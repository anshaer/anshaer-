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
// 預處理高斯模糊控制項已移除

// 後處理控制項
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

// --- 核心處理邏輯 ---

// 1. 高斯模糊 (用於後處理平滑)
function applyGaussianFilter(imageData, radius) {
    if (radius <= 0) return imageData;

    const width = imageData.width;
    const height = imageData.height;
    const data = new Uint8ClampedArray(imageData.data); 
    const blurredData = new Uint8ClampedArray(imageData.data.length); 

    const sigma = radius / 3; 
    const kernelSize = Math.ceil(radius * 2 + 1); 
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
                const p = Math.min(Math.max(x_offset, 0), width - 1); 
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
                const p = Math.min(Math.max(y_offset, 0), height - 1); 
                const index = (p * width + x) * 4; 
                r += blurredData[index] * kernel[i];
                g += blurredData[index + 1] * kernel[i];
                b += blurredData[index + 2] * kernel[i];
                a += blurredData[index + 3] * kernel[i];
            }
            const outputIndex = (y * width + x) * 4;
            // 將最終結果寫回原始 imageData.data
            imageData.data[outputIndex] = r;
            imageData.data[outputIndex + 1] = g;
            imageData.data[outputIndex + 2] = b;
            imageData.data[outputIndex + 3] = a;
        }
    }
    return imageData;
}


// 2. 灰度化 (未改變)
function applyGrayscale(imageData, weights) {
    // ... 保持不變
    const data = imageData.data;
    const grayData = new Uint8ClampedArray(imageData.width * imageData.height);
    const [wR, wG, wB] = weights;

    for (let i = 0; i < data.length; i += 4) {
        const avg = wR * data[i] + wG * data[i + 1] + wB * data[i + 2];
        grayData[i / 4] = avg > 255 ? 255 : (avg < 0 ? 0 : avg);
    }
    return grayData;
}

