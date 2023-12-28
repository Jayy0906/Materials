import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import * as dat from 'dat.gui';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.25;
renderer.setSize(window.innerWidth * 0.8, window.innerHeight);
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const loader = new GLTFLoader();
const textureLoader = new TextureLoader();
const dracoLoader = new DRACOLoader();
const ktx2Loader = new KTX2Loader();

ktx2Loader.setTranscoderPath('/basis/');
ktx2Loader.detectSupport(renderer);

dracoLoader.setDecoderPath('/draco/');

loader.setDRACOLoader(dracoLoader);
loader.setKTX2Loader(ktx2Loader);

let currentMaterialVariant = 0;

const jsonContent = {
  "materials": [
    {
      "name": "material1",
      "albedoMap": "src/albedoMap1.jpg",
      "normalMap": "src/normalMap1.jpg",
      "roughnessMap": "src/roughnessMap1.jpg"
    },
    {
      "name": "material2",
      "albedoMap": "src/albedoMap2.jpg",
      "normalMap": "src/normalMap2.jpg",
      "roughnessMap": "src/roughnessMap2.jpg"
    }
  ]
};

const materialVariants = jsonContent.materials.map((material) => material.name);

loader.load('src/Sofa.glb', (gltf) => {
  const materialSwitcher = {
    materialVariant: materialVariants[currentMaterialVariant],
  };

  const gui = new dat.GUI();
  gui.add(materialSwitcher, 'materialVariant', materialVariants).onChange((value) => {
    currentMaterialVariant = materialVariants.indexOf(value);
    applyMaterialVariant(gltf.scene, jsonContent.materials[currentMaterialVariant]);
  });

  applyMaterialVariant(gltf.scene, jsonContent.materials[currentMaterialVariant]);
  scene.add(gltf.scene);

  // Add lights to the scene
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Ambient light
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Directional light
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);
  
});

camera.position.z = 5;

const animate = function () {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
};

animate();

window.addEventListener('resize', () => {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(newWidth, newHeight);
});

function applyMaterialVariant(scene, materialEntry) {
  scene.traverse((child) => {
    if (child.isMesh) {
      const mesh = child;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          if (materialEntry.albedoMap) {
            textureLoader.load(materialEntry.albedoMap, (albedoMap) => {
              material.map = albedoMap;
              material.needsUpdate = true;
            });
          } else {
            material.map = null; // Reset the map if not provided
            material.needsUpdate = true;
          }

          if (materialEntry.normalMap) {
            textureLoader.load(materialEntry.normalMap, (normalMap) => {
              material.normalMap = normalMap;
              material.needsUpdate = true;
            });
          } else {
            material.normalMap = null; // Reset the normal map if not provided
            material.needsUpdate = true;
          }

          if (materialEntry.roughnessMap) {
            textureLoader.load(materialEntry.roughnessMap, (roughnessMap) => {
              material.roughnessMap = roughnessMap;
              material.needsUpdate = true;
            });
          } else {
            material.roughnessMap = null; // Reset the roughness map if not provided
            material.needsUpdate = true;
          }
        }
      }
    }
  });
}