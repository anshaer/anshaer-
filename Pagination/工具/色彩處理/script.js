// 獲取 DOM 元素
const uploadInput = document.getElementById('image-upload');
const canvas = document.getElementById('image-canvas');
const ctx = canvas.getContext('2d');
const colorButtons = document.querySelectorAll('.preset-color-button');
const customColorPicker = document.getElementById('custom-color-picker');
const customColorButton = document.getElementById('custom-color-button');
const downloadButton = document.getElementById('download-button');
const invertLuminosityButton = document.getElementById('invert-luminosity-button');
const resetButton = document.getElementById('reset-button');

// 核心數據儲存：
let originalImageData = null; // 原始圖片數據 (永不變動)
let currentImageData = null;  // 當前畫布上的圖片數據 (每次操作都會更新)

// ----------------------
// 輔助函數: 16進制顏色轉RGB陣列
// ----------------------
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}

// ----------------------
// 核心功能 1: 顏色替換 (保持紋路)
// ----------------------
function replaceColor(newColorRgb, inputData) {
    if (!inputData) return;
    
    const outputData = ctx.createImageData(inputData.width, inputData.height);
    outputData.data.set(inputData.data);

    const data = outputData.data;
    const targetR = newColorRgb[0];
    const targetG = newColorRgb[1];
    const targetB = newColorRgb[2];
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Rec. 709 亮度計算：L = 0.2126*R + 0.7152*G + 0.0722*B
        const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const alpha = L / 255; // 亮度比例
        
        // 應用亮度比例到目標顏色，保持紋路
        data[i]     = targetR * alpha; 
        data[i + 1] = targetG * alpha; 
        data[i + 2] = targetB * alpha; 
    }
    return outputData;
}

// ----------------------
// 核心功能 2: 反轉紋路 (Invert Luminosity)
// ----------------------
function invertLuminosity(inputData) {
    if (!inputData) return;

    const outputData = ctx.createImageData(inputData.width, inputData.height);
    outputData.data.set(inputData.data);

    const data = outputData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 步驟 1: 計算原始像素的亮度 (Luminosity)
        const L_orig = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        
        // 步驟 2: 計算反轉後的亮度比例
        const alpha_inverted = 1 - (L_orig / 255); 
        
        // 步驟 3: 計算原始像素的顏色比例 (用於保留色相)
        const color_factor_r = r / 255;
        const color_factor_g = g / 255;
        const color_factor_b = b / 255;

        // 步驟 4: 用反轉後的亮度比例，調整原始顏色
        data[i]     = color_factor_r * (255 * alpha_inverted); 
        data[i + 1] = color_factor_g * (255 * alpha_inverted); 
        data[i + 2] = color_factor_b * (255 * alpha_inverted);
    }

    return outputData;
}

// ----------------------
// 繪製函數：將數據繪製到畫布並更新 currentImageData
// ----------------------
function drawAndUpdate(imageData) {
    ctx.putImageData(imageData, 0, 0);
    currentImageData = imageData; // 更新當前狀態
}

// ----------------------
// 事件處理函數
// ----------------------

// 1. 上傳圖片 (初始化)
uploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // 初始化 originalImageData 和 currentImageData
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            currentImageData = originalImageData; 

            // 啟用所有控制按鈕
            document.querySelectorAll('.action-button').forEach(btn => btn.disabled = false);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

// 2. 重置圖像
resetButton.addEventListener('click', () => {
    if (originalImageData) {
        drawAndUpdate(originalImageData); 
    }
});

// 3. 紋路反轉
invertLuminosityButton.addEventListener('click', () => {
    if (currentImageData) {
        const newData = invertLuminosity(currentImageData);
        drawAndUpdate(newData);
    }
});

// 4. 預設顏色替換
colorButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (currentImageData) {
            // 從 data-rgb 屬性獲取目標顏色
            const rgbString = button.dataset.rgb;
            const rgbArray = rgbString.split(',').map(s => parseInt(s.trim()));
            
            // 將操作應用到當前圖像
            const newData = replaceColor(rgbArray, currentImageData);
            drawAndUpdate(newData);
        }
    });
});

// 5. 自訂顏色替換
customColorButton.addEventListener('click', () => {
    if (currentImageData) {
        const hex = customColorPicker.value;
        const rgbArray = hexToRgb(hex);
        const newData = replaceColor(rgbArray, currentImageData);
        drawAndUpdate(newData);
    }
});

// 6. 下載畫布圖片
downloadButton.addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'processed_image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});