import './style.css'
import * as dat from 'dat.gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import panelVertexShader from './shaders/panel/vertex.glsl'
import panelFragmentShader from './shaders/panel/fragment.glsl'
import { Raycaster } from 'three'


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
        // gltf.scene.traverse((child) =>
        // {
        //     console.log(child);
        //     child.material = bakedMaterial1
        // })

        const WoodsBakeBlackMesh = gltf.scene.children.find(child => child.name === 'Cube')
        WoodsBakeBlackMesh.material = bakedMaterial1

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

        const lastBakedMesh = gltf.scene.children.find(child => child.name === 'Cube180')
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
    // firefliesMaterial.uniforms.uTime.value = elapsedTime
    panelMaterial.uniforms.uTime.value = elapsedTime

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