/**
 * I. 安全與工具函式
 */
const securityProtocol = () => {
    const t1 = performance.now();
    for (let i = 0; i < 500000; i++) { Math.atan(i); }
    if (performance.now() - t1 > 150) {
        document.body.innerHTML = "<h2 style='color:red; text-align:center; margin-top:50px;'>SECURITY_ALERT: UNSTABLE_ENV</h2>";
        return false;
    }
    return true;
};
setInterval(securityProtocol, 15000);
document.addEventListener('contextmenu', e => e.preventDefault());

const getNoise = (seed, len) => {
    let h = Array.from(seed).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
    const n = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        h = Math.imul(48271, h) | 0 % 2147483647;
        n[i] = (h & 0xFF);
    }
    return n;
};

const loadImage = (url) => new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("IMG_ERR"));
    i.src = url;
});

/**
 * II. 核心引擎變數
 */
let allPosts = [];
let loadedIdx = 0;
let dbCache = { A: null, B: null, C: null };
let lbInterval = null;

/**
 * III. 渲染與解密引擎
 */
async function getDB() {
    if (!dbCache.A) {
        const [a, b, c] = await Promise.all([
            fetch('data_A.json').then(r => r.json()),
            fetch('data_B.json').then(r => r.json()),
            fetch('data_C.json').then(r => r.json())
        ]);
        dbCache = { A: a, B: b, C: c };
    }
    return dbCache;
}

async function renderPost(postData) {
    const stream = document.getElementById('gallery-stream');
    const { A, B, C } = await getDB();

    const post = document.createElement('div');
    post.className = 'post-card';
    const displayIDs = postData.imageIDs.slice(0, 4);

    post.innerHTML = `
        <div class="post-header">// POST_SIGNAL: ${postData.postID}</div>
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
                overlay.style.fontSize = isLightbox ? '32px' : rC.size;
            }
            parentPost.classList.add('active');
        };

        // 啟動主牆循環
        decrypt(ctx, txtId);
        setInterval(() => decrypt(ctx, txtId), 10000);

        // 燈箱觸發
        canvas.addEventListener('click', () => {
            const lb = document.getElementById('lightbox');
            const lbCanvas = document.getElementById('lightbox-canvas');
            const lbCtx = lbCanvas.getContext('2d', { willReadFrequently: true });

            lbCanvas.width = imgE.width; lbCanvas.height = imgE.height;
            lb.classList.add('show');
            
            decrypt(lbCtx, 'lightbox-text', true);
            if(lbInterval) clearInterval(lbInterval);
            lbInterval = setInterval(() => decrypt(lbCtx, 'lightbox-text', true), 10000);
        });

    } catch (e) { console.log("RESOURCE_ERROR", e); }
}

/**
 * IV. 初始化與捲動控制
 */
document.querySelector('.lightbox-close').addEventListener('click', () => {
    document.getElementById('lightbox').classList.remove('show');
    if(lbInterval) clearInterval(lbInterval);
});

async function main() {
    try {
        const res = await fetch('posts.json');
        allPosts = (await res.json()).reverse(); 
        
        if (allPosts.length > 0) renderPost(allPosts[loadedIdx++]);
        if (allPosts.length > 1) renderPost(allPosts[loadedIdx++]);
    } catch (e) { console.error("INIT_FAIL"); }
}

window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 600) {
        if (loadedIdx < allPosts.length) renderPost(allPosts[loadedIdx++]);
    }
}, { passive: true });

main();
