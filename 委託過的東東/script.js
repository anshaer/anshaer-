// 全域變數
let allPosts = [];
let loadedIdx = 0;
let dbCache = { A: null, B: null, C: null };
let lbInterval = null;

// 工具：顯示螢幕錯誤訊息 (診斷用)
const showError = (msg) => {
    const status = document.getElementById('loading-status');
    if (status) {
        status.style.color = "#ff0055";
        status.innerHTML = `ERROR: ${msg}`;
    }
};

// 工具：雜訊算法
const getNoise = (seed, len) => {
    let h = Array.from(seed).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
    const n = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        h = Math.imul(48271, h) | 0 % 2147483647;
        n[i] = (h & 0xFF);
    }
    return n;
};

// 工具：圖片加載 (加上跨域與防快取)
const loadImage = (url) => new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error(`無法讀取圖片: ${url}`));
    i.src = url;
});

// 核心：抓取資料庫
async function getDB() {
    if (!dbCache.A) {
        try {
            const [a, b, c] = await Promise.all([
                fetch('data_A.json').then(r => { if(!r.ok) throw 'A'; return r.json(); }),
                fetch('data_B.json').then(r => { if(!r.ok) throw 'B'; return r.json(); }),
                fetch('data_C.json').then(r => { if(!r.ok) throw 'C'; return r.json(); })
            ]);
            dbCache = { A: a, B: b, C: c };
        } catch (e) {
            throw new Error(`資料庫檔案讀取失敗 (data_${e}.json)`);
        }
    }
    return dbCache;
}

// 核心：渲染單一貼文
async function renderPost(postData) {
    const stream = document.getElementById('gallery-stream');
    const { A, B, C } = await getDB();
    
    const post = document.createElement('div');
    post.className = 'post-card';
    const displayIDs = postData.imageIDs.slice(0, 4);

    post.innerHTML = `
        <div class="post-header">// SIGNAL: ${postData.postID}</div>
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
        } else {
            console.error(`找不到資源 ID: ${resId}`);
        }
    });
}

// 核心：Canvas 解密邏輯
async function initImageLogic(cvsId, txtId, rA, rB, rC, resId, parentPost) {
    const canvas = document.getElementById(cvsId);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    try {
        const [imgE, imgK] = await Promise.all([loadImage(rA.encUrl), loadImage(rB.keyUrl)]);
        canvas.width = imgE.width; 
        canvas.height = imgE.height;

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

        decrypt(ctx, txtId);
        setInterval(() => decrypt(ctx, txtId), 10000);

        // 燈箱點擊
        canvas.addEventListener('click', () => {
            const lb = document.getElementById('lightbox');
            const lbCanvas = document.getElementById('lightbox-canvas');
            const lbCtx = lbCanvas.getContext('2d', { willReadFrequently: true });
            lbCanvas.width = imgE.width; 
            lbCanvas.height = imgE.height;
            lb.classList.add('show');
            decrypt(lbCtx, 'lightbox-text', true);
            if(lbInterval) clearInterval(lbInterval);
            lbInterval = setInterval(() => decrypt(lbCtx, 'lightbox-text', true), 10000);
        });

    } catch (e) {
        console.error(e.message);
    }
}

// 燈箱關閉
document.querySelector('.lightbox-close').addEventListener('click', () => {
    document.getElementById('lightbox').classList.remove('show');
    if(lbInterval) clearInterval(lbInterval);
});

// 初始化入口
async function main() {
    try {
        const res = await fetch('posts.json');
        if (!res.ok) throw new Error("找不到 posts.json");
        allPosts = (await res.json()).reverse(); 
        
        if (allPosts.length > 0) {
            await renderPost(allPosts[loadedIdx++]);
            document.getElementById('loading-status').style.display = 'none';
        } else {
            showError("posts.json 內沒有貼文數據");
        }
    } catch (e) { 
        showError(e.message);
    }
}

// 無限捲動
window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        if (loadedIdx < allPosts.length) {
            renderPost(allPosts[loadedIdx++]);
        }
    }
}, { passive: true });

main();
