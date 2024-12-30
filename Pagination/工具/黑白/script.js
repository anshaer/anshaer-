document.getElementById('upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const originalImg = document.getElementById('originalImage');
            const bwImg = document.getElementById('bwImage');
            originalImg.src = e.target.result;
            bwImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});
