document.getElementById('file-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                applyNegativeEffect(img, 'red');
                applyNegativeEffect(img, 'blue');
                applyNegativeEffect(img, 'green');
                applyNegativeEffect(img, 'yellow');
                applyInvertedEffect(img, 'red');
                applyInvertedEffect(img, 'blue');
                applyInvertedEffect(img, 'green');
                applyInvertedEffect(img, 'yellow');
                applyBWNegativeEffect(img);
                applyColorInvertedEffect(img);
            };
        };
        reader.readAsDataURL(file);
    }
});

function applyNegativeEffect(img, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        if (color === 'red') {
            data[i] = 255 - data[i];     // Red
            data[i + 1] = 0;             // Green
            data[i + 2] = 0;             // Blue
        } else if (color === 'blue') {
            data[i] = 0;                 // Red
            data[i + 1] = 0;             // Green
            data[i + 2] = 255 - data[i + 2]; // Blue
        } else if (color === 'green') {
            data[i] = 0;                 // Red
            data[i + 1] = 255 - data[i + 1]; // Green
            data[i + 2] = 0;             // Blue
        } else if (color === 'yellow') {
            data[i] = 255 - data[i];     // Red
            data[i + 1] = 255 - data[i + 1]; // Green
            data[i + 2] = 0;             // Blue
        }
    }    
    ctx.putImageData(imageData, 0, 0);
    document.getElementById(`${color}-image`).src = canvas.toDataURL();
}

function applyInvertedEffect(img, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);    
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;    
    for (let i = 0; i < data.length; i += 4) {
        if (color === 'red') {
            data[i] = 255 - (255 - data[i]); // Red Inverted
            data[i + 1] = 255 - data[i + 1]; // Green
            data[i + 2] = 255 - data[i + 2]; // Blue
        } else if (color === 'blue') {
            data[i] = 255 - data[i];         // Red
            data[i + 1] = 255 - data[i + 1]; // Green
            data[i + 2] = 255 - (255 - data[i + 2]); // Blue Inverted
        } else if (color === 'green') {
            data[i] = 255 - data[i];         // Red
            data[i + 1] = 255 - (255 - data[i + 1]); // Green Inverted
            data[i + 2] = 255 - data[i + 2]; // Blue
        } else if (color === 'yellow') {
            data[i] = 255 - (255 - data[i]); // Red Inverted
            data[i + 1] = 255 - (255 - data[i + 1]); // Green Inverted
            data[i + 2] = 255 - data[i + 2]; // Blue
        }
    }    
    ctx.putImageData(imageData, 0, 0);
    document.getElementById(`${color}-inverted-image`).src = canvas.toDataURL();
}

function applyBWNegativeEffect(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = 255 - avg;     // Red
        data[i + 1] = 255 - avg; // Green
        data[i + 2] = 255 - avg; // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
    document.getElementById('bw-negative-image').src = canvas.toDataURL();
}

function applyColorInvertedEffect(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];     // Red
        data[i + 1] = 255 - data[i + 1]; // Green
        data[i + 2] = 255 - data[i + 2]; // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
    document.getElementById('color-inverted-image').src = canvas.toDataURL();
}
