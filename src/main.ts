import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import Stats from 'three/addons/libs/stats.module.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { addCityLayout, drones, flyingCars } from './building'
import { addPlane } from './plane'
import { addLenflare, createLight, createLightHelper } from './light'
import { createRenderer } from './renderer'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(10, 10, 10)

const light = createLight(camera)
scene.add(light)
const lightOffset = new THREE.Vector3(100, 30, 70)

const lightHelper = createLightHelper(light)
scene.add(lightHelper)

addLenflare(light)

const renderer = createRenderer()

// Environment texture
const environmentTexture = new THREE.CubeTextureLoader()
  .setPath('https://sbcode.net/img/')
  .load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'])

scene.environment = environmentTexture
scene.background = environmentTexture

// Load HDR (optional override)
async function init() {
  await new RGBELoader()
    .loadAsync('img/venice_sunset_1k.hdr')
    .then(() => {
      scene.environment = environmentTexture
      scene.background = environmentTexture
      scene.environmentIntensity = 1
    })
}
init()

// Replace PointerLockControls with OrbitControls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.minDistance = 5
controls.maxDistance = 200
controls.maxPolarAngle = Math.PI / 2.1

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  render()
})

// Add objects to scene
addPlane(scene)
addCityLayout(scene)

// Stats and GUI
const stats = new Stats()
document.body.appendChild(stats.dom)

const gui = new GUI({ width: 400 }).close()
gui.addFolder('Renderer').add(renderer, 'toneMappingExposure', 0, 2, 0.01)
gui.addFolder('Background').add(scene, 'backgroundIntensity', 0, 2, 0.01)
gui.addFolder('Background').add(scene, 'backgroundBlurriness', 0, 2, 0.01)
gui.addFolder('Environment').add(scene, 'environmentIntensity', 0, 2, 0.01)
gui.addFolder('Light Helper').add(lightHelper, 'visible')

const clock = new THREE.Clock()

function updateFlyingObjects(t: number) {
  flyingCars.forEach((car, i) => {
    const { pathStart, pathEnd, speed, offset } = car.userData
    const total = 200
    const tMod = ((t * speed + offset) % total) / total
    const dir = tMod < 0.5 ? 1 : -1
    const progress = dir === 1 ? tMod * 2 : (1 - tMod) * 2
    car.position.lerpVectors(pathStart, pathEnd, progress)
    car.position.y = 14 + Math.sin(t * 3 + i) * 1.2
    car.rotation.y = dir === 1 ? 0 : Math.PI
  })

  drones.forEach((drone, i) => {
    drone.position.y = 50 + Math.sin(t * 3 + i) * 2
  })
}

function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()

  updateFlyingObjects(elapsed)
  light.position.copy(camera.position).add(lightOffset)
  render()
  stats.update()
  controls.update()
}

function render() {
  renderer.render(scene, camera)
}

animate()
