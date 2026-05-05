document.addEventListener("DOMContentLoaded", () => {
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('無法讀取 JSON 資料');
            }
            return response.json();
        })
        .then(data => {
            // 1. 設定頁面標題
            document.getElementById("page-title").textContent = data.title;

            // 2. 渲染多筆推廣內容
            const promoList = document.getElementById("promo-list");
            promoList.innerHTML = '';
            
            data.promo.forEach(item => {
                const promoItem = document.createElement("div");
                promoItem.className = "promo-flex-box";
                promoItem.innerHTML = `
                    <div class="promo-media">
                        <img src="${item.imageUrl}" alt="${item.title}">
                    </div>
                    <div class="promo-content">
                        <div class="promo-title-box">${item.title}</div>
                        <div class="promo-desc-box">${item.description}</div>
                        <div class="promo-links">
                            <a href="${item.ytUrl}" class="promo-link-item" target="_blank">
                                <i class="fab fa-youtube"></i> ${item.channel1Name}
                            </a>
                            <a href="${item.xUrl}" class="promo-link-item" target="_blank">
                                <i class="fa-solid fa-hashtag"></i> ${item.channel2Name}
                            </a>
                        </div>
                    </div>
                `;
                promoList.appendChild(promoItem);
            });

            // 3. 圖片集輪播邏輯
            let currentIndex = 0;
            const galleryImg = document.getElementById("gallery-img");
            const galleryCaption = document.getElementById("gallery-caption");
            const prevBtn = document.getElementById("prev-btn");
            const nextBtn = document.getElementById("next-btn");

            const updateGallery = () => {
                if (data.gallery && data.gallery.length > 0) {
                    const currentItem = data.gallery[currentIndex];
                    galleryImg.src = currentItem.url;
                    galleryImg.alt = currentItem.title;
                    galleryCaption.textContent = currentItem.title;
                }
            };

            if (data.gallery && data.gallery.length > 0) {
                updateGallery();

                prevBtn.addEventListener("click", () => {
                    currentIndex = (currentIndex - 1 + data.gallery.length) % data.gallery.length;
                    updateGallery();
                });

                nextBtn.addEventListener("click", () => {
                    currentIndex = (currentIndex + 1) % data.gallery.length;
                    updateGallery();
                });
            }

            // 4. 渲染技術支援連結 (網格)
            const supportGrid = document.getElementById("support-grid");
            supportGrid.innerHTML = '';
            data.support.forEach(item => {
                const link = document.createElement("a");
                link.href = item.url;
                link.className = "support-link-item";
                link.textContent = item.title;
                supportGrid.appendChild(link);
            });

            // 5. 渲染社群 Icons
            const socialIcons = document.getElementById("social-icons");
            socialIcons.innerHTML = `
                <a href="${data.social.x}" target="_blank" class="social-icon" title="X"><i class="fa-solid fa-hashtag"></i></a>
                <a href="${data.social.yt}" target="_blank" class="social-icon" title="YouTube"><i class="fab fa-youtube"></i></a>
                <a href="${data.social.twitch}" target="_blank" class="social-icon" title="Twitch"><i class="fab fa-twitch"></i></a>
                <a href="mailto:${data.social.email}" class="social-icon" title="傳送 Email"><i class="fas fa-envelope"></i></a>
            `;
        })
        .catch(error => {
            console.error("載入錯誤:", error);
        });
});
