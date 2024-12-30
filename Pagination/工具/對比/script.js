document.getElementById('colorPicker').addEventListener('input', function(event) {
    const color = event.target.value;
    const contrastColor = getContrastColor(color);

    const blocksToColor = [1, 3, 6, 8, 9, 11, 14, 16];
    const blocksToContrast = [2, 4, 5, 7, 10, 12, 13, 15];

    blocksToColor.forEach(id => {
        const block = document.getElementById(`block${id}`);
        block.style.backgroundColor = color;
        block.style.color = contrastColor;
    });

    blocksToContrast.forEach(id => {
        const block = document.getElementById(`block${id}`);
        block.style.backgroundColor = contrastColor;
        block.style.color = color;
    });
});

function getContrastColor(hex) {
    // Convert hex to RGB
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    // Calculate contrast color (simple inversion)
    const contrastR = 255 - r;
    const contrastG = 255 - g;
    const contrastB = 255 - b;
    // Convert back to hex
    return `#${contrastR.toString(16).padStart(2, '0')}${contrastG.toString(16).padStart(2, '0')}${contrastB.toString(16).padStart(2, '0')}`;
}
