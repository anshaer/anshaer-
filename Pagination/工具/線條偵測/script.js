// script.js
// DOM 元素引用 (保持不變)
const imageLoader = document.getElementById('imageLoader');

const thumbnailCanvas = document.getElementById('thumbnailCanvas');
const thumbnailCtx = thumbnailCanvas.getContext('2d');
const downloadThumbnailButton = document.getElementById('downloadThumbnailButton');
const thumbnailMaxSizeDisplay = document.getElementById('thumbnailMaxSizeDisplay');

const fullSizeCanvas = document.getElementById('fullSizeCanvas');
const fullSizeCtx = fullSizeCanvas.getContext('2d');
const downloadFullSizeButton = document.getElementById('downloadFullSizeButton');

// 控制項 (保持不變)
const gaussianRadiusSlider = document.getElementById('gaussianRadius');
const gaussianRadiusDisplay = document.getElementById('gaussianRadiusDisplay');
// ... (所有其他控制項的引用保持不變)
const redWeightSlider = document.getElementById('redWeight');
const greenWeightSlider = document.getElementById('greenWeight');
const blueWeightSlider = document.getElementById('blueWeight');
const redWeightValueDisplay = document.getElementById('redWeightValue');
const greenWeightValueDisplay = document.getElementById('greenWeightValue');
const blueWeightValueDisplay = document.getElementById('blueWeightValue');

const hysteresisToggle = document.getElementById('hysteresisToggle');
const thresholdValueInputHigh = document.getElementById('thresholdValueInputHigh');
const thresholdValueDisplayHigh = document.getElementById('thresholdValueDisplayHigh');
const thresholdValueInputLow = document.getElementById('thresholdValueInputLow');
const thresholdValueDisplayLow = document.getElementById('thresholdValueDisplayLow');
const singleThresholdControl = document.getElementById('singleThresholdControl');
const thresholdValueInputSingle = document.getElementById('thresholdValueInputSingle');
const thresholdValueDisplaySingle = document.getElementById('thresholdValueDisplaySingle');

const lineColorPicker = document.getElementById('lineColorPicker');
const lineAlphaSlider = document.getElementById('lineAlpha');
const lineAlphaDisplay = document.getElementById('lineAlphaDisplay');

const edgeFeatheringToggle = document.getElementById('edgeFeatheringToggle');
const edgeFeatheringStrengthSlider = document.getElementById('edgeFeatheringStrength');
const edgeFeatheringStrengthDisplay = document.getElementById('edgeFeatheringStrengthDisplay');
const edgeFeatheringStrengthControl = document.getElementById('edgeFeatheringStrengthControl');

const bgColorPicker = document.getElementById('bgColorPicker');
const backgroundAlphaSlider = document.getElementById('backgroundAlpha'); 
const backgroundAlphaDisplay = document.getElementById('backgroundAlphaDisplay');


// 全域變數
let uploadedImage = null; 
const MAX_THUMBNAIL_SIZE = 800; 

// 針對兩個畫布各自的圖像數據和快取
let thumbnailOriginalImageData = null;
let thumbnailCachedGrayData = null;
let thumbnailCachedMagnitudeData = null;
let thumbnailCachedEdgeMap = null; // 新增：快取最終的二值化邊緣圖

let fullSizeOriginalImageData = null;
let fullSizeCachedGrayData = null;
let fullSizeCachedMagnitudeData = null;
let fullSizeCachedEdgeMap = null; // 新增：快取最終的二值化邊緣圖

thumbnailMaxSizeDisplay.textContent = MAX_THUMBNAIL_SIZE;


// --- Web Worker 設定 ---
let worker = new Worker('worker.js');
let currentWorkerId = 0; // 用於追蹤 Worker 請求的 ID
let processingQueue = []; // 處理隊列，確保請求順序

// 輔助函式 (僅用於主執行緒的 UI 處理)
function hexToRgb(hex) { /* ... 保持不變 ... */ }
function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 7) { 
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    } else if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    }
    return [r, g, b];
}

