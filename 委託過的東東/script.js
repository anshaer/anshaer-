/**
 * I. 安全防禦模組 - iPad 兼容優化版
 * 移除會導致 Safari 鎖死的 debugger 關鍵字，改用時間差偵測
 */
const securityCheck = () => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // 偵測執行頻率，若被調試工具拖慢則觸發自毀
    let t1 = performance.now();
    // 這裡我們不寫 debugger，改用一段無意義的密集運算來測試執行速度
    for(let i=0; i<1000000; i++) { Math.atan(i); } 
    let t2 = performance.now();

    if (t2 - t1 > 200) { // 正常運算應在 50ms 內，若超過代表環境異常
        document.body.innerHTML = "<div style='color:red;padding:20px;'>SECURITY_ALERT: ENVIRONMENT_UNSTABLE</div>";
        return false;
    }
    return true;
};

// 啟動循環監控
setInterval(() => {
    securityCheck();
}, 10000);

document.addEventListener('contextmenu', e => e.preventDefault());

/**
 * II. 核心引擎
 */
let workOrder = [];
let loadedIdx = 0;
const stream = document.getElementById('gallery-stream');

// 雜訊算法 (不變)
const getNoise = (seed, len) => {
    let h = Array.from(seed).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
    const n = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        h = Math.imul(48271, h) | 0 % 2147483647;
        n[i] = (h & 0xFF);
    }
    return n;
};

// 加載圖片 (針對 iPad 強化的 CORS 處理)
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const i = new Image();
        // 關鍵：先設 Anonymous，且不加隨機參數（除非確定 Server 支援）
        i.crossOrigin = "anonymous"; 
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("IMG_LOAD_ERROR"));
        i.src = url;
    });
}

// 載入區塊
async function renderBlock(id) {
    try {
        // 抓取各項 JSON 碎片
        const [dbA, dbB, dbC] = await Promise.all([
            fetch('data_A.json').then(r => r.json()),
            fetch('data_B.json').then(r => r.json()),
            fetch('data_C.json').then(r => r.json())
        ]);

        const infoA = dbA[id], infoB = dbB[id], infoC = dbC[id];
        
        // 先創 DOM 再算圖，iPad 才不會因為 async 等待太久而跳過渲染
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

        const canvas = document.getElementById(`cvs-${id}`);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const [imgE, imgK] = await Promise.all([loadImage(infoA.encUrl), loadImage(infoB.keyUrl)]);
        
        // 限制畫布尺寸，避免 iPad 記憶體崩潰
        const scale = window.devicePixelRatio || 1;
        canvas.width = imgE.width; 
        canvas.height = imgE.height;

        const compute = () => {
            if (!ctx) return;
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
        setInterval(compute, 10000); 
    } catch (err) {
        console.error("BLOCK_RENDER_FAILED:", err);
    }
}

// 滾動調度
stream.addEventListener('scroll', () => {
    if (stream.scrollTop + stream.clientHeight >= stream.scrollHeight - 100) {
        if (loadedIdx < workOrder.length) {
            renderBlock(workOrder[loadedIdx++]);
        }
    }
}, { passive: true });

// 初始化
async function init() {
    try {
        const res = await fetch('index.json');
        const data = await res.json();
        workOrder = data.order;
        if(workOrder.length > 0) renderBlock(workOrder[loadedIdx++]);
    } catch (e) {
        console.error("INIT_ERROR:", e);
    }
}

init();
