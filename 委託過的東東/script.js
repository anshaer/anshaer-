/**
 * I. iPad 兼容版防禦模組
 */
(function secureLoop() {
    // 檢查是否為移動端 Safari，調整 debugger 頻率防止掛起
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const t = performance.now();
    
    // 如果是電腦端才強制啟動 debugger 循環，手機端適度放寬
    if (!isSafari) {
        debugger; 
    }
    
    if (performance.now() - t > 150) {
        document.body.innerHTML = "<h1>PROTOCOL_BREACH</h1>";
        return;
    }
    setTimeout(secureLoop, 15000); 
})();

/**
 * II. 核心渲染引擎 (加強 CORS 處理)
 */
async function renderBlock(id) {
    try {
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
        document.getElementById('gallery-stream').appendChild(block);

        const [dbA, dbB, dbC] = await Promise.all([
            fetch('data_A.json').then(r => r.json()),
            fetch('data_B.json').then(r => r.json()),
            fetch('data_C.json').then(r => r.json())
        ]);

        const infoA = dbA[id], infoB = dbB[id], infoC = dbC[id];
        const canvas = document.getElementById(`cvs-${id}`);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // iPad 關鍵修正：等待圖片完全載入且處理 CORS 報錯
        const [imgE, imgK] = await Promise.all([
            loadImage(infoA.encUrl), 
            loadImage(infoB.keyUrl)
        ]).catch(err => {
            console.error("圖片加載失敗，可能是 CORS 問題:", err);
            throw err;
        });

        canvas.width = imgE.width; 
        canvas.height = imgE.height;

        const compute = () => {
            // 清除畫布防止殘留
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
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
    } catch (e) {
        console.error("渲染區塊出錯:", e);
    }
}

// 修改後的圖片加載器
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const i = new Image();
        // 必須先設定 Anonymous 再設定 src
        i.crossOrigin = "Anonymous"; 
        i.onload = () => resolve(i);
        i.onerror = (e) => reject(new Error(`無法載入圖片: ${url}`));
        // 加上時間戳防止 iPad 強制緩存舊的無 CORS 圖片
        i.src = url + "?t=" + new Date().getTime();
    });
}
