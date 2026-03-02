/**
 * IRIS PRO ANALYZER - PRECISION SAMPLING EDITION
 * 功能：自定義取樣趴數、智能權重補償、空間偏位懲罰
 */

// 預設取樣趴數，會隨 HTML 輸入框即時更新
let samplingRanges = [
    [0.15, 0.35], // 捲縮輪
    [0.35, 0.65], // 隱窩層
    [0.65, 1.0]   // 收縮溝
];

function init() {
    setupSource('A');
    setupSource('B');
}

function setupSource(id) {
    const can = document.getElementById('can' + id);
    const guide = document.getElementById('guide' + id);
    const ctx = can.getContext('2d');

    document.getElementById('up' + id).onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
// 在 setupSource 函式內修改
img.onload = () => {
    can.width = guide.width = img.width;
    can.height = guide.height = img.height;
    
    // 設定預設座標
    document.getElementById(id.toLowerCase() + 'x').value = Math.round(img.width / 2);
    document.getElementById(id.toLowerCase() + 'y').value = Math.round(img.height / 2);
    document.getElementById(id.toLowerCase() + 'r').value = Math.round(img.width / 2.5);
    
    ctx.drawImage(img, 0, 0);

    // --- 關鍵修正：圖片載入後立即執行一次全域同步 ---
    updateSamplingAndRun(); 
};
            img.src = ev.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    guide.onmousedown = (e) => {
        const rect = guide.getBoundingClientRect();
        const scaleX = guide.width / rect.width;
        const scaleY = guide.height / rect.height;
        document.getElementById(id.toLowerCase() + 'x').value = Math.round((e.clientX - rect.left) * scaleX);
        document.getElementById(id.toLowerCase() + 'y').value = Math.round((e.clientY - rect.top) * scaleY);
        syncAndRun(id);
    };
}

// 更新取樣趴數並重新執行分析
function updateSamplingAndRun() {
    // 強制從 HTML 抓取最新的趴數設定
    samplingRanges = [
        [parseFloat(document.getElementById('r1m').value)/100, parseFloat(document.getElementById('r1x').value)/100],
        [parseFloat(document.getElementById('r2m').value)/100, parseFloat(document.getElementById('r2x').value)/100],
        [parseFloat(document.getElementById('r3m').value)/100, parseFloat(document.getElementById('r3x').value)/100]
    ];
    
    // 執行分析
    runCoreAnalysis();
    
    // 更新兩邊的輔助線
    if(document.getElementById('canA').width > 0) updateVisualGuides('A');
    if(document.getElementById('canB').width > 0) updateVisualGuides('B');
}

function syncAndRun(id) {
    updateVisualGuides(id);
    runCoreAnalysis();
}

function updateVisualGuides(id) {
    const g = document.getElementById('guide' + id);
    const gctx = g.getContext('2d');
    gctx.clearRect(0, 0, g.width, g.height);
    const x = parseInt(document.getElementById(id.toLowerCase() + 'x').value) || 0;
    const y = parseInt(document.getElementById(id.toLowerCase() + 'y').value) || 0;
    const r = parseInt(document.getElementById(id.toLowerCase() + 'r').value) || 0;

    gctx.strokeStyle = '#00ffcc';
    gctx.lineWidth = Math.max(2, g.width / 450);
    gctx.beginPath(); gctx.moveTo(x - 30, y); gctx.lineTo(x + 30, y);
    gctx.moveTo(x, y - 30); gctx.lineTo(x, y + 30); gctx.stroke();

    // 繪製動態取樣圈
    samplingRanges.forEach((range, i) => {
        gctx.setLineDash(i === 2 ? [] : [10, 5]);
        gctx.beginPath(); gctx.arc(x, y, r * range[0], 0, Math.PI * 2); gctx.stroke();
        if (i === 2) { // 最外圈
            gctx.beginPath(); gctx.arc(x, y, r * range[1], 0, Math.PI * 2); gctx.stroke();
        }
    });
}

