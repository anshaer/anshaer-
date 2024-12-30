const upload = document.getElementById('upload');
const colorPicker = document.getElementById('colorPicker');
const leftPercentage = document.getElementById('leftPercentage');
const rightPercentage = document.getElementById('rightPercentage');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let originalImageData = null;

upload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            changeColors();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

colorPicker.addEventListener('input', changeColors);
leftPercentage.addEventListener('input', changeColors);
rightPercentage.addEventListener('input', changeColors);

function changeColors() {
    if (!originalImageData) return;
    ctx.putImageData(originalImageData, 0, 0); // 重置為原圖
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const selectedColor = hexToRgb(colorPicker.value);
    const leftHeightLimit = canvas.height * (leftPercentage.value / 100);
    const rightHeightLimit = canvas.height * (rightPercentage.value / 100);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const heightLimit = leftHeightLimit + (rightHeightLimit - leftHeightLimit) * (x / canvas.width);
            if (data[index + 3] !== 0) { // 檢查透明度
                if (y < heightLimit) {
                    data[index] = selectedColor.r;     // Red
                    data[index + 1] = selectedColor.g; // Green
                    data[index + 2] = selectedColor.b; // Blue
                }
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}
