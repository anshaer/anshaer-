let saveTimer = 300;
let timerInterval = setInterval(() => {
    saveTimer--;
    document.getElementById("saveTimer").textContent = saveTimer;
    if (saveTimer <= 0) {
        autoDownload();
    }
}, 1000);

function resetTimer() {
    saveTimer = parseInt(document.getElementById("timeInterval").value);
    document.getElementById("saveTimer").textContent = saveTimer;
}

function updateStats() {
    let text = document.getElementById("editor").value;
    document.getElementById("charCount").textContent = text.length;
    document.getElementById("lineCount").textContent = text.split('\n').length;
}

function updateFontSize() {
    let size = document.getElementById("fontSize").value;
    document.getElementById("editor").style.fontSize = size + "px";
}

function updateFontColor() {
    let color = document.getElementById("fontColor").value;
    document.getElementById("editor").style.color = color;
}

function downloadFile(type) {
    let text = document.getElementById("editor").value;
    let fileName = document.getElementById("fileName").value || "default_filename";
    let blob = new Blob([text], { type: "text/plain" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName + "." + type;
    a.click();
    resetTimer(); // 重置計時器
}

function autoDownload() {
    let type = document.getElementById("fileType").value;
    downloadFile(type);
}

function uploadFile() {
    let fileInput = document.getElementById("fileInput");
    let file = fileInput.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function (e) {
        document.getElementById("editor").value = e.target.result;
        document.getElementById("fileName").value = file.name.split(".")[0];
        updateStats();
    };
    reader.readAsText(file);
}
