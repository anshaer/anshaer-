const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

// 全域變數存儲生成的影片檔案
let currentVideoFile = null;

// UI 元素
const convertBtn = document.getElementById('convertBtn');
const shareBtn = document.getElementById('shareBtn');
const statusDisplay = document.getElementById('statusDisplay');
const previewBox = document.getElementById('previewBox');
const videoPreview = document.getElementById('videoPreview');
const downloadLink = document.getElementById('downloadLink');

// --- UI 事件處理 ---

function updateVal(id) {
    const el = document.getElementById(id);
    const display = document.getElementById(id + 'Val');
    if (display) display.innerText = el.value + (id.includes('pos') ? '%' : '');
}

['fontSize', 'posX', 'posY'].forEach(id => {
    document.getElementById(id).oninput = () => updateVal(id);
});

document.getElementById('textColor').oninput = (e) => {
    document.getElementById('colorHex').innerText = e.target.value.toUpperCase();
};

// --- 核心功能：生成影片 ---

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
    previewBox.style.display = 'none';
    
    try {
        if (!ffmpeg.isLoaded()) {
            statusDisplay.innerText = '⏳ 正在初始化引擎...';
            await ffmpeg.load();
        }

        statusDisplay.innerText = '⏳ 正在準備字體與檔案...';
        const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf';
        
        // 並行處理字體與圖片載入
        const [fontData, imageData] = await Promise.all([
            fetchFile(fontUrl),
            fetchFile(file)
        ]);

        ffmpeg.FS('writeFile', 'font.otf', fontData);
        ffmpeg.FS('writeFile', 'input.img', imageData);

        statusDisplay.innerText = `🚀 影片合成中 (${h}p)...`;
        
        await ffmpeg.run(
            '-loop', '1', '-i', 'input.img',
            '-t', '3',
            '-vf', `scale=-2:${h},drawtext=fontfile=font.otf:text='${text}':fontcolor=${color}:fontsize=${size}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=(w-tw)*${xPct}:y=(h-th)*${yPct}`,
            '-pix_fmt', 'yuv420p',
            'out.mp4'
        );

        statusDisplay.innerText = '⌛ 處理完成，準備預覽...';
        const data = ffmpeg.FS('readFile', 'out.mp4');
        
        // 建立 Blob 與 URL
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(videoBlob);
        
        // 封裝成 File 物件供 Web Share API 使用
        currentVideoFile = new File([videoBlob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });

        // 更新 UI
        videoPreview.src = url;
        downloadLink.href = url;
        downloadLink.download = `watermark_video.mp4`;
        previewBox.style.display = 'block';
        
        statusDisplay.innerText = '✅ 生成完成！';
        previewBox.scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        console.error(e);
        statusDisplay.innerText = '❌ 發生錯誤，請重整網頁後再試。';
    } finally {
        convertBtn.disabled = false;
    }
};

// --- 核心功能：分享功能 ---

shareBtn.onclick = async () => {
    if (!currentVideoFile) return;

    const watermarkText = document.getElementById('videoText').value;
    const shareData = {
        title: '我的作品',
        text: `這是我的作品：${watermarkText}`, // 分享時帶入浮水印文字
        files: [currentVideoFile]
    };

    if (navigator.canShare && navigator.canShare({ files: [currentVideoFile] })) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            if (err.name !== 'AbortError') {
                alert('分享失敗。');
            }
        }
    } else {
        alert('您的瀏覽器不支援檔案分享功能，請手動下載。');
    }
};
