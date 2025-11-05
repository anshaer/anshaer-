// DOM 元素引用
const imageLoader = document.getElementById('imageLoader');

const thumbnailCanvas = document.getElementById('thumbnailCanvas');
const thumbnailCtx = thumbnailCanvas.getContext('2d');
const downloadThumbnailButton = document.getElementById('downloadThumbnailButton');
const thumbnailMaxSizeDisplay = document.getElementById('thumbnailMaxSizeDisplay');

const fullSizeCanvas = document.getElementById('fullSizeCanvas');
const fullSizeCtx = fullSizeCanvas.getContext('2d');
const downloadFullSizeButton = document.getElementById('downloadFullSizeButton');

// 控制項
const gaussianRadiusSlider = document.getElementById('gaussianRadius');
const gaussianRadiusDisplay = document.getElementById('gaussianRadiusDisplay');

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

let fullSizeOriginalImageData = null;
let fullSizeCachedGrayData = null;
let fullSizeCachedMagnitudeData = null;

thumbnailMaxSizeDisplay.textContent = MAX_THUMBNAIL_SIZE;

// --- 輔助函式 ---

// 將 HEX 顏色碼轉換為 RGB 陣列 [r, g, b]
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

// --- 核心圖像處理邏輯 ---

// 1. 高斯模糊 (預處理)
function applyGaussianFilter(imageData, radius) {
    if (radius <= 0) return imageData;

    const width = imageData.width;
    const height = imageData.height;
    const data = new Uint8ClampedArray(imageData.data); // 複製一份數據進行操作
    const blurredData = new Uint8ClampedArray(imageData.data); // 輸出數據

    const sigma = radius / 3; // 通常sigma約等於radius/3
    const kernelSize = Math.ceil(radius * 2 + 1); // 確保核心大小為奇數
    const kernel = [];
    let sum = 0;

    // 計算高斯核心
    for (let i = 0; i < kernelSize; i++) {
        const x = i - Math.floor(kernelSize / 2);
        const val = (1 / (Math.sqrt(2 * Math.PI) * sigma)) * Math.exp(-(x * x) / (2 * sigma * sigma));
        kernel.push(val);
        sum += val;
    }
    // 歸一化核心
    for (let i = 0; i < kernel.length; i++) {
        kernel[i] /= sum;
    }

    // 水平方向模糊
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let i = 0; i < kernelSize; i++) {
                const x_offset = x - Math.floor(kernelSize / 2) + i;
                const p = Math.min(Math.max(x_offset, 0), width - 1); // 邊界處理
                const index = (y * width + p) * 4;
                r += data[index] * kernel[i];
                g += data[index + 1] * kernel[i];
                b += data[index + 2] * kernel[i];
                a += data[index + 3] * kernel[i];
            }
            const outputIndex = (y * width + x) * 4;
            blurredData[outputIndex] = r;
            blurredData[outputIndex + 1] = g;
            blurredData[outputIndex + 2] = b;
            blurredData[outputIndex + 3] = a;
        }
    }

    // 垂直方向模糊 (在水平模糊的結果上進行)
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let i = 0; i < kernelSize; i++) {
                const y_offset = y - Math.floor(kernelSize / 2) + i;
                const p = Math.min(Math.max(y_offset, 0), height - 1); // 邊界處理
                const index = (p * width + x) * 4;
                r += blurredData[index] * kernel[i];
                g += blurredData[index + 1] * kernel[i];
                b += blurredData[index + 2] * kernel[i];
                a += blurredData[index + 3] * kernel[i];
            }
            const outputIndex = (y * width + x) * 4;
            imageData.data[outputIndex] = r;
            imageData.data[outputIndex + 1] = g;
            imageData.data[outputIndex + 2] = b;
            imageData.data[outputIndex + 3] = a;
        }
    }
    return imageData;
}


