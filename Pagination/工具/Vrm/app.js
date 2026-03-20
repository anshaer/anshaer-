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

document.getElementById('vrm_input').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (currentVrm) {
        scene.remove(currentVrm.scene);
        VRMUtils.deepDispose(currentVrm.scene);
    }

    loader.load(url, (gltf) => {
        const vrm = gltf.userData.vrm;
        currentVrm = vrm;
        scene.add(vrm.scene);
        VRMUtils.rotateVRM0(vrm);
        
        // 載入成功後，發送通知給 GAS API
        logToGAS("model_loaded", file.name);
    });
});

// --- 6. 核心：將 AI 數據轉換為表情與動作 ---
function predictWebcam() {
    if (faceLandmarker && video.readyState >= 2) {
        const results = faceLandmarker.detectForVideo(video, performance.now());

        if (results.faceBlendshapes && results.faceBlendshapes.length > 0 && currentVrm) {
            const shapes = results.faceBlendshapes[0].categories;
            const exp = currentVrm.expressionManager;

            // 表情映射：MediaPipe -> VRM 標準表情
            shapes.forEach(s => {
                // 眼睛
                if (s.categoryName === "eyeBlinkLeft") exp.setValue("blinkLeft", s.score);
                if (s.categoryName === "eyeBlinkRight") exp.setValue("blinkRight", s.score);
                // 嘴型 (aa 為大張口)
                if (s.categoryName === "jawOpen") exp.setValue("aa", s.score);
                // 嘴角 (微笑)
                if (s.categoryName === "mouthSmileLeft") exp.setValue("relaxed", s.score);
            });

            // 頭部旋轉 (利用 FaceLandmarks 座標)
            const head = currentVrm.humanoid.getRawBoneNode("head");
            if (results.faceLandmarks && head) {
                const face = results.faceLandmarks[0];
                // 映射中心點座標 (0~1) 到旋轉弧度
                head.rotation.y = -(face[1].x - 0.5) * 1.5; // 左右
                head.rotation.x = (face[1].y - 0.5) * 1.0;  // 上下
            }
        }
    }
    requestAnimationFrame(predictWebcam);
}

// --- 7. GAS API 串接 ---
async function logToGAS(action, detail) {
    if (GAS_URL === "https://script.google.com/macros/s/AKfycbx9y6ts9MZ2HAqQAdN0m8sspELGtfHaEKv3OepeTKhcs_wlwU_RtmPYCYm369T7Cj8iWQ/exec") return;

    const payload = {
        userId: "Anshaer_Live",
        action: action,
        vrmInfo: detail,
        timestamp: new Date().toISOString()
    };

    // 使用 no-cors 避免跨域失敗
    fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

// --- 8. 渲染迴圈 ---
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (currentVrm) {
        currentVrm.update(delta); // 確保 VRM 動畫平滑更新
    }
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 啟動流程
initScene();
setupAI();
animate();
