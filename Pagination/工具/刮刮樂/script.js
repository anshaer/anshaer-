document.addEventListener('DOMContentLoaded', function () {
    const settingsBtn = document.getElementById('settings-btn');
    const instructionsBtn = document.getElementById('instructions-btn');
    const settingsModal = document.getElementById('settings-modal');
    const instructionsModal = document.getElementById('instructions-modal');
    const scratchCardModal = document.getElementById('scratch-card-modal');
    const closeButtons = document.querySelectorAll('.close');
    const saveSettingsBtn = document.getElementById('save-settings');
    const addPrizeBtn = document.getElementById('add-prize');
    const prizeSettings = document.getElementById('prize-settings');
    const thumbnailContainer = document.getElementById('thumbnail-container');
    const scratchCanvas = document.getElementById('scratch-canvas');
    const scratchResult = document.getElementById('scratch-result');

    let cardCount = 10;
    let silverColor = '#cccccc';
    let backgroundColor = '#ffffff';
    let backgroundImage = '';
    let scratchPattern = '';
    let modalBackgroundColor = '#ffffff';
    let modalBackgroundImage = '';
    let prizeMap = new Map();
    let scratchedCards = new Set();

    let isDrawing = false;
    let ctx = scratchCanvas.getContext('2d');

    // 打開設定彈窗
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });

    // 打開使用說明彈窗
    instructionsBtn.addEventListener('click', () => {
        instructionsModal.style.display = 'block';
    });

    // 關閉彈窗
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            settingsModal.style.display = 'none';
            instructionsModal.style.display = 'none';
            scratchCardModal.style.display = 'none';
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            // 檢查點擊的區域是否是 modal-content 以外
            if (!event.target.closest('.modal-content')) {
                modal.style.display = 'none';
            }
        });
    });

    // 保存設定
    saveSettingsBtn.addEventListener('click', () => {
        cardCount = parseInt(document.getElementById('card-count').value);
        silverColor = document.getElementById('silver-color').value;
        backgroundColor = document.getElementById('background-color').value;
        backgroundImage = document.getElementById('background-image').value;
        scratchPattern = document.getElementById('scratch-pattern').value;
        modalBackgroundColor = document.getElementById('modal-background-color').value;
        modalBackgroundImage = document.getElementById('modal-background-image').value;

        // 更新 modal-content 的背景顏色和圖片
        const modalContents = document.querySelectorAll('.modal-content');
        modalContents.forEach(modalContent => {
            modalContent.style.backgroundColor = modalBackgroundColor;
            if (modalBackgroundImage) {
                modalContent.style.backgroundImage = `url(${modalBackgroundImage})`;
                modalContent.style.backgroundSize = 'cover';
                modalContent.style.backgroundPosition = 'center';
            } else {
                modalContent.style.backgroundImage = '';
            }
        });

        // 清空舊的獎項設定
        prizeMap.clear();

        // 讀取獎項名稱和卡號
        document.querySelectorAll('.prize').forEach(prize => {
            const prizeName = prize.querySelector('.prize-name').value;
            const cardsInput = prize.querySelector('.prize-cards').value;
            const cards = cardsInput.split(',').map(Number).filter(card => !isNaN(card));

            if (prizeName && cards.length > 0) {
                prizeMap.set(prizeName, cards);
            }
        });

        // 清空已刮開的卡片
        scratchedCards.clear();

        // 重新生成縮圖
        generateThumbnails();

        // 關閉設定彈窗
        settingsModal.style.display = 'none';
    });

    // 新增獎項
    addPrizeBtn.addEventListener('click', () => {
        const newPrize = document.createElement('div');
        newPrize.className = 'prize';
        newPrize.innerHTML = `
            <label>獎項名稱:</label>
            <input type="text" class="prize-name" placeholder="例如: 特別獎">
            <label>獎項卡號 (逗號分隔):</label>
            <input type="text" class="prize-cards" placeholder="例如: 10,11,12">
        `;
        prizeSettings.appendChild(newPrize);
    });

    // 生成縮圖
    function generateThumbnails() {
        thumbnailContainer.innerHTML = '';
        for (let i = 1; i <= cardCount; i++) {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'thumbnail';
            thumbnail.dataset.cardNumber = i;

            if (scratchPattern) {
                const img = document.createElement('img');
                img.src = scratchPattern;
                img.alt = `刮刮卡 ${i}`;
                thumbnail.appendChild(img);
            }

            const cardNumber = document.createElement('div');
            cardNumber.className = 'card-number';
            cardNumber.textContent = `卡號: ${i}`;
            thumbnail.appendChild(cardNumber);

            // 如果卡片已刮開，顯示刮開狀態
            if (scratchedCards.has(i)) {
                thumbnail.style.backgroundColor = backgroundColor;
                if (backgroundImage) {
                    thumbnail.style.backgroundImage = `url(${backgroundImage})`;
                    thumbnail.style.backgroundSize = 'cover';
                }
            }

            thumbnail.addEventListener('click', () => showScratchCard(i));
            thumbnailContainer.appendChild(thumbnail);
        }
    }

    // 顯示刮刮卡
    function showScratchCard(cardNumber) {
        scratchCanvas.width = 300;
        scratchCanvas.height = 200;
        scratchResult.textContent = getPrizeByCardNumber(cardNumber);

        // 設置背景顏色和圖片
        scratchResult.style.backgroundColor = backgroundColor;
        if (backgroundImage) {
            const img = new Image();
            img.src = backgroundImage;
            img.onload = () => {
                scratchResult.style.backgroundImage = `url(${backgroundImage})`;
            };
            img.onerror = () => {
                scratchResult.style.backgroundImage = '';
            };
        } else {
            scratchResult.style.backgroundImage = '';
        }

        // 設置刮刮卡圖案
        if (scratchPattern) {
            const img = new Image();
            img.src = scratchPattern;
            img.onload = () => {
                ctx.drawImage(img, 0, 0, scratchCanvas.width, scratchCanvas.height);
            };
        }

        // 初始化畫布（銀漆層）
        ctx.fillStyle = silverColor;
        ctx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);

        // 綁定刮開事件
        scratchCanvas.addEventListener('mousedown', startDrawing);
        scratchCanvas.addEventListener('mousemove', draw);
        scratchCanvas.addEventListener('mouseup', stopDrawing);
        scratchCanvas.addEventListener('mouseleave', stopDrawing);

        // 標記卡片為已刮開
        scratchedCards.add(cardNumber);

        scratchCardModal.style.display = 'block';
    }

    // 刮開效果
    function startDrawing(e) {
        isDrawing = true;
        ctx.globalCompositeOperation = 'destination-out';
        draw(e);
    }

    function draw(e) {
        if (!isDrawing) return;
        const rect = scratchCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }

    function stopDrawing() {
        isDrawing = false;
        generateThumbnails();
    }

    // 根據卡號獲取獎項
    function getPrizeByCardNumber(cardNumber) {
        for (const [prizeName, cards] of prizeMap.entries()) {
            if (cards.includes(cardNumber)) {
                return prizeName;
            }
        }
        return '銘謝惠顧';
    }

    // 初始化
    generateThumbnails();
});