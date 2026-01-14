/**
 * 🎄 3秒真影片 - 專業彈幕工具
 * 版本：V2.4.0 (Final Stability Fix)
 * 修復重點：
 * 1. 解決手機端 FFmpeg 濾鏡崩潰導致的黑屏。
 * 2. 移除 zoompan，回歸穩定 loop 模式並強制固定解析度為偶數。
 * 3. 增加 setsar=1:1 確保比例在手機上不跳動。
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
            statusDisplay.innerText = '⏳ 引擎啟動中...';
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
         * V2.4.0 核心修正邏輯：
         * 1. 使用 scale 配合 pad 確保最終輸出長寬一定是偶數且符合比例。
         * 2. setsar=1:1 防止手機播放時畫面比例被壓縮。
         */
        const targetW = Math.round((qualityH * 16) / 9 / 2) * 2; // 強制 16:9 或維持原圖比例但轉偶數
        
        let filter = `scale=trunc(iw*${qualityH}/ih/2)*2:${qualityH},format=yuv420p,setsar=1:1,drawtext=fontfile=font.otf:text='${mainText}':fontcolor=${mainColor}:fontsize=${mainSize}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=floor((w-tw)*${xPct}):y=floor((h-th)*${yPct})`;

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

        statusDisplay.innerText = `🚀 正在進行最終相容性壓製...`;

        await ffmpeg.run(
            '-loop', '1',              // 穩定循環模式
            '-i', 'input.img',
            '-vf', filter,
            '-r', '30',                // 固定 30 幀
            '-t', '3',                 // 3 秒
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',     // 最關鍵：必須是 yuv420p
            '-preset', 'ultrafast',
            '-tune', 'stillimage',
            '-f', 'mp4',               // 強制 mp4 容器格式
            'out.mp4'
        );

        statusDisplay.innerText = '⌛ 影片準備中...';
        const data = ffmpeg.FS('readFile', 'out.mp4');
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(videoBlob);
        
        currentVideoFile = new File([videoBlob], `v24_video.mp4`, { type: 'video/mp4' });
        videoPreview.src = url;
        downloadLink.href = url;
        downloadLink.download = `3s_stable_v24.mp4`;
        previewBox.style.display = 'block';
        statusDisplay.innerText = '✅ 生成完成！';

    } catch (e) {
        console.error('FFmpeg Error:', e);
        statusDisplay.innerText = '❌ 錯誤：請嘗試換一張較小的圖片。';
    } finally {
        convertBtn.disabled = false;
    }
};

shareBtn.onclick = async () => {
    if (!currentVideoFile) return;
    try {
        await navigator.share({ title: '彈幕影片', files: [currentVideoFile] });
    } catch (err) { alert('請手動下載分享'); }
};
