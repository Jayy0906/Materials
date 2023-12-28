import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Load the GLB model and assign textures
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
const ktx2Loader = new KTX2Loader();
const textureLoader = new THREE.TextureLoader();
const jsonLoader = new THREE.FileLoader();

dracoLoader.setDecoderPath('/draco/');
loader.setDRACOLoader(dracoLoader);
ktx2Loader.setTranscoderPath('/basis/');
ktx2Loader.detectSupport(renderer);
loader.setKTX2Loader(ktx2Loader);

jsonLoader.load('materialData.json', (json) => {
  const jsonContent = JSON.parse(json);

  loader.load('models/Sofa.glb', (gltf) => {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        const materialEntry = jsonContent.materials.find(material => material.name === child.material.name);

        if (materialEntry) {
          if (materialEntry.albedoMap) {
            const albedoMap = textureLoader.load(materialEntry.albedoMap);
            child.material.map = albedoMap;
          }

          if (materialEntry.normalMap) {
            const normalMap = textureLoader.load(materialEntry.normalMap);
            child.material.normalMap = normalMap;
          }

          if (materialEntry.roughnessMap) {
            const roughnessMap = textureLoader.load(materialEntry.roughnessMap);
            child.material.roughnessMap = roughnessMap;
          }

          child.material.needsUpdate = true;
        }
      }
    });

    scene.add(gltf.scene);
  });
});

camera.position.z = 5;

const animate = function () {
  requestAnimationFrame(animate);

  // Add any animations or updates here

  renderer.render(scene, camera);
};

animate();

// Handle window resize
window.addEventListener('resize', () => {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(newWidth, newHeight);
});