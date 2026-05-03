let galleryData = [];
let currentIndex = 0;

function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

document.addEventListener("DOMContentLoaded", async function() {
    // 網域檢查
    const allowedDomains = ["www.anshaer.com", "anshaer.github.io"];
    if (!allowedDomains.includes(window.location.hostname)) {
        document.body.innerHTML = "<h1 style='color:red; text-align:center; margin-top:50px;'>存取被拒：未授權的網域</h1>";
        return;
    }

    try {
        const [promotions, gallery, support, social] = await Promise.all([
            fetch('promotions.json').then(res => res.json()),
            fetch('gallery.json').then(res => res.json()),
            fetch('support.json').then(res => res.json()),
            fetch('social.json').then(res => res.json())
        ]);

        galleryData = gallery;

        // 渲染推廣區塊
        const promoGrid = document.getElementById('promotionGrid');
        promoGrid.innerHTML = promotions.map(item => `
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

        // 渲染圖片集縮圖
        const thumbnails = document.getElementById('thumbnails');
        thumbnails.innerHTML = gallery.map((item, index) => `
            <div class="thumb-card ${index === 0 ? 'active' : ''}" onclick="updateGallery(${index})">
                <div class="thumb-placeholder" style="background-image: url('${item.imgUrl}');"></div>
                <span>${item.tag}</span>
            </div>
        `).join('');

        if (galleryData.length > 0) {
            updateGallery(0);
        }

        // 渲染技術支持區塊
        const supportGrid = document.getElementById('supportGrid');
        supportGrid.innerHTML = support.map(item => `
            <a href="${item.link}" class="support-card">
                <h3>${item.title}</h3>
            </a>
        `).join('');

        // 渲染社群連結區塊
        const socialRow = document.getElementById('socialRow');
        socialRow.innerHTML = social.map(item => `
            <a href="${item.url}" target="_blank" class="social-icon-link" title="${item.name}">
                <i class="${item.icon}"></i>
            </a>
        `).join('');

        // 手機版左右觸控滑動
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
    // 讀取加密圖片 JSON 內的 data 欄位以顯示圖片
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