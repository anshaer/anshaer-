const langDict = {
    "zh-TW": {
        title: "⚡ 圖片轉 3s 彈幕影片", img: "1. 選擇來源圖片", main: "2. 固定主標題",
        dan: "3. 彈幕設定 (位置,秒數,顏色,內容)", res: "4. 解析度", size: "大小",
        px: "左右", py: "上下", speed: "速度", density: "提前時間", btn: "開始合成 🚀",
        ready: "系統就緒", loading: "載入素材中...", processing: "正在合成影片...", success: "生成成功！", dl: "⬇️ 下載影片", share: "📤 分享影片"
    },
    "zh-HK": {
        title: "⚡ 圖像轉 3s 彈幕短片", img: "1. 選擇來源圖片", main: "2. 固定標題",
        dan: "3. 彈幕設定 (位置,秒數,顏色,內容)", res: "4. 解像度", size: "大細",
        px: "左右", py: "上下", speed: "速度", density: "預設時間", btn: "製作短片 🚀",
        ready: "準備就緒", loading: "素材讀取中...", processing: "正在製作短片...", success: "製作完成！", dl: "⬇️ 下載短片", share: "📤 分享短片"
    },
    "en": {
        title: "⚡ Image to 3s Danmaku", img: "1. Select Image", main: "2. Main Title",
        dan: "3. Danmaku (Lane, Time, Color, Text)", res: "4. Quality", size: "Size",
        px: "X-Pos", py: "Y-Pos", speed: "Speed", density: "Start Offset", btn: "GENERATE 🚀",
        ready: "READY", loading: "Loading assets...", processing: "Processing...", success: "SUCCESS!", dl: "⬇️ DOWNLOAD", share: "📤 SHARE"
    },
    "ja": {
        title: "⚡ 画像から3秒弾幕動画へ", img: "1. 画像を選択", main: "2. メインタイトル",
        dan: "3. 弾幕設定 (行, 秒, 色, 内容)", res: "4. 解像度", size: "サイズ",
        px: "横位置", py: "縦位置", speed: "速度", density: "先行表示", btn: "動画を生成 🚀",
        ready: "準備完了", loading: "読み込み中...", processing: "合成中...", success: "完了！", dl: "⬇️ ダウンロード", share: "📤 共有する"
    }
};

const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: false });
let currentVideoFile = null;

// UI 連動與發光效果
function updateVal(id) {
    const el = document.getElementById(id);
    const display = document.getElementById(id + 'Val');
    if (!display) return;
    
    let suffix = id.includes('pos') ? '%' : (id === 'preStartOffset' ? 's' : '');
    display.innerText = el.value + suffix;
    display.style.textShadow = `0 0 8px var(--neon-blue)`;
}

['fontSize', 'posX', 'posY', 'danmakuSpeed', 'preStartOffset'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = () => updateVal(id);
});

// 自動偵測主題與語言
function initApp() {
    // 主題
    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 6;
    document.documentElement.setAttribute('data-theme', isNight ? 'dark' : 'light');

    // 語言
    const bLang = navigator.language.toLowerCase();
    let lang = 'zh-TW';
    if (bLang.includes('hk')) lang = 'zh-HK';
    else if (bLang.includes('en')) lang = 'en';
    else if (bLang.includes('ja')) lang = 'ja';
    
    document.getElementById('langSelect').value = lang;
    updateLanguage(lang);
}

function updateLanguage(lang) {
    const d = langDict[lang];
    Object.keys(d).forEach(key => {
        const el = document.getElementById('t-' + key);
        if (el) el.innerText = d[key];
    });
    document.getElementById('convertBtn').innerText = d.btn;
    document.getElementById('statusDisplay').innerText = d.ready;
    document.getElementById('downloadLink').innerText = d.dl;
    document.getElementById('shareBtn').innerText = d.share;
}

document.getElementById('langSelect').onchange = (e) => updateLanguage(e.target.value);
document.getElementById('themeToggle').onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
};

// 影片生成邏輯
document.getElementById('convertBtn').onclick = async () => {
    const uploader = document.getElementById('uploader');
    if (uploader.files.length === 0) return alert('Please select image');

    const lang = document.getElementById('langSelect').value;
    const d = langDict[lang];
    const btn = document.getElementById('convertBtn');
    const status = document.getElementById('statusDisplay');

    btn.disabled = true;
    status.innerText = d.loading;

    try {
        if (!ffmpeg.isLoaded()) await ffmpeg.load();

        const file = uploader.files[0];
        const qualityH = document.getElementById('qualitySelect').value;
        const mainText = document.getElementById('videoText').value || ' ';
        const mainSize = document.getElementById('fontSize').value;
        const mainColor = document.getElementById('textColor').value;
        const xPct = document.getElementById('posX').value / 100;
        const yPct = document.getElementById('posY').value / 100;
        const danmakuSpeed = document.getElementById('danmakuSpeed').value;
        const preOffset = parseFloat(document.getElementById('preStartOffset').value);

        ffmpeg.FS('writeFile', 'font.otf', await fetchFile('https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf'));
        ffmpeg.FS('writeFile', 'input.img', await fetchFile(file));

        let filter = `scale=-2:${qualityH},drawtext=fontfile=font.otf:text='${mainText}':fontcolor=${mainColor}:fontsize=${mainSize}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=(w-tw)*${xPct}:y=(h-th)*${yPct}`;

        const danmakuLines = document.getElementById('danmakuText').value.split('\n').filter(l => l.trim() !== '');
        danmakuLines.forEach((line, index) => {
            const p = line.split(',');
            const lane = p[0] && !isNaN(p[0]) ? parseInt(p[0]) : ((index % 20) + 1);
            let start = p[1] && !isNaN(p[1]) ? parseFloat(p[1]) : (index * 0.2);
            start = start - preOffset;
            const color = p[2] ? p[2].trim() : 'white';
            const txt = p[3] ? p[3].trim().replace(/'/g, "\u2019") : (p[0] ? p[0].trim() : "...");

            const yPos = `(h/21)*${lane}`;
            const xMove = `w-(t-(${start}))*${danmakuSpeed}`;
            const enable = start < 0 ? `gt(t,0)` : `gt(t,${start})`;
            filter += `,drawtext=fontfile=font.otf:text='${txt}':fontcolor=${color}:fontsize=32:shadowcolor=black@0.3:shadowx=1:shadowy=1:x=${xMove}:y=${yPos}:enable='${enable}'`;
        });

        status.innerText = d.processing;
        await ffmpeg.run('-loop', '1', '-i', 'input.img', '-t', '3', '-vf', filter, '-pix_fmt', 'yuv420p', '-vcodec', 'libx264', 'out.mp4');

        const data = ffmpeg.FS('readFile', 'out.mp4');
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
        currentVideoFile = new File([data.buffer], "danmaku.mp4", { type: "video/mp4" });

        document.getElementById('videoPreview').src = url;
        document.getElementById('downloadLink').href = url;
        document.getElementById('downloadLink').download = "neon_danmaku.mp4";
        document.getElementById('actionBtns').style.display = 'flex';
        status.innerText = d.success;
    } catch (e) {
        console.error(e);
        status.innerText = "ERROR";
    } finally {
        btn.disabled = false;
    }
};

document.getElementById('shareBtn').onclick = async () => {
    if (navigator.share && currentVideoFile) {
        await navigator.share({ files: [currentVideoFile], title: 'My Neon Danmaku' });
    }
};

initApp();
