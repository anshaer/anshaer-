let currentIndex = 0;
const galleryData = [
    { title: '視覺開發與角色設計', desc: '與創作者共同設計的精緻圖像、3D 模型與美術規格書展示。', imgUrl: 'images/gallery1.jpg', tag: '角色與視覺' },
    { title: '簡約 UI 介面視覺', desc: '霓虹未來感與暗黑極簡風格的介面設計展示與色系搭配。', imgUrl: 'images/gallery2.jpg', tag: '介面設計' },
    { title: '動態捕捉與虛擬互動', desc: '將 3D 模型無縫整合，提供更具沉浸感的視覺體驗效果。', imgUrl: 'images/gallery3.jpg', tag: '虛擬互動' },
    { title: '互動式網頁專案', desc: '運用輕量化前端技術開發的專案，提供粉絲更具沉浸感的線上微型網站。', imgUrl: 'images/gallery4.jpg', tag: '互動網頁' },
    { title: '硬體與物聯網應用', desc: '結合微控制器與前端感測器的技術支援與客製化程式開發。', imgUrl: 'images/gallery5.jpg', tag: '物聯網支援' },
    { title: '數位創作與推廣', desc: '協助創作者打造專屬視覺推廣素材，讓創作被更多人看見。', imgUrl: 'images/gallery6.jpg', tag: '創作者推廣' },
    { title: '專案實例七', desc: '第七個專案的詳細說明與資料展示。', imgUrl: 'images/gallery7.jpg', tag: '專案實例七' },
    { title: '專案實例八', desc: '第八個專案的詳細說明與資料展示。', imgUrl: 'images/gallery8.jpg', tag: '專案实例八' },
    { title: '專案-實例九', desc: '第九個專案的詳細說明與資料展示。', imgUrl: 'images/gallery9.jpg', tag: '專案-實例九' },
    { title: '專案實例十', desc: '第十個專案的詳細說明與資料展示。', imgUrl: 'images/gallery10.jpg', tag: '專案實例十' }
];

function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

document.addEventListener("DOMContentLoaded", function() {
    updateGallery(0, galleryData[0].title, galleryData[0].desc, galleryData[0].imgUrl);

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
});

function updateGallery(index, title, desc, imgUrl) {
    currentIndex = index;
    const placeholder = document.getElementById('largePlaceholder');
    placeholder.style.backgroundImage = `url('${imgUrl}')`;

    document.getElementById('largeTitle').innerText = title;
    document.getElementById('largeDesc').innerText = desc;

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
    currentIndex = (currentIndex - 1 + galleryData.length) % galleryData.length;
    updateGallery(currentIndex, galleryData[currentIndex].title, galleryData[currentIndex].desc, galleryData[currentIndex].imgUrl);
}

function nextImage() {
    currentIndex = (currentIndex + 1) % galleryData.length;
    updateGallery(currentIndex, galleryData[currentIndex].title, galleryData[currentIndex].desc, galleryData[currentIndex].imgUrl);
}
