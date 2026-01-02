/**
 * 核心渲染引擎 - 社群貼文版
 */
async function renderBlock(id) {
    try {
        // 抓取各項 JSON 碎片
        const [dbA, dbB, dbC] = await Promise.all([
            fetch('data_A.json').then(r => r.json()),
            fetch('data_B.json').then(r => r.json()),
            fetch('data_C.json').then(r => r.json())
        ]);

        const infoA = dbA[id], infoB = dbB[id], infoC = dbC[id];
        
        // 建立貼文卡片結構
        const post = document.createElement('div');
        post.className = 'post-card';
        post.id = `post-${id}`;
        
        // C 的資料現在分成兩部分：長敘述 (description) 與 圖片覆蓋文字 (text)
        // 假設你的 JSON C 裡面有多一個欄位叫 "longDesc"
        const longDescription = infoC.longDesc || "這是預設的長篇文字敘述，系統正在解密下方加密內容...";

        post.innerHTML = `
            <div class="post-header">// ORIGIN_ID: ${id}</div>
            <div class="post-description">${longDescription}</div>
            <div class="canvas-container">
                <canvas id="cvs-${id}"></canvas>
                <div id="txt-${id}" class="overlay-desc"></div>
            </div>
        `;
        document.getElementById('gallery-stream').appendChild(post);

        const canvas = document.getElementById(`cvs-${id}`);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // 載入圖片
        const [imgE, imgK] = await Promise.all([
            loadImage(infoA.encUrl), 
            loadImage(infoB.keyUrl)
        ]);
        
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
            
            // 處理圖片上覆蓋的文字
            const txt = document.getElementById(`txt-${id}`);
            txt.innerText = infoC.text;
            txt.style.color = infoC.color;
            txt.style.fontSize = infoC.size;
            post.classList.add('active');
        };

        compute();
        setInterval(compute, 10000); 
    } catch (err) {
        console.error("貼文渲染失敗:", err);
    }
}

// 其餘 init, loadImage, getNoise, scroll 監聽邏輯保持不變...
