import * as THREE from 'three';

export function addPlane(scene: THREE.Scene) {
    const planeGeometry = new THREE.PlaneGeometry(300, 300, 1, 1)
    const material = new THREE.MeshStandardMaterial()
    const plane = new THREE.Mesh(planeGeometry, material)
    plane.rotateX(-Math.PI / 2)
    plane.receiveShadow = true
    scene.add(plane)
}