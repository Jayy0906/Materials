import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import CustomRayCaster from "./raycaster";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { SubsurfaceScatteringShader } from "three/examples/jsm/shaders/SubsurfaceScatteringShader";
import {
  RepeatWrapping,
  ShaderMaterial,
  TextureLoader,
  UniformsUtils,
  Vector3,
  DoubleSide,
} from "three";

// const progressContainer = document.querySelector('.spinner-container') as HTMLElement;
const specificObjectToggleCheckbox = document.getElementById('specificObjectToggle');
let specificObject;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Set 3D scene's background color to white
const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.25;
renderer.setSize(window.innerWidth * 0.8, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Append the renderer's DOM element to the canvas-container
// const canvasContainer = document.getElementById("canvas-container");
// canvasContainer.appendChild(renderer.domElement);
//Anti Aliasing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Replace the FXAA pass with SMAA pass
const smaaPass = new SMAAPass(
  window.innerWidth * renderer.getPixelRatio(),
  window.innerHeight * renderer.getPixelRatio()
);
composer.addPass(smaaPass);

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

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;
// controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

const customRayCaster = new CustomRayCaster(renderer, camera, scene);

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

function createSubsurfaceMaterial() {
  const texLoader = new TextureLoader();
  const subTexture = texLoader.load("./textures/subTexture.png");
  subTexture.wrapS = subTexture.wrapT = RepeatWrapping;
  subTexture.repeat.set(4, 4);

  const shader = SubsurfaceScatteringShader;
  const uniforms = UniformsUtils.clone(shader.uniforms);

  // Adjust the color to a more neutral tone
  uniforms.diffuse.value = new Vector3(0.9, 0.7, 0.5);
  uniforms.shininess.value = 10;

  uniforms.thicknessMap.value = subTexture;
  uniforms.thicknessColor.value = new Vector3(
    0.5607843137254902,
    0.26666666666666666,
    0.054901960784313725
  );
  uniforms.thicknessDistortion.value = 0.1;
  uniforms.thicknessAmbient.value = 0.4;
  uniforms.thicknessAttenuation.value = 0.7;
  uniforms.thicknessPower.value = 10.0;
  uniforms.thicknessScale.value = 1;

  const subMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
    lights: true,
  });

  subMaterial.side = DoubleSide; // Render on both sides of the geometry

  return subMaterial;
}

// Example: Replace material of 'FloorLamp_Cover' with subsurface scattering material
const subsurfaceScatteringMaterial = createSubsurfaceMaterial();

// Ensure that specificObject is defined before replacing its material
if (specificObject) {
  replaceMaterial(
    specificObject,
    "FloorLamp_Cover",
    subsurfaceScatteringMaterial
  );
}

if (specificObjectToggleCheckbox) {
  specificObjectToggleCheckbox.addEventListener('change', () => {
    const isActivated = specificObjectToggleCheckbox.checked;

    // Toggle visibility of the specific object based on the checkbox state
    if (specificObject) {
      specificObject.visible = isActivated;
    }
  });
} else {
  // console.error("Element with id 'specificObjectToggle' not found.");
}

function replaceMaterial(model, materialName, newMaterial) {
  model.traverse((child) => {
    if (child.isMesh) {
      const mesh = child;

      // Check if the mesh name matches the specified materialName
      if (mesh.name === materialName) {
        // console.log(`Replacing material for ${materialName}`);
        mesh.material = newMaterial;
      }
    }
  });
}

