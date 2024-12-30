const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('upload');
const mosaicSize = document.getElementById('mosaicSize');
const sizeValue = document.getElementById('sizeValue');
const mosaicDensity = document.getElementById('mosaicDensity');
const densityValue = document.getElementById('densityValue');
let img = null;
let isDrawing = false;

// Handle image upload
upload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      scaleCanvas();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// Handle mosaic size range input
mosaicSize.addEventListener('input', () => {
  sizeValue.textContent = mosaicSize.value;
});

// Handle mosaic density range input
mosaicDensity.addEventListener('input', () => {
  densityValue.textContent = mosaicDensity.value;
});

// Scale the canvas to fit within 85% of the window size
function scaleCanvas() {
  const scale = Math.min(0.85 * window.innerWidth / canvas.width, 0.85 * window.innerHeight / canvas.height, 1);
  canvas.style.width = canvas.width * scale + 'px';
  canvas.style.height = canvas.height * scale + 'px';
}

// Apply mosaic effect on mouse move
canvas.addEventListener('mousedown', () => {
  isDrawing = true;
});
canvas.addEventListener('mouseup', () => {
  isDrawing = false;
});
canvas.addEventListener('mousemove', (event) => {
  if (!isDrawing || !img) return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  applyMosaic(x, y);
});

function applyMosaic(x, y) {
  const size = parseInt(mosaicSize.value);
  const density = parseInt(mosaicDensity.value);
  
  for (let i = 0; i < size; i += density) {
    for (let j = 0; j < size; j += density) {
      const pixel = ctx.getImageData(x + i, y + j, 1, 1).data;
      ctx.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
      ctx.fillRect(x + i, y + j, density, density);
    }
  }
}

window.addEventListener('resize', scaleCanvas);
