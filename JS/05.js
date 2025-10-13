document.addEventListener('DOMContentLoaded', function() {
    const areaOne = document.getElementById('areaOne');
    const areaTwo = document.getElementById('areaTwo');
    const contentOne = document.getElementById('contentOne');
    const contentTwo = document.getElementById('contentTwo');

    // --- 顏色配置 (保持不變) ---
    const colorSchemes = [
        // ... (顏色配置清單保持不變) ...
        { bg: '#2c3e50', txt: '#ecf0f1' }, 
        { bg: '#e74c3c', txt: '#fefefe' }, 
        { bg: '#3498db', txt: '#1f1f1f' }, 
        { bg: '#1abc9c', txt: '#f1c40f' }, 
        { bg: '#f1c40f', txt: '#c0392b' }, 
        { bg: '#9b59b6', txt: '#ecf0f1' }, 
        { bg: '#fefefe', txt: '#34495e' }, 
        { bg: '#ff7f50', txt: '#364f6b' }, 
    ];

    function getRandomColorPair() {
        const index1 = Math.floor(Math.random() * colorSchemes.length);
        let index2 = index1;
        while (index2 === index1) {
            index2 = Math.floor(Math.random() * colorSchemes.length);
        }
        return [colorSchemes[index1], colorSchemes[index2]];
    }

    // --- 分割模式配置 - 關鍵改動: 加入旋轉角度和微調位置 ---
    const diagonalModes = [
        {
            // 模式一：從右上角斜切到左下角 ( / )
            name: 'Top-Right to Bottom-Left',
            clip1: 'polygon(0 0, 100% 0, 0 100%)', 
            clip2: 'polygon(100% 100%, 100% 0, 0 100%)', 
            
            // 內容定位 (區域一 - 位於左上角的三角形)
            content1Pos: { 
                top: '25%', left: '10%', right: 'auto', bottom: 'auto', textAlign: 'center', 
                // 調整角度 (例如 -25deg) 和位置 (translate) 使文字與斜線平行
                transform: 'rotate(-25deg) translateX(0) translateY(0)' 
            },
            
            // 內容定位 (區域二 - 位於右下角的三角形)
            content2Pos: { 
                top: 'auto', left: 'auto', right: '10%', bottom: '25%', textAlign: 'center', 
                // 調整角度
                transform: 'rotate(-25deg) translateX(0) translateY(0)' 
            }
        },
        {
            // 模式二：從左上角斜切到右下角 ( \ )
            name: 'Top-Left to Bottom-Right',
            clip1: 'polygon(0 0, 100% 0, 100% 100%)', 
            clip2: 'polygon(0 0, 100% 100%, 0 100%)',
            
            // 內容定位 (區域一 - 位於右上角的三角形)
            content1Pos: { 
                top: '25%', left: 'auto', right: '10%', bottom: 'auto', textAlign: 'center', 
                // 調整角度 (例如 25deg)
                transform: 'rotate(25deg) translateX(0) translateY(0)' 
            },
            
            // 內容定位 (區域二 - 位於左下角的三角形)
            content2Pos: { 
                top: 'auto', left: '10%', right: 'auto', bottom: '25%', textAlign: 'center', 
                // 調整角度
                transform: 'rotate(25deg) translateX(0) translateY(0)' 
            }
        }
    ];

    // --- 執行邏輯 (保持不變) ---
    
    // 1. 隨機選擇對角線模式
    const modeIndex = Math.floor(Math.random() * diagonalModes.length);
    const selectedMode = diagonalModes[modeIndex];

    // 2. 隨機選擇對比顏色
    const [colorA, colorB] = getRandomColorPair();

    // 3. 應用樣式
    areaOne.style.backgroundColor = colorA.bg;
    areaOne.style.clipPath = selectedMode.clip1;
    contentOne.style.color = colorA.txt;

    areaTwo.style.backgroundColor = colorB.bg;
    areaTwo.style.clipPath = selectedMode.clip2;
    contentTwo.style.color = colorB.txt;

    // 4. 調整內容定位
    const updateContentPosition = (element, styles) => {
        // 清除舊的樣式
        element.style.top = element.style.left = element.style.right = element.style.bottom = element.style.textAlign = '';
        
        for (const prop in styles) {
            element.style[prop] = styles[prop];
        }
    };
    
    updateContentPosition(contentOne, selectedMode.content1Pos);
    updateContentPosition(contentTwo, selectedMode.content2Pos);
    
    console.log(`頁面已隨機切割：${selectedMode.name}`);
});