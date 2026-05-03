const galleryData = [
    { title: '視覺開發與角色設計', desc: '與創作者共同設計的精緻圖像、3D 模型與美術規格書展示。', imgUrl: 'gallery1.jpg' },
    { title: '簡約 UI 介面視覺', desc: '霓虹未來感與暗黑極簡風格的介面設計展示與色系搭配。', imgUrl: 'gallery2.jpg' },
    { title: '動態捕捉與虛擬互動', desc: '將 3D 模型無縫整合，提供更具沉浸感的視覺體驗效果。', imgUrl: 'gallery3.jpg' },
    { title: '互動式網頁專案', desc: '運用輕量化前端技術開發的專案，提供粉絲更具沉浸感的線上微型網站。', imgUrl: 'gallery4.jpg' },
    { title: '硬體與物聯網應用', desc: '結合微控制器與前端感測器的技術支援與客製化程式開發。', imgUrl: 'gallery5.jpg' },
    { title: '數位創作與推廣', desc: '協助創作者打造專屬視覺推廣素材，讓創作被更多人看見。', imgUrl: 'gallery6.jpg' },
    { title: '專案實例七', desc: '第七個專案的詳細說明與資料展示。', imgUrl: 'gallery7.jpg' },
    { title: '專案實例八', desc: '第八個專案的詳細說明與資料展示。', imgUrl: 'gallery8.jpg' },
    { title: '專案-實例九', desc: '第九個專案的詳細說明與資料展示。', imgUrl: 'gallery9.jpg' },
    { title: '專案實例十', desc: '第十個專案的詳細說明與資料展示。', imgUrl: 'gallery10.jpg' }
];

let currentIndex = 0;

function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('active');
}

document.addEventListener("DOMContentLoaded", () => {
    updateGallery(0);
    
    // 手機版觸控滑動
    const largeDisplay = document.getElementById('largeDisplay');
    let startX = 0;

    largeDisplay.addEventListener('touchstart', e => startX = e.touches[0].clientX, { passive: true });
    largeDisplay.addEventListener('touchend', e => {
        const endX = e.changedTouches[0].clientX;
        if (startX - endX > 40) nextImage();
        else if (endX - startX > 40) prevImage();
    }, { passive: true });
});

function updateGallery(index) {
    currentIndex = index;
    
    document.getElementById('largePlaceholder').style.backgroundImage = `url('${galleryData[index].imgUrl}')`;
    document.getElementById('largeTitle').textContent = galleryData[index].title;
    document.getElementById('largeDesc').textContent = galleryData[index].desc;

    // 更新縮圖 active 狀態
    document.querySelectorAll('.thumb-card').forEach((card, i) => {
        card.classList.toggle('active', i === index);
    });
}

function prevImage() {
    currentIndex = (currentIndex - 1 + galleryData.length) % galleryData.length;
    updateGallery(currentIndex);
}

function nextImage() {
    currentIndex = (currentIndex + 1) % galleryData.length;
    updateGallery(currentIndex);
}

// 讓 HTML 的 onclick 可以呼叫
window.updateGallery = updateGallery;
window.prevImage = prevImage;
window.nextImage = nextImage;
window.toggleMenu = toggleMenu;