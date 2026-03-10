const videoInput = document.getElementById('videoInput');
const audioInput = document.getElementById('audioInput');
const logoInput = document.getElementById('logoInput');
const timeline = document.getElementById('timeline');
const playPauseBtn = document.getElementById('playPauseBtn');
const exportBtn = document.getElementById('exportBtn');
const filterSelect = document.getElementById('filterSelect');
const overlayText = document.getElementById('overlayText');

// 素材載入邏輯
videoInput.onchange = (e) => {
    assets.video.src = URL.createObjectURL(e.target.files[0]);
    assets.video.onloadedmetadata = () => {
        const duration = Math.min(assets.video.duration, 600); // 限制 10 分鐘
        timeline.max = duration;
        document.getElementById('videoTrackVisual').style.width = (duration/600 * 100) + "%";
    };
};

audioInput.onchange = (e) => assets.audio.src = URL.createObjectURL(e.target.files[0]);
logoInput.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => assets.logo.src = ev.target.result;
    reader.readAsDataURL(e.target.files[0]);
};

// UI 控制與同步
filterSelect.onchange = () => assets.filter = filterSelect.value;
overlayText.oninput = () => assets.text = overlayText.value;

playPauseBtn.onclick = () => {
    if (assets.video.paused) {
        assets.video.play();
        if(assets.audio.src) assets.audio.play();
        playPauseBtn.innerText = "暫停";
    } else {
        assets.video.pause();
        assets.audio.pause();
        playPauseBtn.innerText = "播放";
    }
};

assets.video.ontimeupdate = () => {
    timeline.value = assets.video.currentTime;
    if (assets.video.currentTime >= 600) assets.video.pause(); // 強制截斷
};

timeline.oninput = () => {
    assets.video.currentTime = timeline.value;
    if(assets.audio.src) assets.audio.currentTime = timeline.value;
};

// 導出功能 (錄製 Canvas)
exportBtn.onclick = () => {
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'export_10min.mp4'; a.click();
    };

    // 重置並錄製
    assets.video.currentTime = 0;
    assets.video.play();
    recorder.start();
    exportBtn.innerText = "錄製中...";
    
    // 10 分鐘或影片結束自動停止
    setTimeout(() => recorder.stop(), Math.min(assets.video.duration, 600) * 1000);
};

// 啟動渲染
startRendering();