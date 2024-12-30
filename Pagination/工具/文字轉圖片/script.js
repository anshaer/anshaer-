// 初始化畫布
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function drawText() {
    canvas.width = window.innerWidth * 0.95;
    canvas.height = 200;
    const text = textInput.value || '預覽文字';
    const font = fontSelect.value;
    const weight = fontWeight.value;
    const size = fontSize.value;
    const color = colorPicker.value;

    // 清除畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 設定文字樣式
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;

    // 繪製文字
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

// 為每個控制項綁定事件
textInput.addEventListener('input', drawText);
fontSelect.addEventListener('change', drawText);
fontWeight.addEventListener('change', drawText);
fontSize.addEventListener('input', drawText);
colorPicker.addEventListener('input', drawText);

// 初始化畫布
drawText();
