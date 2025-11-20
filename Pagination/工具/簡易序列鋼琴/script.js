// JavaScript 程式碼
        
// 1. 全域播放與踏板狀態管理
let isPlaying = false; 
let isPaused = false;
let currentNoteIndex = 0; 
let sequenceToPlay = []; 
let timeoutId = null; 

const DOT_MARKER = '.'; 
const ACCENT_MARKER = '>'; 

// 這些狀態將被用於即時播放和離線渲染
let isSustainActive = false;
let isSoftActive = false;
let isSostenutoActive = false;
const SUSTAIN_DURATION = 10;

// 2. 元素和映射
const bpmInput = document.getElementById('bpmInput');
const inputElement = document.getElementById('noteSequenceInput');
const playbackDisplay = document.getElementById('playbackDisplay'); 
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const stopButton = document.getElementById('stopButton');
const exportWavButton = document.getElementById('exportWavButton'); 
        
const sustainPedalButton = document.getElementById('sustainPedal');
const softPedalButton = document.getElementById('softPedal');
const sostenutoPedalButton = document.getElementById('sostenutoPedal');
sostenutoPedalButton.disabled = false;

// 頻率定義 (中音 C4 = 261.63 Hz)
const C4 = 261.63;
const noteFrequencies = {
    // 低音 (C3)
    'a': C4 / 2, 'b': C4 * (Math.pow(2, 2/12)) / 2, 'c': C4 * (Math.pow(2, 4/12)) / 2, 
    'd': C4 * (Math.pow(2, 5/12)) / 2, 'e': C4 * (Math.pow(2, 7/12)) / 2, 'f': C4 * (Math.pow(2, 9/12)) / 2, 
    'g': C4 * (Math.pow(2, 11/12)) / 2, 
    
    // 中音 (C4)
    '1': C4, '2': C4 * (Math.pow(2, 2/12)), '3': C4 * (Math.pow(2, 4/12)), 
    '4': C4 * (Math.pow(2, 5/12)), '5': C4 * (Math.pow(2, 7/12)), '6': C4 * (Math.pow(2, 9/12)), 
    '7': C4 * (Math.pow(2, 11/12)), 
    
    // 高音 (C5)
    'A': C4 * 2, 'B': C4 * (Math.pow(2, 2/12)) * 2, 'C': C4 * (Math.pow(2, 4/12)) * 2, 
    'D': C4 * (Math.pow(2, 5/12)) * 2, 'E': C4 * (Math.pow(2, 7/12)) * 2, 'F': C4 * (Math.pow(2, 9/12)) * 2, 
    'G': C4 * (Math.pow(2, 11/12)) * 2,
};
        
const baseMultipliers = {
    'A': 1.0, 'B': 1.0, 'C': 1.0, 'D': 1.0, 'E': 1.0, 'F': 1.0, 'G': 1.0, 
    '1': 1.0, '2': 1.0, '3': 1.0, '4': 1.0, '5': 1.0, '6': 1.0, '7': 1.0, 
    'a': 1.0, 'b': 1.0, 'c': 1.0, 'd': 1.0, 'e': 1.0, 'f': 1.0, 'g': 1.0, 
    '0': 1.0, '9': 0.5, '8': 0.25 
};
        
function isNoteCode(char) {
    return (char >= '1' && char <= '7') || (char >= 'A' && char <= 'G') || (char >= 'a' && char <= 'g');
}

// 3. 建立 AudioContext (單例模式)
let audioContext;
function initializeAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// 4. BPM 換算 (不變)
function getBeatDuration() {
    const bpm = parseInt(bpmInput.value) || 120;
    return 60 / bpm; 
}