// 2. 灰度化
function applyGrayscale(imageData, weights) {
    const data = imageData.data;
    const grayData = new Uint8ClampedArray(imageData.width * imageData.height);
    const [wR, wG, wB] = weights;

    for (let i = 0; i < data.length; i += 4) {
        const avg = wR * data[i] + wG * data[i + 1] + wB * data[i + 2];
        grayData[i / 4] = avg > 255 ? 255 : (avg < 0 ? 0 : avg);
    }
    return grayData;
}

// 3. Sobel 邊緣偵測
function applySobel(grayData, width, height) {
    const magnitudeData = new Uint8ClampedArray(width * height);
    
    const Gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const Gy = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sumX = 0;
            let sumY = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixelIndex = ((y + ky) * width + (x + kx));
                    const grayscaleValue = grayData[pixelIndex];

                    sumX += grayscaleValue * Gx[ky + 1][kx + 1];
                    sumY += grayscaleValue * Gy[ky + 1][kx + 1];
                }
            }

            const magnitude = Math.sqrt(sumX * sumX + sumY * sumY);    
            const index = y * width + x;
            magnitudeData[index] = magnitude > 255 ? 255 : magnitude;
        }
    }
    return magnitudeData;
}

// 4. 滯後閾值 (Hysteresis Thresholding)
function applyHysteresisThresholding(magnitudeData, width, height, highThreshold, lowThreshold) {
    const outputEdges = new Uint8ClampedArray(width * height);
    const strong = 255;
    const weak = 100; // 代表弱邊緣，用於連接
    const suppressed = 0;

    // 階段 1: 強弱邊緣分類
    for (let i = 0; i < magnitudeData.length; i++) {
        if (magnitudeData[i] >= highThreshold) {
            outputEdges[i] = strong;
        } else if (magnitudeData[i] >= lowThreshold) {
            outputEdges[i] = weak;
        } else {
            outputEdges[i] = suppressed;
        }
    }

    // 階段 2: 邊緣連接 (弱邊緣連接到強邊緣則變強)
    // 使用類似 DFS 或 BFS 的方式
    const queue = [];
    for (let i = 0; i < outputEdges.length; i++) {
        if (outputEdges[i] === strong) {
            queue.push(i);
        }
    }

    while (queue.length > 0) {
        const index = queue.shift();
        const x = index % width;
        const y = Math.floor(index / width);

        // 檢查 8 個鄰居
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;

                const nx = x + dx;
                const ny = y + dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const neighborIndex = ny * width + nx;
                    if (outputEdges[neighborIndex] === weak) {
                        outputEdges[neighborIndex] = strong;
                        queue.push(neighborIndex); // 將新連接的強邊緣加入隊列，繼續向外擴展
                    }
                }
            }
        }
    }

    // 階段 3: 抑制所有未連接的弱邊緣
    for (let i = 0; i < outputEdges.length; i++) {
        if (outputEdges[i] === weak) {
            outputEdges[i] = suppressed;
        }
    }

    return outputEdges; // 0 或 255 的二值圖像
}

