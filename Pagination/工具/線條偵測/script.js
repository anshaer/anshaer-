// DOM 元素引用
const imageLoader = document.getElementById('imageLoader');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const detectLinesButton = document.getElementById('detectLinesButton');
const downloadButton = document.getElementById('downloadButton');

// 新的控制項
const redWeightSlider = document.getElementById('redWeight');
const greenWeightSlider = document.getElementById('greenWeight');
const blueWeightSlider = document.getElementById('blueWeight');
const redWeightValueDisplay = document.getElementById('redWeightValue');
const greenWeightValueDisplay = document.getElementById('greenWeightValue');
const blueWeightValueDisplay = document.getElementById('blueWeightValue');

const thresholdValueInput = document.getElementById('thresholdValueInput');
const thresholdValueDisplay = document.getElementById('thresholdValueDisplay');

const lineColorPicker = document.getElementById('lineColorPicker');
const bgColorPicker = document.getElementById('bgColorPicker');
const transparentBackgroundCheckbox = document.getElementById('transparentBackground');

let img = null; // 儲存上傳的圖片物件
let originalImageData = null; // 儲存原始圖片像素數據
let cachedGrayData = null; // 快取灰度數據
let cachedMagnitudeData = null; // 快取梯度數據

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

/**
 * 灰度化：根據權重將 RGB 數據轉換為灰度值
 * @param {ImageData} imageData - 原始圖片的 ImageData 物件
 * @param {number[]} weights - [R, G, B] 的浮點數權重陣列
 * @returns {Uint8ClampedArray} 單通道灰度數據
 */
function applyGrayscale(imageData, weights) {
    const data = imageData.data;
    const grayData = new Uint8ClampedArray(imageData.width * imageData.height);
    const [wR, wG, wB] = weights; // 權重

    for (let i = 0; i < data.length; i += 4) {
        // 加權平均計算灰度值
        const avg = wR * data[i] + wG * data[i + 1] + wB * data[i + 2];
        grayData[i / 4] = avg > 255 ? 255 : (avg < 0 ? 0 : avg);
    }
    return grayData;
}

/**
 * Sobel 邊緣偵測：從灰度數據計算梯度強度
 * @param {Uint8ClampedArray} grayData - 灰度數據
 * @param {number} width - 圖片寬度
 * @param {number} height - 圖片高度
 * @returns {Uint8ClampedArray} 梯度強度數據
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
            // 限制梯度強度在 0-255 範圍
            magnitudeData[index] = magnitude > 255 ? 255 : magnitude; 
        }
    }
    return magnitudeData;
}

/**
 * 閾值化和著色：根據梯度強度和閾值，設定線條或底色/透明
 * @param {Uint8ClampedArray} magnitudeData - 梯度強度數據
 * @param {number} width - 圖片寬度
 * @param {number} height - 圖片高度
 * @param {number} threshold - 閾值強度
 * @param {number[]} lineColor - 線條 RGB 顏色 [r, g, b]
 * @param {number[]} bgColor - 底色 RGB 顏色 [r, g, b]
 * @param {boolean} isTransparent - 底色是否透明
 * @returns {ImageData} 最終的輸出圖像數據
 */
function applyThresholdingAndColoring(magnitudeData, width, height, threshold, lineColor, bgColor, isTransparent) {
    const edgeData = ctx.createImageData(width, height);
    const edgeDataArr = edgeData.data;

    const [lineR, lineG, lineB] = lineColor;
    const [bgR, bgG, bgB] = bgColor;
    
    for (let i = 0; i < magnitudeData.length; i++) {
        const magnitude = magnitudeData[i];
        const outputIndex = i * 4;

        if (magnitude > threshold) {
            // 線條部分 (使用線條顏色)
            edgeDataArr[outputIndex]     = lineR; 
            edgeDataArr[outputIndex + 1] = lineG;
            edgeDataArr[outputIndex + 2] = lineB;
            edgeDataArr[outputIndex + 3] = 255;   // 完全不透明
        } else {
            // 底色部分 (使用底色或透明)
            if (isTransparent) {
                edgeDataArr[outputIndex]     = 0;     // R
                edgeDataArr[outputIndex + 1] = 0;     // G
                edgeDataArr[outputIndex + 2] = 0;     // B
                edgeDataArr[outputIndex + 3] = 0;     // Alpha = 0 (完全透明)
            } else {
                edgeDataArr[outputIndex]     = bgR;   // R
                edgeDataArr[outputIndex + 1] = bgG;   // G
                edgeDataArr[outputIndex + 2] = bgB;   // B
                edgeDataArr[outputIndex + 3] = 255;   // 完全不透明
            }
        }
    }
    return edgeData;
}