/**
 * 核心：向 Worker 發送計算請求
 * @param {string} type - 'TYPE_FULL_RECALCULATION' 或 'TYPE_COLOR_UPDATE'
 * @param {HTMLCanvasElement} canvasEl 
 * @param {CanvasRenderingContext2D} ctxTarget 
 * @param {ImageData} originalImgData 
 * @param {Uint8ClampedArray} cachedGray 
 * @param {Uint8ClampedArray} cachedMagnitude 
 * @param {Uint8ClampedArray} cachedEdgeMap 
 * @param {function} updateCacheFn - 用於更新主執行緒快取的回調函式
 */
function sendWorkerRequest(type, canvasEl, ctxTarget, originalImgData, 
                            cachedGray, cachedMagnitude, cachedEdgeMap, updateCacheFn) {
    if (!originalImgData) return;

    currentWorkerId++;
    const id = currentWorkerId;
    
    // 1. 準備參數
    const width = canvasEl.width;
    const height = canvasEl.height;

    const weights = [
        parseFloat(redWeightSlider.value) / 100, 
        parseFloat(greenWeightSlider.value) / 100, 
        parseFloat(blueWeightSlider.value) / 100
    ];

    const thresholdParams = {
        useHysteresis: hysteresisToggle.checked,
        highThreshold: parseInt(thresholdValueInputHigh.value),
        lowThreshold: parseInt(thresholdValueInputLow.value),
        singleThreshold: parseInt(thresholdValueInputSingle.value),
        lineColor: hexToRgb(lineColorPicker.value),
        lineAlpha: parseInt(lineAlphaSlider.value),
        bgColor: hexToRgb(bgColorPicker.value),
        backgroundAlpha: parseInt(backgroundAlphaSlider.value),
        useFeathering: edgeFeatheringToggle.checked,
        featheringStrength: parseFloat(edgeFeatheringStrengthSlider.value) / 100
    };
    
    // 2. 準備傳輸數據
    let transferList = [];
    let dataToSend = {
        id,
        type,
        imageData: originalImgData, // 包含 width/height 和 data array
        thresholdParams,
    };
    
    if (type === 'TYPE_FULL_RECALCULATION') {
        dataToSend.gaussianRadius = parseFloat(gaussianRadiusSlider.value);
        dataToSend.weights = weights;
        // 由於我們需要原始數據進行高斯模糊，所以傳輸一份拷貝
        transferList.push(originalImgData.data.buffer.slice(0)); 
    } else if (type === 'TYPE_COLOR_UPDATE') {
        dataToSend.cachedGrayData = cachedGray;
        dataToSend.cachedMagnitudeData = cachedMagnitude;
        dataToSend.precalculatedEdgeMap = cachedEdgeMap; // 傳輸上次的 Edge Map，避免重新計算
        
        // 傳輸快取的 ArrayBuffer，性能更好
        if (cachedGray) transferList.push(cachedGray.buffer);
        if (cachedMagnitude) transferList.push(cachedMagnitude.buffer);
        if (cachedEdgeMap) transferList.push(cachedEdgeMap.buffer);
    }
    
    // 3. 發送請求
    worker.postMessage(dataToSend, transferList);
    
    // 4. 將回調函式加入隊列
    processingQueue[id] = { canvasEl, ctxTarget, updateCacheFn };
}


// Worker 接收消息
worker.onmessage = function(e) {
    const { id, result, success, error } = e.data;

    if (!processingQueue[id]) return; // 忽略已過時的或不存在的請求

    const { canvasEl, ctxTarget, updateCacheFn } = processingQueue[id];
    delete processingQueue[id]; // 處理完成，從隊列移除

    if (!success) {
        console.error(`Worker Error (ID: ${id}): ${error}`);
        // 可以在畫布上顯示錯誤信息
        return;
    }
    
    const width = canvasEl.width;
    const height = canvasEl.height;
    
    // 1. 更新畫布
    const newImageData = new ImageData(result.imageDataArray, width, height);
    ctxTarget.putImageData(newImageData, 0, 0);

    // 2. 更新主執行緒快取
    if (updateCacheFn) {
        updateCacheFn(result);
    }
    
    // 3. 處理完一個大圖處理後，嘗試立即處理下一個隊列中的更新（如果有的話）
    // 這裡我們只處理收到的結果，不主動發起下一個，由 runFullDetection/updateColorAndThresholding 控制發送
};

