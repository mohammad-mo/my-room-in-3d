import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import panelVertexShader from './shaders/panel/vertex.glsl'
import panelFragmentShader from './shaders/panel/fragment.glsl'
import mirrorVertexShader from './shaders/mirror/vertex.glsl'
import mirrorFragmentShader from './shaders/mirror/fragment.glsl'
import coffeSteamVertexShader from './shaders/coffeSteam/vertex.glsl'
import coffeSteamFragmentShader from './shaders/coffeSteam/fragment.glsl'
import { Raycaster, Vector2 } from 'three'

let playButton = document.getElementById('playButton')
let pauseButton = document.getElementById('pauseButton')
let point0 = document.getElementById('point-0')
let point1 = document.getElementById('point-1')
let point2 = document.getElementById('point-2')
let text = document.getElementById('text')
let text1 = document.getElementById('text1')

"mousemove click".split(" ").forEach((e) =>
{
    point0.addEventListener(e, () =>
    {
        text.style.opacity = 1

        setTimeout(() =>
        {
            text.style.opacity = 0
        }, 10000)
        })
})

"mousemove click".split(" ").forEach((e) =>
{
    point1.addEventListener(e, () =>
    {
        text1.style.opacity = 1
        text1.style.pointerEvents = 'initial'

        setTimeout(() =>
        {
            text1.style.opacity = 0
            text1.style.pointerEvents = 'none'
        }, 10000)
        })
})


/**
 * Sound
 */
const sound = new Audio('/sound/music.mp3')
const sound1 = new Audio('/sound/music1.mp3')

playButton.addEventListener('click', () =>
{
    sound.play()
})
pauseButton.addEventListener('click', () =>
{
    sound.pause()
})

point2.addEventListener('click', () =>
{
    sound1.play()
})

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

// GLTF loader
const gltfLoader = new GLTFLoader()

// panel material
const panelMaterial = new THREE.ShaderMaterial({
    uniforms:
    {  
        uTime: { value: 0 },
        uColorStart: { value: new THREE.Color(0x5e6573) },
        uColorEnd: { value: new THREE.Color(0xbb4ccf) }
    },
    vertexShader: panelVertexShader,
    fragmentShader: panelFragmentShader
})

// Mirror material
const mirrorMaterial = new THREE.ShaderMaterial({
    uniforms:
    {  
        uTime: { value: 0 },
        uColorStart: { value: new THREE.Color(0x1e63b3) },
        uColorEnd: { value: new THREE.Color(0xeba834) }
    },
    vertexShader: mirrorVertexShader,
    fragmentShader: mirrorFragmentShader
})

// Text material
const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })

// Coffe steam
const coffeSteamMaterial = new THREE.ShaderMaterial({
    uniforms:
    {
        vUvFrequency: { value: new Vector2(4, 4) },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xb0b0b0) }
    },
    vertexShader: coffeSteamVertexShader,
    fragmentShader: coffeSteamFragmentShader,
    transparent: true,
    depthWrite: false
})

// const topChairMaterial = new THREE.ShaderMaterial({
//     uniforms:
//     {
//         uTime: { value: 0 }
//     },
//     vertexShader: topChairVertexShader
// })


/**
 * Textures
 */
