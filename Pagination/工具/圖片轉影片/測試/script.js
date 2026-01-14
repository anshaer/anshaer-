/**
 * 🎄 3秒真影片 - 專業彈幕工具
 * 版本：V2.5.0 (Extreme Stability - Mobile First)
 * 修復重點：
 * 1. 移除外部字體下載，避免網絡與記憶體阻塞。
 * 2. 強制固定輸出 $1280 \times 720$ 解析度，解決奇數像素與內存問題。
 * 3. 優化編碼參數，專為手機瀏覽器設計。
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

// UI 自動高度
function autoResize() {
    danmakuInput.style.height = 'auto';
    danmakuInput.style.height = (danmakuInput.scrollHeight) + 'px';
}
danmakuInput.addEventListener('input', autoResize);
window.addEventListener('load', autoResize);

// 滑桿數值顯示
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

// --- 核心生成邏輯 ---
convertBtn.onclick = async () => {
    const uploader = document.getElementById('uploader');
    if (uploader.files.length === 0) return alert('請先選擇圖片');

    const file = uploader.files[0];
    const mainText = document.getElementById('videoText').value || ' ';
    const mainSize = document.getElementById('fontSize').value;
    const mainColor = document.getElementById('textColor').value;
    const xPct = document.getElementById('posX').value / 100;
    const yPct = document.getElementById('posY').value / 100;
    const danmakuLines = danmakuInput.value.split('\n').filter(l => l.trim() !== '').slice(0, 100);
    const danmakuSpeed = document.getElementById('danmakuSpeed').value;

    convertBtn.disabled = true;
    previewBox.style.display = 'none';

    try {
        if (!ffmpeg.isLoaded()) {
            statusDisplay.innerText = '⏳ 正在啟動處理引擎...';
            await ffmpeg.load();
        }

        statusDisplay.innerText = '⏳ 正在處理圖片檔案...';
        const imageData = await fetchFile(file);
        ffmpeg.FS('writeFile', 'input.img', imageData);

        /**
         * V2.5.0 核心策略：
         * 1. 強制 scale=1280:720 並使用 force_original_aspect_ratio 避免變形。
         * 2. 不使用外部字體檔案 (直接省略 fontfile)，使用系統預設字體以節省 RAM。
         */
        let filter = `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(1280-iw)/2:(720-ih)/2,format=yuv420p,drawtext=text='${mainText}':fontcolor=${mainColor}:fontsize=${mainSize}:x=(w-tw)*${xPct}:y=(h-th)*${yPct}`;

        danmakuLines.forEach((line, index) => {
            const parts = line.split(',');
            const lane = (parts[0] && !isNaN(parts[0])) ? parseInt(parts[0]) : ((index % 20) + 1);
            const startTime = (parts[1] && !isNaN(parts[1])) ? parseFloat(parts[1]) : (index * 0.2);
            const dColor = parts[2] ? parts[2].trim() : 'white';
            const content = parts[3] ? parts[3].trim().replace(/'/g, "\u2019") : (parts[0] ? parts[0].trim() : "...");

            const yPos = `(h/21)*${lane}`;
            const xMove = `w-(t-${startTime})*${danmakuSpeed}`;

            filter += `,drawtext=text='${content}':fontcolor=${dColor}:fontsize=30:x=${xMove}:y=${yPos}:enable='gt(t,${startTime})'`;
        });

        statusDisplay.innerText = `🚀 正在生成影片...`;

        await ffmpeg.run(
            '-loop', '1',
            '-i', 'input.img',
            '-vf', filter,
            '-r', '25',                // 稍微降低影格率到 25fps 減少計算壓力
            '-t', '3',
            '-pix_fmt', 'yuv420p',
            '-vcodec', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'stillimage',
            '-crf', '28',              // 稍微增加壓縮率，確保檔案小
            'out.mp4'
        );

        const data = ffmpeg.FS('readFile', 'out.mp4');
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(videoBlob);
        
        currentVideoFile = new File([videoBlob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });
        videoPreview.src = url;
        downloadLink.href = url;
        downloadLink.download = `3s_stable.mp4`;
        previewBox.style.display = 'block';
        statusDisplay.innerText = '✅ 生成成功！';

    } catch (e) {
        console.error(e);
        statusDisplay.innerText = '❌ 處理失敗。建議換一張較小的圖片重試。';
    } finally {
        convertBtn.disabled = false;
    }
};

shareBtn.onclick = async () => {
    if (!currentVideoFile) return;
    try {
        await navigator.share({ title: '彈幕影片', files: [currentVideoFile] });
    } catch (err) { alert('請點擊下載保存'); }
};
