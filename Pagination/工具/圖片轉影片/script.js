const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

// UI 控制元素
const convertBtn = document.getElementById('convertBtn');
const statusDisplay = document.getElementById('statusDisplay');
const previewBox = document.getElementById('previewBox');
const videoPreview = document.getElementById('videoPreview');
const downloadLink = document.getElementById('downloadLink');

// 即時更新數值顯示
function updateVal(id) {
    const el = document.getElementById(id);
    const display = document.getElementById(id + 'Val');
    if (display) {
        display.innerText = el.value + (id.includes('pos') ? '%' : '');
    }
}

// 綁定滑桿事件
['fontSize', 'posX', 'posY'].forEach(id => {
    document.getElementById(id).oninput = () => updateVal(id);
});

// 顏色選擇器文字同步
document.getElementById('textColor').oninput = (e) => {
    document.getElementById('colorHex').innerText = e.target.value.toUpperCase();
};

// 影片合成核心逻辑
convertBtn.onclick = async () => {
    const uploader = document.getElementById('uploader');
    if (uploader.files.length === 0) return alert('請先選擇圖片');
    
    const file = uploader.files[0];
    const text = document.getElementById('videoText').value || ' ';
    const size = document.getElementById('fontSize').value;
    const color = document.getElementById('textColor').value;
    const xPct = document.getElementById('posX').value / 100;
    const yPct = document.getElementById('posY').value / 100;
    const h = document.getElementById('qualitySelect').value;

    convertBtn.disabled = true;
    
    try {
        if (!ffmpeg.isLoaded()) {
            statusDisplay.innerText = '⏳ 正在初始化引擎 (首次加載較久)...';
            await ffmpeg.load();
        }

        statusDisplay.innerText = '⏳ 正在下載中文字體...';
        const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf';
        ffmpeg.FS('writeFile', 'font.otf', await fetchFile(fontUrl));

        statusDisplay.innerText = '⏳ 正在讀取圖片...';
        ffmpeg.FS('writeFile', 'input.img', await fetchFile(file));

        statusDisplay.innerText = `🚀 影片合成中 (${h}p)... 請耐心等候`;
        
        // FFmpeg 指令解釋：
        // -loop 1: 重複圖片輸入
        // -t 3: 設定影片長度為 3 秒
        // -vf: 影片濾鏡 (縮放, 加入文字)
        // -pix_fmt yuv420p: 確保移動設備能播放
        await ffmpeg.run(
            '-loop', '1', '-i', 'input.img',
            '-t', '3',
            '-vf', `scale=-2:${h},drawtext=fontfile=font.otf:text='${text}':fontcolor=${color}:fontsize=${size}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=(w-tw)*${xPct}:y=(h-th)*${yPct}`,
            '-pix_fmt', 'yuv420p',
            'out.mp4'
        );

        statusDisplay.innerText = '⌛ 匯出影片檔案...';
        const data = ffmpeg.FS('readFile', 'out.mp4');
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
        
        // 更新顯示與下載連結
        previewBox.style.display = 'block';
        videoPreview.src = url;
        downloadLink.href = url;
        downloadLink.download = `video_watermark_${Date.now()}.mp4`;
        
        statusDisplay.innerText = '✅ 影片生成完成！';
        previewBox.scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        console.error(e);
        statusDisplay.innerText = '❌ 出錯了，請確保圖片格式正確並重新嘗試。';
    } finally {
        convertBtn.disabled = false;
    }
};
