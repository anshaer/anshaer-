// 計算圖像比例並即時顯示 (取整數比例)
function calculateAspectRatio() {
    var screenWidth = parseInt(document.getElementById('screenWidth1').value);
    var screenHeight = parseInt(document.getElementById('screenHeight1').value);

    if (screenWidth > 0 && screenHeight > 0) {
        var aspectWidth = Math.round(screenWidth / gcd(screenWidth, screenHeight));
        var aspectHeight = Math.round(screenHeight / gcd(screenWidth, screenHeight));
        document.getElementById('aspectRatioDisplay').value = aspectWidth + ":" + aspectHeight;
        document.getElementById('screenWidth2').value = screenWidth; // 同步寬度
        document.getElementById('screenHeight2').value = screenHeight; // 同步高度
        calculatePixels(screenWidth, screenHeight);
    }
}

// 計算圖像邊寬換算後的高度或寬度，並顯示圖像尺寸與總像素
function calculateScreenDimensions() {
    var screenWidth = parseInt(document.getElementById('screenWidth1').value);
    var screenHeight = parseInt(document.getElementById('screenHeight1').value);
    var aspectWidth = parseInt(document.getElementById('aspectWidth').value);
    var aspectHeight = parseInt(document.getElementById('aspectHeight').value);
    var fixedOption = document.getElementById('fixedOption').value;

    if (aspectWidth > 0 && aspectHeight > 0) {
        if (fixedOption === 'width') {
            document.getElementById('fixedWidthSection').style.display = 'block';
            document.getElementById('fixedHeightSection').style.display = 'none';
            var calculatedHeight = Math.round(screenWidth * aspectHeight / aspectWidth);
            document.getElementById('calculatedHeight').value = calculatedHeight;
            calculatePixels(screenWidth, calculatedHeight);
        } else if (fixedOption === 'height') {
            document.getElementById('fixedWidthSection').style.display = 'none';
            document.getElementById('fixedHeightSection').style.display = 'block';
            var calculatedWidth = Math.round(screenHeight * aspectWidth / aspectHeight);
            document.getElementById('calculatedWidth').value = calculatedWidth;
            calculatePixels(calculatedWidth, screenHeight);
        }
    }
}

// 計算總像素並顯示百萬像素
function calculatePixels(screenWidth, screenHeight) {
    if (screenWidth > 0 && screenHeight > 0) {
        var totalPixels = screenWidth * screenHeight;
        var megaPixels = (totalPixels / 1000000).toFixed(2);
        document.getElementById('screenSizeResult').innerHTML = "圖像總像素: " + totalPixels.toLocaleString();
        document.getElementById('megaPixels').innerHTML = "百萬像素: " + megaPixels + " MP";
    }
}

// 求最大公因數 (GCD)
function gcd(a, b) {
    return b == 0 ? a : gcd(b, a % b);
}

// 初始載入時觸發計算
window.onload = function() {
    calculateAspectRatio();
    calculateScreenDimensions();
};