const bakedTexture = textureLoader.load('woodsBake.jpg')
const bakedTexture1 = textureLoader.load('woodsBakeBlack.jpg')
const bakedTexture2 = textureLoader.load('wallBake.jpg')
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
let mixer = null
gltfLoader.load(
    'room.glb',
    (gltf) =>
    {
        // gltf.scene.traverse((child) =>
        // {
        //     console.log(child);
        //     child.material = bakedMaterial1
        // })

        const mogMesh = gltf.scene.children.find(child => child.name === 'mog')
        mogMesh.material = bakedMaterial3

        const coffeSteamMesh = gltf.scene.children.find(child => child.name === 'coffeSteam')
        coffeSteamMesh.material = coffeSteamMaterial

        const WoodsBakeBlackMesh = gltf.scene.children.find(child => child.name === 'Cube')
        WoodsBakeBlackMesh.material = bakedMaterial1

        const chairTopMesh = gltf.scene.children.find(child => child.name === 'chairTop')
        mixer = new THREE.AnimationMixer(gltf.scene)
        const action = mixer.clipAction(gltf.animations[0])
        action.play()
        chairTopMesh.material = bakedMaterial1

        const flowerBakeMesh = gltf.scene.children.find(child => child.name === 'flowers')
        flowerBakeMesh.material = bakedMaterial1
        
        const woodsBakeMesh = gltf.scene.children.find(child => child.name === 'Cube008')
        woodsBakeMesh.material = bakedMaterial

        const panelLightMesh = gltf.scene.children.find(child => child.name === 'panel')
        const mirrorLightMesh = gltf.scene.children.find(child => child.name === 'mirror')
        const textLightMesh = gltf.scene.children.find(child => child.name === 'text')

        panelLightMesh.material = panelMaterial
        mirrorLightMesh.material = mirrorMaterial
        textLightMesh.material = textMaterial

        const wallBakeMesh = gltf.scene.children.find(child => child.name === 'Cube028')
        wallBakeMesh.material = bakedMaterial2

        const lastBakedMesh = gltf.scene.children.find(child => child.name === 'Cube001')
        lastBakedMesh.material = bakedMaterial3

        scene.add(gltf.scene)
    }
)


/**
 * Fireflies
 */
// Geometry
// const firefliesGeometry = new THREE.BufferGeometry()
// const firefliesCount = 2
// const positionArray = new Float32Array(firefliesCount * 3)
// const scaleArray = new Float32Array(firefliesCount)

// for(let i = 0; i < firefliesCount; i++)
// {
//     positionArray[i * 3 + 0] = (Math.random() - 0.2) * 4
//     positionArray[i * 3 + 1] = Math.random() * 3
//     positionArray[i * 3 + 2] = (Math.random() + 0.9) * 4

//     scaleArray[i] = Math.random()
// }

// firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))
// firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1))

// // Material
// const firefliesMaterial = new THREE.ShaderMaterial({
//     uniforms:
//     {
//         uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
//         uSize: { value: 400 },
//         uTime: { value: 0}
//     },
//     vertexShader: firefliesVertexShader,
//     fragmentShader: firefliesFragmentShader,
//     transparent: true,
//     blending: THREE.AdditiveBlending,
//     depthWrite: false
// })

// // Points
// const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial)
// scene.add(fireflies)

/**
 * Points of interest
 */
const raycaster = new Raycaster()
const points = [
    {
        position: new THREE.Vector3(- 1.17, 0.5, 2.9),
        element: document.querySelector('.point-0')
    },
    {
        position: new THREE.Vector3(2.5, 0.8, 4.5),
        element: document.querySelector('.point-1')
    },
    {
        position: new THREE.Vector3(- 2.23, 0.4, 3.025),
        element: document.querySelector('.point-2')
    }
]


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
    // firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
camera.position.x = -8
camera.position.y = 8
camera.position.z = -20

scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.maxDistance = 40
controls.maxPolarAngle = 0.5 * Math.PI

// controls.update()

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
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Update materials
    panelMaterial.uniforms.uTime.value = elapsedTime
    mirrorMaterial.uniforms.uTime.value = elapsedTime
    coffeSteamMaterial.uniforms.uTime.value = elapsedTime

    // Update mixer
    if(mixer !== null)
    {
        mixer.update(deltaTime)
    }

    // Update controls
    controls.update()

    // Go through each point
    for(const point of points)
    {
        const screenPosition = point.position.clone()
        screenPosition.project(camera)

        raycaster.setFromCamera(screenPosition, camera)
        const intersects = raycaster.intersectObjects(scene.children, true)

        if(intersects.length === 0)
        {
            point.element.classList.add('visible')
        }
        else
        {
            const intersectionDistance = intersects[0].distance
            const pointDistance = point.position.distanceTo(camera.position)

            if(intersectionDistance < pointDistance)
            {
                point.element.classList.remove('visible')   
            }
            else
            {
                point.element.classList.add('visible') 
            }
        }
        
        const translateX = screenPosition.x * sizes.width * 0.5
        const translateY = - screenPosition.y * sizes.height * 0.5
        point.element.style.transform = `translate(${translateX}px, ${translateY}px)`
    }

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()