// 3. Sobel 邊緣偵測 (未改變)
function applySobel(grayData, width, height) {
    // ... 保持不變
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

// 4. 閾值化和著色 (未改變)
function applyThresholdingAndColoring(magnitudeData, width, height, threshold, lineColor, lineAlpha, bgColor, backgroundAlpha, ctxTarget) {
    // ... 保持不變
    const edgeData = ctxTarget.createImageData(width, height);
    const edgeDataArr = edgeData.data;

    const [lineR, lineG, lineB] = lineColor;
    const [bgR, bgG, bgB] = bgColor;
    
    for (let i = 0; i < magnitudeData.length; i++) {
        const magnitude = magnitudeData[i];
        const outputIndex = i * 4;

        if (magnitude > threshold) {
            edgeDataArr[outputIndex]        = lineR;  
            edgeDataArr[outputIndex + 1] = lineG;
            edgeDataArr[outputIndex + 2] = lineB;
            edgeDataArr[outputIndex + 3] = lineAlpha; 
        } else {
            edgeDataArr[outputIndex]        = bgR;    
            edgeDataArr[outputIndex + 1] = bgG;    
            edgeDataArr[outputIndex + 2] = bgB;    
            edgeDataArr[outputIndex + 3] = backgroundAlpha; 
        }
    }
    return edgeData;
}

// 偵測執行函式 (移除預處理高斯模糊邏輯)
function runDetectionForCanvas(canvasEl, ctxTarget, originalImgData, 
                                 cachedGray, cachedMagnitude, recalculatePreprocessing = true) {
    if (!originalImgData) return;
    
    const width = canvasEl.width;
    const height = canvasEl.height;
    
    const wR = parseFloat(redWeightSlider.value) / 100;
    const wG = parseFloat(greenWeightSlider.value) / 100;
    const wB = parseFloat(blueWeightSlider.value) / 100;
    const weights = [wR, wG, wB];
    
    // 後處理高斯模糊參數
    const postBlurEnabled = postBlurToggle.checked;
    const postBlurRadius = parseFloat(postBlurRadiusSlider.value);

    let currentGrayData = cachedGray;
    let currentMagnitudeData = cachedMagnitude;

    // 複製一份原始圖像數據，用於灰度化
    let currentImageDataForProcessing = new ImageData(new Uint8ClampedArray(originalImgData.data), width, height);

    // 只有灰度權重改變時才重新計算前處理
    if (recalculatePreprocessing || !currentGrayData || !currentMagnitudeData) {
        // 預處理高斯模糊已移除
        
        // 1. 灰度化 & 2. Sobel 偵測
        currentGrayData = applyGrayscale(currentImageDataForProcessing, weights);
        currentMagnitudeData = applySobel(currentGrayData, width, height);
    }
    
    // 3. 閾值化和著色 (產生最終線條圖)
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
    
    // 4. 應用後處理高斯模糊 (線條平滑)
    if (postBlurEnabled && postBlurRadius > 0) {
        finalImageData = applyGaussianFilter(finalImageData, postBlurRadius);
    }

    ctxTarget.putImageData(finalImageData, 0, 0);

    return { gray: currentGrayData, magnitude: currentMagnitudeData };
}

// 統籌函式 (當灰度權重改變時，需要重新計算 Sobel 梯度)
function runFullDetection() {
    if (!uploadedImage) return;

    // 清空所有快取，強制重新計算
    thumbnailCachedGrayData = null;
    thumbnailCachedMagnitudeData = null;
    fullSizeCachedGrayData = null;
    fullSizeCachedMagnitudeData = null;

    const thumbResult = runDetectionForCanvas(
        thumbnailCanvas, thumbnailCtx, thumbnailOriginalImageData, 
        thumbnailCachedGrayData, thumbnailCachedMagnitudeData, true 
    );
    if (thumbResult) {
        thumbnailCachedGrayData = thumbResult.gray;
        thumbnailCachedMagnitudeData = thumbResult.magnitude;
    }

    const fullResult = runDetectionForCanvas(
        fullSizeCanvas, fullSizeCtx, fullSizeOriginalImageData, 
        fullSizeCachedGrayData, fullSizeCachedMagnitudeData, true 
    );
    if (fullResult) {
        fullSizeCachedGrayData = fullResult.gray;
        fullSizeCachedMagnitudeData = fullResult.magnitude;
    }
}

// 統籌函式 (當閾值、顏色或後處理模糊參數改變時，只需重新應用閾值和著色，重用之前的灰度和梯度數據)
function updateColorAndThresholding() {
    if (!uploadedImage) return;
    
    const thumbResult = runDetectionForCanvas(
        thumbnailCanvas, thumbnailCtx, thumbnailOriginalImageData, 
        thumbnailCachedGrayData, thumbnailCachedMagnitudeData, false // 不重新計算前處理
    );
    if (thumbResult) {
        thumbnailCachedGrayData = thumbResult.gray;
        thumbnailCachedMagnitudeData = thumbResult.magnitude;
    }

    const fullResult = runDetectionForCanvas(
        fullSizeCanvas, fullSizeCtx, fullSizeOriginalImageData, 
        fullSizeCachedGrayData, fullSizeCachedMagnitudeData, false // 不重新計算前處理
    );
    if (fullResult) {
        fullSizeCachedGrayData = fullResult.gray;
        fullSizeCachedMagnitudeData = fullResult.magnitude;
    }
}

// --- 事件處理 ---

imageLoader.addEventListener('change', handleImage, false);
downloadThumbnailButton.addEventListener('click', () => downloadImage(thumbnailCanvas, 'thumbnail'), false);
downloadFullSizeButton.addEventListener('click', () => downloadImage(fullSizeCanvas, 'fullsize'), false);

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


// 圖片上傳處理 (未改變)
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
            [downloadThumbnailButton, downloadFullSizeButton, 
             postBlurToggle, postBlurRadiusSlider,
             redWeightSlider, greenWeightSlider, blueWeightSlider, 
             thresholdValueInput, lineColorPicker, lineAlphaSlider, 
             bgColorPicker, backgroundAlphaSlider].forEach(el => {
                el.disabled = false;
            });
            
            runFullDetection(); 
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

// 初始禁用控制項 (未改變)
[downloadThumbnailButton, downloadFullSizeButton, 
 postBlurToggle, postBlurRadiusSlider,
 redWeightSlider, greenWeightSlider, blueWeightSlider, 
 thresholdValueInput, lineColorPicker, lineAlphaSlider, 
 bgColorPicker, backgroundAlphaSlider].forEach(el => {
    el.disabled = true;
});

// 初始設定顯示值
postBlurRadiusDisplay.textContent = `${parseFloat(postBlurRadiusSlider.value).toFixed(1)} (關閉)`;
