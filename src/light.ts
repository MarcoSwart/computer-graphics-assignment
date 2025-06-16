import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';

export function createLight(camera: THREE.PerspectiveCamera) {
    const light = new THREE.DirectionalLight(0xebfeff, Math.PI)
    light.castShadow = true
    light.shadow.camera.far = 250
    light.shadow.camera.left = -50
    light.shadow.camera.right = 50
    light.shadow.camera.top = 50
    light.shadow.camera.bottom = -50
    light.shadow.blurSamples = 10
    light.shadow.radius = 5
    light.target = camera
    return light;
}

export function createLightHelper(light: THREE.DirectionalLight){
    const lightHelper = new THREE.CameraHelper(light.shadow.camera)
    lightHelper.visible = false
    return lightHelper;
}

export function addLenflare(light: THREE.DirectionalLight) {
const textureLoader = new THREE.TextureLoader()
const textureFlare0 = textureLoader.load('img/lensflare0.png')
const textureFlare3 = textureLoader.load('img/lensflare3.png')
const lensflare = new Lensflare()
lensflare.addElement(new LensflareElement(textureFlare0, 1000, 0))
lensflare.addElement(new LensflareElement(textureFlare3, 500, 0.2))
lensflare.addElement(new LensflareElement(textureFlare3, 250, 0.8))
lensflare.addElement(new LensflareElement(textureFlare3, 125, 0.6))
lensflare.addElement(new LensflareElement(textureFlare3, 62.5, 0.4))
light.add(lensflare)
}