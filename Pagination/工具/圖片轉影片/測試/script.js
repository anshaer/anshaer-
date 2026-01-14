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
const danmakuInput = document.getElementById('danmakuText');

// --- 1. UI 互動邏輯 ---

// 輸入框自動增高
function autoResize() {
    danmakuInput.style.height = 'auto';
    danmakuInput.style.height = (danmakuInput.scrollHeight) + 'px';
}

danmakuInput.addEventListener('input', autoResize);
window.addEventListener('load', autoResize);

// 滑桿數值即時顯示
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

document.getElementById('textColor').oninput = (e) => {
    document.getElementById('colorHex').innerText = e.target.value.toUpperCase();
};

// --- 2. 影片生成核心 ---

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

    // 解析彈幕並限制 100 行
    const danmakuLines = danmakuInput.value.split('\n')
        .filter(line => line.trim() !== '')
        .slice(0, 100);
    const danmakuSpeed = document.getElementById('danmakuSpeed').value;

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

        // A. 基礎：縮放 + 主標題
        let filter = `scale=-2:${qualityH},drawtext=fontfile=font.otf:text='${mainText}':fontcolor=${mainColor}:fontsize=${mainSize}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=(w-tw)*${xPct}:y=(h-th)*${yPct}`;

        // B. 疊加彈幕 (位置,時間,顏色,文字)
        danmakuLines.forEach((line, index) => {
            const parts = line.split(',');
            // 如果只有文字，給予預設值
            const lane = parts[0] && !isNaN(parts[0]) ? parseInt(parts[0]) : ((index % 20) + 1);
            const startTime = parts[1] && !isNaN(parts[1]) ? parseFloat(parts[1]) : (index * 0.2);
            const dColor = parts[2] ? parts[2].trim() : 'white';
            const content = parts[3] ? parts[3].trim().replace(/'/g, "\u2019") : parts[0].trim();

            const yPos = `(h/21)*${lane}`; // 20軌道，均分21份空間
            const xMove = `w-(t-${startTime})*${danmakuSpeed}`;

            filter += `,drawtext=fontfile=font.otf:text='${content}':fontcolor=${dColor}:fontsize=32:shadowcolor=black@0.3:shadowx=1:shadowy=1:x=${xMove}:y=${yPos}:enable='gt(t,${startTime})'`;
        });

        statusDisplay.innerText = `🚀 正在合成影片 (共 ${danmakuLines.length} 條彈幕)...`;

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
        previewBox.scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        console.error(e);
        statusDisplay.innerText = '❌ 發生錯誤，請檢查輸入格式。';
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
                title: '分享我的 3s 彈幕影片',
                files: [currentVideoFile]
            });
        } catch (err) {
            if (err.name !== 'AbortError') alert('分享失敗。');
        }
    } else {
        alert('您的瀏覽器不支援檔案分享，請點擊下載按鈕。');
    }
};
