// cityLayout.ts
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export const flyingCars: THREE.Object3D[] = [];
export const drones: THREE.Object3D[] = [];

export function addCityLayout(scene: THREE.Scene, camera: THREE.Camera) {
  const buildingGeometries: THREE.BufferGeometry[] = [];
  const sidewalkGeometries: THREE.BufferGeometry[] = [];
  const roadGeometries: THREE.BufferGeometry[] = [];
  const lineGeometries: THREE.BufferGeometry[] = [];

  const rows = 10;
  const cols = 10;
  const lotSize = 30;
  const buildingSize = 10;
  const sidewalkSize = 15;
  const roadSize = 6;
  const halfCitySize = (cols * lotSize) / 2;

  // Determine center plot index
  const centerRow = Math.floor(rows / 2);
  const centerCol = Math.floor(cols / 2);
  let centerX = 0;
  let centerZ = 0;

  const textureLoader = new THREE.TextureLoader();
  const facadeTexture = textureLoader.load('textures/facade_specular.png');
  facadeTexture.wrapS = facadeTexture.wrapT = THREE.RepeatWrapping;
  facadeTexture.repeat.set(2, 4);

  const buildingMaterial = new THREE.MeshStandardMaterial({
    map: facadeTexture,
    bumpScale: 0.5,
    roughness: 0.3,
    metalness: 0.6,
    flatShading: true
  });
  const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const lightPoleMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffeeaa,
    emissive: 0xffcc66,
    emissiveIntensity: 1.2,
    metalness: 0.2,
    roughness: 0.7
  });

  // Create pole & bulb base geometries
  const poleHeight = 8;
  const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, poleHeight);
  const bulbGeometry = new THREE.SphereGeometry(0.3, 8, 8);

  // Count poles for instancing
  let poleCount = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!(row === centerRow && col === centerCol)) poleCount++;
    }
  }

  // Create InstancedMeshes
  const polesMesh = new THREE.InstancedMesh(poleGeometry, lightPoleMaterial, poleCount);
  const bulbsMesh = new THREE.InstancedMesh(bulbGeometry, glowMaterial, poleCount);
  polesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bulbsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // Store bulb positions for light updates
  const bulbPositions: THREE.Vector3[] = [];
  let poleIndex = 0;

  // Generate city grid
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const lotX = col * lotSize - halfCitySize + lotSize / 2;
      const lotZ = row * lotSize - halfCitySize + lotSize / 2;

      if (row === centerRow && col === centerCol) {
        centerX = lotX;
        centerZ = lotZ;
      } else {
        // Building
        const height = Math.random() * 29 + 10;
        const buildingGeo = new THREE.BoxGeometry(buildingSize, height, buildingSize);
        buildingGeo.translate(lotX, height / 2, lotZ);
        buildingGeometries.push(buildingGeo);

        // Streetlight pole & bulb
        const poleX = lotX + (buildingSize + sidewalkSize) / 2 - 1;
        const poleZ = lotZ + (buildingSize + sidewalkSize) / 2 - 1;

        const poleMatrix = new THREE.Matrix4().makeTranslation(poleX, poleHeight / 2, poleZ);
        polesMesh.setMatrixAt(poleIndex, poleMatrix);

        const bulbMatrix = new THREE.Matrix4().makeTranslation(poleX, poleHeight + 0.2, poleZ);
        bulbsMesh.setMatrixAt(poleIndex, bulbMatrix);

        bulbPositions.push(new THREE.Vector3(poleX, poleHeight + 0.2, poleZ));
        poleIndex++;
      }

      // Sidewalk
      const sidewalkGeo = new THREE.BoxGeometry(buildingSize + sidewalkSize, 0.2, buildingSize + sidewalkSize);
      sidewalkGeo.translate(lotX, 0.1, lotZ);
      sidewalkGeometries.push(sidewalkGeo);

      // Roads + lines
      if (col < cols - 1) {
        const roadGeoX = new THREE.BoxGeometry(roadSize, 0.1, lotSize);
        roadGeoX.translate(lotX + lotSize / 2, 0.05, lotZ);
        roadGeometries.push(roadGeoX);

        const lineGeoX = new THREE.BoxGeometry(0.2, 0.02, lotSize - 6);
        lineGeoX.translate(lotX + lotSize / 2, 0.1, lotZ);
        lineGeometries.push(lineGeoX);
      }
      if (row < rows - 1) {
        const roadGeoZ = new THREE.BoxGeometry(lotSize, 0.1, roadSize);
        roadGeoZ.translate(lotX, 0.05, lotZ + lotSize / 2);
        roadGeometries.push(roadGeoZ);

        const lineGeoZ = new THREE.BoxGeometry(lotSize - 6, 0.02, 0.2);
        lineGeoZ.translate(lotX, 0.1, lotZ + lotSize / 2);
        lineGeometries.push(lineGeoZ);
      }
    }
  }

  // Add InstancedMeshes to scene
  scene.add(polesMesh);
  scene.add(bulbsMesh);

  // Store streetlight objects
  const streetLights: THREE.PointLight[] = [];

  // Dynamic update function for closest 8 lights
  const updateStreetLights = () => {
    // Remove all existing lights from scene
    streetLights.forEach(light => scene.remove(light));
    streetLights.length = 0;

    // Find 8 closest poles to camera
    const closest = bulbPositions
      .map(pos => ({ pos, dist: pos.distanceTo(camera.position) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);

    // Add real lights for the closest ones
    closest.forEach(({ pos }) => {
      const light = new THREE.PointLight(0xffcc66, 15, 10, 1);
      light.position.copy(pos);
      light.castShadow = false;
      scene.add(light);
      streetLights.push(light);
    });
  };

  // Merge static meshes
  const safeMerge = (geoms: THREE.BufferGeometry[], mat: THREE.Material) =>
    geoms.length ? new THREE.Mesh(BufferGeometryUtils.mergeGeometries(geoms, false), mat) : null;

  const buildingMesh = safeMerge(buildingGeometries, buildingMaterial);
  const sidewalkMesh = safeMerge(sidewalkGeometries, sidewalkMaterial);
  const roadMesh = safeMerge(roadGeometries, roadMaterial);
  const lineMesh = safeMerge(lineGeometries, lineMaterial);

  if (buildingMesh) {
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;
    scene.add(buildingMesh);
  }
  if (sidewalkMesh) scene.add(sidewalkMesh);
  if (roadMesh) scene.add(roadMesh);
  if (lineMesh) scene.add(lineMesh);

  // Neon billboard (unchanged from before)
  const billboardWidth = 20;
  const billboardHeight = 10;
  const billboardGeo = new THREE.PlaneGeometry(billboardWidth, billboardHeight);
  const billboardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x00ffcc,
    emissiveIntensity: 2,
    side: THREE.DoubleSide
  });
  const billboardMesh = new THREE.Mesh(billboardGeo, billboardMat);
  billboardMesh.position.set(centerX, billboardHeight / 2 + 2, centerZ);
  billboardMesh.rotation.y = Math.PI / 2;
  billboardMesh.castShadow = true;
  scene.add(billboardMesh);

  billboardMesh.updateWorldMatrix(true, false);
  const normal = new THREE.Vector3();
  billboardMesh.getWorldDirection(normal);
  normal.negate();

  const flushDistance = 0.5;
  const targetDistance = 20;

  const spotFront = new THREE.SpotLight(0x00ffcc);
  spotFront.intensity = 20;
  spotFront.distance  = 25;
  spotFront.angle     = Math.PI / 4;
  spotFront.decay     = 0.2;
  spotFront.castShadow = true;
  spotFront.position.copy(billboardMesh.position).addScaledVector(normal, -flushDistance);
  spotFront.target.position.copy(billboardMesh.position).addScaledVector(normal, targetDistance);
  scene.add(spotFront, spotFront.target);
  scene.add(new THREE.SpotLightHelper(spotFront));

  const spotBack = new THREE.SpotLight(0x00ffcc);
  spotBack.intensity = 20;
  spotBack.distance  = 25;
  spotBack.angle     = Math.PI / 4;
  spotBack.decay     = 0.2;
  spotBack.castShadow = true;
  spotBack.position.copy(billboardMesh.position).addScaledVector(normal, flushDistance);
  spotBack.target.position.copy(billboardMesh.position).addScaledVector(normal, -targetDistance);
  scene.add(spotBack, spotBack.target);
  scene.add(new THREE.SpotLightHelper(spotBack));

  // Loaders for drones & cars (unchanged)
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('jsm/libs/draco/');
  loader.setDRACOLoader(dracoLoader);

  loader.load('models/drone_compressed.glb', (gltf) => {
    for (let i = 0; i < 8; i++) {
      const drone = gltf.scene.clone();
      drone.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      const x = -halfCitySize + i * 20;
      const z = halfCitySize + Math.random() * 60;
      const baseY = 20 + Math.random() * 5;
      drone.position.set(x, baseY, z);
      drone.userData.baseY = baseY;
      drone.userData.offset = Math.random() * Math.PI * 2;
      scene.add(drone);
      drones.push(drone);
    }
  });

  loader.load('models/flying_beetle_car.glb', (gltf) => {
  for (let i = 0; i < 9; i++) {
    const car = gltf.scene.clone();
    car.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const roadCol = i + 1;
    const x = roadCol * lotSize - halfCitySize;
    car.userData.pathStart = new THREE.Vector3(x, 0, -halfCitySize + 10);
    car.userData.pathEnd   = new THREE.Vector3(x, 0, halfCitySize - 10);
    car.userData.speed     = 5 + i * 2;
    car.userData.offset    = Math.random() * 100;
    car.position.set(x, 14, -halfCitySize + 10);

    // --- Headlights ---
    const headlightColor = 0xffffff;
    const headlightIntensity = 10;
    const headlightDistance = 20;

    // Left headlight
    const leftLight = new THREE.PointLight(headlightColor, headlightIntensity, headlightDistance,0.8);
    leftLight.position.set(-0.6, 0.4, 15); // relative to car model
    leftLight.castShadow = false;
    car.add(leftLight);

    // Right headlight
    const rightLight = new THREE.PointLight(headlightColor, headlightIntensity, headlightDistance,0.8);
    rightLight.position.set(0.6, 0.4, 15);
    rightLight.castShadow = false;
    car.add(rightLight);

    scene.add(car);
    flyingCars.push(car);
  }
});

  // Return the update function so it can be called in the render loop
  return { updateStreetLights };
}
