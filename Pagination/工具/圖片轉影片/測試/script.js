/**
 * 🎄 3秒真影片 - 專業彈幕工具
 * 版本：V2.3.0 (Ultimate Compatibility)
 * 修復重點：
 * 1. 解決播放器黑屏/毀損問題 (修正像素奇數問題與編碼兼容性)
 * 2. 徹底移除可能失效的 tpad 濾鏡，改用穩定的 zoompan 固定影格
 * 3. 強制輸出高品質 H.264 基礎 Profile
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
            statusDisplay.innerText = '⏳ 初始化引擎中...';
            await ffmpeg.load();
        }

        statusDisplay.innerText = '⏳ 讀取素材...';
        const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf';
        const [fontData, imageData] = await Promise.all([
            fetchFile(fontUrl),
            fetchFile(file)
        ]);

        ffmpeg.FS('writeFile', 'font.otf', fontData);
        ffmpeg.FS('writeFile', 'input.img', imageData);

        /**
         * V2.3.0 濾鏡鏈重構：
         * 1. scale='if(gte(iw/ih,w/h),...)' : 複雜的縮放確保寬高為偶數 (mp4 必備條件)
         * 2. zoompan : 取代 loop，產生穩定的 3 秒靜態畫面 (90幀)
         * 3. 主浮水印與彈幕座標強制使用 floor
         */
        let filter = `scale=trunc(oh*a/2)*2:${qualityH},format=yuv420p,zoompan=fps=30:d=90:s=${qualityH}x${qualityH},drawtext=fontfile=font.otf:text='${mainText}':fontcolor=${mainColor}:fontsize=${mainSize}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=floor((w-tw)*${xPct}):y=floor((h-th)*${yPct})`;

        danmakuLines.forEach((line, index) => {
            const parts = line.split(',');
            const lane = (parts[0] && !isNaN(parts[0])) ? parseInt(parts[0]) : ((index % 20) + 1);
            const startTime = (parts[1] && !isNaN(parts[1])) ? parseFloat(parts[1]) : (index * 0.2);
            const dColor = parts[2] ? parts[2].trim() : 'white';
            const content = parts[3] ? parts[3].trim().replace(/'/g, "\u2019") : (parts[0] ? parts[0].trim() : "...");

            const yPos = `floor((h/21)*${lane})`;
            const xMove = `floor(w-(max(0,t-${startTime}))*${danmakuSpeed})`;

            filter += `,drawtext=fontfile=font.otf:text='${content}':fontcolor=${dColor}:fontsize=32:shadowcolor=black@0.3:shadowx=1:shadowy=1:x=${xMove}:y=${yPos}:enable='gt(t,${startTime})'`;
        });

        statusDisplay.innerText = `🚀 穩定化生成中 (共 ${danmakuLines.length} 條彈幕)...`;

        await ffmpeg.run(
            '-i', 'input.img',
            '-vf', filter,
            '-t', '3',
            '-c:v', 'libx264',
            '-profile:v', 'baseline', // 使用最基礎的 Profile 確保所有手機都能播
            '-level', '3.0',
            '-pix_fmt', 'yuv420p',
            '-preset', 'ultrafast',
            '-y', 'out.mp4'
        );

        statusDisplay.innerText = '⌛ 讀取影片...';
        const data = ffmpeg.FS('readFile', 'out.mp4');
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(videoBlob);
        
        currentVideoFile = new File([videoBlob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });
        videoPreview.src = url;
        downloadLink.href = url;
        downloadLink.download = `3s_video_fixed.mp4`;
        previewBox.style.display = 'block';
        statusDisplay.innerText = '✅ 生成完成！';

    } catch (e) {
        console.error('FFmpeg Error:', e);
        statusDisplay.innerText = '❌ 生成錯誤，可能是圖片過大或格式不符。';
    } finally {
        convertBtn.disabled = false;
    }
};

shareBtn.onclick = async () => {
    if (!currentVideoFile) return;
    try {
        await navigator.share({ title: '我的彈幕影片', files: [currentVideoFile] });
    } catch (err) { if (err.name !== 'AbortError') alert('分享失敗'); }
};