// 5. 播放單個音符的函數 (用於即時播放 - 延音邏輯不變)
function playNote(frequency, duration, isAccent) { 
    initializeAudioContext();
    
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    const gainNode = audioContext.createGain();
    
    let initialVolume = 0.5;
    if (isSoftActive || isSostenutoActive) initialVolume *= 0.5; 
    if (isAccent) initialVolume *= 1.5; 

    gainNode.gain.setValueAtTime(initialVolume, audioContext.currentTime);
    
    let stopTime;
    let releaseTime;

    if (isSustainActive || isSostenutoActive) {
        stopTime = audioContext.currentTime + SUSTAIN_DURATION;
        releaseTime = audioContext.currentTime + SUSTAIN_DURATION;
    } else {
        stopTime = audioContext.currentTime + duration;
        releaseTime = audioContext.currentTime + duration * 0.9;
    }
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();

    gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        releaseTime
    );

    oscillator.stop(stopTime);
}

// 6. 處理單鍵點擊播放 (不變)
const keys = document.querySelectorAll('.key');
keys.forEach(key => {
    key.addEventListener('mousedown', (e) => {
        const noteNumber = key.getAttribute('data-note'); 
        const frequency = noteFrequencies[noteNumber];
        if (frequency) {
            playNote(frequency, getBeatDuration(), false); 
        }
    });
});

// 7. 踏板事件處理 (不變)
function togglePedal(pedalType) {
    if (pedalType === 'sustain') {
        isSustainActive = !isSustainActive;
        sustainPedalButton.classList.toggle('active', isSustainActive);
    } else if (pedalType === 'soft') {
        isSoftActive = !isSoftActive;
        softPedalButton.classList.toggle('active', isSoftActive);
    } else if (pedalType === 'sostenuto') {
        isSostenutoActive = !isSostenutoActive;
        sostenutoPedalButton.classList.toggle('active', isSostenutoActive);
    }
}
        
sustainPedalButton.addEventListener('click', () => togglePedal('sustain'));
softPedalButton.addEventListener('click', () => togglePedal('soft'));
sostenutoPedalButton.addEventListener('click', () => togglePedal('sostenuto'));

// 8. 附點時長計算 (不變)
function calculateDotMultiplier(base, dotCount) {
    let totalMultiplier = base;
    let addedValue = base / 2;
    for (let i = 0; i < dotCount; i++) {
        totalMultiplier += addedValue;
        addedValue /= 2;
    }
    return totalMultiplier;
}

// 9. 序列解析 (不變)
function parseSequence(rawSequence) {
    const sequence = [];
    const regex = /(>)?([1-7098AGabcdefg])(\.+)?/g; 
    const matches = Array.from(rawSequence.matchAll(regex));

    for (const match of matches) {
        const isAccent = match[1] === ACCENT_MARKER; 
        const char = match[2]; 
        const dots = match[3] || ''; 
        
        const baseMultiplier = baseMultipliers[char];

        if (baseMultiplier !== undefined) {
            const totalMultiplier = calculateDotMultiplier(baseMultiplier, dots.length);
            const isNote = isNoteCode(char); 
            
            const element = {
                type: isNote ? 'note' : 'rest',
                durationMultiplier: totalMultiplier,
                isAccent: isNote && isAccent,
                displayUnit: match[0] 
            };
            
            if (element.type === 'note') {
                element.frequency = noteFrequencies[char];
            }
            sequence.push(element);
        }
    }
    return sequence;
}
        
// ------------------ 進度顯示和控制邏輯 (不變) ------------------
        
function updateDisplay(content, active) {
    playbackDisplay.textContent = content;
    playbackDisplay.classList.toggle('active', active);
}
        
function updateButtonState(state) {
    if (state === 'playing') {
        playButton.disabled = true;
        pauseButton.disabled = false;
        stopButton.disabled = false;
        exportWavButton.disabled = true; 
        pauseButton.textContent = '暫停';
    } else if (state === 'paused') {
        playButton.disabled = true;
        pauseButton.disabled = false;
        stopButton.disabled = false;
        exportWavButton.disabled = false; 
        pauseButton.textContent = '繼續';
    } else { // stopped
        playButton.disabled = false;
        pauseButton.disabled = true;
        stopButton.disabled = true;
        exportWavButton.disabled = false; 
        pauseButton.textContent = '暫停';
    }
}
        
function resetPedalState() {
    if (isSustainActive) togglePedal('sustain');
    if (isSoftActive) togglePedal('soft');
    if (isSostenutoActive) togglePedal('sostenuto');
}

