// worker.js
// 這是一個獨立的執行緒，無法直接操作 DOM 元素或 canvas。

// 輔助函式 (與 script.js 相同)
function hexToRgb(hex) { /* ... 保持不變 ... */ }
// ... (將 script.js 中的 hexToRgb 函式內容複製到這裡)
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


// 核心處理函式 (與 script.js 相同)
// 1. 高斯模糊
function applyGaussianFilter(imageData, radius) {
    // ... (將 script.js 中的 applyGaussianFilter 函式內容複製到這裡)
    if (radius <= 0) return imageData;

    const width = imageData.width;
    const height = imageData.height;
    const data = new Uint8ClampedArray(imageData.data); // 複製一份數據進行操作
    const blurredData = new Uint8ClampedArray(imageData.data); // 輸出數據

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

    // 垂直方向模糊
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
    // ... (將 script.js 中的 applyGrayscale 函式內容複製到這裡)
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
    // ... (將 script.js 中的 applySobel 函式內容複製到這裡)
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


// 4. 滯後閾值
function applyHysteresisThresholding(magnitudeData, width, height, highThreshold, lowThreshold) {
    // ... (將 script.js 中的 applyHysteresisThresholding 函式內容複製到這裡)
    const outputEdges = new Uint8ClampedArray(width * height);
    const strong = 255;
    const weak = 100;
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
                        queue.push(neighborIndex);
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

    return outputEdges;
}


// 5. 著色
function applyThresholdingAndColoring(
    magnitudeData, 
    width, 
    height, 
    thresholdParams, // 將所有閾值和顏色參數包裝成一個物件傳入
    precalculatedEdgeMap // 處理後的二值化邊緣圖（僅在顏色更新時傳入）
) {
    const { 
        useHysteresis, highThreshold, lowThreshold, singleThreshold,
        lineColor, lineAlpha, bgColor, backgroundAlpha,
        useFeathering, featheringStrength 
    } = thresholdParams;
    
    // 輸出最終的圖像數據 (RGBA)
    const outputDataArray = new Uint8ClampedArray(width * height * 4);
    let finalEdgeMap = precalculatedEdgeMap;

    if (!finalEdgeMap) {
        // 第一次計算時才進行複雜的閾值處理
        if (useHysteresis) {
            finalEdgeMap = applyHysteresisThresholding(magnitudeData, width, height, highThreshold, lowThreshold);
        } else {
            finalEdgeMap = new Uint8ClampedArray(width * height);
            for (let i = 0; i < magnitudeData.length; i++) {
                finalEdgeMap[i] = magnitudeData[i] > singleThreshold ? 255 : 0;
            }
        }
    }

    for (let i = 0; i < magnitudeData.length; i++) {
        const outputIndex = i * 4;

        if (finalEdgeMap[i] === 255) { // 是邊緣
            outputDataArray[outputIndex]     = lineColor[0];  
            outputDataArray[outputIndex + 1] = lineColor[1];
            outputDataArray[outputIndex + 2] = lineColor[2];

            if (useFeathering) {
                const originalMagnitude = magnitudeData[i];
                const normalizedMagnitude = originalMagnitude / 255; 
                // 柔化計算：強度越強，越趨近原始梯度
                const featheredAlpha = lineAlpha * (normalizedMagnitude * featheringStrength + (1 - featheringStrength));
                outputDataArray[outputIndex + 3] = Math.min(255, featheredAlpha);
            } else {
                outputDataArray[outputIndex + 3] = lineAlpha;
            }

        } else { // 背景
            outputDataArray[outputIndex]     = bgColor[0];    
            outputDataArray[outputIndex + 1] = bgColor[1];    
            outputDataArray[outputIndex + 2] = bgColor[2];    
            outputDataArray[outputIndex + 3] = backgroundAlpha;
        }
    }
    
    // 將結果（包含新的圖像數據、灰度數據和梯度數據）傳回主執行緒
    return {
        imageDataArray: outputDataArray,
        finalEdgeMap: finalEdgeMap
    };
}


// Web Worker 監聽函式
self.onmessage = function(e) {
    const { 
        id, 
        type, 
        imageData, 
        weights, 
        gaussianRadius,
        cachedGrayData,
        cachedMagnitudeData,
        thresholdParams,
        precalculatedEdgeMap // 僅在 TYPE_COLOR_UPDATE 時傳入
    } = e.data;
    
    const width = imageData.width;
    const height = imageData.height;

    let currentImageData = imageData;
    let grayData = cachedGrayData;
    let magnitudeData = cachedMagnitudeData;
    
    let result = {};

    try {
        if (type === 'TYPE_FULL_RECALCULATION') {
            // 步驟 1: 高斯模糊
            currentImageData = applyGaussianFilter(currentImageData, gaussianRadius);
            
            // 步驟 2: 灰度化
            grayData = applyGrayscale(currentImageData, weights);
            
            // 步驟 3: Sobel 偵測
            magnitudeData = applySobel(grayData, width, height);

            // 步驟 4 & 5: 閾值化和著色
            const coloringResult = applyThresholdingAndColoring(
                magnitudeData, width, height, thresholdParams
            );
            
            result = {
                imageDataArray: coloringResult.imageDataArray,
                grayData: grayData,
                magnitudeData: magnitudeData,
                finalEdgeMap: coloringResult.finalEdgeMap
            };
            
        } else if (type === 'TYPE_COLOR_UPDATE') {
             // 只需要步驟 4 & 5: 閾值化和著色
            const coloringResult = applyThresholdingAndColoring(
                magnitudeData, width, height, thresholdParams, precalculatedEdgeMap
            );
            
            result = {
                imageDataArray: coloringResult.imageDataArray,
                finalEdgeMap: coloringResult.finalEdgeMap // 即使只是顏色更新，也回傳新的 Edge Map，因為閾值可能變了
            };
        }
        
        // 使用 postMessage 將結果傳回主執行緒
        // 使用 Transferable Objects 傳輸 ArrayBuffer，以提高性能
        self.postMessage({ id, result, success: true }, [result.imageDataArray.buffer]);

    } catch (error) {
        self.postMessage({ id, error: error.message, success: false });
    }
};
