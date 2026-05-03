let galleryData = [];
let promotionsData = [];
let currentIndex = 0;

function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

document.addEventListener("DOMContentLoaded", async function() {
    // 網域檢查機制：授權網域，封鎖 localhost 與 127.0.0.1 以外的來源
    const allowedDomains = ["www.anshaer.com", "anshaer.github.io"];
    if (!allowedDomains.includes(window.location.hostname)) {
        document.body.innerHTML = "<h1 style='color:red; text-align:center; margin-top:50px;'>存取被拒：未授權的網域</h1>";
        return;
    }

    try {
        // 讀取通用設定檔案
        const [support, social] = await Promise.all([
            fetch('support.json').then(res => res.json()),
            fetch('social.json').then(res => res.json())
        ]);

        // 動態讀取 promotions 資料夾下的 JSON 檔案
        promotionsData = [];
        const totalPromoItems = 2; // 調整為您實際擁有的推廣檔案數量
        for (let i = 1; i <= totalPromoItems; i++) {
            try {
                const response = await fetch(`promotions/promotions${i}.json`);
                if (response.ok) {
                    const item = await response.json();
                    promotionsData.push(item);
                }
            } catch (e) {
                console.warn(`無法讀取 promotions/promotions${i}.json`);
            }
        }

        // 動態讀取 gallery 資料夾下的 JSON 檔案
        galleryData = [];
        const totalGalleryItems = 6; // 調整為您實際擁有的圖片集檔案數量
        for (let i = 1; i <= totalGalleryItems; i++) {
            try {
                const response = await fetch(`gallery/gallery${i}.json`);
                if (response.ok) {
                    const item = await response.json();
                    galleryData.push(item);
                }
            } catch (e) {
                console.warn(`無法讀取 gallery/gallery${i}.json`);
            }
        }

        // 1. 渲染推廣區塊
        const promoGrid = document.getElementById('promotionGrid');
        promoGrid.innerHTML = promotionsData.map(item => `
            <div class="promotion-card">
                <div class="promotion-img" style="background-image: url('${item.imgUrl}');"></div>
                <div class="promotion-content">
                    <h3>${item.title}</h3>
                    <p>${item.desc}</p>
                    <div class="promo-links">
                        <a href="${item.xLink}" target="_blank" title="X"><i class="fab fa-x-twitter"></i></a>
                        <a href="${item.ytLink}" target="_blank" title="YouTube"><i class="fab fa-youtube"></i></a>
                    </div>
                </div>
            </div>
        `).join('');

        // 2. 渲染圖片集縮圖
        const thumbnails = document.getElementById('thumbnails');
        thumbnails.innerHTML = galleryData.map((item, index) => `
            <div class="thumb-card ${index === 0 ? 'active' : ''}" onclick="updateGallery(${index})">
                <div class="thumb-placeholder" style="background-image: url('${item.data || item.imgUrl}');"></div>
                <span>${item.tag || '項目 ' + (index + 1)}</span>
            </div>
        `).join('');

        if (galleryData.length > 0) {
            updateGallery(0);
        }

        // 3. 渲染技術支持區塊
        const supportGrid = document.getElementById('supportGrid');
        supportGrid.innerHTML = support.map(item => `
            <a href="${item.link}" class="support-card">
                <h3>${item.title}</h3>
            </a>
        `).join('');

        // 4. 渲染社群連結區塊
        const socialRow = document.getElementById('socialRow');
        socialRow.innerHTML = social.map(item => `
            <a href="${item.url}" target="_blank" class="social-icon-link" title="${item.name}">
                <i class="${item.icon}"></i>
            </a>
        `).join('');

        // 手機版觸控滑動切換
        const largeDisplay = document.getElementById('largeDisplay');
        let startX = 0;

        largeDisplay.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });

        largeDisplay.addEventListener('touchend', (e) => {
            let endX = e.changedTouches[0].clientX;
            if (startX - endX > 40) {
                nextImage();
            } else if (endX - startX > 40) {
                prevImage();
            }
        }, { passive: true });

    } catch (error) {
        console.error("載入設定失敗：", error);
    }
});

function updateGallery(index) {
    currentIndex = index;
    const item = galleryData[index];
    const placeholder = document.getElementById('largePlaceholder');
    
    // 優先讀取 Data 欄位中的 Base64 內容，若無則降級讀取實體圖
    placeholder.style.backgroundImage = `url('${item.data || item.imgUrl}')`;

    document.getElementById('largeTitle').innerText = item.title;
    document.getElementById('largeDesc').innerText = item.desc;

    const thumbs = document.querySelectorAll('.thumb-card');
    thumbs.forEach((thumb, i) => {
        if (i === index) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

function prevImage() {
    if (galleryData.length === 0) return;
    currentIndex = (currentIndex - 1 + galleryData.length) % galleryData.length;
    updateGallery(currentIndex);
}

function nextImage() {
    if (galleryData.length === 0) return;
    currentIndex = (currentIndex + 1) % galleryData.length;
    updateGallery(currentIndex);
}
