const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

let currentVideoFile = null;

// UI 元素
const convertBtn = document.getElementById('convertBtn');
const shareBtn = document.getElementById('shareBtn');
const statusDisplay = document.getElementById('statusDisplay');
const previewBox = document.getElementById('previewBox');
const videoPreview = document.getElementById('videoPreview');
const downloadLink = document.getElementById('downloadLink');

// --- UI 即時顯示 ---
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

// --- 核心功能 ---

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

        statusDisplay.innerText = '⏳ 處理素材中...';
        const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf';
        const [fontData, imageData] = await Promise.all([
            fetchFile(fontUrl),
            fetchFile(file)
        ]);

        ffmpeg.FS('writeFile', 'font.otf', fontData);
        ffmpeg.FS('writeFile', 'input.img', imageData);

        // A. 基礎濾鏡：圖片縮放 + 主浮水印
        let filter = `scale=-2:${qualityH},drawtext=fontfile=font.otf:text='${mainText}':fontcolor=${mainColor}:fontsize=${mainSize}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=(w-tw)*${xPct}:y=(h-th)*${yPct}`;

        // B. 解析並生成自定義彈幕
        danmakuLines.forEach((line, index) => {
            // 解析格式: "文字,時間,位置"
            const parts = line.split(',');
            const content = parts[0].trim().replace(/'/g, "\u2019");
            
            // 如果沒給時間或位置，則使用自動分配
            const startTime = parts[1] ? parseFloat(parts[1]) : (index * 0.4);
            const lane = parts[2] ? parseInt(parts[2]) : ((index % 8) + 1);
            
            // 計算 Y 座標 (畫面均分 10 份軌道)
            const yPos = `(h/11)*${lane}`;
            
            // 動態 X 座標公式
            // w = 起點寬度, t = 當前秒數, startTime = 延遲開始, danmakuSpeed = 像素/秒
            const xMove = `w-(t-${startTime})*${danmakuSpeed}`;

            // 疊加濾鏡 (限制在時間到達後才顯示 drawtext)
            // 使用 enable='gt(t,startTime)' 確保文字不會在開始前擠在螢幕右側
            filter += `,drawtext=fontfile=font.otf:text='${content}':fontcolor=white:fontsize=36:shadowcolor=black@0.4:shadowx=1:shadowy=1:x=${xMove}:y=${yPos}:enable='gt(t,${startTime})'`;
        });

        statusDisplay.innerText = '🚀 影片合成中...';

        await ffmpeg.run(
            '-loop', '1', 
            '-i', 'input.img',
            '-t', '3', 
            '-vf', filter,
            '-pix_fmt', 'yuv420p',
            '-vcodec', 'libx264',
            'out.mp4'
        );

        const data = ffmpeg.FS('readFile', 'out.mp4');
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(videoBlob);
        
        currentVideoFile = new File([videoBlob], `danmaku_${Date.now()}.mp4`, { type: 'video/mp4' });
        videoPreview.src = url;
        downloadLink.href = url;
        downloadLink.download = `3s_video.mp4`;
        previewBox.style.display = 'block';
        
        statusDisplay.innerText = '✅ 生成成功！';
    } catch (e) {
        console.error(e);
        statusDisplay.innerText = '❌ 發生錯誤，請重整頁面。';
    } finally {
        convertBtn.disabled = false;
    }
};

// 分享功能
shareBtn.onclick = async () => {
    if (!currentVideoFile) return;
    if (navigator.canShare && navigator.canShare({ files: [currentVideoFile] })) {
        try {
            await navigator.share({
                title: '我的作品',
                files: [currentVideoFile]
            });
        } catch (err) {
            if (err.name !== 'AbortError') alert('分享失敗。');
        }
    } else {
        alert('請點擊下載按鈕保存影片。');
    }
};
