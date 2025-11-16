let watchID;
let lastPosition = null;
let smoothedSpeed_m_s = 0;

// --- 核心邏輯配置 ---
const SMOOTHING_FACTOR = 0.2;
const SMOOTHING_FACTOR_LOW = 0.5;
const ZERO_THRESHOLD_KMH = 0.2;
const HIGH_SPEED_THRESHOLD_KMH = 3.0;
const EARTH_RADIUS_M = 6371000;

// 單位轉換常數 (從 m/s 轉換為目標單位)
const CONVERSION_FACTORS = {
    'km/h': 3.6,        
    'mph': 2.23694,     
    'kn': 1.94384      
};

// --- 廣告輪播相關變數 ---
const ads = [
    { img: 'https://via.placeholder.com/400x120/007bff/ffffff?text=Ad+1', link: 'https://www.google.com' },
    { img: 'https://via.placeholder.com/400x120/28a745/ffffff?text=Ad+2', link: 'https://www.youtube.com' },
    { img: 'https://via.placeholder.com/400x120/ffc107/000000?text=Ad+3', link: 'https://www.bing.com' }
];
let currentAdIndex = 0;
let adInterval;
const AD_ROTATION_INTERVAL = 5000; // 廣告切換間隔 (毫秒)
// ------------------

// --- 多語言翻譯文本 ---
const translations = {
    'zh-TW': {
        'title': 'GPS 測速測試 (多語言)',
        'lang-select-title': '切換語言',
        'unit-select-title': '速度單位',
        'main-title': 'GPS 測速測試',
        'label-calc-speed': '計算時速 (原始)：',
        'label-accuracy': '定位精度：',
        'label-source': '訊號來源：',
        'label-location': '當前位置：',
        'startBtn': '開始追蹤',
        'stopBtn': '停止追蹤',
        'status-on': '移動中',
        'status-off': '已靜止',
        'speed-source-calc': '計算值 (Haversine)',
        'speed-source-gps': '內建值 (裝置 GPS)',
        'unit-accuracy': '公尺',
        'msg-locating': '定位中...',
        'msg-stopped': '已停止',
        'msg-waiting': '等待訊號...',
        'err-perm': '拒絕授權 (請允許存取)',
        'err-signal': '訊號不可用',
        'err-timeout': '定位超時',
        'err-unknown': '未知錯誤'
    },
    'en-US': {
        'title': 'GPS Speed Test (Multi-language)',
        'lang-select-title': 'Select Language',
        'unit-select-title': 'Speed Unit',
        'main-title': 'GPS Speed Test',
        'label-calc-speed': 'Calculated Speed (Raw):',
        'label-accuracy': 'Accuracy:',
        'label-source': 'Source:',
        'label-location': 'Location:',
        'startBtn': 'Start Tracking',
        'stopBtn': 'Stop Tracking',
        'status-on': 'Moving',
        'status-off': 'Stopped',
        'speed-source-calc': 'Calculated (Haversine)',
        'speed-source-gps': 'Built-in (Device GPS)',
        'unit-accuracy': 'Meters',
        'msg-locating': 'Locating...',
        'msg-stopped': 'Stopped',
        'msg-waiting': 'Waiting for signal...',
        'err-perm': 'Permission Denied',
        'err-signal': 'Signal Unavailable',
        'err-timeout': 'Timeout',
        'err-unknown': 'Unknown Error'
    },
    'ja-JP': {
        'title': 'GPS 速度テスト (多言語)',
        'lang-select-title': '言語切り替え',
        'unit-select-title': '速度単位',
        'main-title': 'GPS 速度テスト',
        'label-calc-speed': '計算速度 (生データ):',
        'label-accuracy': '精度:',
        'label-source': '信号源:',
        'label-location': '現在地:',
        'startBtn': '追跡開始',
        'stopBtn': '追跡停止',
        'status-on': '移動中',
        'status-off': '停止中',
        'speed-source-calc': '計算値 (Haversine)',
        'speed-source-gps': '内蔵値 (デバイス GPS)',
        'unit-accuracy': 'メートル',
        'msg-locating': '測位中...',
        'msg-stopped': '停止しました',
        'msg-waiting': '信号待機中...',
        'err-perm': 'アクセス拒否',
        'err-signal': '信号利用不可',
        'err-timeout': 'タイムアウト',
        'err-unknown': '不明なエラー'
    }
};

let currentLang = 'zh-TW';

// 初始化應用程式 (頁面載入時呼叫)
function initApp() {
    setLanguage('zh-TW'); // 預設語言
    initAdCarousel();     // 初始化廣告
}

// 數學函式：將角度轉為弧度
function toRad(degrees) { 
    return degrees * Math.PI / 180; 
}

