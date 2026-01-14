/**
 * 🎄 3秒真影片 - 專業彈幕工具
 * 版本：V2.2.0 (Deep Stable)
 * 修復重點：徹底解決靜態圖轉影片的影格閃爍與跳動
 */

const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

let currentVideoFile = null;

const convertBtn = document.getElementById('convertBtn');
const shareBtn = document.getElementById('shareBtn');
const statusDisplay = document.getElementById('statusDisplay');
const previewBox = document.getElementById('previewBox');
const videoPreview = document.getElementById('videoPreview');
const downloadLink = document.getElementById('downloadLink');
const danmakuInput = document.getElementById('danmakuText');

// --- UI 工具 ---
function autoResize() {
    danmakuInput.style.height = 'auto';
    danmakuInput.style.height = (danmakuInput.scrollHeight) + 'px';
}
danmakuInput.addEventListener('input', autoResize);
window.addEventListener('load', autoResize);

function updateVal(id) {
    const el = document.getElementById(id);
    const display = document.getElementById(id + 'Val');
    if (!display) return;
    if (id === 'danmakuSpeed') {
        const val = parseInt(el.value);
        display.innerText = val < 350 ? '慢' : (val < 600 ? '中' : '快');
    } else {
        display.innerText = el.value + (id.includes('pos') ? '%' : '');
    }
}
['fontSize', 'posX', 'posY', 'danmakuSpeed'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = () => updateVal(id);
});

// --- 核心邏輯 ---
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
    const danmakuLines = danmakuInput.value.split('\n').filter(l => l.trim() !== '').slice(0, 100);
    const danmakuSpeed = document.getElementById('danmakuSpeed').value;

    convertBtn.disabled = true;
    previewBox.style.display = 'none';

    try {
        if (!ffmpeg.isLoaded()) {
            statusDisplay.innerText = '⏳ 引擎初始化...';
            await ffmpeg.load();
        }

        const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf';
        const [fontData, imageData] = await Promise.all([
            fetchFile(fontUrl),
            fetchFile(file)
        ]);

        ffmpeg.FS('writeFile', 'font.otf', fontData);
        ffmpeg.FS('writeFile', 'input.img', imageData);

        /**
         * 閃爍修復核心：
         * 1. 使用 tpad 建立穩定的 3 秒畫面 (90幀 @ 30fps)
         * 2. 使用 format=yuv420p 鎖定像素格式
         * 3. 確保 drawtext 的所有座標都是整數
         */
        let filter = `scale=-2:${qualityH},format=yuv420p,tpad=stop_mode=clone:stop_duration=3,drawtext=fontfile=font.otf:text='${mainText}':fontcolor=${mainColor}:fontsize=${mainSize}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=floor((w-tw)*${xPct}):y=floor((h-th)*${yPct})`;

        danmakuLines.forEach((line, index) => {
            const parts = line.split(',');
            const lane = (parts[0] && !isNaN(parts[0])) ? parseInt(parts[0]) : ((index % 20) + 1);
            const startTime = (parts[1] && !isNaN(parts[1])) ? parseFloat(parts[1]) : (index * 0.2);
            const dColor = parts[2] ? parts[2].trim() : 'white';
            const content = parts[3] ? parts[3].trim().replace(/'/g, "\u2019") : (parts[0] ? parts[0].trim() : "...");

            const yPos = `floor((h/21)*${lane})`;
            // 修正：使用 max(0, t-startTime) 防止負值計算錯誤
            const xMove = `floor(w-(max(0,t-${startTime}))*${danmakuSpeed})`;

            filter += `,drawtext=fontfile=font.otf:text='${content}':fontcolor=${dColor}:fontsize=32:shadowcolor=black@0.3:shadowx=1:shadowy=1:x=${xMove}:y=${yPos}:enable='gt(t,${startTime})'`;
        });

        statusDisplay.innerText = `🚀 深度穩定化處理中...`;

        await ffmpeg.run(
            '-i', 'input.img',
            '-vf', filter,
            '-r', '30',
            '-t', '3',
            '-c:v', 'libx264',
            '-tune', 'stillimage',     // 針對靜態圖優化，減少閃爍
            '-pix_fmt', 'yuv420p',
            '-preset', 'ultrafast',
            'out.mp4'
        );

        const data = ffmpeg.FS('readFile', 'out.mp4');
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(videoBlob);
        
        currentVideoFile = new File([videoBlob], `3s_v22_${Date.now()}.mp4`, { type: 'video/mp4' });
        videoPreview.src = url;
        downloadLink.href = url;
        downloadLink.download = `stable_video.mp4`;
        previewBox.style.display = 'block';
        statusDisplay.innerText = '✅ 穩定版生成成功！';

    } catch (e) {
        console.error(e);
        statusDisplay.innerText = '❌ 錯誤，請重整頁面。';
    } finally {
        convertBtn.disabled = false;
    }
};

shareBtn.onclick = async () => {
    if (!currentVideoFile) return;
    try {
        await navigator.share({ title: '我的彈幕作品', files: [currentVideoFile] });
    } catch (err) { if (err.name !== 'AbortError') alert('請下載後分享'); }
};