// 統籌函式 (當灰度權重或高斯模糊改變時，需要重新計算所有步驟)
function runFullDetection() {
    if (!uploadedImage) return;

    // 1. 縮圖處理
    sendWorkerRequest(
        'TYPE_FULL_RECALCULATION',
        thumbnailCanvas, thumbnailCtx, thumbnailOriginalImageData, 
        thumbnailCachedGrayData, thumbnailCachedMagnitudeData, thumbnailCachedEdgeMap,
        (result) => {
            // 更新縮圖快取的回調
            thumbnailCachedGrayData = result.grayData;
            thumbnailCachedMagnitudeData = result.magnitudeData;
            thumbnailCachedEdgeMap = result.finalEdgeMap;
            // 注意：因為 ArrayBuffer 被傳輸到 Worker，我們需要新的 ArrayBuffer 才能再次使用
            // 所以這裡的 grayData 和 magnitudeData 已經是 Worker 傳回的「新拷貝」
        }
    );

    // 2. 原始尺寸圖處理 (最耗時，所以確保它是非同步的)
    sendWorkerRequest(
        'TYPE_FULL_RECALCULATION',
        fullSizeCanvas, fullSizeCtx, fullSizeOriginalImageData, 
        fullSizeCachedGrayData, fullSizeCachedMagnitudeData, fullSizeCachedEdgeMap,
        (result) => {
            // 更新大圖快取的回調
            fullSizeCachedGrayData = result.grayData;
            fullSizeCachedMagnitudeData = result.magnitudeData;
            fullSizeCachedEdgeMap = result.finalEdgeMap;
        }
    );
}

// 統籌函式 (當閾值或顏色參數改變時，只需重新應用閾值和著色，重用之前的灰度和梯度數據)
function updateColorAndThresholding() {
    if (!uploadedImage) return;
    
    // 1. 縮圖處理
    sendWorkerRequest(
        'TYPE_COLOR_UPDATE',
        thumbnailCanvas, thumbnailCtx, thumbnailOriginalImageData, 
        thumbnailCachedGrayData, thumbnailCachedMagnitudeData, thumbnailCachedEdgeMap,
        (result) => {
            thumbnailCachedEdgeMap = result.finalEdgeMap; // 閾值改變，Edge Map 可能改變
        }
    );

    // 2. 原始尺寸圖處理 (此時計算量依然較大，所以仍需 Worker)
    sendWorkerRequest(
        'TYPE_COLOR_UPDATE',
        fullSizeCanvas, fullSizeCtx, fullSizeOriginalImageData, 
        fullSizeCachedGrayData, fullSizeCachedMagnitudeData, fullSizeCachedEdgeMap,
        (result) => {
            fullSizeCachedEdgeMap = result.finalEdgeMap; // 閾值改變，Edge Map 可能改變
        }
    );
}


// --- 事件處理 (保持不變) ---

imageLoader.addEventListener('change', handleImage, false);
downloadThumbnailButton.addEventListener('click', () => downloadImage(thumbnailCanvas, 'thumbnail'), false);
downloadFullSizeButton.addEventListener('click', () => downloadImage(fullSizeCanvas, 'fullsize'), false);

// 灰度化權重 或 高斯模糊半徑 改變 (需要重新計算 Sobel 梯度，因此觸發 runFullDetection)
[redWeightSlider, greenWeightSlider, blueWeightSlider, gaussianRadiusSlider].forEach(control => {
    control.addEventListener('input', () => {
        // ... (更新 UI 顯示值的邏輯保持不變)
        if (control.id === 'gaussianRadius') {
            const radius = parseFloat(gaussianRadiusSlider.value);
            gaussianRadiusDisplay.textContent = radius > 0 ? `${radius.toFixed(1)}` : '0 (關閉)';
        } else {
            const total = parseInt(redWeightSlider.value) + parseInt(greenWeightSlider.value) + parseInt(blueWeightSlider.value);
            const adjustRatio = 100 / (total === 0 ? 1 : total); // 避免除以零
            redWeightValueDisplay.textContent = (parseInt(redWeightSlider.value) * adjustRatio / 100).toFixed(2);
            greenWeightValueDisplay.textContent = (parseInt(greenWeightSlider.value) * adjustRatio / 100).toFixed(2);
            blueWeightValueDisplay.textContent = (parseInt(blueWeightSlider.value) * adjustRatio / 100).toFixed(2);
        }
        if (uploadedImage) runFullDetection(); 
    });
});


