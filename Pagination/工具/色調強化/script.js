document.getElementById('upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const originalImg = document.getElementById('originalImage');
            const enhancedImg = document.getElementById('enhancedImage');
            originalImg.src = e.target.result;
            enhancedImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

const contrastSlider = document.getElementById('contrast');
const saturationSlider = document.getElementById('saturation');
const enhancedImg = document.getElementById('enhancedImage');

function updateFilter() {
    const contrast = contrastSlider.value;
    const saturation = saturationSlider.value;
    enhancedImg.style.filter = `contrast(${contrast}%) saturate(${saturation}%)`;
}

contrastSlider.addEventListener('input', updateFilter);
saturationSlider.addEventListener('input', updateFilter);
