let allPosts = [];
let loadedIdx = 0;
let dbCache = { A: null, B: null, C: null };
let lbInterval = null;

// 工具：顯示診斷錯誤
const showError = (msg) => {
    const status = document.getElementById('loading-status');
    if (status) { status.style.color = "#ff0055"; status.innerHTML = `ERROR: ${msg}`; }
};

// 工具：雜訊生成
const getNoise = (seed, len) => {
    let h = Array.from(seed).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
    const n = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        h = Math.imul(48271, h) | 0 % 2147483647;
        n[i] = (h & 0xFF);
    }
    return n;
};

// 工具：圖片加載
const loadImage = (url) => new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error(`IMAGE_LOST: ${url}`));
    i.src = url;
});

// 1. 抓取資源庫
async function getDB() {
    if (!dbCache.A) {
        try {
            const [a, b, c] = await Promise.all([
                fetch('data_A.json').then(r => r.json()),
                fetch('data_B.json').then(r => r.json()),
                fetch('data_C.json').then(r => r.json())
            ]);
            dbCache = { A: a, B: b, C: c };
        } catch (e) { throw new Error("DATABASE_LOAD_FAILED"); }
    }
    return dbCache;
}

// 2. 渲染貼文
async function renderPost(postData) {
    if (!postData) return;
    const stream = document.getElementById('gallery-stream');
    const { A, B, C } = await getDB();
    
    const post = document.createElement('div');
    post.className = 'post-card';
    const displayIDs = postData.imageIDs.slice(0, 4);

    post.innerHTML = `
        <div class="post-header">// SIGNAL_RECIEVED: ${postData.postID}</div>
        <div class="post-description">${postData.description}</div>
        <div class="post-grid grid-${displayIDs.length}" id="grid-${postData.postID}"></div>
    `;
    stream.appendChild(post);

    const grid = document.getElementById(`grid-${postData.postID}`);
    
    displayIDs.forEach((resId, idx) => {
        const cvsId = `cvs-${postData.postID}-${idx}`;
        const txtId = `txt-${postData.postID}-${idx}`;
        
        const container = document.createElement('div');
        container.className = 'canvas-container';
        container.innerHTML = `<canvas id="${cvsId}"></canvas><div id="${txtId}" class="overlay-desc"></div>`;
        grid.appendChild(container);

        if (A[resId] && B[resId] && C[resId]) {
            initImageLogic(cvsId, txtId, A[resId], B[resId], C[resId], resId, post);
        }
    });
}

// 3. 核心解密與燈箱連動
async function initImageLogic(cvsId, txtId, rA, rB, rC, resId, parentPost) {
    const canvas = document.getElementById(cvsId);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    try {
        const [imgE, imgK] = await Promise.all([loadImage(rA.encUrl), loadImage(rB.keyUrl)]);
        canvas.width = imgE.width; canvas.height = imgE.height;

        const decrypt = (targetCtx, targetTxtId, isLightbox = false) => {
            if (!targetCtx) return;
            targetCtx.drawImage(imgE, 0, 0);
            const dE = targetCtx.getImageData(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);
            targetCtx.drawImage(imgK, 0, 0);
            const dK = targetCtx.getImageData(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);
            
            const seed = rA.codeA + rB.codeB + rC.codeC + resId;
            const noise = getNoise(seed, dE.data.length);
            const res = targetCtx.createImageData(targetCtx.canvas.width, targetCtx.canvas.height);

            for (let i = 0; i < dE.data.length; i += 4) {
                res.data[i] = dE.data[i] ^ dK.data[i] ^ noise[i];
                res.data[i+1] = dE.data[i+1] ^ dK.data[i+1] ^ noise[i+1];
                res.data[i+2] = dE.data[i+2] ^ dK.data[i+2] ^ noise[i+2];
                res.data[i+3] = 255;
            }
            targetCtx.putImageData(res, 0, 0);
            
            const overlay = document.getElementById(targetTxtId);
            if (overlay) {
                overlay.innerText = rC.text;
                overlay.style.color = rC.color;
                overlay.style.fontSize = isLightbox ? '36px' : rC.size;
                if (isLightbox) overlay.style.opacity = "1";
            }
            parentPost.classList.add('active');
        };

        decrypt(ctx, txtId);
        setInterval(() => decrypt(ctx, txtId), 10000);

        canvas.addEventListener('click', () => {
            const lb = document.getElementById('lightbox');
            const lbCanvas = document.getElementById('lightbox-canvas');
            const lbCtx = lbCanvas.getContext('2d', { willReadFrequently: true });
            lbCanvas.width = imgE.width; lbCanvas.height = imgE.height;
            lb.style.display = 'flex';
            decrypt(lbCtx, 'lightbox-text', true);
            if(lbInterval) clearInterval(lbInterval);
            lbInterval = setInterval(() => decrypt(lbCtx, 'lightbox-text', true), 10000);
        });

    } catch (e) { console.error(e); }
}

// 4. 系統初始化 (強化版)
document.querySelector('.lightbox-close').addEventListener('click', () => {
    document.getElementById('lightbox').style.display = 'none';
    if(lbInterval) clearInterval(lbInterval);
});

async function main() {
    try {
        const res = await fetch('posts.json');
        if (!res.ok) throw new Error("MISSING_POSTS_JSON");
        const rawData = await res.json();
        allPosts = rawData.reverse(); 
        
        // 初始先加載前 3 則 (或全部，如果不足 3 則)
        const initialCount = Math.min(allPosts.length, 3);
        for (let i = 0; i < initialCount; i++) {
            await renderPost(allPosts[loadedIdx++]);
        }
        
        document.getElementById('loading-status').style.display = 'none';
    } catch (e) { showError(e.message); }
}

// 捲動監聽 (優化觸發距離)
window.addEventListener('scroll', () => {
    const scrollBottom = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    
    // 距離底部 600px 且還有未載入的貼文時觸發
    if (scrollBottom >= pageHeight - 600) {
        if (loadedIdx < allPosts.length) {
            renderPost(allPosts[loadedIdx++]);
        }
    }
}, { passive: true });

main();