// 5. 閾值化和著色：新增邊緣柔化、同時處理兩種閾值模式
function applyThresholdingAndColoring(magnitudeData, width, height, ctxTarget) {
    const edgeData = ctxTarget.createImageData(width, height);
    const edgeDataArr = edgeData.data;

    const lineColor = hexToRgb(lineColorPicker.value);
    const lineAlpha = parseInt(lineAlphaSlider.value);
    const bgColor = hexToRgb(bgColorPicker.value);
    const backgroundAlpha = parseInt(backgroundAlphaSlider.value);

    const useFeathering = edgeFeatheringToggle.checked;
    const featheringStrength = parseFloat(edgeFeatheringStrengthSlider.value) / 100; // 0 到 1

    const useHysteresis = hysteresisToggle.checked;
    let finalEdgeMap; // 最終的二值化邊緣圖 (0或255)

    if (useHysteresis) {
        const highThreshold = parseInt(thresholdValueInputHigh.value);
        const lowThreshold = parseInt(thresholdValueInputLow.value);
        finalEdgeMap = applyHysteresisThresholding(magnitudeData, width, height, highThreshold, lowThreshold);
    } else {
        const singleThreshold = parseInt(thresholdValueInputSingle.value);
        finalEdgeMap = new Uint8ClampedArray(width * height);
        for (let i = 0; i < magnitudeData.length; i++) {
            finalEdgeMap[i] = magnitudeData[i] > singleThreshold ? 255 : 0;
        }
    }
    
    for (let i = 0; i < magnitudeData.length; i++) {
        const outputIndex = i * 4;

        if (finalEdgeMap[i] === 255) { // 是邊緣 (經過滯後閾值或單一閾值判斷)
            edgeDataArr[outputIndex]        = lineColor[0];  
            edgeDataArr[outputIndex + 1] = lineColor[1];
            edgeDataArr[outputIndex + 2] = lineColor[2];

            if (useFeathering) {
                // 根據原始梯度強度調整 Alpha 值
                // 讓強邊緣更不透明，弱邊緣更透明 (在邊緣範圍內)
                // featheringStrength 控制柔化影響的程度
                const originalMagnitude = magnitudeData[i];
                const normalizedMagnitude = originalMagnitude / 255; // 0-1
                const featheredAlpha = lineAlpha * (normalizedMagnitude * featheringStrength + (1 - featheringStrength));
                edgeDataArr[outputIndex + 3] = Math.min(255, featheredAlpha);
            } else {
                edgeDataArr[outputIndex + 3] = lineAlpha;
            }

        } else { // 不是邊緣 (背景)
            edgeDataArr[outputIndex]        = bgColor[0];    
            edgeDataArr[outputIndex + 1] = bgColor[1];    
            edgeDataArr[outputIndex + 2] = bgColor[2];    
            edgeDataArr[outputIndex + 3] = backgroundAlpha;
        }
    }
    return edgeData;
}

// 偵測執行函式 (整合高斯模糊、灰度化、Sobel、滯後閾值/單一閾值、著色)
function runDetectionForCanvas(canvasEl, ctxTarget, originalImgData, 
                                 cachedGray, cachedMagnitude, recalculatePreprocessing = true) {
    if (!originalImgData) return;
    
    const width = canvasEl.width;
    const height = canvasEl.height;

    const wR = parseFloat(redWeightSlider.value) / 100;
    const wG = parseFloat(greenWeightSlider.value) / 100;
    const wB = parseFloat(blueWeightSlider.value) / 100;
    const weights = [wR, wG, wB];

    let currentImageDataForProcessing = new ImageData(new Uint8ClampedArray(originalImgData.data), width, height);
    let currentGrayData = cachedGray;
    let currentMagnitudeData = cachedMagnitude;

    // 如果需要重新計算前處理（高斯模糊、灰度化、Sobel），或者快取不存在
    if (recalculatePreprocessing || !currentGrayData || !currentMagnitudeData) {
        // 應用高斯模糊
        const gaussianRadius = parseFloat(gaussianRadiusSlider.value);
        if (gaussianRadius > 0) {
            currentImageDataForProcessing = applyGaussianFilter(currentImageDataForProcessing, gaussianRadius);
        }
        
        currentGrayData = applyGrayscale(currentImageDataForProcessing, weights);
        currentMagnitudeData = applySobel(currentGrayData, width, height);
    }
    
    const finalImageData = applyThresholdingAndColoring(
        currentMagnitudeData, 
        width, 
        height, 
        ctxTarget 
    );
    
    ctxTarget.putImageData(finalImageData, 0, 0);

    return { gray: currentGrayData, magnitude: currentMagnitudeData };
}

