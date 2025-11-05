// DOM 元素引用
const imageLoader = document.getElementById('imageLoader');

const thumbnailCanvas = document.getElementById('thumbnailCanvas');
const thumbnailCtx = thumbnailCanvas.getContext('2d');
const downloadThumbnailButton = document.getElementById('downloadThumbnailButton');
const thumbnailMaxSizeDisplay = document.getElementById('thumbnailMaxSizeDisplay');

const fullSizeCanvas = document.getElementById('fullSizeCanvas');
const fullSizeCtx = fullSizeCanvas.getContext('2d');
// 新增按鈕引用
const processFullSizeButton = document.getElementById('processFullSizeButton'); 
const downloadFullSizeButton = document.getElementById('downloadFullSizeButton');

// 控制項 (保持不變)
// ... (所有控制項的引用代碼與您上次提供的版本相同，這裡省略以保持簡潔)
const postBlurToggle = document.getElementById('postBlurToggle');
const postBlurRadiusSlider = document.getElementById('postBlurRadius');
const postBlurRadiusDisplay = document.getElementById('postBlurRadiusDisplay');

const redWeightSlider = document.getElementById('redWeight');
const greenWeightSlider = document.getElementById('greenWeight');
const blueWeightSlider = document.getElementById('blueWeight');
const redWeightValueDisplay = document.getElementById('redWeightValue');
const greenWeightValueDisplay = document.getElementById('greenWeightValue');
const blueWeightValueDisplay = document.getElementById('blueWeightValue');

const thresholdValueInput = document.getElementById('thresholdValueInput');
const thresholdValueDisplay = document.getElementById('thresholdValueDisplay');

const lineColorPicker = document.getElementById('lineColorPicker');
const lineAlphaSlider = document.getElementById('lineAlpha');
const lineAlphaDisplay = document.getElementById('lineAlphaDisplay');

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

// 保持 hexToRgb, applyGaussianFilter, applyGrayscale, applySobel, applyThresholdingAndColoring 函式不變
// ... (這些函式邏輯保持不變)

// 偵測執行函式 (保持不變)
function runDetectionForCanvas(canvasEl, ctxTarget, originalImgData, 
                                 cachedGray, cachedMagnitude, recalculatePreprocessing = true) {
    if (!originalImgData) return;
    
    // ... (runDetectionForCanvas 函式內容保持不變，它接受參數決定是否重新計算)
    const width = canvasEl.width;
    const height = canvasEl.height;
    
    const wR = parseFloat(redWeightSlider.value) / 100;
    const wG = parseFloat(greenWeightSlider.value) / 100;
    const wB = parseFloat(blueWeightSlider.value) / 100;
    const weights = [wR, wG, wB];
    
    const postBlurEnabled = postBlurToggle.checked;
    const postBlurRadius = parseFloat(postBlurRadiusSlider.value);

    let currentGrayData = cachedGray;
    let currentMagnitudeData = cachedMagnitude;

    let currentImageDataForProcessing = new ImageData(new Uint8ClampedArray(originalImgData.data), width, height);

    if (recalculatePreprocessing || !currentGrayData || !currentMagnitudeData) {
        // 預處理高斯模糊已移除
        
        currentGrayData = applyGrayscale(currentImageDataForProcessing, weights);
        currentMagnitudeData = applySobel(currentGrayData, width, height);
    }
    
    const threshold = parseInt(thresholdValueInput.value);
    const lineColor = hexToRgb(lineColorPicker.value);
    const lineAlpha = parseInt(lineAlphaSlider.value); 
    const bgColor = hexToRgb(bgColorPicker.value);
    const backgroundAlpha = parseInt(backgroundAlphaSlider.value); 

    let finalImageData = applyThresholdingAndColoring(
        currentMagnitudeData, 
        width, 
        height, 
        threshold, 
        lineColor, 
        lineAlpha, 
        bgColor, 
        backgroundAlpha, 
        ctxTarget 
    );
    
    if (postBlurEnabled && postBlurRadius > 0) {
        finalImageData = applyGaussianFilter(finalImageData, postBlurRadius);
    }

    ctxTarget.putImageData(finalImageData, 0, 0);

    return { gray: currentGrayData, magnitude: currentMagnitudeData };
}


// --- 核心修改區域 START ---

// 統籌函式 (只處理縮圖 - 灰度權重改變時)
function runFullDetection() {
    if (!uploadedImage) return;

    // 清空縮圖快取，強制重新計算
    thumbnailCachedGrayData = null;
    thumbnailCachedMagnitudeData = null;
    // 不碰 fullSize 的快取

    // *只對縮圖執行處理*
    const thumbResult = runDetectionForCanvas(
        thumbnailCanvas, thumbnailCtx, thumbnailOriginalImageData, 
        thumbnailCachedGrayData, thumbnailCachedMagnitudeData, true 
    );
    if (thumbResult) {
        thumbnailCachedGrayData = thumbResult.gray;
        thumbnailCachedMagnitudeData = thumbResult.magnitude;
    }
    
    // 禁用下載全尺寸按鈕，直到原始圖處理完成
    downloadFullSizeButton.disabled = true;
}

// 統籌函式 (只處理縮圖 - 顏色、閾值、平滑改變時)
function updateColorAndThresholding() {
    if (!uploadedImage) return;
    
    // *只對縮圖執行處理*
    const thumbResult = runDetectionForCanvas(
        thumbnailCanvas, thumbnailCtx, thumbnailOriginalImageData, 
        thumbnailCachedGrayData, thumbnailCachedMagnitudeData, false // 不重新計算前處理
    );
    if (thumbResult) {
        thumbnailCachedGrayData = thumbResult.gray;
        thumbnailCachedMagnitudeData = thumbResult.magnitude;
    }

    // 禁用下載全尺寸按鈕，直到原始圖處理完成
    downloadFullSizeButton.disabled = true;
}

