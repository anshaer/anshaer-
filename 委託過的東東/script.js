/**
 * I. 安全模組 (Anti-Debugger & 自動重算)
 */
(function secureLoop() {
    const t = performance.now();
    debugger;
    if (performance.now() - t > 100) {
        document.body.innerHTML = "<h1>PROTOCOL_BREACH</h1>";
        return;
    }
    setTimeout(secureLoop, 10000);
})();

document.addEventListener('contextmenu', e => e.preventDefault());

/**
 * II. 核心引擎
 */
let workOrder = [];
let loadedIdx = 0;
const stream = document.getElementById('gallery-stream');

// 雜訊算法
const getNoise = (seed, len) => {
    let h = Array.from(seed).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
    const n = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        h = Math.imul(48271, h) | 0 % 2147483647;
        n[i] = (h & 0xFF);
    }
    return n;
};

// 載入區塊
async function renderBlock(id) {
    const block = document.createElement('div');
    block.className = 'section-block';
    block.id = `node-${id}`;
    block.innerHTML = `
        <div class="id-tag">LINK_ID: ${id}</div>
        <div class="canvas-container">
            <canvas id="cvs-${id}"></canvas>
            <div id="txt-${id}" class="overlay-desc"></div>
        </div>
    `;
    stream.appendChild(block);

    // 抓取各項 JSON 碎片
    const [dbA, dbB, dbC] = await Promise.all([
        fetch('data_A.json').then(r => r.json()),
        fetch('data_B.json').then(r => r.json()),
        fetch('data_C.json').then(r => r.json())
    ]);

    const infoA = dbA[id], infoB = dbB[id], infoC = dbC[id];
    const canvas = document.getElementById(`cvs-${id}`);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const [imgE, imgK] = await Promise.all([loadImage(infoA.encUrl), loadImage(infoB.keyUrl)]);
    canvas.width = imgE.width; canvas.height = imgE.height;

    // 運算函數
    const compute = () => {
        ctx.drawImage(imgE, 0, 0);
        const dE = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgK, 0, 0);
        const dK = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const seed = infoA.codeA + infoB.codeB + infoC.codeC + id;
        const noise = getNoise(seed, dE.data.length);
        const res = ctx.createImageData(canvas.width, canvas.height);

        for (let i = 0; i < dE.data.length; i += 4) {
            res.data[i]   = dE.data[i] ^ dK.data[i] ^ noise[i];
            res.data[i+1] = dE.data[i+1] ^ dK.data[i+1] ^ noise[i+1];
            res.data[i+2] = dE.data[i+2] ^ dK.data[i+2] ^ noise[i+2];
            res.data[i+3] = 255;
        }
        ctx.putImageData(res, 0, 0);
        
        const txt = document.getElementById(`txt-${id}`);
        txt.innerText = infoC.text;
        txt.style.color = infoC.color;
        txt.style.fontSize = infoC.size;
        block.classList.add('active');
    };

    compute();
    setInterval(compute, 10000); // 10秒強刷邏輯
}

// 滾動調度
stream.addEventListener('scroll', () => {
    if (stream.scrollTop + stream.clientHeight >= stream.scrollHeight - 50) {
        if (loadedIdx < workOrder.length) {
            renderBlock(workOrder[loadedIdx++]);
        }
    }
});

// 初始化
async function init() {
    const res = await fetch('index.json');
    const data = await res.json();
    workOrder = data.order;
    if(workOrder.length > 0) renderBlock(workOrder[loadedIdx++]);
    if(workOrder.length > 1) renderBlock(workOrder[loadedIdx++]); // 預載第二個
}

function loadImage(url) {
    return new Promise(r => { const i = new Image(); i.crossOrigin="Anonymous"; i.onload=()=>r(i); i.src=url; });
}

init();
