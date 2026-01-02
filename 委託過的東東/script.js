/**
 * I. 安全防禦模組 (iPad 兼容版)
 */
const securityCheck = () => {
    const t1 = performance.now();
    for (let i = 0; i < 500000; i++) { Math.sqrt(i); }
    if (performance.now() - t1 > 150) {
        document.body.innerHTML = "<div style='color:var(--pink);padding:50px;text-align:center;'>SEC_ERR: UNSTABLE_ENV</div>";
        return false;
    }
    return true;
};
setInterval(securityCheck, 10000);
document.addEventListener('contextmenu', e => e.preventDefault());

/**
 * II. 加密與載入核心
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

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("LOAD_FAIL"));
        i.src = url;
    });
}

/**
 * III. 貼文渲染引擎
 */
let allPosts = [];
let loadedIdx = 0;
let dbCache = { A: null, B: null, C: null };

async function fetchDatabases() {
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
    const { A, B, C } = await fetchDatabases();

    const post = document.createElement('div');
    post.className = 'post-card';
    const displayIDs = postData.imageIDs.slice(0, 4);

    post.innerHTML = `
        <div class="post-header">// ORIGIN: ${postData.postID}</div>
        <div class="post-description">${postData.description}</div>
        <div class="post-grid grid-${displayIDs.length}" id="grid-${postData.postID}"></div>
    `;
    stream.appendChild(post);

    const grid = document.getElementById(`grid-${postData.postID}`);
    
    displayIDs.forEach(async (resId, idx) => {
        const cvsId = `cvs-${postData.postID}-${idx}`;
        const txtId = `txt-${postData.postID}-${idx}`;
        
        const container = document.createElement('div');
        container.className = 'canvas-container';
        container.innerHTML = `<canvas id="${cvsId}"></canvas><div id="${txtId}" class="overlay-desc"></div>`;
        grid.appendChild(container);

        const resA = A[resId], resB = B[resId], resC = C[resId];
        if (resA && resB && resC) {
            decryptToCanvas(cvsId, txtId, resA, resB, resC, resId, post);
        }
    });
}

async function decryptToCanvas(cvsId, txtId, rA, rB, rC, id, parentPost) {
    const canvas = document.getElementById(cvsId);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    try {
        const [imgE, imgK] = await Promise.all([loadImage(rA.encUrl), loadImage(rB.keyUrl)]);
        canvas.width = imgE.width; canvas.height = imgE.height;

        const run = () => {
            ctx.drawImage(imgE, 0, 0);
            const dE = ctx.getImageData(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imgK, 0, 0);
            const dK = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const seed = rA.codeA + rB.codeB + rC.codeC + id;
            const noise = getNoise(seed, dE.data.length);
            const res = ctx.createImageData(canvas.width, canvas.height);

            for (let i = 0; i < dE.data.length; i += 4) {
                res.data[i] = dE.data[i] ^ dK.data[i] ^ noise[i];
                res.data[i+1] = dE.data[i+1] ^ dK.data[i+1] ^ noise[i+1];
                res.data[i+2] = dE.data[i+2] ^ dK.data[i+2] ^ noise[i+2];
                res.data[i+3] = 255;
            }
            ctx.putImageData(res, 0, 0);
            
            const overlay = document.getElementById(txtId);
            overlay.innerText = rC.text;
            overlay.style.color = rC.color;
            overlay.style.fontSize = rC.size;
            parentPost.classList.add('active');
        };

        run();
        setInterval(run, 10000);
    } catch (e) { console.error(e); }
}

/**
 * IV. 初始化與捲動加載
 */
async function init() {
    try {
        const res = await fetch('posts.json');
        allPosts = await res.json();
        allPosts.reverse(); // 反向排序，最新的在前

        if (allPosts.length > 0) renderPost(allPosts[loadedIdx++]);
        if (allPosts.length > 1) renderPost(allPosts[loadedIdx++]);
    } catch (e) { console.error(e); }
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (loadedIdx < allPosts.length) renderPost(allPosts[loadedIdx++]);
    }
}, { passive: true });

init();
