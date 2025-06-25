// cityLayout.ts
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const flyingCars: THREE.Object3D[] = [];
export const drones: THREE.Object3D[] = [];

export function addCityLayout(scene: THREE.Scene) {
  const buildingGeometries: THREE.BufferGeometry[] = [];
  const sidewalkGeometries: THREE.BufferGeometry[] = [];
  const roadGeometries: THREE.BufferGeometry[] = [];
  const lineGeometries: THREE.BufferGeometry[] = [];
  const lightPoleGeometries: THREE.BufferGeometry[] = [];

  const rows = 10;
  const cols = 10;
  const lotSize = 30;
  const buildingSize = 10;
  const sidewalkSize = 15;
  const roadSize = 6;
  const halfCitySize = (cols * lotSize) / 2;

  const textureLoader = new THREE.TextureLoader();
  const facadeTexture = textureLoader.load('textures/facade_specular.png');
  const bumpMap = textureLoader.load('textures/concrete.png');
  facadeTexture.wrapS = facadeTexture.wrapT = THREE.RepeatWrapping;
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  facadeTexture.repeat.set(2, 4);
  bumpMap.repeat.set(4, 4);

  const buildingMaterial = new THREE.MeshStandardMaterial({
    map: facadeTexture,
    bumpMap: bumpMap,
    bumpScale: 0.5,
    roughness: 0.3,
    metalness: 0.6,
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

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const lotX = col * lotSize - halfCitySize + lotSize / 2;
      const lotZ = row * lotSize - halfCitySize + lotSize / 2;

      // Building
      const height = Math.random() * 29 + 10;
      const buildingGeo = new THREE.BoxGeometry(buildingSize, height, buildingSize);
      buildingGeo.translate(lotX, height / 2, lotZ);
      buildingGeometries.push(buildingGeo);

      // Sidewalk
      const sidewalkGeo = new THREE.BoxGeometry(buildingSize + sidewalkSize, 0.2, buildingSize + sidewalkSize);
      sidewalkGeo.translate(lotX, 0.1, lotZ);
      sidewalkGeometries.push(sidewalkGeo);

      // Streetlight pole
      const poleHeight = 8;
      const poleX = lotX + (buildingSize + sidewalkSize) / 2 - 1;
      const poleZ = lotZ + (buildingSize + sidewalkSize) / 2 - 1;
      const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, poleHeight);
      poleGeo.translate(poleX, poleHeight / 2, poleZ);
      lightPoleGeometries.push(poleGeo);

      // Emissive bulb (fake light)
      const bulbGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const bulbMesh = new THREE.Mesh(bulbGeo, glowMaterial);
      bulbMesh.position.set(poleX, poleHeight + 0.2, poleZ);
      bulbMesh.castShadow = true;
      scene.add(bulbMesh);

      // Roads + lines
      if (col < cols - 1) {
        const roadGeoX = new THREE.BoxGeometry(roadSize, 0.1, lotSize);
        roadGeoX.translate(lotX + lotSize / 2, 0.05, lotZ);
        roadGeometries.push(roadGeoX);

        const lineGeo = new THREE.BoxGeometry(0.2, 0.02, lotSize - 6);
        lineGeo.translate(lotX + lotSize / 2, 0.1, lotZ);
        lineGeometries.push(lineGeo);
      }
      if (row < rows - 1) {
        const roadGeoZ = new THREE.BoxGeometry(lotSize, 0.1, roadSize);
        roadGeoZ.translate(lotX, 0.05, lotZ + lotSize / 2);
        roadGeometries.push(roadGeoZ);

        const lineGeo = new THREE.BoxGeometry(lotSize - 6, 0.02, 0.2);
        lineGeo.translate(lotX, 0.1, lotZ + lotSize / 2);
        lineGeometries.push(lineGeo);
      }
    }
  }

  const safeMerge = (geoms: THREE.BufferGeometry[], material: THREE.Material) =>
    geoms.length ? new THREE.Mesh(BufferGeometryUtils.mergeGeometries(geoms, false), material) : null;

  const buildingMesh = safeMerge(buildingGeometries, buildingMaterial);
  const sidewalkMesh = safeMerge(sidewalkGeometries, sidewalkMaterial);
  const roadMesh = safeMerge(roadGeometries, roadMaterial);
  const lineMesh = safeMerge(lineGeometries, lineMaterial);
  const lightPolesMesh = safeMerge(lightPoleGeometries, lightPoleMaterial);

  if (buildingMesh) { buildingMesh.castShadow = true; buildingMesh.receiveShadow = true; scene.add(buildingMesh); }
  if (sidewalkMesh) scene.add(sidewalkMesh);
  if (roadMesh) scene.add(roadMesh);
  if (lineMesh) scene.add(lineMesh);
  if (lightPolesMesh) scene.add(lightPolesMesh);

  const loader = new GLTFLoader();

  // Drones using GLTF models
loader.load('models/drone.glb', (gltf) => {
  for (let i = 0; i < 8; i++) {
    const droneModel = gltf.scene.clone();
    droneModel.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const x = -80 + i * 20;
    const z = 80 + Math.random() * 60;
    const baseY = 20 + Math.random() * 5;

    droneModel.position.set(x, baseY, z);

    droneModel.userData.baseY = baseY;
    droneModel.userData.offset = Math.random() * Math.PI * 2; // phase offset for varied motion

    scene.add(droneModel);
    drones.push(droneModel);
  }
});

  // Flying Cars via GLTF model
  loader.load('models/flying_beetle_car.glb', (gltf) => {
    for (let i = 0; i < 5; i++) {
      const model = gltf.scene.clone();
      model.traverse((child: any) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }});
      const roadCol = i + 1;
      const x = roadCol * lotSize - halfCitySize;
      model.userData.pathStart = new THREE.Vector3(x, 0, -halfCitySize + 10);
      model.userData.pathEnd   = new THREE.Vector3(x, 0,  halfCitySize - 10);
      model.userData.speed     = 5 + i * 2;
      model.userData.offset    = Math.random() * 100;
      model.position.set(x, 14, -halfCitySize + 10);
      scene.add(model);
      flyingCars.push(model);
    }
  });
}