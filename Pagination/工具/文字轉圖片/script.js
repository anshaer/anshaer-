// 初始化畫布
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// **********************************************
// 修正 1：宣告所有控制項的變數，確保程式碼能正確找到 HTML 元素
// **********************************************
const textInput = document.getElementById('textInput'); 
const fontSelect = document.getElementById('fontSelect');
const fontWeight = document.getElementById('fontWeight');
const fontSize = document.getElementById('fontSize');
const colorPicker = document.getElementById('colorPicker');
const downloadButton = document.getElementById('downloadButton');


function drawText() {
    // **********************************************
    // 修正 2：為了下載的圖片清晰，將畫布寬度設為固定的 800 像素
    // **********************************************
    canvas.width = 800; 
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


// ----------------------
// 下載功能 (保持不變，因為邏輯是正確的)
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
