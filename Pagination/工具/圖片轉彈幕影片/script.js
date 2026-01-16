const langDict = {
    "zh-TW": { title: "⚡ 圖片轉 3s 彈幕影片", img: "1. 選擇來源圖片", main: "2. 固定主標題", dan: "3. 彈幕設定 (位置,秒數,顏色,內容)", res: "4. 解析度", size: "大小", px: "左右", py: "上下", speed: "速度", density: "提前時間", btn: "開始合成 🚀", ready: "系統就緒", loading: "載入中...", processing: "合成中...", success: "生成成功！", dl: "⬇️ 下載影片", share: "📤 分享影片" },
    "zh-HK": { title: "⚡ 圖像轉 3s 彈幕短片", img: "1. 選擇來源圖片", main: "2. 固定標題", dan: "3. 彈幕設定 (位置,秒數,顏色,內容)", res: "4. 解像度", size: "大細", px: "左右", py: "上下", speed: "速度", density: "預設時間", btn: "製作短片 🚀", ready: "準備就緒", loading: "載入中...", processing: "製作中...", success: "製作完成！", dl: "⬇️ 下載短片", share: "📤 分享短片" },
    "en": { title: "⚡ Image to 3s Video", img: "1. Select Image", main: "2. Main Title", dan: "3. Danmaku Settings", res: "4. Quality", size: "Size", px: "X-Pos", py: "Y-Pos", speed: "Speed", density: "Start Offset", btn: "GENERATE 🚀", ready: "READY", loading: "Loading...", processing: "Processing...", success: "SUCCESS!", dl: "⬇️ DOWNLOAD", share: "📤 SHARE" },
    "ja": { title: "⚡ 画像から3秒動画へ", img: "1. 画像を選択", main: "2. タイトル", dan: "3. 弾幕設定", res: "4. 解像度", size: "サイズ", px: "横位置", py: "縦位置", speed: "速度", density: "先行表示", btn: "動画生成 🚀", ready: "準備完了", loading: "読込中...", processing: "合成中...", success: "完了！", dl: "⬇️ 保存", share: "📤 共有" }
};

const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: false });
let currentVideoFile = null;

// UI 連動
function updateVal(id) {
    const el = document.getElementById(id);
    const display = document.getElementById(id + 'Val');
    if (!display) return;
    let suffix = id.includes('pos') ? '%' : (id === 'preStartOffset' ? 's' : '');
    display.innerText = el.value + suffix;
}

['fontSize', 'posX', 'posY', 'danmakuSpeed', 'preStartOffset'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = () => updateVal(id);
});

// 主題與語言初始化
function initApp() {
    const themeSelect = document.getElementById('themeSelect');
    const langSelect = document.getElementById('langSelect');

    // 主題初始化
    const savedTheme = localStorage.getItem('user-theme') || (new Date().getHours() >= 18 ? 'neon' : 'morning');
    themeSelect.value = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeSelect.onchange = (e) => {
        document.documentElement.setAttribute('data-theme', e.target.value);
        localStorage.setItem('user-theme', e.target.value);
    };

    // 語言初始化
    const bLang = navigator.language.toLowerCase();
    let lang = 'zh-TW';
    if (bLang.includes('hk')) lang = 'zh-HK';
    else if (bLang.includes('en')) lang = 'en';
    else if (bLang.includes('ja')) lang = 'ja';
    langSelect.value = lang;
    updateLanguage(lang);
    langSelect.onchange = (e) => updateLanguage(e.target.value);
}

function updateLanguage(lang) {
    const d = langDict[lang];
    const ids = ['title', 'img', 'main', 'dan', 'res', 'size', 'px', 'py', 'speed', 'density'];
    ids.forEach(id => document.getElementById('t-' + id).innerText = d[id]);
    document.getElementById('convertBtn').innerText = d.btn;
    document.getElementById('statusDisplay').innerText = d.ready;
    document.getElementById('downloadLink').innerText = d.dl;
    document.getElementById('shareBtn').innerText = d.share;
}

// 影片生成核心
document.getElementById('convertBtn').onclick = async () => {
    const uploader = document.getElementById('uploader');
    if (uploader.files.length === 0) return alert('Please select image');

    const btn = document.getElementById('convertBtn');
    const status = document.getElementById('statusDisplay');
    const lang = document.getElementById('langSelect').value;
    const d = langDict[lang];

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
        const speed = document.getElementById('danmakuSpeed').value;
        const offset = parseFloat(document.getElementById('preStartOffset').value);

        ffmpeg.FS('writeFile', 'font.otf', await fetchFile('https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf'));
        ffmpeg.FS('writeFile', 'input.img', await fetchFile(file));

        let filter = `scale=-2:${qualityH},drawtext=fontfile=font.otf:text='${mainText}':fontcolor=${mainColor}:fontsize=${mainSize}:shadowcolor=black@0.4:shadowx=2:shadowy=2:x=(w-tw)*${xPct}:y=(h-th)*${yPct}`;

        const lines = document.getElementById('danmakuText').value.split('\n').filter(l => l.trim() !== '');
        lines.forEach((line, i) => {
            const p = line.split(',');
            const lane = p[0] && !isNaN(p[0]) ? parseInt(p[0]) : ((i % 20) + 1);
            let start = (p[1] && !isNaN(p[1]) ? parseFloat(p[1]) : (i * 0.2)) - offset;
            const color = p[2] ? p[2].trim() : 'white';
            const txt = (p[3] ? p[3].trim() : (p[0]||"...")).replace(/'/g, "\u2019");

            const yPos = `(h/21)*${lane}`;
            const xMove = `w-(t-(${start}))*${speed}`;
            const enable = start < 0 ? `gt(t,0)` : `gt(t,${start})`;
            filter += `,drawtext=fontfile=font.otf:text='${txt}':fontcolor=${color}:fontsize=32:shadowcolor=black@0.3:shadowx=1:shadowy=1:x=${xMove}:y=${yPos}:enable='${enable}'`;
        });

        status.innerText = d.processing;
        await ffmpeg.run('-loop', '1', '-i', 'input.img', '-t', '3', '-vf', filter, '-pix_fmt', 'yuv420p', '-vcodec', 'libx264', 'out.mp4');

        const data = ffmpeg.FS('readFile', 'out.mp4');
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
        currentVideoFile = new File([data.buffer], "video.mp4", { type: "video/mp4" });

        document.getElementById('videoPreview').src = url;
        document.getElementById('downloadLink').href = url;
        document.getElementById('actionBtns').style.display = 'flex';
        status.innerText = d.success;
    } catch (e) { console.error(e); status.innerText = "ERROR"; } finally { btn.disabled = false; }
};

document.getElementById('shareBtn').onclick = async () => {
    if (navigator.share && currentVideoFile) await navigator.share({ files: [currentVideoFile] });
};

initApp();
