import * as THREE from "three";
import * as dat from 'dat.gui';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff); // Set the background color to white
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);

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

  // Create material
  const material = new THREE.MeshStandardMaterial({
    metalness: jsonData.metalness,
    roughness: 1 - jsonData.sheenGloss,
    opacity: jsonData.opacity,
    transparent: true,
    map: diffuseMap,
    roughnessMap: glossMap,
    normalMap: normalMap,
    mapRepeat: new THREE.Vector2(...jsonData.diffuseMapTiling),
    roughnessMapRepeat: new THREE.Vector2(...jsonData.glossMapTiling),
    normalMapRepeat: new THREE.Vector2(...jsonData.normalMapTiling),
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

  return material;
}

// Fetch the JSON file
fetch("src/MaterialData/MaterialData.json")
  .then((response) => response.json())
  .then((data) => {
    // Assign the loaded JSON data to the variable
    const jsonFiles = data;

    // User selects a material
    const selectedMaterial = "material1"; // Replace with user input or dynamic selection
    let selectedJsonData = jsonFiles[selectedMaterial];

    // Create GUI
    const gui = new dat.GUI();

    // Define an object to hold the material parameters
    const materialParameters = {
      selectedMaterial: "material1",
    };

    // Create cube with the selected material
    const cube = new THREE.Mesh(geometry, createMaterialFromJSON(selectedJsonData));
    scene.add(cube);

    // Add material selection to the GUI
    gui.add(materialParameters, 'selectedMaterial', Object.keys(jsonFiles))
  .onChange(function(value) {
    // Update selectedJsonData based on user selection
    selectedJsonData = jsonFiles[value];

    // Create material based on the new selection
    const newMaterial = createMaterialFromJSON(selectedJsonData);

    // Update cube material
    cube.material = newMaterial;
  });

    camera.position.z = 5;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Intensity can be adjusted
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Intensity can be adjusted
    directionalLight.position.set(5, 5, 5); // Set the direction of the light
    scene.add(directionalLight);

    function animate() {
      requestAnimationFrame(animate);

      controls.update(); // Update controls in the animation loop

      renderer.render(scene, camera);
    }

    // Start animation
    animate();
  })
  .catch((error) => console.error("Error loading JSON file:", error));
