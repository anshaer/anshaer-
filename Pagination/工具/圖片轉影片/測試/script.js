/**
 * 🎄 3秒真影片 - 浮水印與彈幕工具
 * 版本：V2.1.0 (2024 Stable)
 * 更新內容：
 * 1. 修正閃爍問題 (引入固定影格率 30fps)
 * 2. 支援 20 軌位置重疊機制
 * 3. 彈幕格式重組：位置,時間,顏色,文字
 * 4. 增加最多 100 行安全截斷
 * 5. 強化 Textarea 自動增長邏輯
 */

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

// --- 1. UI 互動與輸入框邏輯 ---

/**
 * 自動調整輸入框高度
 */
function autoResize() {
    danmakuInput.style.height = 'auto';
    danmakuInput.style.height = (danmakuInput.scrollHeight) + 'px';
}

danmakuInput.addEventListener('input', autoResize);
window.addEventListener('load', autoResize);

/**
 * 滑桿數值即時更新顯示
 */
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

// 綁定所有滑桿
['fontSize', 'posX', 'posY', 'danmakuSpeed'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = () => updateVal(id);
});

// 顏色選擇器文字同步
document.getElementById('textColor').oninput = (e) => {
    document.getElementById('colorHex').innerText = e.target.value.toUpperCase();
};

// --- 2. 影片生成核心核心邏輯 ---

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

    // 解析彈幕並執行安全限制 (最多 100 行)
    const danmakuLines = danmakuInput.value.split('\n')
        .filter(line => line.trim() !== '')
        .slice(0, 100);
    const danmakuSpeed = document.getElementById('danmakuSpeed').value;

    convertBtn.disabled = true;
    previewBox.style.display = 'none';

    try {
        if (!ffmpeg.isLoaded()) {
            statusDisplay.innerText = '⏳ 引擎初始化中...';
            await ffmpeg.load();
        }

        statusDisplay.innerText = '⏳ 載入素材與字體...';
        const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf';
        const [fontData, imageData] = await Promise.all([
            fetchFile(fontUrl),
            fetchFile(file)
        ]);

        ffmpeg.FS('writeFile', 'font.otf', fontData);
        ffmpeg.FS('writeFile', 'input.img', imageData);

        // A. 基礎濾鏡鏈：縮放 -> 設定格式 -> 主標題
        // 使用 floor 確保座標為整數，減少渲染閃爍
        let filter = `scale=-2:${qualityH},format=yuv420p,drawtext=fontfile=font.otf:text='${mainText}':fontcolor=${mainColor}:fontsize=${mainSize}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=floor((w-tw)*${xPct}):y=floor((h-th)*${yPct})`;

        // B. 疊加彈幕 (解析順序：位置,時間,顏色,文字)
        danmakuLines.forEach((line, index) => {
            const parts = line.split(',');
            // 解析參數
            const lane = (parts[0] && !isNaN(parts[0])) ? parseInt(parts[0]) : ((index % 20) + 1);
            const startTime = (parts[1] && !isNaN(parts[1])) ? parseFloat(parts[1]) : (index * 0.2);
            const dColor = parts[2] ? parts[2].trim() : 'white';
            const content = parts[3] ? parts[3].trim().replace(/'/g, "\u2019") : (parts[0] ? parts[0].trim() : "...");

            // Y 軸 20 軌位邏輯
            const yPos = `floor((h/21)*${lane})`;
            // X 軸飛行邏輯 (當前時間 t 減去 開始時間)
            const xMove = `floor(w-(t-${startTime})*${danmakuSpeed})`;

            filter += `,drawtext=fontfile=font.otf:text='${content}':fontcolor=${dColor}:fontsize=32:shadowcolor=black@0.3:shadowx=1:shadowy=1:x=${xMove}:y=${yPos}:enable='gt(t,${startTime})'`;
        });

        statusDisplay.innerText = `🚀 穩定化合成中 (30fps, ${danmakuLines.length}條彈幕)...`;

        // C. 執行 FFmpeg 指令
        await ffmpeg.run(
            '-loop', '1',
            '-i', 'input.img',
            '-r', '30',                  // 固定影格率，關鍵修復閃爍
            '-t', '3',                   // 固定長度 3 秒
            '-vf', filter,
            '-c:v', 'libx264',           // H.264 編碼
            '-pix_fmt', 'yuv420p',       // 最高相容性像素格式
            '-preset', 'ultrafast',      // 提升手機端處理速度
            '-movflags', 'faststart',    // 讓影片可以邊下載邊播放
            'out.mp4'
        );

        statusDisplay.innerText = '⌛ 讀取影片資料...';
        const data = ffmpeg.FS('readFile', 'out.mp4');
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(videoBlob);
        
        // 儲存 File 物件供 Web Share 使用
        currentVideoFile = new File([videoBlob], `3s_video_${Date.now()}.mp4`, { type: 'video/mp4' });

        // 更新 UI 預覽
        videoPreview.src = url;
        downloadLink.href = url;
        downloadLink.download = `watermark_video_${Date.now()}.mp4`;
        previewBox.style.display = 'block';
        
        statusDisplay.innerText = '✅ 生成成功！';
        previewBox.scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        console.error('FFmpeg Error:', e);
        statusDisplay.innerText = '❌ 發生錯誤，請檢查格式或重整網頁。';
    } finally {
        convertBtn.disabled = false;
    }
};

// --- 3. 分享功能 ---

shareBtn.onclick = async () => {
    if (!currentVideoFile) return;
    
    const shareData = {
        title: '我的 3s 彈幕作品',
        files: [currentVideoFile]
    };

    if (navigator.canShare && navigator.canShare(shareData)) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            if (err.name !== 'AbortError') alert('分享失敗。');
        }
    } else {
        alert('您的瀏覽器不支援直接分享，請使用下載按鈕保存影片。');
    }
};