// 手動觸發原始尺寸畫布處理的專門函式
function processFullSize() {
    if (!uploadedImage) return;
    
    // 清空原始圖快取，強制重新計算（因為參數可能已變）
    fullSizeCachedGrayData = null;
    fullSizeCachedMagnitudeData = null;

    processFullSizeButton.textContent = '處理中... (請稍候)';
    processFullSizeButton.disabled = true;
    
    // 使用 setTimeout 讓瀏覽器有機會更新 UI，避免完全鎖死
    setTimeout(() => {
        try {
            const fullResult = runDetectionForCanvas(
                fullSizeCanvas, fullSizeCtx, fullSizeOriginalImageData, 
                fullSizeCachedGrayData, fullSizeCachedMagnitudeData, true // 強制重新計算所有步驟
            );
            
            if (fullResult) {
                fullSizeCachedGrayData = fullResult.gray;
                fullSizeCachedMagnitudeData = fullResult.magnitude;
            }

            processFullSizeButton.textContent = '原始圖處理完成';
            downloadFullSizeButton.disabled = false;
        } catch (error) {
            console.error('原始圖處理失敗:', error);
            processFullSizeButton.textContent = '處理失敗';
            alert('處理原始圖失敗，圖片可能太大或設備記憶體不足。');
        } finally {
            // 處理完成後，無論成功或失敗，重新啟用按鈕，等待下一次手動點擊
            setTimeout(() => {
                processFullSizeButton.textContent = '處理原始圖 (耗時)';
                processFullSizeButton.disabled = false;
            }, 3000); 
        }
    }, 50); // 延遲執行，釋放 UI 執行緒
}

// --- 核心修改區域 END ---


// --- 事件處理 ---

imageLoader.addEventListener('change', handleImage, false);
downloadThumbnailButton.addEventListener('click', () => downloadImage(thumbnailCanvas, 'thumbnail'), false);
downloadFullSizeButton.addEventListener('click', () => downloadImage(fullSizeCanvas, 'fullsize'), false);
// 新增手動處理按鈕的監聽
processFullSizeButton.addEventListener('click', processFullSize, false); 

// 灰度權重改變 (觸發 runFullDetection)
[redWeightSlider, greenWeightSlider, blueWeightSlider].forEach(control => {
    control.addEventListener('input', () => {
        const total = parseInt(redWeightSlider.value) + parseInt(greenWeightSlider.value) + parseInt(blueWeightSlider.value);
        const adjustRatio = 100 / (total === 0 ? 1 : total);
        redWeightValueDisplay.textContent = (parseInt(redWeightSlider.value) * adjustRatio / 100).toFixed(2);
        greenWeightValueDisplay.textContent = (parseInt(greenWeightSlider.value) * adjustRatio / 100).toFixed(2);
        blueWeightValueDisplay.textContent = (parseInt(blueWeightSlider.value) * adjustRatio / 100).toFixed(2);
        
        if (uploadedImage) runFullDetection(); 
    });
});


// 閾值化、顏色、Alpha 值 或 後處理模糊參數改變 (觸發 updateColorAndThresholding)
[
    thresholdValueInput, lineColorPicker, lineAlphaSlider, 
    bgColorPicker, backgroundAlphaSlider,
    postBlurToggle, postBlurRadiusSlider 
].forEach(control => {
    control.addEventListener('input', () => {
        if (control.id === 'thresholdValueInput') {
            thresholdValueDisplay.textContent = thresholdValueInput.value;
        } else if (control.id === 'lineAlpha') {
            const alphaValue = parseInt(lineAlphaSlider.value);
            let display = alphaValue;
            if (alphaValue === 255) display += " (不透明)";
            if (alphaValue === 0) display += " (透明)";
            lineAlphaDisplay.textContent = display;
        } else if (control.id === 'backgroundAlpha') {
            const alphaValue = parseInt(backgroundAlphaSlider.value);
            let display = alphaValue;
            if (alphaValue === 255) display += " (不透明)";
            if (alphaValue === 0) display += " (透明)";
            backgroundAlphaDisplay.textContent = display;
        } else if (control.id === 'postBlurRadius') {
            const radius = parseFloat(postBlurRadiusSlider.value);
            postBlurRadiusDisplay.textContent = radius > 0 ? `${radius.toFixed(1)}` : '0 (關閉)';
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
            [downloadThumbnailButton, processFullSizeButton, 
             postBlurToggle, postBlurRadiusSlider,
             redWeightSlider, greenWeightSlider, blueWeightSlider, 
             thresholdValueInput, lineColorPicker, lineAlphaSlider, 
             bgColorPicker, backgroundAlphaSlider].forEach(el => {
                el.disabled = false;
            });
            
            // 初始狀態下禁用下載原始圖按鈕
            downloadFullSizeButton.disabled = true;

            runFullDetection(); // 初始處理縮圖
        }
        uploadedImage.src = event.target.result;
    }
    reader.readAsDataURL(file);
}

// 下載函式 (未改變)
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
[downloadThumbnailButton, processFullSizeButton, downloadFullSizeButton, 
 postBlurToggle, postBlurRadiusSlider,
 redWeightSlider, greenWeightSlider, blueWeightSlider, 
 thresholdValueInput, lineColorPicker, lineAlphaSlider, 
 bgColorPicker, backgroundAlphaSlider].forEach(el => {
    el.disabled = true;
});

// 初始設定顯示值
postBlurRadiusDisplay.textContent = `${parseFloat(postBlurRadiusSlider.value).toFixed(1)} (關閉)`;
