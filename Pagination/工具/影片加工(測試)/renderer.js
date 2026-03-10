const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');

const assets = {
    video: document.createElement('video'),
    audio: new Audio(),
    logo: new Image(),
    text: "",
    filter: "none"
};

function startRendering() {
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. 繪製影片 (帶濾鏡)
        if (assets.video.readyState >= 2) {
            ctx.save();
            ctx.filter = assets.filter;
            ctx.drawImage(assets.video, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        // 2. 繪製 Logo
        if (assets.logo.src) {
            ctx.drawImage(assets.logo, canvas.width - 150, 30, 100, 100);
        }

        // 3. 繪製文字
        if (assets.text) {
            ctx.font = "bold 50px Arial";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "black";
            ctx.fillText(assets.text, canvas.width / 2, canvas.height - 80);
        }

        requestAnimationFrame(render);
    }
    render();
}