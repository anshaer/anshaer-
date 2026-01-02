/**
 * I. 安全防禦模組 - 兼容模式
 * 監控執行環境，若偵測到異常延遲（調試器介入）則觸發內容銷毀
 */
const securityProtocol = () => {
    // 透過高強度運算偵測執行速度
    const t1 = performance.now();
    for (let i = 0; i < 500000; i++) { Math.sqrt(i); }
    const t2 = performance.now();

    // 在行動裝置上，若這段運算超過 150ms，通常代表有外部監控或環境不穩
    if (t2 - t1 > 150) {
        document.body.innerHTML = "<div style='color:#ff0055;padding:50px;text-align:center;'><h2>[SECURITY_BREACH]</h2><p>UNUSUAL ENVIRONMENT DETECTED.</p></div>";
        return false;
    }
    return true;
};

// 啟動 10 秒週期性安全掃描
setInterval(securityProtocol, 10000);

// 禁用右鍵選單防止直接抓圖
document.addEventListener('contextmenu', e => e.preventDefault());

/**
 * II. 加密計算核心
 */
const getNoise = (seed, len) => {
    let h = Array.from(seed).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
    const n = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        h = Math.imul(48271, h) | 0 % 2147483647;
        n[i] = (h & 0xFF);
    }
    return n;
};

/**
 * III. 資源加載器
 */
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const i = new Image();
        // 必須先設置 crossOrigin 以便於 canvas 讀取像素
        i.crossOrigin = "anonymous"; 
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error(`IMAGE_LOAD_FAILED: ${url}`));
        i.src = url;
    });
}

/**
 * IV. 渲染引擎 - 社群貼文模式
 */
let workOrder = [];
let loadedIdx = 0;
const stream = document.getElementById('gallery-stream');

async function renderBlock(id) {
    try {
        // 1. 同步抓取碎片資料
        const [dbA, dbB, dbC] = await Promise.all([
            fetch('data_A.json').then(r => r.json()),
            fetch('data_B.json').then(r => r.json()),
            fetch('data_C.json').then(r => r.json())
        ]);

        const infoA = dbA[id], infoB = dbB[id], infoC = dbC[id];
        if (!infoA || !infoB || !infoC) return;

        // 2. 建立社群貼文 DOM 結構
        const post = document.createElement('div');
        post.className = 'post-card';
        post.id = `post-${id}`;

        const longDesc = infoC.longDesc || "// NO_DESCRIPTION_AVAILABLE //";

        post.innerHTML = `
            <div class="post-header">// LINK_ID: ${id}</div>
            <div class="post-description">${longDesc}</div>
            <div class="canvas-container">
                <canvas id="cvs-${id}"></canvas>
                <div id="txt-${id}" class="overlay-desc"></div>
            </div>
        `;
        stream.appendChild(post);

        // 3. 獲取 Canvas 上下文
        const canvas = document.getElementById(`cvs-${id}`);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // 4. 加載加密圖與密鑰圖
        const [imgE, imgK] = await Promise.all([
            loadImage(infoA.encUrl), 
            loadImage(infoB.keyUrl)
        ]);
        
        canvas.width = imgE.width; 
        canvas.height = imgE.height;

        // 5. 解密與渲染邏輯
        const runSync = () => {
            if (!ctx) return;
            
            // 繪製與提取像素
            ctx.drawImage(imgE, 0, 0);
            const dE = ctx.getImageData(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imgK, 0, 0);
            const dK = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // 複合種子生成
            const seed = infoA.codeA + infoB.codeB + infoC.codeC + id;
            const noise = getNoise(seed, dE.data.length);
            const result = ctx.createImageData(canvas.width, canvas.height);

            // XOR 邏輯運算
            for (let i = 0; i < dE.data.length; i += 4) {
                result.data[i]     = dE.data[i] ^ dK.data[i] ^ noise[i];
                result.data[i + 1] = dE.data[i + 1] ^ dK.data[i + 1] ^ noise[i + 1];
                result.data[i + 2] = dE.data[i + 2] ^ dK.data[i + 2] ^ noise[i + 2];
                result.data[i + 3] = 255; // 確保不透明
            }
            ctx.putImageData(result, 0, 0);
            
            // 渲染圖片中心覆蓋文字
            const overlayText = document.getElementById(`txt-${id}`);
            overlayText.innerText = infoC.text;
            overlayText.style.color = infoC.color || "#00f2ff";
            overlayText.style.fontSize = infoC.size || "20px";
            
            // 觸發漸顯效果
            post.classList.add('active');
        };

        // 執行初次渲染
        runSync();

        // 依要求：每 10 秒重新計算還原一次，對抗記憶體竄改
        setInterval(runSync, 10000);

    } catch (err) {
        console.error("BLOCK_INIT_FAILED:", err);
    }
}

/**
 * V. 滾動與初始化調度
 */
const handleScroll = () => {
    const scrollPos = stream.scrollTop + stream.clientHeight;
    const threshold = stream.scrollHeight - 200; // 距離底部 200px 觸發載入

    if (scrollPos >= threshold && loadedIdx < workOrder.length) {
        renderBlock(workOrder[loadedIdx++]);
    }
};

// 使用被動監聽優化行動端捲動效能
stream.addEventListener('scroll', handleScroll, { passive: true });

async function initGallery() {
    try {
        // 讀取主控清單
        const res = await fetch('index.json');
        const data = await res.json();
        workOrder = data.order || [];

        // 初始載入：首篇貼文
        if (workOrder.length > 0) {
            renderBlock(workOrder[loadedIdx++]);
        }
        
        // 視寬度嘗試預載第二篇
        if (workOrder.length > 1 && window.innerHeight > 800) {
            renderBlock(workOrder[loadedIdx++]);
        }
    } catch (e) {
        console.error("GALLERY_INIT_ERROR:", e);
    }
}

// 啟動系統
window.addEventListener('DOMContentLoaded', initGallery);