// 統籌函式 (當灰度權重或高斯模糊改變時，需要重新計算所有步驟)
function runFullDetection() {
    if (!uploadedImage) return;

    // 清空所有快取，強制重新計算
    thumbnailCachedGrayData = null;
    thumbnailCachedMagnitudeData = null;
    fullSizeCachedGrayData = null;
    fullSizeCachedMagnitudeData = null;

    const thumbResult = runDetectionForCanvas(
        thumbnailCanvas, thumbnailCtx, thumbnailOriginalImageData, 
        thumbnailCachedGrayData, thumbnailCachedMagnitudeData, true // 強制重新計算
    );
    if (thumbResult) {
        thumbnailCachedGrayData = thumbResult.gray;
        thumbnailCachedMagnitudeData = thumbResult.magnitude;
    }

    const fullResult = runDetectionForCanvas(
        fullSizeCanvas, fullSizeCtx, fullSizeOriginalImageData, 
        fullSizeCachedGrayData, fullSizeCachedMagnitudeData, true // 強制重新計算
    );
    if (fullResult) {
        fullSizeCachedGrayData = fullResult.gray;
        fullSizeCachedMagnitudeData = fullResult.magnitude;
    }
}

// 統籌函式 (當閾值或顏色參數改變時，只需重新應用閾值和著色，重用之前的灰度和梯度數據)
function updateColorAndThresholding() {
    if (!uploadedImage) return;
    
    const thumbResult = runDetectionForCanvas(
        thumbnailCanvas, thumbnailCtx, thumbnailOriginalImageData, 
        thumbnailCachedGrayData, thumbnailCachedMagnitudeData, false // 不重新計算前處理
    );
    if (thumbResult) {
        thumbnailCachedGrayData = thumbResult.gray; // 更新快取
        thumbnailCachedMagnitudeData = thumbResult.magnitude;
    }

    const fullResult = runDetectionForCanvas(
        fullSizeCanvas, fullSizeCtx, fullSizeOriginalImageData, 
        fullSizeCachedGrayData, fullSizeCachedMagnitudeData, false // 不重新計算前處理
    );
    if (fullResult) {
        fullSizeCachedGrayData = fullResult.gray; // 更新快取
        fullSizeCachedMagnitudeData = fullResult.magnitude;
    }
}

// --- 事件處理 ---

imageLoader.addEventListener('change', handleImage, false);
downloadThumbnailButton.addEventListener('click', () => downloadImage(thumbnailCanvas, 'thumbnail'), false);
downloadFullSizeButton.addEventListener('click', () => downloadImage(fullSizeCanvas, 'fullsize'), false);

// 灰度化權重 或 高斯模糊半徑 改變 (需要重新計算 Sobel 梯度，因此觸發 runFullDetection)
[redWeightSlider, greenWeightSlider, blueWeightSlider, gaussianRadiusSlider].forEach(control => {
    control.addEventListener('input', () => {
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
        if (control.id === 'hysteresisToggle') {
            // 根據是否啟用滯後閾值，切換顯示高低閾值或單一閾值
            thresholdValueInputHigh.parentElement.style.display = hysteresisToggle.checked ? 'flex' : 'none';
            thresholdValueInputLow.parentElement.style.display = hysteresisToggle.checked ? 'flex' : 'none';
            singleThresholdControl.style.display = hysteresisToggle.checked ? 'none' : 'flex';
        }
        if (control.id === 'thresholdValueInputHigh') {
            thresholdValueDisplayHigh.textContent = thresholdValueInputHigh.value;
            // 確保高閾值不低於低閾值
            if (parseInt(thresholdValueInputHigh.value) < parseInt(thresholdValueInputLow.value)) {
                thresholdValueInputLow.value = thresholdValueInputHigh.value;
                thresholdValueDisplayLow.textContent = thresholdValueInputLow.value;
            }
        }
        if (control.id === 'thresholdValueInputLow') {
            thresholdValueDisplayLow.textContent = thresholdValueInputLow.value;
            // 確保低閾值不高於高閾值
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

// 圖片上傳處理
function handleImage(e) {
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
            fullSizeCachedGrayData = null; 
            fullSizeCachedMagnitudeData = null;

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

// 下載函式 
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
