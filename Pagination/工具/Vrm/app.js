import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// --- 1. 全域變數與設定 ---
let scene, camera, renderer, currentVrm, faceLandmarker;
const video = document.getElementById("video");
const btn = document.getElementById("start_camera");
const statusP = document.getElementById("status");

// 請替換成你部署後的 GAS Web App 網址
const GAS_URL = "https://script.google.com/macros/s/AKfycbx9y6ts9MZ2HAqQAdN0m8sspELGtfHaEKv3OepeTKhcs_wlwU_RtmPYCYm369T7Cj8iWQ/exec"; 

// --- 2. 初始化 Three.js 舞台 ---
function initScene() {
    scene = new THREE.Scene();
    
    // 相機：對準模型頭部位置
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 20);
    camera.position.set(0, 1.4, 2.2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 效能優化
    document.body.appendChild(renderer.domElement);

    // 燈光設定
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    window.addEventListener('resize', onWindowResize);
}

// --- 3. 初始化 MediaPipe AI 模型 ---
async function setupAI() {
    try {
        statusP.innerText = "⏳ 正在下載 AI 模型 (30MB)...";
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });
        
        statusP.innerText = "✅ AI 準備就緒，請開啟鏡頭";
        btn.disabled = false;
    } catch (error) {
        statusP.innerText = "❌ 模型載入失敗，請檢查網路或 HTTPS";
        console.error(error);
    }
}

// --- 4. 啟動攝影機 ---
btn.addEventListener("click", () => {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then((stream) => {
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                statusP.innerText = "🎥 捕捉運行中";
                btn.style.display = "none";
                predictWebcam(); 
            };
        })
        .catch(err => {
            statusP.innerText = "🚫 無法存取鏡頭 (需 HTTPS)";
            console.error(err);
        });
});

// --- 5. VRM 模型上傳處理 ---
const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

document.
