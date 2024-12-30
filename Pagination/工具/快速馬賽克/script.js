const upload = document.getElementById('upload');
const mosaicLevelSelect = document.getElementById('mosaicLevel');
const originalCanvas = document.getElementById('originalCanvas');
const mosaicCanvas = document.getElementById('mosaicCanvas');
const originalCtx = originalCanvas.getContext('2d');
const mosaicCtx = mosaicCanvas.getContext('2d');

let originalImage = null;
const maxDimension = 600; // Maximum width or height

// Function to draw the mosaic image
function applyMosaic(image, mosaicLevel) {
    const width = originalCanvas.width;
    const height = originalCanvas.height;

    // Resize the image to a smaller size to create the mosaic effect
    mosaicCtx.clearRect(0, 0, mosaicCanvas.width, mosaicCanvas.height);
    mosaicCtx.drawImage(image, 0, 0, width / mosaicLevel, height / mosaicLevel);

    // Scale the small image back to the original size
    mosaicCtx.drawImage(mosaicCanvas, 0, 0, width / mosaicLevel, height / mosaicLevel, 0, 0, width, height);
}

// Function to handle file upload and display the images
function handleUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;

        img.onload = function() {
            // Calculate the new dimensions while maintaining aspect ratio
            let imgWidth = img.width;
            let imgHeight = img.height;
            if (imgWidth > maxDimension || imgHeight > maxDimension) {
                if (imgWidth > imgHeight) {
                    imgHeight = (maxDimension / imgWidth) * imgHeight;
                    imgWidth = maxDimension;
                } else {
                    imgWidth = (maxDimension / imgHeight) * imgWidth;
                    imgHeight = maxDimension;
                }
            }

            // Set canvas size based on the resized image dimensions
            originalCanvas.width = imgWidth;
            originalCanvas.height = imgHeight;
            mosaicCanvas.width = imgWidth;
            mosaicCanvas.height = imgHeight;

            // Draw the original image on the first canvas
            originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
            originalCtx.drawImage(img, 0, 0, imgWidth, imgHeight);

            // Apply the mosaic effect on the second canvas
            originalImage = img;
            applyMosaic(img, mosaicLevelSelect.value);
        };
    };

    if (file) {
        reader.readAsDataURL(file);
    }
}

// Update the mosaic effect when the mosaic level changes
mosaicLevelSelect.addEventListener('change', function() {
    if (originalImage) {
        applyMosaic(originalImage, mosaicLevelSelect.value);
    }
});

// Handle image upload
upload.addEventListener('change', handleUpload);
