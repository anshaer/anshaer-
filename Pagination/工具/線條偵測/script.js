document.getElementById('upload').addEventListener('change', handleImageUpload);
document.getElementById('threshold').addEventListener('input', handleThresholdChange);

let originalImage = null;

function handleImageUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
            detectEdges();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleThresholdChange() {
    if (originalImage) {
        detectEdges();
    }
}

function detectEdges() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(originalImage);
    const threshold = document.getElementById('threshold').value;

    for (let i = 0; i < originalImage.data.length; i += 4) {
        const r = originalImage.data[i];
        const g = originalImage.data[i + 1];
        const b = originalImage.data[i + 2];
        const avg = (r + g + b) / 3;
        const value = avg > threshold ? 255 : 0;
        imageData.data[i] = value;
        imageData.data[i + 1] = value;
        imageData.data[i + 2] = value;
        imageData.data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
}
