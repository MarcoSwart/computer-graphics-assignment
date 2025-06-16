import './style.css'
import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import Stats from 'three/addons/libs/stats.module.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { addCityLayout, drones, flyingCars } from './building'
import { addPlane } from './plane'
import { addLenflare, createLight, createLightHelper } from './light'
import { createRenderer } from './renderer'
// import { flyingCars, drones } from './cityLayout'
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 1, 2)

const light = createLight(camera);
scene.add(light);

const lightOffset = new THREE.Vector3(100, 30, 70)

const lightHelper = createLightHelper(light);
scene.add(lightHelper)

addLenflare(light);

const renderer = createRenderer();
let environmentTexture = new THREE.CubeTextureLoader().setPath('https://sbcode.net/img/').load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'])
scene.environment = environmentTexture
scene.background = environmentTexture

async function init() {
  await new RGBELoader().loadAsync('img/venice_sunset_1k.hdr').then(() => {
  //     environmentTexture = texture
  // environmentTexture.mapping = THREE.EquirectangularReflectionMapping
  scene.environment = environmentTexture
  scene.background = environmentTexture
  scene.environmentIntensity = 1
  // texture.mapping = THREE.EquirectangularReflectionMapping
  // scene.environment = texture
  // scene.environmentIntensity = 0.1
  // scene.background = scene.environment
  // scene.backgroundIntensity = 0.25
  // scene.backgroundBlurriness = 0.3
})
}

init();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  render()
})

const menuPanel = document.getElementById('menuPanel') as HTMLDivElement

const startButton = document.getElementById('startButton') as HTMLButtonElement
startButton.addEventListener(
  'click',
  () => {
    controls.lock()
  },
  false
)

const controls = new PointerLockControls(camera, renderer.domElement)
controls.addEventListener('change', () => {
  console.log('pointerlock change')
})
controls.addEventListener('lock', () => (menuPanel.style.display = 'none'))
controls.addEventListener('unlock', () => (menuPanel.style.display = 'block'))

addPlane(scene);

addCityLayout(scene);

const keyMap: { [key: string]: boolean } = {}
const onDocumentKey = (e: KeyboardEvent) => {
  keyMap[e.code] = e.type === 'keydown'
}
document.addEventListener('keydown', onDocumentKey, false)
document.addEventListener('keyup', onDocumentKey, false)

const stats = new Stats()
document.body.appendChild(stats.dom)

const gui = new GUI({ width: 400 }).close()

const rendererFolder = gui.addFolder('Renderer')
rendererFolder.add(renderer, 'toneMappingExposure', 0, 2, 0.01)

const backgroundFolder = gui.addFolder('Background')
backgroundFolder.add(scene, 'backgroundIntensity', 0, 2, 0.01)
backgroundFolder.add(scene, 'backgroundBlurriness', 0, 2, 0.01)

const environmentFolder = gui.addFolder('Environnment')
environmentFolder.add(scene, 'environmentIntensity', 0, 2, 0.01)

const lightFolder = gui.addFolder('Light Helper')
lightFolder.add(lightHelper, 'visible')

const clock = new THREE.Clock()
let delta

function updateFlyingObjects(t: number) {
  flyingCars.forEach((car, i) => {
    const { pathStart, pathEnd, speed, offset } = car.userData;
    const total = 200;
    const tMod = ((t * speed + offset) % total) / total;
    const dir = tMod < 0.5 ? 1 : -1;
    const progress = dir === 1 ? tMod * 2 : (1 - tMod) * 2;
    car.position.lerpVectors(pathStart, pathEnd, progress);
    car.position.y = 14 + Math.sin(t * 3 + i) * 1.2;
    car.rotation.y = dir === 1 ? 0 : Math.PI;
  });

  drones.forEach((drone, i) => {
    drone.position.y = 20 + Math.sin(t * 3 + i) * 2;
    drone.rotation.y += 0.05;
    drone.rotation.x += 0.02;
  });
}

function animate() {
  requestAnimationFrame(animate)

  delta = clock.getDelta()

  if (keyMap['KeyW'] || keyMap['ArrowUp']) controls.moveForward(delta * 25)
  if (keyMap['KeyS'] || keyMap['ArrowDown']) controls.moveForward(-delta * 25)
  if (keyMap['KeyA'] || keyMap['ArrowLeft']) controls.moveRight(-delta * 25)
  if (keyMap['KeyD'] || keyMap['ArrowRight']) controls.moveRight(delta * 25)

  updateFlyingObjects(clock.getElapsedTime());
  light.position.copy(camera.position).add(lightOffset)

  render()
  stats.update()
}

function render() {
  renderer.render(scene, camera)
}

animate()