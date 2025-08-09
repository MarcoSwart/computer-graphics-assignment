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

  // Flat shading for buildings
  const buildingMaterial = new THREE.MeshStandardMaterial({
  map: facadeTexture,
  bumpScale: 0.5,
  roughness: 0.3,
  metalness: 0.6,
  flatShading: true
  });
  // Gouraud shading for sidewalks
  const sidewalkMaterial = new THREE.MeshLambertMaterial({
    color: 0xaaaaaa
  });

  // Gouraud shading for roads
  const roadMaterial = new THREE.MeshLambertMaterial({
    color: 0x333333
  });

  // Gouraud shading for lane lines
  const lineMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff
  });
  // Phong shading for light poles
  const lightPoleMaterial = new THREE.MeshPhongMaterial({
    color: 0x222222,
    shininess: 80,
    specular: 0x444444
  });

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

// --- Road bounds / helpers ---
const edgePad = 2.50; // how far inside the border roads should end
const minB = -halfCitySize + edgePad;
const maxB =  halfCitySize - edgePad;

function addClampedX(x0: number, x1: number, zMid: number) {
  const a = Math.max(minB, Math.min(x0, x1));
  const b = Math.min(maxB, Math.max(x0, x1));
  const len = b - a;
  if (len <= 0) return;
  const cx = (a + b) / 2;

  const road = new THREE.BoxGeometry(len, 0.1, roadSize);
  road.translate(cx, 0.05, zMid);
  roadGeometries.push(road);

  const line = new THREE.BoxGeometry(Math.max(0.1, len - 6), 0.02, 0.2);
  line.translate(cx, 0.1, zMid);
  lineGeometries.push(line);
}

function addClampedZ(z0: number, z1: number, xMid: number) {
  const a = Math.max(minB, Math.min(z0, z1));
  const b = Math.min(maxB, Math.max(z0, z1));
  const len = b - a;
  if (len <= 0) return;
  const cz = (a + b) / 2;

  const road = new THREE.BoxGeometry(roadSize, 0.1, len);
  road.translate(xMid, 0.05, cz);
  roadGeometries.push(road);

  const line = new THREE.BoxGeometry(0.2, 0.02, Math.max(0.1, len - 6));
  line.translate(xMid, 0.1, cz);
  lineGeometries.push(line);
}
// Horizontal roads (between rows) – run along X
for (let r = 0; r < rows - 1; r++) {
  const zMid = -halfCitySize + (r + 1) * lotSize; // centers between row r and r+1
  addClampedX(-halfCitySize, +halfCitySize, zMid);
}

// Vertical roads (between columns) – run along Z
for (let c = 0; c < cols - 1; c++) {
  const xMid = -halfCitySize + (c + 1) * lotSize; // centers between col c and c+1
  addClampedZ(-halfCitySize, +halfCitySize, xMid);
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
  const billboardMat = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  emissive: 0x00ffcc,
  emissiveIntensity: 2,
  shininess: 100,
  specular: 0x00ffff,
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
      car.userData.pathEnd = new THREE.Vector3(x, 0, halfCitySize - 10);
      car.userData.speed = 5 + i * 2;
      car.userData.offset = Math.random() * 100;
      car.position.set(x, 14, -halfCitySize + 10);

      // Headlights
      const headlightColor = 0xffffff;
      const headlightIntensity = 10;
      const headlightDistance = 20;

      const leftLight = new THREE.PointLight(headlightColor, headlightIntensity, headlightDistance, 0.8);
      leftLight.position.set(-0.6, 0.4, 15);
      leftLight.castShadow = false;
      car.add(leftLight);

      const rightLight = new THREE.PointLight(headlightColor, headlightIntensity, headlightDistance, 0.8);
      rightLight.position.set(0.6, 0.4, 15);
      rightLight.castShadow = false;
      car.add(rightLight);

      scene.add(car);
      flyingCars.push(car);
    }
  });

  // Load concrete road barriers on all four edges, with optional pair-per-lane
loader.load('models/concrete_road_barrier.glb', (gltf) => {
  const barrierModel = gltf.scene;

  // ---- config ----
  const barrierScale = 4;            // size of the GLB
  const yOnRoad = 0.05;              // matches your road top
  const inward = roadSize / 2 + 1.5; // nudge inside the border so it sits ON the asphalt
  const twoPerLane = true;           // <- set false for one barrier per lane
  const laneOffset = Math.min(roadSize * 0.25, 1.0); // sideways offset for the pair
  // ----------------

  barrierModel.scale.setScalar(barrierScale);

  // Make sure the barriers actually reflect the environment:
  barrierModel.traverse((obj: any) => {
    if (obj.isMesh && obj.material) {
      const m = obj.material as THREE.MeshStandardMaterial;
      m.envMapIntensity = 1.2; // boost reflection strength
      m.metalness = 0.05; // concrete is not metal
      m.roughness = 0.45; // a bit glossy to catch highlights
      m.needsUpdate = true;

      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  // Helpers
  const makeBarriers = (
    centers: Array<{ x: number; z: number }>,
    rotationY: number,
    lateralAxis: "x" | "z"
  ) => {
    const laterals = twoPerLane ? [-laneOffset, laneOffset] : [0];
    centers.forEach(({ x, z }) => {
      laterals.forEach((off) => {
        const b = barrierModel.clone();
        if (lateralAxis === "x") {
          b.position.set(x + off, yOnRoad, z);
        } else {
          b.position.set(x, yOnRoad, z + off);
        }
        b.rotation.y = rotationY;
        scene.add(b);
      });
    });
  };

  // Centers for roads:
  // - Horizontal roads run along X and are centered at:
  //   z = -halfCitySize + (row+1)*lotSize  for row = 0..rows-2
  // - Vertical roads run along Z and are centered at:
  //   x = -halfCitySize + (col+1)*lotSize  for col = 0..cols-2

  // RIGHT edge (end of horizontal roads): x near +halfCitySize
  {
    const x = halfCitySize - inward;              // on road end
    const centers = Array.from({ length: rows - 1 }, (_, row) => ({
      x,
      z: -halfCitySize + (row + 1) * lotSize,
    }));
    // Horizontal road → lateral axis is Z; barrier perpendicular to road → rotate 90°
    makeBarriers(centers, Math.PI / 2, "z");
  }

  // LEFT edge (start of horizontal roads): x near -halfCitySize
  {
    const x = -halfCitySize + inward;
    const centers = Array.from({ length: rows - 1 }, (_, row) => ({
      x,
      z: -halfCitySize + (row + 1) * lotSize,
    }));
    makeBarriers(centers, Math.PI / 2, "z");
  }

  // BOTTOM edge (end of vertical roads): z near +halfCitySize
  {
    const z = halfCitySize - inward;
    const centers = Array.from({ length: cols - 1 }, (_, col) => ({
      x: -halfCitySize + (col + 1) * lotSize,
      z,
    }));
    // Vertical road → lateral axis is X; barrier perpendicular to road → rotation 0
    makeBarriers(centers, 0, "x");
  }

  // TOP edge (start of vertical roads): z near -halfCitySize
  {
    const z = -halfCitySize + inward;
    const centers = Array.from({ length: cols - 1 }, (_, col) => ({
      x: -halfCitySize + (col + 1) * lotSize,
      z,
    }));
    makeBarriers(centers, 0, "x");
  }
});


  // Return the update function so it can be called in the render loop
  return { updateStreetLights };
}
