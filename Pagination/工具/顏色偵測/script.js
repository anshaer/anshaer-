let canvas, ctx;

function loadImage(event) {
    const image = document.getElementById('uploadedImage');
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    image.src = URL.createObjectURL(event.target.files[0]);
    image.onload = function() {
        createColorTable(image);
        loading.style.display = 'none';
    };
}

function createColorTable(image) {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0, image.width, image.height);

    const colorTable = document.getElementById('colorTable').getElementsByTagName('tbody')[0];
    colorTable.innerHTML = ''; // Clear previous table rows

    const colors = new Set();
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
            colors.add(hex);
        }
    }

    colors.forEach(color => {
        const rgb = hexToRgb(color);
        const row = colorTable.insertRow();
        const cellColor = row.insertCell(0);
        const cellHex = row.insertCell(1);
        const cellRgb = row.insertCell(2);

        cellColor.style.backgroundColor = color;
        cellHex.textContent = color;
        cellRgb.textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

        row.onclick = function() {
            displayColorInfo(color, rgb);
        };
    });
}

function pickColor(event) {
    const x = event.offsetX;
    const y = event.offsetY;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    const rgb = { r: pixel[0], g: pixel[1], b: pixel[2] };
    displayColorInfo(hex, rgb);
}

function displayColorInfo(hex, rgb) {
    const colorDisplay = document.getElementById('colorDisplay');
    const colorInfo = document.getElementById('colorInfo');
    colorDisplay.style.backgroundColor = hex;
    colorInfo.textContent = `${hex} - rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}
