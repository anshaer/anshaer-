// =================================================================
// 1. DOM 元素與狀態管理
// =================================================================

const elements = {}; // 存放所有 DOM 元素的物件
let img = null; // 儲存上傳的圖片物件
let originalImageData = null; // 儲存圖片在畫布上的初始像素數據 (已縮放)
let cachedGrayData = null; // 快取當前灰度化設定下的灰度數據
let cachedMagnitudeData = null; // 快取 Sobel 運算後的梯度強度數據
const MAX_CANVAS_WIDTH = 800; // 畫布最大寬度限制 (與 CSS 配合)

// =================================================================
// 2. 輔助函式
// =================================================================

/**
 * 將 HEX 顏色碼轉換為 RGB 陣列 [r, g, b]
 * @param {string} hex - #RRGGBB 格式的顏色碼
 * @returns {number[]} RGB 陣列
 */
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
 * 根據螢幕和最大限制，計算畫布的縮放尺寸
 * @param {number} originalWidth - 圖片原始寬度
 * @param {number} originalHeight - 圖片原始高度
 * @returns {{width: number, height: number}} 縮放後的尺寸
 */
function calculateCanvasSize(originalWidth, originalHeight) {
    const viewportWidth = window.innerWidth;
    // 考慮 CSS 樣式中的 5% 邊距
    const maxAllowableWidth = Math.min(MAX_CANVAS_WIDTH, viewportWidth * 0.95);

    if (originalWidth > maxAllowableWidth) {
        const scale = maxAllowableWidth / originalWidth;
        return {
            width: maxAllowableWidth,
            height: originalHeight * scale
        };
    }
    return { width: originalWidth, height: originalHeight };
}

// =================================================================
// 3. 核心圖像處理邏輯
// =================================================================

/**
 * 灰度化：根據權重將 RGB 數據轉換為灰度值
 */
function applyGrayscale(imageData, weights) {
    const data = imageData.data;
    const grayData = new new Uint8ClampedArray(imageData.width * imageData.height);
    const [wR, wG, wB] = weights;

    for (let i = 0; i < data.length; i += 4) {
        const avg = wR * data[i] + wG * data[i + 1] + wB * data[i + 2];
        grayData[i / 4] = avg > 255 ? 255 : (avg < 0 ? 0 : avg);
    }
    return grayData;
}

/**
 * Sobel 邊緣偵測：從灰度數據計算梯度強度
 */
