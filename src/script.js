import './style.css'
import * as dat from 'dat.gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js'

/**
 * Base
 */
// Debug
const gui = new dat.GUI({
    width: 400
})

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 *  Light
 */
// const pointLight = new THREE.PointLight( 0xffffff, 2, 100 );
// pointLight.position.set( -8, 4, -6 );
// scene.add( pointLight );

const pointLight = new THREE.PointLight( 0xffffff, 1, 100 );
pointLight.position.set( 0, 0, 10 );
scene.add( pointLight )
const pointLight1 = new THREE.PointLight( 0xffffff, 1, 50 );
pointLight.position.set( 0, 2, -9 );
// scene.add( pointLight1 )

const bakedTexture = textureLoader.load('woodsBake.jpg')
const bakedTexture1 = textureLoader.load('woodsBakeBlack.jpg')
const bakedTexture2 = textureLoader.load('wallBaked.jpg')
const bakedTexture3 = textureLoader.load('lastBaking.jpg')


const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })
const bakedMaterial1 = new THREE.MeshBasicMaterial({ map: bakedTexture1 })
const bakedMaterial2 = new THREE.MeshBasicMaterial({ map: bakedTexture2 })
const bakedMaterial3 = new THREE.MeshBasicMaterial({ map: bakedTexture3 })
bakedTexture.flipY = false
bakedTexture1.flipY = false
bakedTexture2.flipY = false
bakedTexture3.flipY = false
/**
 * Model
 */
gltfLoader.load(
    'woodsBake.glb',
    (gltf) =>
    {
        gltf.scene.traverse((child) =>
        {
            child.material = bakedMaterial
        })
        scene.add(gltf.scene)
    }
)

gltfLoader.load(
    'woodsBakeBlack.glb',
    (gltf) =>
    {
        gltf.scene.traverse((child) =>
        {
            child.material = bakedMaterial1
        })
        scene.add(gltf.scene)
    }
)

gltfLoader.load(
    'wallBaked.glb',
    (gltf) =>
    {
        gltf.scene.traverse((child) =>
        {
            child.material = bakedMaterial2
        })
        scene.add(gltf.scene)
    }
)

gltfLoader.load(
    'lastBaked.glb',
    (gltf) =>
    {
        gltf.scene.traverse((child) =>
        {
            child.material = bakedMaterial3
        })
        scene.add(gltf.scene)
    }
)
/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
camera.position.x = -8
camera.position.y = 5
camera.position.z = -20

scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()