// 數學函式：計算兩點之間的球面距離 (Haversine 公式)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = EARTH_RADIUS_M; 
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 轉換速度單位
function convertSpeed(speed_m_s, unit) {
    const factor = CONVERSION_FACTORS[unit] || CONVERSION_FACTORS['km/h'];
    return speed_m_s * factor;
}

// 獲取當前選定的單位
function getSelectedUnit() {
    return document.querySelector('input[name="speed_unit"]:checked').value;
}

// 單位切換時，強制更新顯示
function updateDisplayUnit() {
    if (watchID !== undefined && lastPosition) {
         success(lastPosition, true);
    }
}

// 設定語言函式
function setLanguage(lang) {
    currentLang = lang;
    const dict = translations[lang];

    document.getElementById('title-text').textContent = dict['title'];
    document.getElementById('lang-select-title').textContent = dict['lang-select-title'];
    document.getElementById('unit-select-title').textContent = dict['unit-select-title'];
    document.getElementById('main-title').textContent = dict['main-title'];
    
    document.getElementById('label-calc-speed').textContent = dict['label-calc-speed'];
    document.getElementById('label-accuracy').textContent = dict['label-accuracy'];
    document.getElementById('label-source').textContent = dict['label-source'];
    document.getElementById('label-location').textContent = dict['label-location'];

    document.getElementById('startBtn').textContent = dict['startBtn'];
    document.getElementById('stopBtn').textContent = dict['stopBtn'];

    document.querySelector('label[for="unit_kn"]').textContent = lang === 'en-US' ? 'kn' : (lang === 'ja-JP' ? 'kn (ノット)' : 'kn (節)');

    // 更新當前顯示的數值和狀態文字
    if (watchID !== undefined) {
        if (lastPosition) {
            success(lastPosition, true); // 傳入 true 表示僅更新顯示
        } else {
            document.querySelector('.speed-display').textContent = dict['msg-locating'];
            document.getElementById('source-value').textContent = dict['msg-waiting'];
        }
    } else {
         document.querySelector('.speed-display').textContent = dict['msg-stopped'];
         document.getElementById('source-value').textContent = "N/A";
    }
}

// 核心邏輯：成功獲取位置時執行
function success(position, isDisplayOnly = false) {
    const currentPosition = position;
    const dict = translations[currentLang];
    const currentUnit = getSelectedUnit();
    let calculatedSpeed_m_s = 0;
    let speedSourceKey = 'speed-source-calc';
    let smoothingAlpha = SMOOTHING_FACTOR;
    let displayClass = "";
    let statusLight = "🔴";

    if (!isDisplayOnly) {
        // *** 計算與平滑處理 ***
        if (currentPosition.coords.speed !== null && currentPosition.coords.speed >= 0) {
            calculatedSpeed_m_s = currentPosition.coords.speed;
            speedSourceKey = 'speed-source-gps';
        } 
        else if (lastPosition) {
            const distance = getDistance(
                lastPosition.coords.latitude, lastPosition.coords.longitude,
                currentPosition.coords.latitude, currentPosition.coords.longitude
            );
            const timeDiff_s = (currentPosition.timestamp - lastPosition.timestamp) / 1000;
            if (timeDiff_s > 0.5) { calculatedSpeed_m_s = distance / timeDiff_s; }
        }

        const calculatedSpeed_kmh = calculatedSpeed_m_s * 3.6; 
        
        // 極端化速度判斷與平滑邏輯
        if (calculatedSpeed_kmh <= ZERO_THRESHOLD_KMH) {
            smoothedSpeed_m_s = 0;
        } else {
            if (calculatedSpeed_kmh <= HIGH_SPEED_THRESHOLD_KMH) {
                 smoothingAlpha = SMOOTHING_FACTOR_LOW; 
            } else {
                smoothingAlpha = SMOOTHING_FACTOR;
            }
            smoothedSpeed_m_s = (smoothingAlpha * calculatedSpeed_m_s) + 
                                (1 - smoothingAlpha) * smoothedSpeed_m_s;
        }

        lastPosition = currentPosition;
    } else {
        // 顯示更新模式下，使用上次的數據
        if (lastPosition) {
             if (lastPosition.coords.speed !== null && lastPosition.coords.speed >= 0) {
                calculatedSpeed_m_s = lastPosition.coords.speed;
                speedSourceKey = 'speed-source-gps';
            } else {
                 calculatedSpeed_m_s = smoothedSpeed_m_s; 
            }
        } else {
             calculatedSpeed_m_s = 0;
        }
    }

    // 4. 更新介面元素 (使用選定的語言和單位)
    const speed_display_value = convertSpeed(smoothedSpeed_m_s, currentUnit);
    const calculated_display_value = convertSpeed(calculatedSpeed_m_s, currentUnit);
    
    // 狀態燈號判斷
    if (smoothedSpeed_m_s === 0) {
        displayClass = "stopped";
        statusLight = "🟢"; 
    } else {
         displayClass = "";
         statusLight = "🔴"; 
    }

    const speedDisplay = document.querySelector('.speed-display');
    speedDisplay.textContent = `${speed_display_value.toFixed(1)} ${currentUnit}`;
    speedDisplay.className = `speed-display ${displayClass}`;

    document.getElementById('status-light').textContent = statusLight;
    document.getElementById('calc-speed').textContent = `${calculated_display_value.toFixed(1)} ${currentUnit} (α:${smoothingAlpha.toFixed(2)})`;
    document.getElementById('accuracy-value').textContent = `${currentPosition.coords.accuracy.toFixed(1)} ${dict['unit-accuracy']}`;
    document.getElementById('source-value').textContent = dict[speedSourceKey];
    document.getElementById('location-value').textContent = `${currentPosition.coords.latitude.toFixed(4)}, ${currentPosition.coords.longitude.toFixed(4)}`;
}

