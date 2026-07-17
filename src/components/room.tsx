import { useAnimations, useGLTF, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { MutableRefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  coffeeSteamFragmentShader,
  coffeeSteamVertexShader,
  panelFragmentShader,
  panelVertexShader,
} from '../shaders'

const KEY_NAMES = ['ctrlKey', 'cKey', 'vKey', 'hKey', 'eKey', 'yKey', 'spaceKey']

type RoomProps = {
  onReady?: () => void
  occluderRef?: MutableRefObject<THREE.Group | null>
}

type AnimatedKey = {
  object: THREE.Object3D
  baseY: number
}

function createBasicMaterial(map: THREE.Texture) {
  return new THREE.MeshBasicMaterial({ map, toneMapped: false })
}

export function Room({ onReady, occluderRef }: RoomProps) {
  const group = useRef<THREE.Group>(null)
  const renderedFrames = useRef(0)
  const readySent = useRef(false)
  const { scene, animations } = useGLTF('/room.glb', '/draco/gltf/')
  const clonedScene = useMemo(() => scene.clone(true), [scene])
  const textures = useTexture([
    '/bakedTexture.jpg',
    '/bakedTexture1.jpg',
    '/bakedTexture2.jpg',
    '/bakedTexture3.jpg',
    '/bakedTexture4.jpg',
    '/bakedTexture5.jpg',
  ])

  const setGroupRef = useCallback(
    (node: THREE.Group | null) => {
      group.current = node
      if (occluderRef) occluderRef.current = node
    },
    [occluderRef],
  )

  const materials = useMemo(() => {
    textures.forEach((texture) => {
      texture.flipY = false
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
    })

    return {
      baked: textures.map(createBasicMaterial),
      eminemBack: new THREE.MeshBasicMaterial({
        color: '#020202',
        side: THREE.BackSide,
        toneMapped: false,
      }),
      bench: new THREE.MeshBasicMaterial({
        color: '#141414',
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
      text: new THREE.MeshBasicMaterial({
        color: '#ffffe5',
        toneMapped: false,
      }),
      panel: new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorStart: { value: new THREE.Color('#5e6573') },
          uColorEnd: { value: new THREE.Color('#bb4ccf') },
        },
        vertexShader: panelVertexShader,
        fragmentShader: panelFragmentShader,
      }),
      steam: new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uTimeFrequency: { value: 0.0004 },
          vUvFrequency: { value: new THREE.Vector2(4, 5) },
          uColor: { value: new THREE.Color('#b0b0b0') },
        },
        vertexShader: coffeeSteamVertexShader,
        fragmentShader: coffeeSteamFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    }
  }, [textures])

  const animatedKeys = useMemo(
    () =>
      KEY_NAMES.map((name) => {
        const object = clonedScene.getObjectByName(name)
        return object ? { object, baseY: object.position.y } : null
      }).filter((key): key is AnimatedKey => key !== null),
    [clonedScene],
  )

  useLayoutEffect(() => {
    const assignments: Record<string, THREE.Material> = {
      keyboard: materials.baked[5],
      ctrlKey: materials.baked[5],
      cKey: materials.baked[5],
      vKey: materials.baked[5],
      hKey: materials.baked[5],
      eKey: materials.baked[5],
      yKey: materials.baked[5],
      spaceKey: materials.baked[5],
      eminem: materials.baked[4],
      eminemBack: materials.eminemBack,
      topbenchPress: materials.bench,
      mog: materials.baked[3],
      coffeSteam: materials.steam,
      Cube: materials.baked[1],
      chairTop: materials.baked[1],
      flowers: materials.baked[1],
      Cube008: materials.baked[0],
      panel: materials.panel,
      text: materials.text,
      Cube028: materials.baked[2],
      Cube001: materials.baked[3],
    }

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = true
        if (child.name === 'mirror') child.visible = false
        if (assignments[child.name]) child.material = assignments[child.name]
      }
    })
  }, [clonedScene, materials])

  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    const activeActions = Object.values(actions)
      .filter((action): action is THREE.AnimationAction => Boolean(action))
      .map((action) => action.reset().fadeIn(0.4).play())

    return () =>
      activeActions.forEach((action) => {
        action.fadeOut(0.2)
      })
  }, [actions])

  useEffect(
    () => () => {
      Object.values(materials)
        .flat()
        .forEach((material) => {
          material?.dispose()
        })
    },
    [materials],
  )

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime()
    materials.panel.uniforms.uTime.value = elapsed
    materials.steam.uniforms.uTime.value = elapsed

    animatedKeys.forEach(({ object, baseY }, index) => {
      const press = Math.max(0, Math.sin(elapsed * 5.8 - index * 0.78))
      object.position.y = baseY + press * 0.0015
    })

    if (!readySent.current) {
      renderedFrames.current += 1
      if (renderedFrames.current >= 4) {
        readySent.current = true
        onReady?.()
      }
    }
  })

  return (
    <group ref={setGroupRef} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  )
}

useGLTF.preload('/room.glb', '/draco/gltf/')
