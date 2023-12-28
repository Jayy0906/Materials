import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TextureLoader } from "three/src/loaders/TextureLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import * as dat from "dat.gui";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(5, 5, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth * 0.8, window.innerHeight);
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2;

const textureLoader = new TextureLoader();
const dracoLoader = new DRACOLoader();
const ktx2Loader = new KTX2Loader();

ktx2Loader.setTranscoderPath("/basis/");
ktx2Loader.detectSupport(renderer);

dracoLoader.setDecoderPath("/draco/");

const jsonContent = {
  models: [
    {
      name: "Sofa",
      glbPath: "src/Sofa.glb",
      materials: [
        {
          name: "material1",
          albedoMap: "src/albedoMap1.jpg",
          normalMap: "src/normalMap1.jpg",
          roughnessMap: "src/roughnessMap1.jpg",
        },
        {
          name: "material2",
          albedoMap: "src/albedoMap2.jpg",
          normalMap: "src/normalMap2.jpg",
          roughnessMap: "src/roughnessMap2.jpg",
        },
      ],
    },

    {
      name: "Floor",
      glbPath: "src/Floor.glb",
      materials: [
        {
          name: "material1",
          albedoMap: "src/albedoMap1.jpg",
          normalMap: "src/normalMap1.jpg",
          roughnessMap: "src/roughnessMap1.jpg",
        },
        {
          name: "material2",
          albedoMap: "src/albedoMap2.jpg",
          normalMap: "src/normalMap2.jpg",
          roughnessMap: "src/roughnessMap2.jpg",
        },
      ],
    },
    {
      name: "Wall",
      glbPath: "src/Wall.glb",
      materials: [
        {
          name: "material1",
          albedoMap: "src/albedoMap1.jpg",
          normalMap: "src/normalMap1.jpg",
          roughnessMap: "src/roughnessMap1.jpg",
        },
        {
          name: "material2",
          albedoMap: "src/albedoMap2.jpg",
          normalMap: "src/normalMap2.jpg",
          roughnessMap: "src/roughnessMap2.jpg",
        },
      ],
    },
    // Add more models here...
    // {
    //   name: "AnotherModel",
    //   glbPath: "src/AnotherModel.glb",
    //   materials: [
    //     // Material variants for AnotherModel
    //   ],
    // },
  ],
};

// Load models
jsonContent.models.forEach((model) => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setTranscoderPath("/basis/");
  ktx2Loader.detectSupport(renderer);
  loader.setKTX2Loader(ktx2Loader);

  loader.load(model.glbPath, (gltf) => {
    const materialSwitcher = {
      materialVariant: model.materials[0].name,
    };

    const gui = new dat.GUI();
    gui
      .add(
        materialSwitcher,
        "materialVariant",
        model.materials.map((m) => m.name)
      )
      .onChange((value) => {
        const currentMaterialVariant = model.materials.find(
          (m) => m.name === value
        );
        applyMaterialVariant(gltf.scene, currentMaterialVariant);
      });

    applyMaterialVariant(gltf.scene, model.materials[0]);
    scene.add(gltf.scene);

    // Additional setup for each loaded model...
  });
});

window.addEventListener("resize", () => {
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

      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          if (materialEntry.albedoMap) {
            textureLoader.load(materialEntry.albedoMap, (albedoMap) => {
              material.map = albedoMap;
              material.needsUpdate = true;
            });
          } else {
            material.map = null;
            material.needsUpdate = true;
          }

          if (materialEntry.normalMap) {
            textureLoader.load(materialEntry.normalMap, (normalMap) => {
              material.normalMap = normalMap;
              material.needsUpdate = true;
            });
          } else {
            material.normalMap = null;
            material.needsUpdate = true;
          }

          if (materialEntry.roughnessMap) {
            textureLoader.load(materialEntry.roughnessMap, (roughnessMap) => {
              material.roughnessMap = roughnessMap;
              material.needsUpdate = true;
            });
          } else {
            material.roughnessMap = null;
            material.needsUpdate = true;
          }
        }
      }
    }
  });
}

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Set up shadow properties for the directional light
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2;
ground.receiveShadow = true;
scene.add(ground);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}

animate();