function startPlayback() {
    const rawSequenceClean = inputElement.value.replace(/\s/g, '');
    sequenceToPlay = parseSequence(rawSequenceClean);
    currentNoteIndex = 0;

    if (sequenceToPlay.length === 0) {
        alert('請輸入有效的序列代號 (1-7, 0, 9, 8, A-G, a-g, ., >)。');
        updateDisplay('-- 序列無效或已停止 --', false);
        return;
    }

    isPlaying = true;
    isPaused = false;
    updateButtonState('playing');

    playbackLoop();
}

function stopPlayback() {
    isPlaying = false;
    isPaused = false;
    clearTimeout(timeoutId);
    
    resetPedalState();

    updateButtonState('stopped');
    currentNoteIndex = 0; 
    
    updateDisplay('-- 播放完畢或已停止 --', false);
}

function togglePause() {
    if (!isPlaying) return;

    isPaused = !isPaused;
    if (isPaused) {
        clearTimeout(timeoutId);
        updateButtonState('paused');
        updateDisplay(`暫停: ${sequenceToPlay[currentNoteIndex - 1]?.displayUnit || ''}`, false);
    } else {
        updateButtonState('playing');
        playbackLoop();
    }
}

async function playbackLoop() {
    if (!isPlaying || isPaused) return;

    if (currentNoteIndex >= sequenceToPlay.length) {
        stopPlayback();
        return;
    }

    const currentElement = sequenceToPlay[currentNoteIndex];
    
    updateDisplay(currentElement.displayUnit, true); 

    const beatDuration = getBeatDuration(); 
    const durationInSeconds = beatDuration * currentElement.durationMultiplier;

    if (currentElement.type === 'note') {
        playNote(currentElement.frequency, durationInSeconds, currentElement.isAccent); 
    } 

    currentNoteIndex++;

    timeoutId = setTimeout(playbackLoop, durationInSeconds * 1000);
}
        
// ------------------ WAV 匯出核心邏輯 (已修改) ------------------

/**
 * 執行整個序列的離線渲染。
 * @param {Array<Object>} sequence 要渲染的序列。
 * @returns {Promise<AudioBuffer>} 渲染完成的 AudioBuffer。
 */
function renderSequenceToBuffer(sequence) {
    return new Promise((resolve, reject) => {
        if (sequence.length === 0) {
            return reject(new Error('序列是空的，無法渲染。'));
        }

        const beatDuration = getBeatDuration(); 
        let totalDuration = 0;

        sequence.forEach(element => {
            totalDuration += beatDuration * element.durationMultiplier;
        });
        
        // 額外增加 1.0 秒的緩衝，以確保延音完全衰減
        const renderDuration = totalDuration + 1.0; 
        
        const offlineContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
            1, 
            Math.ceil(renderDuration * 44100), 
            44100 
        );

        let currentTime = 0;

        sequence.forEach(element => {
            const durationInSeconds = beatDuration * element.durationMultiplier;

            if (element.type === 'note') {
                const oscillator = offlineContext.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(element.frequency, currentTime); 

                const gainNode = offlineContext.createGain();
                
                // **【弱音/柔音 效果實現】**
                let initialVolume = 0.5;
                if (isSoftActive || isSostenutoActive) {
                    initialVolume *= 0.5; 
                }
                if (element.isAccent) {
                    initialVolume *= 1.5;
                }

                gainNode.gain.setValueAtTime(initialVolume, currentTime);
                
                let stopTime;
                let releaseTime;
                
                if (isSustainActive) {
                    // **【延音 效果實現】**
                    // 如果延音開啟，音符必須持續到渲染結束 (或接近結束)
                    stopTime = renderDuration; 
                    // 延音釋放時間設定在當前音符的下一個拍子，讓聲音可以持續疊加
                    // 衰減曲線必須從當前時長結束後開始
                    releaseTime = totalDuration; 
                    
                    // 確保音符至少在當前持續時間內保持初始音量
                    gainNode.gain.linearRampToValueAtTime(initialVolume, currentTime + durationInSeconds);
                    // 然後，音量從當前時長結束後開始，指數衰減到渲染結束
                    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime - 0.1); 

                } else {
                    // 無延音：正常衰減
                    stopTime = currentTime + durationInSeconds;
                    releaseTime = currentTime + durationInSeconds * 0.9;
                    
                    // 正常的快速衰減
                    gainNode.gain.exponentialRampToValueAtTime(
                        0.0001,
                        releaseTime 
                    );
                }

                // 連接和啟動
                oscillator.connect(gainNode);
                gainNode.connect(offlineContext.destination);
                oscillator.start(currentTime);

                // 在計算出的停止時間點停止振盪器
                oscillator.stop(stopTime);
            }

            // 更新下一個音符的開始時間
            currentTime += durationInSeconds;
        });

        // 開始渲染
        offlineContext.startRendering()
            .then(renderedBuffer => resolve(renderedBuffer))
            .catch(err => reject(err));
    });
}