// --- 協調與繪製函式 ---

/**
 * 執行完整的偵測流程：灰度化 -> Sobel -> 閾值化和著色
 */
function runFullDetection() {
    if (!originalImageData) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // 1. 獲取灰度化權重
    const wR = parseFloat(redWeightSlider.value) / 100;
    const wG = parseFloat(greenWeightSlider.value) / 100;
    const wB = parseFloat(blueWeightSlider.value) / 100;
    
    // 2. 灰度化並快取
    cachedGrayData = applyGrayscale(originalImageData, [wR, wG, wB]);
    
    // 3. 邊緣偵測 (Sobel) 並快取
    cachedMagnitudeData = applySobel(cachedGrayData, width, height);
    
    // 4. 閾值化和著色
    updateColorAndThresholding();
}

/**
 * 僅執行閾值化和著色 (Sobel 數據不變時使用)
 */
function updateColorAndThresholding() {
     if (!cachedMagnitudeData) {
         // 如果還沒有梯度數據，則先執行一次完整的偵測
         runFullDetection();
         return;
     }

    const width = canvas.width;
    const height = canvas.height;
    
    // 獲取當前的閾值和顏色設定
    const threshold = parseInt(thresholdValueInput.value);
    const lineColor = hexToRgb(lineColorPicker.value);
    const bgColor = hexToRgb(bgColorPicker.value);
    const isTransparent = transparentBackgroundCheckbox.checked;

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
    ctx.putImageData(finalImageData, 0, 0);
}


// --- 事件處理與輔助函式 ---

// 圖片上傳處理
function handleImage(e) {
    const reader = new FileReader();
    reader.onload = function(event) {
        img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            // 獲取原始圖片的像素數據，供後續處理使用
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // 清空快取
            cachedGrayData = null; 
            cachedMagnitudeData = null;

            // 啟用控制項
            [detectLinesButton, downloadButton, redWeightSlider, greenWeightSlider, blueWeightSlider, 
             thresholdValueInput, lineColorPicker, bgColorPicker, transparentBackgroundCheckbox].forEach(el => {
                el.disabled = false;
            });
            
            // 執行一次完整的偵測作為預設結果
            runFullDetection();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
}

// 下載函式 (使用 PNG 支援透明度)
function downloadImage() {
    if (!img) return;
    
    const dataURL = canvas.toDataURL('image/png'); 
    
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'edge_detection_' + new Date().getTime() + '.png';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 事件監聽設定
imageLoader.addEventListener('change', handleImage, false);
detectLinesButton.addEventListener('click', runFullDetection, false);
downloadButton.addEventListener('click', downloadImage, false);

// 灰度化權重改變，需要重新計算 Sobel 
[redWeightSlider, greenWeightSlider, blueWeightSlider].forEach(slider => {
    slider.addEventListener('input', (e) => {
        // 更新顯示的權重值 (可以選擇是否強制總和為 1.00，這裡僅做展示更新)
        redWeightValueDisplay.textContent = (parseInt(redWeightSlider.value) / 100).toFixed(2);
        greenWeightValueDisplay.textContent = (parseInt(greenWeightSlider.value) / 100).toFixed(2);
        blueWeightValueDisplay.textContent = (parseInt(blueWeightSlider.value) / 100).toFixed(2);
        
        if (img) runFullDetection(); // 每次灰度權重調整都重新計算
    });
});

// 閾值化、顏色或透明度改變，僅需重新應用閾值化
[thresholdValueInput, lineColorPicker, bgColorPicker, transparentBackgroundCheckbox].forEach(control => {
    control.addEventListener('input', () => {
        if (control.id === 'thresholdValueInput') {
            thresholdValueDisplay.textContent = thresholdValueInput.value;
        }
        if (img) updateColorAndThresholding(); // 每次改變都重新繪製
    });
});


// 初始禁用控制項
[detectLinesButton, downloadButton, redWeightSlider, greenWeightSlider, blueWeightSlider, 
 thresholdValueInput, lineColorPicker, bgColorPicker, transparentBackgroundCheckbox].forEach(el => {
    el.disabled = true;
});
