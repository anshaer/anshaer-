const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

// 全域變數
let currentVideoFile = null;

// UI 元素
const convertBtn = document.getElementById('convertBtn');
const shareBtn = document.getElementById('shareBtn');
const statusDisplay = document.getElementById('statusDisplay');
const previewBox = document.getElementById('previewBox');
const videoPreview = document.getElementById('videoPreview');
const downloadLink = document.getElementById('downloadLink');

// --- 1. UI 滑桿數值即時顯示 ---

function updateVal(id) {
    const el = document.getElementById(id);
    const display = document.getElementById(id + 'Val');
    if (display) {
        if (id === 'danmakuSpeed') {
            const speed = parseInt(el.value);
            display.innerText = speed < 300 ? '慢' : (speed < 550 ? '中' : '快');
        } else {
            display.innerText = el.value + (id.includes('pos') ? '%' : '');
        }
    }
}

['fontSize', 'posX', 'posY', 'danmakuSpeed'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = () => updateVal(id);
});

document.getElementById('textColor').oninput = (e) => {
    document.getElementById('colorHex').innerText = e.target.value.toUpperCase();
};

// --- 2. 核心功能：生成彈幕影片 ---

convertBtn.onclick = async () => {
    const uploader = document.getElementById('uploader');
    if (uploader.files.length === 0) return alert('請先選擇圖片');

    const file = uploader.files[0];
    const mainText = document.getElementById('videoText').value || ' ';
    const mainSize = document.getElementById('fontSize').value;
    const mainColor = document.getElementById('textColor').value;
    const xPct = document.getElementById('posX').value / 100;
    const yPct = document.getElementById('posY').value / 100;
    const qualityH = document.getElementById('qualitySelect').value;

    // 彈幕解析
    const danmakuRaw = document.getElementById('danmakuText').value;
    const danmakuLines = danmakuRaw.split('\n').filter(line => line.trim() !== '');
    const danmakuSpeed = document.getElementById('danmakuSpeed').value;

    convertBtn.disabled = true;
    previewBox.style.display = 'none';

    try {
        if (!ffmpeg.isLoaded()) {
            statusDisplay.innerText = '⏳ 正在啟動 FFmpeg 引擎...';
            await ffmpeg.load();
        }

        statusDisplay.innerText = '⏳ 載入素材中...';
        const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf';
        
        const [fontData, imageData] = await Promise.all([
            fetchFile(fontUrl),
            fetchFile(file)
        ]);

        ffmpeg.FS('writeFile', 'font.otf', fontData);
        ffmpeg.FS('writeFile', 'input.img', imageData);

        // --- 構建 FFmpeg 濾鏡 (Video Filter) ---
        // A. 基礎：縮放圖片 + 主浮水印
        let filter = `scale=-2:${qualityH},drawtext=fontfile=font.otf:text='${mainText}':fontcolor=${mainColor}:fontsize=${mainSize}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=(w-tw)*${xPct}:y=(h-th)*${yPct}`;

        // B. 疊加彈幕：每行文字轉為一個 drawtext 濾鏡
        danmakuLines.forEach((line, index) => {
            // 隨機軌道 (1~9)，避免彈幕重疊
            const lane = (index % 9) + 1;
            const yPos = `(h/11)*${lane}`; 
            
            // 延遲出現時間 (秒)
            const delay = index * 0.4; 
            
            // 運動公式：x = 畫布寬 - (時間-延遲)*速度
            // 當 t < delay 時，x 會在畫布外；當 t > delay 時開始向左移動
            const xMove = `w-(t-${delay.toFixed(1)})*${danmakuSpeed}`;
            
            // 轉義單引號防止指令中斷
            const safeLine = line.replace(/'/g, "\u2019");

            filter += `,drawtext=fontfile=font.otf:text='${safeLine}':fontcolor=white:fontsize=36:shadowcolor=black@0.5:shadowx=1:shadowy=1:x=${xMove}:y=${yPos}`;
        });

        statusDisplay.innerText = `🚀 影片合成中 (畫質: ${qualityH}p)...`;

        await ffmpeg.run(
            '-loop', '1', 
            '-i', 'input.img',
            '-t', '3', // 影片長度 3 秒
            '-vf', filter,
            '-pix_fmt', 'yuv420p',
            '-vcodec', 'libx264',
            'out.mp4'
        );

        statusDisplay.innerText = '⌛ 處理完畢，正在準備預覽...';
        
        const data = ffmpeg.FS('readFile', 'out.mp4');
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(videoBlob);
        
        // 封裝供分享使用
        currentVideoFile = new File([videoBlob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });

        // 更新預覽區
        videoPreview.src = url;
        downloadLink.href = url;
        downloadLink.download = `watermark_danmaku.mp4`;
        previewBox.style.display = 'block';
        
        statusDisplay.innerText = '✅ 生成成功！';
        previewBox.scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        console.error(e);
        statusDisplay.innerText = '❌ 發生錯誤，請重整頁面後重試。';
    } finally {
        convertBtn.disabled = false;
    }
};

// --- 3. 分享功能 ---

shareBtn.onclick = async () => {
    if (!currentVideoFile) return;

    if (navigator.canShare && navigator.canShare({ files: [currentVideoFile] })) {
        try {
            await navigator.share({
                title: '我的彈幕影片',
                text: '看我做的 3 秒彈幕影片！',
                files: [currentVideoFile]
            });
        } catch (err) {
            if (err.name !== 'AbortError') alert('分享失敗。');
        }
    } else {
        alert('您的瀏覽器/系統不支援直接分享檔案，請使用下載按鈕。');
    }
};
