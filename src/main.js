import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.25;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let loadedModel;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

function createMaterialFromJSON(jsonData) {
  const diffuseMap = new THREE.TextureLoader().load(jsonData.diffuseMap);
  const glossMap = new THREE.TextureLoader().load(jsonData.glossMap);
  const normalMap = new THREE.TextureLoader().load(jsonData.normalMap);

  diffuseMap.wrapS = THREE.RepeatWrapping;
  diffuseMap.wrapT = THREE.RepeatWrapping;
  glossMap.wrapS = THREE.RepeatWrapping;
  glossMap.wrapT = THREE.RepeatWrapping;
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;

  diffuseMap.repeat.set(...jsonData.diffuseMapTiling);
  glossMap.repeat.set(...jsonData.glossMapTiling);
  normalMap.repeat.set(...jsonData.normalMapTiling);

  const material = new THREE.MeshPhysicalMaterial({
    metalness: jsonData.metalness,
    roughness: 1 - jsonData.sheenGloss,
    opacity: jsonData.opacity,
    transparent: true,
    map: diffuseMap,
    roughnessMap: glossMap,
    normalMap: normalMap,
    side: jsonData.twoSidedLighting ? THREE.DoubleSide : THREE.FrontSide,
    alphaTest: jsonData.alphaTest,
    depthWrite: jsonData.depthWrite,
    depthTest: jsonData.depthTest,
    color: new THREE.Color(...jsonData.diffuse),
    emissive: new THREE.Color(...jsonData.emissive),
    emissiveIntensity: jsonData.emissiveIntensity,
    aoMap: null,
    aoMapIntensity: 1,
  });

  material.clearcoat = jsonData.clearcoat || 0;
  material.clearcoatRoughness = jsonData.clearcoatRoughness || 0;
  material.reflectivity = jsonData.reflectivity || 0.5;

  return material;
}

fetch("MaterialData/SofaMaterials.json")
  .then((response) => response.json())
  .then((data) => {
    const jsonFiles = data;

    const materialSelector = document.getElementById("material-selector");
    const applyMaterialBtn = document.getElementById("apply-material-btn");
    // const leftContainer = document.getElementById('left-container');

    Object.keys(jsonFiles).forEach((materialName) => {
      const option = document.createElement("option");
      option.value = materialName;
      option.text = materialName;
      materialSelector.add(option);
    });

    applyMaterialBtn.addEventListener("click", () => {
      const selectedJsonData = jsonFiles[materialSelector.value];
      const newMaterial = createMaterialFromJSON(selectedJsonData);

      if (loadedModel) {
        loadedModel.traverse((node) => {
          if (node.isMesh) {
            node.material = newMaterial;
          }
        });
      }
    });

    const modelPaths = [
      "models/Sofa.glb",
    //   "models/Wall.glb",
    //   "models/Floor.glb",
    //   "models/Frame.glb",
    //   "models/Plant.glb",
    //   "models/Coffee_Table.glb",
    //   "models/Accessories.glb",
    //   "models/Floor_Lamp.glb",
    //   "models/Window.glb",
    //   "models/Carpet.glb",
    ];

    let currentModelIndex = 0;

    function loadNextModel() {
      if (currentModelIndex < modelPaths.length) {
        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        const ktx2Loader = new KTX2Loader();

        ktx2Loader.setTranscoderPath("/basis/");
        ktx2Loader.detectSupport(renderer);

        dracoLoader.setDecoderPath(
          "https://www.gstatic.com/draco/versioned/decoders/1.4.2/"
        );

        loader.setDRACOLoader(dracoLoader);
        loader.setKTX2Loader(ktx2Loader);

        loader.load(modelPaths[currentModelIndex], (gltf) => {
          loadedModel = gltf.scene;

          const initialMaterial = createMaterialFromJSON(
            jsonFiles[materialSelector.value]
          );

          loadedModel.traverse((node) => {
            if (node.isMesh) {
              node.material = initialMaterial;
            }
          });

          scene.add(loadedModel);

          currentModelIndex++;
          loadNextModel();
        });
      } else {
        camera.position.z = 5;

        function setupHDRI() {
          const rgbeloader = new RGBELoader();
          rgbeloader.load("hdri/gem_2.hdr", (hdri) => {
            const myhdr = hdri;
            myhdr.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = myhdr;
          });
        }

        setupHDRI();

        const composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        const ssaoPass = new SSAOPass(
          scene,
          camera,
          window.innerWidth,
          window.innerHeight
        );
        ssaoPass.kernelRadius = 16;
        ssaoPass.minDistance = 0.01;
        ssaoPass.maxDistance = 0.05;
        composer.addPass(ssaoPass);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        function animate() {
          requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);

          composer.render();
        }

        animate();
      }
    }

    // Start loading the models
    loadNextModel();
  })
  .catch((error) => console.error("Error loading JSON file:", error));
