document.addEventListener("DOMContentLoaded", () => {
    // 透過 Fetch 載入 JSON 資料
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // 1. 設定標題
            document.getElementById("page-title").textContent = data.title;
            
            // 2. 渲染推廣區塊
            const promoContent = document.getElementById("promo-content");
            promoContent.innerHTML = `
                <h3>${data.promo.title}</h3>
                <p>${data.promo.description}</p>
                <a href="${data.promo.linkUrl}" style="color: var(--mint-dark); font-weight: bold;">${data.promo.linkText}</a>
            `;
            
            // 3. 渲染圖片集區塊
            const galleryGrid = document.getElementById("gallery-grid");
            data.gallery.forEach(item => {
                const itemDiv = document.createElement("div");
                itemDiv.className = "grid-item";
                itemDiv.innerHTML = `
                    <img src="${item.url}" alt="${item.title}">
                    <p>${item.title}</p>
                `;
                galleryGrid.appendChild(itemDiv);
            });
            
            // 4. 渲染技術支援區塊
            const supportContent = document.getElementById("support-content");
            supportContent.innerHTML = `
                <h3>${data.support.title}</h3>
                <p>${data.support.description}</p>
                <p>聯絡信箱：<a href="mailto:${data.support.email}" style="color: var(--mint-dark); font-weight: bold;">${data.support.email}</a></p>
            `;
            
            // 5. 渲染社群連結區塊
            const communityList = document.getElementById("community-list");
            data.community.forEach(item => {
                const li = document.createElement("li");
                li.innerHTML = `<a href="${item.url}" target="_blank">${item.name}</a>`;
                communityList.appendChild(li);
            });
        })
        .catch(error => {
            console.error("載入 JSON 資料錯誤:", error);
        });
});
