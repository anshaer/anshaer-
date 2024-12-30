document.getElementById('upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const maxDim = 100;
            const scale = Math.min(maxDim / img.width, maxDim / img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const ascii = convertToASCII(imageData);
            document.getElementById('ascii').textContent = ascii;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

function convertToASCII(imageData) {
    const chars = '@%#*+=-:. ';
    let ascii = '';
    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const index = (y * imageData.width + x) * 4;
            const r = imageData.data[index];
            const g = imageData.data[index + 1];
            const b = imageData.data[index + 2];
            const brightness = (r + g + b) / 3;
            const charIndex = Math.floor((brightness / 255) * (chars.length - 1));
            ascii += chars[charIndex];
        }
        ascii += '\n';
    }
    return ascii;
}
