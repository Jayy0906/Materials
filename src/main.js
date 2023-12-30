import * as THREE from "three";
import * as dat from "dat.gui";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Set 3D scene's background color to white
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.25;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let loadedModel; // Variable to store the loaded model

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

function createMaterialFromJSON(jsonData) {
  // Load textures
  const diffuseMap = new THREE.TextureLoader().load(jsonData.diffuseMap);
  const glossMap = new THREE.TextureLoader().load(jsonData.glossMap);
  const normalMap = new THREE.TextureLoader().load(jsonData.normalMap);

  // Set texture wrapping
  diffuseMap.wrapS = THREE.RepeatWrapping;
  diffuseMap.wrapT = THREE.RepeatWrapping;
  glossMap.wrapS = THREE.RepeatWrapping;
  glossMap.wrapT = THREE.RepeatWrapping;
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;

  // Set texture repeats
  diffuseMap.repeat.set(...jsonData.diffuseMapTiling);
  glossMap.repeat.set(...jsonData.glossMapTiling);
  normalMap.repeat.set(...jsonData.normalMapTiling);

  // Create material
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

  // Additional parameters for a more realistic look
  material.clearcoat = jsonData.clearcoat || 0; // Clearcoat intensity
  material.clearcoatRoughness = jsonData.clearcoatRoughness || 0; // Clearcoat roughness
  material.reflectivity = jsonData.reflectivity || 0.5; // Reflectivity

  return material;
}

// Fetch the JSON file
fetch("MaterialData/MaterialData.json")
  .then((response) => response.json())
  .then((data) => {
    const jsonFiles = data;

    const gui = new dat.GUI();
    const materialParameters = {
      selectedMaterial: "material1",
    };

    gui
      .add(materialParameters, "selectedMaterial", Object.keys(jsonFiles))
      .onChange(function (value) {
        const selectedJsonData = jsonFiles[value];
        const newMaterial = createMaterialFromJSON(selectedJsonData);

        // Update materials of the loaded model
        if (loadedModel) {
          loadedModel.traverse((node) => {
            if (node.isMesh) {
              node.material = newMaterial;
            }
          });
        }
      });

    // Load GLB model
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader(); // Create an instance of DRACOLoader
    dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.4.2/"
    ); // Set the path to the Draco decoder

    loader.setDRACOLoader(dracoLoader); // Set DRACOLoader to GLTFLoader

    loader.load("models/Sofa1.glb", (gltf) => {
      // Store the loaded model
      loadedModel = gltf.scene;

      // Set initial material
      const initialMaterial = createMaterialFromJSON(
        jsonFiles[materialParameters.selectedMaterial]
      );
      loadedModel.traverse((node) => {
        if (node.isMesh) {
          node.material = initialMaterial;
        }
      });

      // Add the loaded model to the scene
      scene.add(loadedModel);
    });

    camera.position.z = 5;

    // Function to add HDRI
    function setupHDRI() {
      const rgbeloader = new RGBELoader();
      rgbeloader.load("hdri/gem_2.hdr", (hdri) => {
        const myhdr = hdri;
        myhdr.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = myhdr;
        // scene.background = new THREE.Color("#000");
      });
    }

    setupHDRI();

    //Anti Aliasing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // SSAO pass
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      composer.render();
    }

    animate();
  })
  .catch((error) => console.error("Error loading JSON file:", error));
