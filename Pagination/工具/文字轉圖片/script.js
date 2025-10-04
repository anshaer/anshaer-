// 初始化畫布
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
// 取得控制項
const textInput = document.getElementById('textInput'); // 假設這些控制項 ID 在 HTML 中都有定義
const fontSelect = document.getElementById('fontSelect');
const fontWeight = document.getElementById('fontWeight');
const fontSize = document.getElementById('fontSize');
const colorPicker = document.getElementById('colorPicker');

// 取得下載按鈕
const downloadButton = document.getElementById('downloadButton');

function drawText() {
    // 為了下載的圖片清晰，將畫布寬度設為固定的
    // 這裡我們將寬度設為 800，跟 CSS 中的 `width: 800pt;` 類似
    canvas.width = 800; 
    canvas.height = 200;
    
    // ... (繪製邏輯保持不變)

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

// ----------------------
// 新增下載功能
// ----------------------
function downloadCanvas() {
    // 1. 將畫布內容轉換為圖片資料 (PNG 格式)
    const imageURL = canvas.toDataURL('image/png');

    // 2. 建立一個臨時的下載連結
    const link = document.createElement('a');
    link.href = imageURL;
    link.download = '文字轉圖片.png'; // 設定下載的檔案名稱

    // 3. 模擬點擊該連結以觸發下載
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 為下載按鈕綁定事件
downloadButton.addEventListener('click', downloadCanvas);

// 為每個控制項綁定事件
textInput.addEventListener('input', drawText);
fontSelect.addEventListener('change', drawText);
fontWeight.addEventListener('change', drawText);
fontSize.addEventListener('input', drawText);
colorPicker.addEventListener('input', drawText);

// 初始化畫布
drawText();
