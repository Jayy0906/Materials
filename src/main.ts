import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { FileLoader } from 'three/src/loaders/FileLoader.js';
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

//@ts-ignore
import GLTFMeshGpuInstancingExtension from 'three-gltf-extensions/loaders/EXT_mesh_gpu_instancing/EXT_mesh_gpu_instancing.js';
//@ts-ignore
import GLTFMaterialsVariantsExtension from 'three-gltf-extensions/loaders/KHR_materials_variants/KHR_materials_variants.js';

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

//Anti Aliasing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;
const loader = new GLTFLoader();
const textureLoader = new TextureLoader();
const jsonLoader = new FileLoader();
const dracoLoader = new DRACOLoader();
const ktx2Loader = new KTX2Loader();

ktx2Loader.setTranscoderPath('/basis/');
ktx2Loader.detectSupport(renderer);

dracoLoader.setDecoderPath('/draco/');

loader.setDRACOLoader(dracoLoader);
loader.setKTX2Loader(ktx2Loader);

loader.register((parser) => new GLTFMaterialsVariantsExtension(parser));
loader.register((parser) => new GLTFMeshGpuInstancingExtension(parser));


jsonLoader.load('src/materialData.json', (json) => {
  const jsonContent = JSON.parse(json as string);

  loader.load('src/Sofa.glb', (gltf) => {
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        const materials: THREE.Material[] = Array.isArray(mesh.material)
          ? (mesh.material as THREE.Material[])
          : [mesh.material as THREE.Material];

        for (const material of materials) {
          const materialEntry = jsonContent.materials.find(
            (m: { name: string; albedoMap?: string; normalMap?: string; roughnessMap?: string }) =>
              m.name === material.name
          );

          if (materialEntry) {
            if (materialEntry.albedoMap) {
              textureLoader.load(materialEntry.albedoMap, (albedoMap) => {
                if ('map' in material) {
                  (material as THREE.MeshStandardMaterial).map = albedoMap;
                  material.needsUpdate = true;
                }
              });
            }

            if (materialEntry.normalMap) {
              textureLoader.load(materialEntry.normalMap, (normalMap) => {
                if ('normalMap' in material) {
                  (material as THREE.MeshStandardMaterial).normalMap = normalMap;
                  material.needsUpdate = true;
                }
              });
            }

            if (materialEntry.roughnessMap) {
              textureLoader.load(materialEntry.roughnessMap, (roughnessMap) => {
                if ('roughnessMap' in material) {
                  (material as THREE.MeshStandardMaterial).roughnessMap = roughnessMap;
                  material.needsUpdate = true;
                }
              });
            }
          }
        }
      }
    });

    scene.add(gltf.scene);
  });
});

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

camera.position.z = 5;

const animate = function () {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

animate();

window.addEventListener('resize', () => {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(newWidth, newHeight);
});