function runCoreAnalysis() {
    const layersA = samplingRanges.map((rng, i) => extract('A', i + 1, rng));
    const layersB = samplingRanges.map((rng, i) => extract('B', i + 1, rng));
    if (!layersA[0] || !layersB[0]) return;

    let totalScores = [];
    let combinedDiff = new Array(256).fill(0);

    layersA.forEach((da, i) => {
        const result = calculateOptimizedSimilarity(da, layersB[i], i + 1);
        totalScores.push(result.score);
        document.getElementById(`sim_${i + 1}`).innerText = result.score.toFixed(2) + "%";
        drawSpectrum(`diff_${i + 1}`, result.diffArr, '#ff3e3e');
        result.diffArr.forEach((v, idx) => combinedDiff[idx] += v);
    });

    const finalAvg = totalScores.reduce((a, b) => a + b) / 3;
    document.getElementById('sim_total').innerText = finalAvg.toFixed(2) + "%";
    drawSpectrum('diff_total', combinedDiff, '#00ffcc');
}

function extract(id, idx, rng) {
    const cx = parseInt(document.getElementById(id.toLowerCase() + 'x').value);
    const cy = parseInt(document.getElementById(id.toLowerCase() + 'y').value);
    const br = parseInt(document.getElementById(id.toLowerCase() + 'r').value);
    const canvas = document.getElementById('can' + id);
    const ctx = canvas.getContext('2d');
    const srcData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const outCanvas = document.getElementById('s' + id.toLowerCase() + idx);
    const octx = outCanvas.getContext('2d');
    
    outCanvas.width = 800; outCanvas.height = 100;
    const oImg = octx.createImageData(800, 100);

    for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 800; x++) {
            const ang = (x / 800) * Math.PI * 2;
            const rad = (rng[0] + (y / 100) * (rng[1] - rng[0])) * br;
            const sx = Math.floor(cx + rad * Math.cos(ang)), sy = Math.floor(cy + rad * Math.sin(ang));
            if (sx >= 0 && sx < canvas.width && sy >= 0 && sy < canvas.height) {
                const si = (sy * canvas.width + sx) * 4, di = (y * 800 + x) * 4;
                oImg.data[di] = srcData[si]; oImg.data[di+1] = srcData[si+1];
                oImg.data[di+2] = srcData[si+2]; oImg.data[di+3] = 255;
            }
        }
    }
    octx.putImageData(oImg, 0, 0);
    return oImg.data;
}

function calculateOptimizedSimilarity(d1, d2, layerIdx) {
    let diffArr = new Array(256).fill(0), sumDiff = 0, validPixels = 0;
    const totalPixels = d1.length / 4;

    for (let i = 0; i < d1.length; i += 4) {
        const l1 = Math.floor((d1[i] + d1[i+1] + d1[i+2]) / 3);
        const l2 = Math.floor((d2[i] + d2[i+1] + d2[i+2]) / 3);
        if (l1 > 15 && l2 > 15) {
            const d = Math.abs(l1 - l2);
            diffArr[l1] += d; sumDiff += d; validPixels++;
        }
    }

    const areaRatio = validPixels / totalPixels;
    let baseScore = validPixels === 0 ? 0 : Math.max(0, 100 - (sumDiff / validPixels / 2.55));
    
    // 針對內圈調降面積懲罰門檻 (因內圈易受瞳孔影響面積較小)
    const threshold = (layerIdx === 1) ? 0.15 : 0.45;
    let finalScore = (areaRatio > threshold) ? baseScore * (0.5 + areaRatio) : baseScore * Math.pow(areaRatio, 2.5);

    return { score: Math.min(100, finalScore), diffArr };
}

function drawSpectrum(canvasId, arr, color) {
    const c = document.getElementById(canvasId);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const max = Math.max(...arr, 1);
    ctx.strokeStyle = color; ctx.beginPath();
    arr.forEach((v, i) => {
        const x = (i / 255) * c.width, h = (v / max) * c.height;
        ctx.moveTo(x, c.height); ctx.lineTo(x, c.height - h);
    });
    ctx.stroke();
}

init();