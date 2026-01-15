const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

let currentVideoFile = null;

const convertBtn = document.getElementById('convertBtn');
const statusDisplay = document.getElementById('statusDisplay');
const previewBox = document.getElementById('previewBox');
const videoPreview = document.getElementById('videoPreview');
const downloadLink = document.getElementById('downloadLink');
const danmakuInput = document.getElementById('danmakuText');

// UI 數值顯示與同步
function updateVal(id) {
    const el = document.getElementById(id);
    const display = document.getElementById(id + 'Val');
    if (!display) return;
    
    if (id === 'danmakuSpeed') {
        const val = parseInt(el.value);
        display.innerText = val < 350 ? '慢' : (val < 600 ? '中' : '快');
    } else if (id === 'preStartOffset') {
        const val = parseFloat(el.value);
        display.innerText = val === 0 ? '無' : val + 's';
    } else {
        display.innerText = el.value + (id.includes('pos') ? '%' : '');
    }
}

['fontSize', 'posX', 'posY', 'danmakuSpeed', 'preStartOffset'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = () => updateVal(id);
});

document.getElementById('textColor').oninput = (e) => {
    document.getElementById('colorHex').innerText = e.target.value.toUpperCase();
};

// 影片生成
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
    const danmakuSpeed = document.getElementById('danmakuSpeed').value;
    const preOffset = parseFloat(document.getElementById('preStartOffset').value);

    const danmakuLines = danmakuInput.value.split('\n').filter(l => l.trim() !== '').slice(0, 100);

    convertBtn.disabled = true;
    previewBox.style.display = 'none';

    try {
        if (!ffmpeg.isLoaded()) {
            statusDisplay.innerText = '⏳ 初始化引擎中...';
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

        // 基礎濾鏡：縮放 + 主標題
        let filter = `scale=-2:${qualityH},drawtext=fontfile=font.otf:text='${mainText}':fontcolor=${mainColor}:fontsize=${mainSize}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=(w-tw)*${xPct}:y=(h-th)*${yPct}`;

        // 疊加彈幕
        danmakuLines.forEach((line, index) => {
            const parts = line.split(',');
            const lane = parts[0] && !isNaN(parts[0]) ? parseInt(parts[0]) : ((index % 20) + 1);
            
            // 核心邏輯：計算提前量
            let startTime = parts[1] && !isNaN(parts[1]) ? parseFloat(parts[1]) : (index * 0.2);
            startTime = startTime - preOffset; 

            const dColor = parts[2] ? parts[2].trim() : 'white';
            const content = parts[3] ? parts[3].trim().replace(/'/g, "\u2019") : (parts[0].trim() || "彈幕");

            const yPos = `(h/21)*${lane}`;
            // 由於 startTime 可能為負，公式改為 t - (startTime)
            const xMove = `w-(t-(${startTime}))*${danmakuSpeed}`;
            const enableCond = startTime < 0 ? `gt(t,0)` : `gt(t,${startTime})`;

            filter += `,drawtext=fontfile=font.otf:text='${content}':fontcolor=${dColor}:fontsize=32:shadowcolor=black@0.3:shadowx=1:shadowy=1:x=${xMove}:y=${yPos}:enable='${enableCond}'`;
        });

        statusDisplay.innerText = `🚀 正在合成影片...`;

        await ffmpeg.run(
            '-loop', '1', '-i', 'input.img',
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
        downloadLink.download = `3s_danmaku.mp4`;
        previewBox.style.display = 'block';
        statusDisplay.innerText = '✅ 生成成功！';

    } catch (e) {
        console.error(e);
        statusDisplay.innerText = '❌ 發生錯誤，請檢查圖片或格式。';
    } finally {
        convertBtn.disabled = false;
    }
};

// 分享按鈕
document.getElementById('shareBtn').onclick = async () => {
    if (!currentVideoFile) return;
    if (navigator.share) {
        await navigator.share({ files: [currentVideoFile], title: '分享彈幕影片' });
    } else {
        alert('瀏覽器不支持分享，請點擊下載。');
    }
};