function applySobel(grayData, width, height) {
    const magnitudeData = new Uint8ClampedArray(width * height);
    
    // Sobel 核心
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

/**
 * 閾值化和著色：根據梯度強度和閾值，設定線條或底色/透明
 */
function applyThresholdingAndColoring(magnitudeData, width, height, threshold, lineColor, bgColor, isTransparent) {
    const edgeData = elements.ctx.createImageData(width, height);
    const edgeDataArr = edgeData.data;

    const [lineR, lineG, lineB] = lineColor;
    const [bgR, bgG, bgB] = bgColor;
    
    for (let i = 0; i < magnitudeData.length; i++) {
        const magnitude = magnitudeData[i];
        const outputIndex = i * 4;

        if (magnitude > threshold) {
            // 線條部分
            edgeDataArr[outputIndex]     = lineR; 
            edgeDataArr[outputIndex + 1] = lineG;
            edgeDataArr[outputIndex + 2] = lineB;
            edgeDataArr[outputIndex + 3] = 255;
        } else {
            // 底色部分
            if (isTransparent) {
                edgeDataArr[outputIndex]     = 0;
                edgeDataArr[outputIndex + 1] = 0;
                edgeDataArr[outputIndex + 2] = 0;
                edgeDataArr[outputIndex + 3] = 0;     // Alpha = 0 (完全透明)
            } else {
                edgeDataArr[outputIndex]     = bgR;
                edgeDataArr[outputIndex + 1] = bgG;
                edgeDataArr[outputIndex + 2] = bgB;
                edgeDataArr[outputIndex + 3] = 255;   // 完全不透明
            }
        }
    }
    return edgeData;
}


// =================================================================
// 4. 流程控制函式
// =================================================================

/**
 * 執行完整的偵測流程：灰度化 -> Sobel -> 閾值化和著色
 * 在圖片載入或灰度權重改變時呼叫。
 */
function runFullDetection() {
    if (!originalImageData) return;
    
    const width = elements.canvas.width;
    const height = elements.canvas.height;
    
    // 1. 獲取灰度化權重 (轉換為 0.00-1.00)
    const wR = parseFloat(elements.redWeightSlider.value) / 100;
    const wG = parseFloat(elements.greenWeightSlider.value) / 100;
    const wB = parseFloat(elements.blueWeightSlider.value) / 100;
    
    // 2. 灰度化並快取
    cachedGrayData = applyGrayscale(originalImageData, [wR, wG, wB]);
    
    // 3. 邊緣偵測 (Sobel) 並快取
    cachedMagnitudeData = applySobel(cachedGrayData, width, height);
    
    // 4. 閾值化和著色
    updateColorAndThresholding();
}

/**
 * 僅執行閾值化和著色 (在閾值、顏色或透明度改變時呼叫)
 */
function updateColorAndThresholding() {
     if (!cachedMagnitudeData) {
         // 如果還沒有梯度數據，表示圖片尚未偵測過，執行一次完整的偵測
         runFullDetection();
         return;
     }

    const width = elements.canvas.width;
    const height = elements.canvas.height;
    
    // 獲取當前的閾值和顏色設定
    const threshold = parseInt(elements.thresholdValueInput.value);
    const lineColor = hexToRgb(elements.lineColorPicker.value);
    const bgColor = hexToRgb(elements.bgColorPicker.value);
    const isTransparent = elements.transparentBackgroundCheckbox.checked;

    // 執行閾值化和著色
    const finalImageData = applyThresholdingAndColoring(
        cachedMagnitudeData, 
        width, 
        height, 
        threshold, 
        lineColor, 
        bgColor, 
        isTransparent
    );
    
    // 繪製到畫布
    elements.ctx.putImageData(finalImageData, 0, 0);
}


// =================================================================
// 5. 事件處理器
// =================================================================

/**
 * 處理圖片上傳
 */
function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        img = new Image();
        img.onload = function() {
            // 1. 計算縮放尺寸
            const { width, height } = calculateCanvasSize(img.width, img.height);

            // 2. 設定畫布尺寸並繪圖
            elements.canvas.width = width;
            elements.canvas.height = height;
            elements.ctx.drawImage(img, 0, 0, width, height); 

            // 3. 獲取初始像素數據 (縮放後)
            originalImageData = elements.ctx.getImageData(0, 0, width, height);
            
            // 4. 清空快取
            cachedGrayData = null; 
            cachedMagnitudeData = null;

            // 5. 啟用控制項
            toggleControls(false);
            
            // 6. 執行預設偵測
            runFullDetection();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
}

/**
 * 處理灰度權重滑動條的輸入事件
 */
function handleGrayscaleInput() {
    // 更新顯示的權重值
    elements.redWeightValueDisplay.textContent = (parseInt(elements.redWeightSlider.value) / 100).toFixed(2);
    elements.greenWeightValueDisplay.textContent = (parseInt(elements.greenWeightSlider.value) / 100).toFixed(2);
    elements.blueWeightValueDisplay.textContent = (parseInt(elements.blueWeightSlider.value) / 100).toFixed(2);
    
    if (img) runFullDetection(); // 灰度權重改變，必須重新執行完整的偵測
}

/**
 * 處理閾值、顏色或透明度控制項的輸入事件
 */
function handleThresholdColorInput(e) {
    if (e.target.id === 'thresholdValueInput') {
        elements.thresholdValueDisplay.textContent = e.target.value;
    }
    if (img) updateColorAndThresholding(); // 僅改變最終顯示效果，只需重新應用閾值化
}

/**
 * 下載畫布圖片為 PNG
 */
function downloadImage() {
    if (!img || elements.downloadButton.disabled) {
        alert("請先上傳圖片並完成偵測。");
        return;
    }
    
    const dataURL = elements.canvas.toDataURL('image/png'); 
    
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `edge_detection_${new Date().getTime()}.png`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * 啟用/禁用所有控制項
 * @param {boolean} disabled - 是否禁用 (true) 或啟用 (false)
 */
function toggleControls(disabled) {
    const controls = [
        elements.detectLinesButton, elements.downloadButton, elements.redWeightSlider, 
        elements.greenWeightSlider, elements.blueWeightSlider, elements.thresholdValueInput, 
        elements.lineColorPicker, elements.bgColorPicker, elements.transparentBackgroundCheckbox
    ];
    controls.forEach(el => {
        if (el) el.disabled = disabled;
    });
}

// =================================================================
// 6. 初始化
// =================================================================

/**
 * 獲取所有 DOM 元素並設置事件監聽
 */
function init() {
    // 獲取 DOM 元素
    elements.canvas = document.getElementById('imageCanvas');
    elements.ctx = elements.canvas.getContext('2d');
    elements.imageLoader = document.getElementById('imageLoader');
    elements.detectLinesButton = document.getElementById('detectLinesButton');
    elements.downloadButton = document.getElementById('downloadButton');
    
    elements.redWeightSlider = document.getElementById('redWeight');
    elements.greenWeightSlider = document.getElementById('greenWeight');
    elements.blueWeightSlider = document.getElementById('blueWeight');
    elements.redWeightValueDisplay = document.getElementById('redWeightValue');
    elements.greenWeightValueDisplay = document.getElementById('greenWeightValue');
    elements.blueWeightValueDisplay = document.getElementById('blueWeightValue');
    
    elements.thresholdValueInput = document.getElementById('thresholdValueInput');
    elements.thresholdValueDisplay = document.getElementById('thresholdValueDisplay');

    elements.lineColorPicker = document.getElementById('lineColorPicker');
    elements.bgColorPicker = document.getElementById('bgColorPicker');
    elements.transparentBackgroundCheckbox = document.getElementById('transparentBackground');

    // 設定初始狀態（禁用所有控制項直到圖片上傳）
    toggleControls(true);

    // 設定事件監聽
    elements.imageLoader.addEventListener('change', handleImage, false);
    elements.detectLinesButton.addEventListener('click', runFullDetection, false);
    elements.downloadButton.addEventListener('click', downloadImage, false);

    // 灰度化權重改變
    [elements.redWeightSlider, elements.greenWeightSlider, elements.blueWeightSlider].forEach(slider => {
        slider.addEventListener('input', handleGrayscaleInput);
    });

    // 閾值化、顏色或透明度改變
    [elements.thresholdValueInput, elements.lineColorPicker, elements.bgColorPicker, elements.transparentBackgroundCheckbox].forEach(control => {
        control.addEventListener('input', handleThresholdColorInput);
    });

    // 處理視窗大小改變時，如果圖片已載入，重新調整畫布大小 (可選，但響應式設計建議)
    window.addEventListener('resize', () => {
        if (img) {
            // 由於調整畫布會清空內容，這裡只處理寬度
            const { width, height } = calculateCanvasSize(img.width, img.height);
            if (elements.canvas.width !== width) {
                // 如果偵測結果存在，則嘗試重新繪製
                if (cachedMagnitudeData) {
                    // 需要將當前畫布內容備份，調整大小，再繪製回來
                    // 為了簡化，這裡在 resize 時不做複雜的重繪，只在圖片上傳時處理響應式
                    // 如果用戶在手機上調整方向，需要重新載入或執行一次 runFullDetection
                }
            }
        }
    });
}

// 網頁載入完成後執行初始化
document.addEventListener('DOMContentLoaded', init);
