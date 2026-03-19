import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

// --- 1. 初始化場景 ---
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// 相機設定
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 20);
camera.position.set(0, 1.3, 3); // 放在大約頭部的高度

// 燈光
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1).normalize();
scene.add(light);

let currentVrm = null;

// --- 2. 處理檔案上傳 ---
const loader = new GLTFLoader();
// 註冊 VRM 插件
loader.register((parser) => new VRMLoaderPlugin(parser));

document.getElementById('vrm_input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    // 如果場景已有模型，先移除
    if (currentVrm) {
        scene.remove(currentVrm.scene);
        VRMUtils.deepDispose(currentVrm.scene);
    }

    loader.load(
        url,
        (gltf) => {
            const vrm = gltf.userData.vrm;
            currentVrm = vrm;
            scene.add(vrm.scene);
            
            // 修正模型朝向（VRM 預設可能背對相機）
            VRMUtils.rotateVRM0(vrm); 
            console.log("模型載入成功！", vrm);
        },
        (progress) => console.log('載入中...', (progress.loaded / progress.total * 100) + '%'),
        (error) => console.error(error)
    );
});

// --- 3. 動畫迴圈 ---
function animate() {
    requestAnimationFrame(animate);
    if (currentVrm) {
        // 這裡之後會放入動補數據來驅動模型
        currentVrm.update(1/60); 
    }
    renderer.render(scene, camera);
}
animate();

// 視窗縮放自適應
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