// 錯誤處理
function error(err) {
    const dict = translations[currentLang];
    let errorMessage;
    switch(err.code) {
        case err.PERMISSION_DENIED: errorMessage = dict['err-perm']; break;
        case err.POSITION_UNAVAILABLE: errorMessage = dict['err-signal']; break;
        case err.TIMEOUT: errorMessage = dict['err-timeout']; break;
        default: errorMessage = dict['err-unknown'];
    }
    
    document.querySelector('.speed-display').textContent = "ERROR";
    document.getElementById('status-light').textContent = "❌";
    document.getElementById('source-value').textContent = errorMessage;
    
    stopTracking();
}

// 開始持續追蹤
function startTracking() {
    if (!navigator.geolocation) {
        alert("您的瀏覽器不支援地理定位 API。");
        return;
    }
    
    const dict = translations[currentLang];

    document.getElementById("startBtn").disabled = true;
    document.getElementById("stopBtn").disabled = false;

    document.querySelector('.speed-display').textContent = dict['msg-locating'];
    document.getElementById('status-light').textContent = "";
    document.getElementById('calc-speed').textContent = "--.- km/h";
    document.getElementById('accuracy-value').textContent = "--.- " + dict['unit-accuracy'];
    document.getElementById('source-value').textContent = dict['msg-waiting'];
    document.getElementById('location-value').textContent = "N/A";

    lastPosition = null; 
    smoothedSpeed_m_s = 0; 

    watchID = navigator.geolocation.watchPosition(success, error, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
}

// 停止持續追蹤
function stopTracking() {
    if (watchID !== undefined) {
        navigator.geolocation.clearWatch(watchID);
        watchID = undefined;
        document.getElementById("startBtn").disabled = false;
        document.getElementById("stopBtn").disabled = true;

        document.querySelector('.speed-display').textContent = translations[currentLang]['msg-stopped'];
        document.getElementById('status-light').textContent = "⏸️";
    }
}

// --- 廣告輪播相關函式 ---
function initAdCarousel() {
    const adCarousel = document.getElementById('ad-carousel');
    const adDotsContainer = adCarousel.querySelector('.ad-dots');

    ads.forEach((ad, index) => {
        const img = document.createElement('img');
        img.src = ad.img;
        img.alt = `Ad ${index + 1}`;
        if (index === 0) img.classList.add('active');
        adCarousel.insertBefore(img, adDotsContainer); // 將圖片插入到點點容器之前

        const dot = document.createElement('div');
        dot.classList.add('ad-dot');
        if (index === 0) dot.classList.add('active');
        dot.onclick = (e) => {
            e.stopPropagation(); // 阻止點擊點點時觸發 goToAdLink
            showAd(index);
        };
        adDotsContainer.appendChild(dot);
    });

    startAdRotation();
}

function showAd(index) {
    const adCarousel = document.getElementById('ad-carousel');
    const images = adCarousel.querySelectorAll('img');
    const dots = adCarousel.querySelectorAll('.ad-dot');

    images.forEach(img => img.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    images[index].classList.add('active');
    dots[index].classList.add('active');
    currentAdIndex = index;

    resetAdRotation();
}

function nextAd() {
    currentAdIndex = (currentAdIndex + 1) % ads.length;
    showAd(currentAdIndex);
}

function startAdRotation() {
    adInterval = setInterval(nextAd, AD_ROTATION_INTERVAL);
}

function stopAdRotation() {
    clearInterval(adInterval);
}

function resetAdRotation() {
    stopAdRotation();
    startAdRotation();
}

function goToAdLink() {
    // 點擊廣告圖片時，跳轉到當前顯示廣告的連結
    if (ads[currentAdIndex] && ads[currentAdIndex].link) {
        window.open(ads[currentAdIndex].link, '_blank');
    }
}
