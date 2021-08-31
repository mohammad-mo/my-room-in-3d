import './style.css'
import * as dat from 'dat.gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js'
import firefliesVertexShader from './shaders/fireflies/vertex.glsl'
import firefliesFragmentShader from './shaders/fireflies/fragment.glsl'

/**
 * Base
 */
// Debug
// const gui = new dat.GUI({
//     width: 400
// })

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

// Portal material
const portalMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })

// Mirror material
const mirrorMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })

// Text material
const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })


/**
 * Textures
 */
const bakedTexture = textureLoader.load('woodsBake.jpg')
const bakedTexture1 = textureLoader.load('woodsBakeBlack.jpg')
const bakedTexture2 = textureLoader.load('wallBaked.jpg')
const bakedTexture3 = textureLoader.load('lastBaked.jpg')


const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })
const bakedMaterial1 = new THREE.MeshBasicMaterial({ map: bakedTexture1 })
const bakedMaterial2 = new THREE.MeshBasicMaterial({ map: bakedTexture2 })
const bakedMaterial3 = new THREE.MeshBasicMaterial({ map: bakedTexture3 })
bakedTexture.flipY = false
bakedTexture.encoding = THREE.sRGBEncoding
bakedTexture1.flipY = false
bakedTexture1.encoding = THREE.sRGBEncoding
bakedTexture2.flipY = false
bakedTexture2.encoding = THREE.sRGBEncoding
bakedTexture3.flipY = false
bakedTexture3.encoding = THREE.sRGBEncoding

/**
 * Model
 */
gltfLoader.load(
    'room.glb',
    (gltf) =>
    {
        gltf.scene.traverse((child) =>
        {
            child.material = bakedMaterial1
        })
        

        const woodsBakeMesh = gltf.scene.children.find(child => child.name === 'Cube008')
        woodsBakeMesh.material = bakedMaterial

        const panelLightMesh = gltf.scene.children.find(child => child.name === 'panel')
        const mirrorLightMesh = gltf.scene.children.find(child => child.name === 'mirror')
        const textLightMesh = gltf.scene.children.find(child => child.name === 'text')

        panelLightMesh.material = portalMaterial
        mirrorLightMesh.material = mirrorMaterial
        textLightMesh.material = textMaterial

        const wallBakeMesh = gltf.scene.children.find(child => child.name === 'Cube028')
        wallBakeMesh.material = bakedMaterial2

        const lastBakedMesh = gltf.scene.children.find(child => child.name === 'Cube180')
        lastBakedMesh.material = bakedMaterial3

        scene.add(gltf.scene)
    }
)

/**
 * Fireflies
 */
// Geometry
const firefliesGeometry = new THREE.BufferGeometry()
const firefliesCount = 10
const positionArray = new Float32Array(firefliesCount * 3)
const scaleArray = new Float32Array(firefliesCount)

for(let i = 0; i < firefliesCount; i++)
{
    positionArray[i * 3 + 0] = (Math.random() + 0.4) * 4
    positionArray[i * 3 + 1] = Math.random() * 3
    positionArray[i * 3 + 2] = (Math.random() + 0.9) * 4

    scaleArray[i] = Math.random()
}

firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))
firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1))

// Material
const firefliesMaterial = new THREE.ShaderMaterial({
    uniforms:
    {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 400 },
        uTime: { value: 0}
    },
    vertexShader: firefliesVertexShader,
    fragmentShader: firefliesFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})

// Points
const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial)
scene.add(fireflies)

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

    // Update fireflies
    firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
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
renderer.outputEncoding = THREE.sRGBEncoding

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update materials
    firefliesMaterial.uniforms.uTime.value = elapsedTime

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()