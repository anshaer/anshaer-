const blocksToChange = [1, 3, 6, 8, 9, 11, 14, 16];
const otherBlocks = [2, 4, 5, 7, 10, 12, 13, 15];
const blockElements = Array.from(document.querySelectorAll('.grid-item'));
let colorIntervalId, moveIntervalId;
let rgb = [0, 0, 0];
let isPaused = false;

// 計算對比色
function getContrastColor(r, g, b) {
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? 'black' : 'white';
}

// 更新區塊顏色和對比色
function updateBlockColor(blockId, r, g, b) {
    const block = document.getElementById(`block${blockId}`);
    const rgbStr = `rgb(${r}, ${g}, ${b})`;
    block.style.backgroundColor = rgbStr;
    block.textContent = `${blockId}\n${rgbStr}`;
    block.style.color = getContrastColor(r, g, b);
}

// 開始顏色循環
function startCycle() {
    colorIntervalId = setInterval(() => {
        blocksToChange.forEach(blockId => {
            updateBlockColor(blockId, ...rgb);
        });
        updateOtherBlocks();

        rgb[0] += 1;
        if (rgb[0] > 255) {
            rgb[0] = 0;
            rgb[1] += 1;
            if (rgb[1] > 255) {
                rgb[1] = 0;
                rgb[2] += 1;
                if (rgb[2] > 255) {
                    clearInterval(colorIntervalId);
                }
            }
        }
    }, 20);
}

// 更新其他區塊顏色
function updateOtherBlocks() {
    const contrastRGB = rgb.map(c => 255 - c);
    otherBlocks.forEach(blockId => {
        updateBlockColor(blockId, ...contrastRGB);
    });
}

// 隨機移動圓形
function moveCircle(circleId, blockIndex) {
    const circle = document.getElementById(circleId);
    const block = blockElements[blockIndex];
    const rect = block.getBoundingClientRect();
    const parentRect = document.querySelector('.grid-container').getBoundingClientRect();

    const x = rect.left - parentRect.left + Math.random() * (rect.width - 50);
    const y = rect.top - parentRect.top + Math.random() * (rect.height - 50);

    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
}

function startMovingCircles() {
    moveIntervalId = setInterval(() => {
        moveCircle('circle1', Math.floor(Math.random() * 16));
        moveCircle('circle2', Math.floor(Math.random() * 16));
        moveCircle('circle3', blocksToChange[Math.floor(Math.random() * blocksToChange.length)] - 1);
        moveCircle('circle4', otherBlocks[Math.floor(Math.random() * otherBlocks.length)] - 1);
    }, 1000); // 每秒移動一次
}

// 開始按鈕
document.getElementById('start-btn').addEventListener('click', () => {
    if (!isPaused) {
        startCycle();
        startMovingCircles();
    }
    isPaused = false;
});

// 暫停按鈕
document.getElementById('pause-btn').addEventListener('click', () => {
    clearInterval(colorIntervalId);  // 暫停顏色變化
    clearInterval(moveIntervalId);   // 暫停圓形移動
    isPaused = true;
});

// 色盤1的選擇事件
document.getElementById('color-picker1').addEventListener('input', (e) => {
    const color = e.target.value;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    blocksToChange.forEach(blockId => {
        updateBlockColor(blockId, r, g, b);
    });
});

// 色盤2的選擇事件
document.getElementById('color-picker2').addEventListener('input', (e) => {
    const color = e.target.value;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    otherBlocks.forEach(blockId => {
        updateBlockColor(blockId, r, g, b);
    });
});
