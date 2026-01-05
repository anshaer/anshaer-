let allPosts = [];
let loadedIdx = 0;
let dbCache = { A: null, B: null, C: null };
let lbInterval = null;

const showError = (msg) => {
    const s = document.getElementById('loading-status');
    if (s) { s.style.color = "#ff0055"; s.innerHTML = `ERROR: ${msg}`; }
};

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
    i.onerror = () => reject(new Error(`IMG_LOST: ${url}`));
    i.src = url;
});

const formatDesc = (text) => {
    const regex = /\[([^|]+)\|([^\]]+)\]/g;
    return text.replace(regex, '<a href="$2" target="_blank">$1</a>');
};

async function getDB() {
    if (!dbCache.A) {
        const [a, b, c] = await Promise.all([
            fetch('data_A.json').then(r => r.json()),
            fetch('data_B.json').then(r => r.json()),
            fetch('測試C.json').then(r => r.json())
        ]);
        dbCache = { A: a, B: b, C: c };
    }
    return dbCache;
}

async function renderPost(postData) {
    if (!postData) return;
    const stream = document.getElementById('gallery-stream');
    const { A, B, C } = await getDB();
    
    const post = document.createElement('div');
    post.className = 'post-card';
    const displayIDs = postData.imageIDs.slice(0, 4);

    post.innerHTML = `
        <div class="post-header">// SIGNAL: ${postData.postID}</div>
        <div class="post-description">${formatDesc(postData.description)}</div>
        <div class="post-grid grid-${displayIDs.length}" id="grid-${postData.postID}"></div>
    `;
    stream.appendChild(post);

    displayIDs.forEach((resId, idx) => {
        const cvsId = `cvs-${postData.postID}-${idx}`;
        const txtId = `txt-${postData.postID}-${idx}`;
        const container = document.createElement('div');
        container.className = 'canvas-container';
        container.innerHTML = `<canvas id="${cvsId}"></canvas><div id="${txtId}" class="overlay-desc"></div>`;
        document.getElementById(`grid-${postData.postID}`).appendChild(container);

        if (A[resId]) initImageLogic(cvsId, txtId, A[resId], B[resId], C[resId], resId, post);
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
            const noise = getNoise(rA.codeA + rB.codeB + rC.codeC + resId, dE.data.length);
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
                overlay.textContent = rC.text;
                overlay.style.color = rC.color;
                overlay.style.fontSize = isLightbox ? '32px' : rC.size;
                if (isLightbox) overlay.style.opacity = "1";
            }
            parentPost.classList.add('active');
        };

        decrypt(ctx, txtId);
        setInterval(() => decrypt(ctx, txtId), 10000);

        canvas.addEventListener('click', () => {
            const lb = document.getElementById('lightbox');
            const lbCanvas = document.getElementById('lightbox-canvas');
            lbCanvas.width = imgE.width; lbCanvas.height = imgE.height;
            lb.style.display = 'flex';
            decrypt(lbCanvas.getContext('2d'), 'lightbox-text', true);
            if(lbInterval) clearInterval(lbInterval);
            lbInterval = setInterval(() => decrypt(lbCanvas.getContext('2d'), 'lightbox-text', true), 10000);
        });
    } catch (e) { console.error(e); }
}

document.querySelector('.lightbox-close').addEventListener('click', () => {
    document.getElementById('lightbox').style.display = 'none';
    if(lbInterval) clearInterval(lbInterval);
});

async function main() {
    try {
        const res = await fetch('posts.json');
        allPosts = (await res.json()).reverse(); 
        for (let i = 0; i < Math.min(allPosts.length, 3); i++) { await renderPost(allPosts[loadedIdx++]); }
        document.getElementById('loading-status').style.display = 'none';
    } catch (e) { showError(e.message); }
}

window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 600) {
        if (loadedIdx < allPosts.length) renderPost(allPosts[loadedIdx++]);
    }
}, { passive: true });

main();