/**
 * 將 AudioBuffer 轉換為 WAV 格式的 Blob。(不變)
 * @param {AudioBuffer} buffer - 要轉換的音頻緩衝區。
 * @returns {Blob} - WAV 格式的 Blob。
 */
function bufferToWave(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numChannels * 2 + 44; 

    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);

    writeString(view, 0, 'RIFF'); 
    view.setUint32(4, length - 8, true); 
    writeString(view, 8, 'WAVE'); 

    writeString(view, 12, 'fmt '); 
    view.setUint32(16, 16, true); 
    view.setUint16(20, 1, true); 
    view.setUint16(22, numChannels, true); 
    view.setUint32(24, sampleRate, true); 
    view.setUint32(28, sampleRate * numChannels * 2, true); 
    view.setUint16(32, numChannels * 2, true); 
    view.setUint16(34, 16, true); 

    writeString(view, 36, 'data'); 
    view.setUint32(40, buffer.length * numChannels * 2, true); 

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset, intSample, true);
            offset += 2;
        }
    }

    return new Blob([bufferArray], { type: 'audio/wav' });
}

// 輔助函數：將字串寫入 DataView
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
        
// ------------------ 按鈕事件綁定與主邏輯 (不變) ------------------
        
playButton.addEventListener('click', () => {
    if (isPaused) {
        togglePause();
    } else {
        startPlayback();
    }
});
pauseButton.addEventListener('click', togglePause);
stopButton.addEventListener('click', stopPlayback);
        
// 匯出 WAV 按鈕事件
exportWavButton.addEventListener('click', async () => {
    const rawSequenceClean = inputElement.value.replace(/\s/g, '');
    const sequence = parseSequence(rawSequenceClean);

    if (sequence.length === 0) {
        alert('請輸入有效的序列代號才能匯出 WAV 檔案。');
        return;
    }

    // 設置按鈕狀態
    exportWavButton.disabled = true;
    exportWavButton.textContent = '正在渲染...';
    updateDisplay('-- 正在渲染音檔 (請稍候) --', true);

    try {
        const renderedBuffer = await renderSequenceToBuffer(sequence);
        const wavBlob = bufferToWave(renderedBuffer);

        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `sequence_export_${Date.now()}.wav`; 
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        updateDisplay('✅ WAV 檔案匯出完成！', false);

    } catch (error) {
        console.error('WAV 匯出失敗:', error);
        alert(`匯出音檔時發生錯誤: ${error.message}`);
        updateDisplay('❌ 匯出失敗', false);

    } finally {
        // 重設按鈕狀態
        exportWavButton.disabled = false;
        exportWavButton.textContent = '匯出 WAV';
    }
});

// 自動調整輸入框高度功能 (不變)
function autoResizeTextarea() {
    inputElement.style.height = 'auto'; 
    inputElement.style.height = inputElement.scrollHeight + 'px';
}

inputElement.addEventListener('input', autoResizeTextarea);
document.addEventListener('DOMContentLoaded', autoResizeTextarea);
        
updateDisplay('-- 待播放序列 --', false);
updateButtonState('stopped');