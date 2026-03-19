import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// --- 全域變數 ---
let scene, camera, renderer, currentVrm, faceLandmarker;
const video = document.getElementById("video");

// --- 1. 初始化 Three.js 場景 ---
function initScene() {
    scene = new THREE.Scene();
    
    // 相機：放在大約人臉的高度 (1.4m - 1.6m)
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 20);
    camera.position.set(0, 1.4, 2.5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // 燈光
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    window.addEventListener('resize', onWindowResize);
}

// --- 2. 初始化 MediaPipe Face Landmarker ---
async function initFaceTracking() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            // 這就是你提到的關鍵 API 模型路徑
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
    });

    console.log("AI 模型載入完畢");
    startCamera();
}

// --- 3. 啟動攝影機 ---
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then((stream) => {
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
        })
        .catch(err => console.error("鏡頭啟動失敗:", err));
}

// --- 4. 處理 VRM 模型上傳 ---
const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

document.getElementById('vrm_input').addEventListener('change', (event) => {
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
        VRMUtils.rotateVRM0(vrm); // 修正部分模型背對問題
        console.log("VRM 載入成功");
    });
});

// --- 5. 每幀更新：驅動模型 ---
async function predictWebcam() {
    if (faceLandmarker && video.readyState >= 2) {
        const startTimeMs = performance.now();
        const results = faceLandmarker.detectForVideo(video, startTimeMs);

        if (results.faceBlendshapes && results.faceBlendshapes.length > 0 && currentVrm) {
            const shapes = results.faceBlendshapes[0].categories;
            const exp = currentVrm.expressionManager;

            // 映射 MediaPipe 數據到 VRM 表情
            // 這裡使用了幾種常見的表情對應
            shapes.forEach(s => {
                switch(s.categoryName) {
                    case "eyeBlinkLeft": exp.setValue("blinkLeft", s.score); break;
                    case "eyeBlinkRight": exp.setValue("blinkRight", s.score); break;
                    case "jawOpen": exp.setValue("aa", s.score); break; // 阿
                    case "mouthSmileLeft": exp.setValue("surprised", s.score * 0.5); break; 
                    // 你可以繼續增加如 eyeLookIn, mouthPucker 等
                }
            });
            
            // 讓頭部跟著轉動 (選配邏輯)
            const head = currentVrm.humanoid.getRawBoneNode("head");
            if (results.faceLandmarks) {
                // 簡單示範：利用面部中心點位置移動
                const face = results.faceLandmarks[0];
                head.rotation.y = -(face[1].x - 0.5); // 左右轉
                head.rotation.x = (face[1].y - 0.5);  // 上下看
            }
        }
    }
    requestAnimationFrame(predictWebcam);
}

// --- 6. 渲染迴圈 ---
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (currentVrm) {
        currentVrm.update(delta);
    }
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 啟動程式
initScene();
initFaceTracking();
animate();