function processJsonData() {
  fetch("MaterialData/Materials.json")
    .then((response) => response.json())
    .then((data) => {
      const jsonFiles = data;
      // const materialSelector = document.getElementById("material-selector");
      // const applyMaterialBtn = document.getElementById("apply-material-btn");
      const materialbutton = document.querySelectorAll(".material-thumbnail");
      console.log(materialbutton);

      Array.from(materialbutton).forEach((item) => {
        item.addEventListener("dragstart", (e) => {
          const thumbnail = e.target;
          const materialName = thumbnail.dataset.material;
          // customRayCaster.setSelectedMaterial(materialName);
        });

        item.addEventListener("dragend", (e) => {
          const thumbnail = e.target;
          const materialName = thumbnail.dataset.material;
          if (loadedSofa) {
            const selectedJsonData = jsonFiles[materialName];
            const newMaterial = createMaterialFromJSON(selectedJsonData);

            loadedSofa.traverse((node) => {
              if (node.isMesh) {
                const originalMaterial = originalMaterials.get(node.uuid);

                if (originalMaterial) {
                  node.material.copy(originalMaterial);
                } else {
                  node.material = newMaterial.clone();
                }
              }
            });
          }
        });
      });

      Object.keys(jsonFiles).forEach((materialName) => {
        const option = document.createElement("option");
        option.value = materialName;
        option.text = materialName;
        // materialSelector.add(option);
      });

      let loadedSofa; // Variable to store the loaded Sofa model
      const originalMaterials = new Map(); // Map to store original materials by node name

      function storeOriginalMaterials(model) {
        model.traverse((node) => {
          if (node.isMesh) {
            originalMaterials.set(node.name, node.material.clone());
          }
        });
      }

      // materialbutton.addEventListener("click", () => {
      //   const selectedJsonData = jsonFiles[materialSelector.value];
      //   const newMaterial = createMaterialFromJSON(selectedJsonData);

      //   if (loadedSofa) {
      //     loadedSofa.traverse((node) => {
      //       if (node.isMesh) {
      //         const originalMaterial = originalMaterials.get(node.uuid);

      //         if (originalMaterial) {
      //           node.material.copy(originalMaterial);
      //         } else {
      //           node.material = newMaterial.clone();
      //         }
      //       }
      //     });
      //   }
      // });

      // applyMaterialBtn.addEventListener("drag", (e) => {
      //   const thumbnail = e.target;
      //   console.log(thumbnail);
      //   const materialName = thumbnail.getAttribute("material");
      //   console.log(materialName);
      //   customRayCaster.selectThumbnail();
      // });

      const modelPaths = [
        "models/Wall.glb",
        "models/Floor.glb",
        "models/Carpet.glb",
        "models/Frame.glb",
        "models/Plant.glb",
        "models/Floor_Lamp.glb",
        "models/Coffee_Table.glb",
        "models/Accessories.glb",
        "models/Window.glb",
        "models/Sofa.glb",
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
            const loadedModel = gltf.scene;

            if (modelPaths[currentModelIndex] === "models/Carpet.glb") {
              specificObject = gltf.scene; // Store the specific object
            }
            
            // Example: Replace material of 'FloorLamp_Cover' with subsurface scattering material
            if (modelPaths[currentModelIndex] === "models/Floor_Lamp.glb") {
              console.log("Replacing material for Floor Lamp");
              const FloorLamp_Cover = "FloorLamp_Cover";
              const newMaterial = createSubsurfaceMaterial(); // Or any other material creation logic
              replaceMaterial(gltf.scene, FloorLamp_Cover, newMaterial);
            }            

            if (modelPaths[currentModelIndex] === "models/Sofa.glb") {
              loadedSofa = loadedModel;
              storeOriginalMaterials(loadedSofa);
            }

            gltf.scene.traverse(function (child) {
              if (child.isMesh) {
                const m = child;
                m.receiveShadow = true;
                m.castShadow = true;
              }
            
              if (child.isLight) {
                let l = child;
                l.castShadow = true;
                // l.intensity = 10; // Adjust the intensity value as needed
                l.distance = 5;
                l.decay = 4;
                l.power = 400;
                // l.position.z = -1;
                l.shadow.bias = -0.005;
                l.shadow.mapSize.width = 1024;
                l.shadow.mapSize.height = 1024;
                l.shadow.radius = 2.5;
              }
            });
            

            scene.add(loadedModel);
            scene.position.set(0, -0.5, 0);

            currentModelIndex++;
            loadNextModel();
          });
        } else {
          camera.position.set(-3.5, 2, 3.5);

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
}
// Assuming you call this function somewhere in your code
processJsonData();