// 閾值化 (單一/高/低)、顏色或 Alpha 值、邊緣柔化改變 (只需重新應用閾值和著色，觸發 updateColorAndThresholding)
[
    hysteresisToggle, thresholdValueInputHigh, thresholdValueInputLow, thresholdValueInputSingle,
    lineColorPicker, lineAlphaSlider, bgColorPicker, backgroundAlphaSlider,
    edgeFeatheringToggle, edgeFeatheringStrengthSlider
].forEach(control => {
    control.addEventListener('input', () => {
        // ... (更新 UI 顯示值的邏輯保持不變)
        if (control.id === 'hysteresisToggle') {
            thresholdValueInputHigh.parentElement.style.display = hysteresisToggle.checked ? 'flex' : 'none';
            thresholdValueInputLow.parentElement.style.display = hysteresisToggle.checked ? 'flex' : 'none';
            singleThresholdControl.style.display = hysteresisToggle.checked ? 'none' : 'flex';
        }
        if (control.id === 'thresholdValueInputHigh') {
            thresholdValueDisplayHigh.textContent = thresholdValueInputHigh.value;
            if (parseInt(thresholdValueInputHigh.value) < parseInt(thresholdValueInputLow.value)) {
                thresholdValueInputLow.value = thresholdValueInputHigh.value;
                thresholdValueDisplayLow.textContent = thresholdValueInputLow.value;
            }
        }
        if (control.id === 'thresholdValueInputLow') {
            thresholdValueDisplayLow.textContent = thresholdValueInputLow.value;
            if (parseInt(thresholdValueInputLow.value) > parseInt(thresholdValueInputHigh.value)) {
                thresholdValueInputHigh.value = thresholdValueInputLow.value;
                thresholdValueDisplayHigh.textContent = thresholdValueInputHigh.value;
            }
        }
        if (control.id === 'thresholdValueInputSingle') {
            thresholdValueDisplaySingle.textContent = thresholdValueInputSingle.value;
        }
        if (control.id === 'lineAlpha') {
            const alphaValue = parseInt(lineAlphaSlider.value);
            let display = alphaValue;
            if (alphaValue === 255) display += " (不透明)";
            if (alphaValue === 0) display += " (透明)";
            lineAlphaDisplay.textContent = display;
        }
        if (control.id === 'backgroundAlpha') {
            const alphaValue = parseInt(backgroundAlphaSlider.value);
            let display = alphaValue;
            if (alphaValue === 255) display += " (不透明)";
            if (alphaValue === 0) display += " (透明)";
            backgroundAlphaDisplay.textContent = display;
        }
        if (control.id === 'edgeFeatheringToggle') {
            edgeFeatheringStrengthControl.style.display = edgeFeatheringToggle.checked ? 'flex' : 'none';
        }
        if (control.id === 'edgeFeatheringStrength') {
            edgeFeatheringStrengthDisplay.textContent = `${edgeFeatheringStrengthSlider.value}%`;
        }

        if (uploadedImage) updateColorAndThresholding(); 
    });
});

// 圖片上傳處理 (保持不變)
function handleImage(e) {
    // ... (初始化邏輯保持不變)
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        uploadedImage = new Image();
        uploadedImage.onload = function() {
            const originalWidth = uploadedImage.width;
            const originalHeight = uploadedImage.height;

            // --- 處理縮圖畫布（限制尺寸）---
            let thumbWidth = originalWidth;
            let thumbHeight = originalHeight;
            
            if (originalWidth > MAX_THUMBNAIL_SIZE || originalHeight > MAX_THUMBNAIL_SIZE) {
                const ratio = Math.min(MAX_THUMBNAIL_SIZE / originalWidth, MAX_THUMBNAIL_SIZE / originalHeight);
                thumbWidth = originalWidth * ratio;
                thumbHeight = originalHeight * ratio;
            }
            thumbnailCanvas.width = thumbWidth;
            thumbnailCanvas.height = thumbHeight;
            thumbnailCtx.drawImage(uploadedImage, 0, 0, thumbWidth, thumbHeight);
            thumbnailOriginalImageData = thumbnailCtx.getImageData(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
            
            // --- 處理原始尺寸畫布（無限制）---
            fullSizeCanvas.width = originalWidth;
            fullSizeCanvas.height = originalHeight;
            fullSizeCtx.drawImage(uploadedImage, 0, 0, originalWidth, originalHeight);
            fullSizeOriginalImageData = fullSizeCtx.getImageData(0, 0, fullSizeCanvas.width, fullSizeCanvas.height);
            
            // 清空所有快取
            thumbnailCachedGrayData = null; 
            thumbnailCachedMagnitudeData = null;
            thumbnailCachedEdgeMap = null;
            fullSizeCachedGrayData = null; 
            fullSizeCachedMagnitudeData = null;
            fullSizeCachedEdgeMap = null;

            // 啟用控制項
            [
                downloadThumbnailButton, downloadFullSizeButton, 
                gaussianRadiusSlider,
                redWeightSlider, greenWeightSlider, blueWeightSlider, 
                hysteresisToggle, thresholdValueInputHigh, thresholdValueInputLow, thresholdValueInputSingle,
                lineColorPicker, lineAlphaSlider, 
                edgeFeatheringToggle, edgeFeatheringStrengthSlider,
                bgColorPicker, backgroundAlphaSlider
            ].forEach(el => {
                el.disabled = false;
            });
            
            // 初始化顯示狀態
            thresholdValueInputHigh.parentElement.style.display = hysteresisToggle.checked ? 'flex' : 'none';
            thresholdValueInputLow.parentElement.style.display = hysteresisToggle.checked ? 'flex' : 'none';
            singleThresholdControl.style.display = hysteresisToggle.checked ? 'none' : 'flex';
            edgeFeatheringStrengthControl.style.display = edgeFeatheringToggle.checked ? 'flex' : 'none';
            
            runFullDetection(); 
        }
        uploadedImage.src = event.target.result;
    }
    reader.readAsDataURL(file);
}

// 下載函式 和 初始禁用控制項 (保持不變)
function downloadImage(canvasTarget, prefix) {
    if (!uploadedImage) return;
    
    const dataURL = canvasTarget.toDataURL('image/png');    
    
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = prefix + '_edge_detection_' + new Date().getTime() + '.png';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 初始禁用控制項
[
    downloadThumbnailButton, downloadFullSizeButton, 
    gaussianRadiusSlider,
    redWeightSlider, greenWeightSlider, blueWeightSlider, 
    hysteresisToggle, thresholdValueInputHigh, thresholdValueInputLow, thresholdValueInputSingle,
    lineColorPicker, lineAlphaSlider, 
    edgeFeatheringToggle, edgeFeatheringStrengthSlider,
    bgColorPicker, backgroundAlphaSlider
].forEach(el => {
    el.disabled = true;
});

// 初始設定顯示值
thresholdValueDisplayHigh.textContent = thresholdValueInputHigh.value;
thresholdValueDisplayLow.textContent = thresholdValueInputLow.value;
thresholdValueDisplaySingle.textContent = thresholdValueInputSingle.value;
gaussianRadiusDisplay.textContent = `${parseFloat(gaussianRadiusSlider.value).toFixed(1)} (關閉)`;
edgeFeatheringStrengthDisplay.textContent = `${edgeFeatheringStrengthSlider.value}%`;

// 初始隱藏單一閾值控制項，因為預設啟用滯後閾值
singleThresholdControl.style.display = 'none';
// 初始隱藏邊緣柔化強度控制項，直到啟用
edgeFeatheringStrengthControl.style.display = edgeFeatheringToggle.checked ? 'flex' : 'none';
