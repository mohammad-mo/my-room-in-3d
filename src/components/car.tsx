import { Html, useGLTF, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as CANNON from 'cannon-es'
import type { MutableRefObject } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { playCarHit, playCarHorn, playGlassBreak } from '../car-audio'
import { honk, onHonk, readCarInput, setKeyboardAction } from '../car-input'
import {
  attachCarPhysics,
  CAR_SCALE,
  createCarDriveState,
  createCarPhysics,
  hopCar,
  isCarAtMirror,
  isCarLost,
  resetCar,
  SPAWN,
  stepCarPhysics,
} from '../car-physics'

/**
 * Car ported from Bruno Simon's folio-2019 (`World/Car.js`): his GLB parts and
 * matcap "shade"/"pure" material parsing, driven by the physics in
 * `car-physics.ts`.
 *
 * His world is Z-up, so the whole rig lives inside a group rotated -90 degrees
 * on X and scaled down to toy size, sitting on the room's real floor height.
 */
const CHASSIS_MODEL_OFFSET = new THREE.Vector3(0, 0, -0.28)
const WHEEL_FLIP = new CANNON.Quaternion().setFromAxisAngle(
  new CANNON.Vec3(0, 0, 1),
  Math.PI,
)

type CarProps = {
  driving: boolean
  onToggleDriving: () => void
  onHitMirror: () => void
  carRef: MutableRefObject<THREE.Object3D | null>
}

/**
 * Driving is not tied to the chase camera: the keys work from any camera, so
 * the car can be sent around the room while looking at it from anywhere.
 */
function useKeyboard() {
  useEffect(() => {
    const set = (code: string, pressed: boolean) => {
      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeyboardAction('up', pressed)
          break
        case 'KeyS':
        case 'ArrowDown':
          setKeyboardAction('down', pressed)
          break
        case 'KeyA':
        case 'ArrowLeft':
          setKeyboardAction('left', pressed)
          break
        case 'KeyD':
        case 'ArrowRight':
          setKeyboardAction('right', pressed)
          break
        case 'Space':
          setKeyboardAction('brake', pressed)
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          setKeyboardAction('boost', pressed)
          break
        default:
          break
      }
    }

    const onDown = (event: KeyboardEvent) => {
      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
        ].includes(event.code)
      ) {
        event.preventDefault()
      }
      // Held keys repeat, and one impulse per repeat launches the car skywards.
      if (event.code === 'KeyH' && !event.repeat) honk()
      set(event.code, true)
    }
    const onUp = (event: KeyboardEvent) => set(event.code, false)

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])
}

/** Bruno's Objects.getConvertedMesh: node name picks the material, `center` recenters. */
function convertModel(source: THREE.Object3D, materials: Record<string, THREE.Material>) {
  const container = new THREE.Object3D()
  const center = new THREE.Vector3()

  for (const child of [...source.children]) {
    if (child.name.match(/^center_?[0-9]{0,3}?/i)) {
      center.set(child.position.x, child.position.y, child.position.z)
    }

    if (!(child instanceof THREE.Mesh)) continue

    const shade = child.name.match(/^shade([a-z]+)_?[0-9]{0,3}?/i)
    const pure = child.name.match(/^pure([a-z]+)_?[0-9]{0,3}?/i)
    const key = shade
      ? `shade${shade[1].charAt(0).toUpperCase()}${shade[1].slice(1).toLowerCase()}`
      : pure
        ? `pure${pure[1].charAt(0).toUpperCase()}${pure[1].slice(1).toLowerCase()}`
        : 'shadeWhite'

    const mesh = child.clone()
    const material = materials[key] ?? materials.shadeWhite
    mesh.material = material
    mesh.traverse((sub) => {
      if (sub instanceof THREE.Mesh) sub.material = material
    })
    container.add(mesh)
  }

  if (center.length() > 0) {
    for (const child of container.children) child.position.sub(center)
    container.position.add(center)
  }

  return container
}

export function Car({ driving, onToggleDriving, onHitMirror, carRef }: CarProps) {
  const chassisRef = useRef<THREE.Object3D | null>(null)
  const rigRef = useRef<THREE.Group>(null)
  const respawnAt = useRef(0)
  useKeyboard()

  const chassisGltf = useGLTF('/car/chassis.glb')
  const wheelGltf = useGLTF('/car/wheel.glb')
  const antenaGltf = useGLTF('/car/antena.glb')
  const brakeGltf = useGLTF('/car/backLightsBrake.glb')
  const reverseGltf = useGLTF('/car/backLightsReverse.glb')

  const matcaps = useTexture([
    '/matcaps/white.png',
    '/matcaps/black.png',
    '/matcaps/red.png',
    '/matcaps/gray.png',
    '/matcaps/yellow.png',
  ])

  const materials = useMemo(() => {
    matcaps.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
    })
    const [white, black, red, gray, yellow] = matcaps

    const brake = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.5,
      toneMapped: false,
    })
    const reverse = new THREE.MeshBasicMaterial({
      color: 0xffe889,
      transparent: true,
      opacity: 0.5,
      toneMapped: false,
    })

    return {
      map: {
        shadeWhite: new THREE.MeshMatcapMaterial({ matcap: white }),
        shadeBlack: new THREE.MeshMatcapMaterial({ matcap: black }),
        shadeRed: new THREE.MeshMatcapMaterial({ matcap: red }),
        shadeGray: new THREE.MeshMatcapMaterial({ matcap: gray }),
        shadeYellow: new THREE.MeshMatcapMaterial({ matcap: yellow }),
        pureRed: new THREE.MeshBasicMaterial({ color: 0xff0000, toneMapped: false }),
        pureWhite: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
        pureYellow: new THREE.MeshBasicMaterial({ color: 0xffe889, toneMapped: false }),
      } as Record<string, THREE.Material>,
      brake,
      reverse,
    }
  }, [matcaps])

  const models = useMemo(() => {
    const chassis = convertModel(chassisGltf.scene, materials.map)
    const antena = convertModel(antenaGltf.scene, materials.map)

    const brakeLights = convertModel(brakeGltf.scene, materials.map)
    brakeLights.traverse((child) => {
      if (child instanceof THREE.Mesh) child.material = materials.brake
    })

    const reverseLights = convertModel(reverseGltf.scene, materials.map)
    reverseLights.traverse((child) => {
      if (child instanceof THREE.Mesh) child.material = materials.reverse
    })

    const wheels = Array.from({ length: 4 }, () =>
      convertModel(wheelGltf.scene, materials.map),
    )

    return { chassis, antena, brakeLights, reverseLights, wheels }
  }, [antenaGltf, brakeGltf, chassisGltf, materials, reverseGltf, wheelGltf])

  const physics = useMemo(() => createCarPhysics(), [])

  useEffect(() => attachCarPhysics(physics), [physics])

  const state = useRef({
    ...createCarDriveState(),
    antenaSpeed: new THREE.Vector2(),
    antenaPosition: new THREE.Vector2(),
    movementSpeed: new THREE.Vector3(),
    movementAcceleration: new THREE.Vector3(),
    lastChassisPosition: new THREE.Vector3(),
  })

  useEffect(
    () =>
      onHonk(() => {
        hopCar(physics, state.current)
        playCarHorn()
      }),
    [physics],
  )

  useEffect(() => {
    const body = physics.chassisBody
    const onCollide = (event: { contact: CANNON.ContactEquation }) => {
      const impact = Math.abs(event.contact.getImpactVelocityAlongNormal())
      if (impact < 0.8) return
      playCarHit(impact / 9)
      // The mirror leans against the wall the car just hit, so a hard enough
      // knock in front of it goes through the glass.
      if (impact > 1.6 && isCarAtMirror(physics)) {
        playGlassBreak()
        onHitMirror()
      }
    }
    body.addEventListener('collide', onCollide)
    return () => {
      body.removeEventListener('collide', onCollide)
    }
  }, [physics, onHitMirror])

  useFrame((frame, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const deltaMs = dt * 1000
    const current = state.current
    const { vehicle, chassisBody, wheelBodies } = physics
    const input = readCarInput()

    stepCarPhysics(physics, current, input, dt)

    // --- leaving the room -------------------------------------------------
    // Driving out of the door is allowed; wander far enough and the car winks
    // out and is put back on the bed where it started.
    const rig = rigRef.current
    if (respawnAt.current > 0) {
      if (frame.clock.elapsedTime >= respawnAt.current) {
        respawnAt.current = 0
        resetCar(physics, current)
        if (rig) rig.visible = true
      }
    } else if (isCarLost(physics)) {
      respawnAt.current = frame.clock.elapsedTime + 0.45
      if (rig) rig.visible = false
    }

    // --- sync three objects ----------------------------------------------
    const chassis = chassisRef.current
    if (chassis) {
      current.lastChassisPosition.copy(chassis.position)
      chassis.position.set(
        chassisBody.position.x,
        chassisBody.position.y,
        chassisBody.position.z,
      )
      chassis.position.add(CHASSIS_MODEL_OFFSET)
      chassis.quaternion.set(
        chassisBody.quaternion.x,
        chassisBody.quaternion.y,
        chassisBody.quaternion.z,
        chassisBody.quaternion.w,
      )
    }

    for (let i = 0; i < vehicle.wheelInfos.length; i++) {
      vehicle.updateWheelTransform(i)
      const transform = vehicle.wheelInfos[i].worldTransform
      wheelBodies[i].position.copy(transform.position)
      wheelBodies[i].quaternion.copy(transform.quaternion)

      // Mirror the right-side wheels so the rims face outward.
      if (i === 1 || i === 3) {
        wheelBodies[i].quaternion = wheelBodies[i].quaternion.mult(WHEEL_FLIP)
      }

      const wheel = models.wheels[i]
      wheel.position.set(
        wheelBodies[i].position.x,
        wheelBodies[i].position.y,
        wheelBodies[i].position.z,
      )
      wheel.quaternion.set(
        wheelBodies[i].quaternion.x,
        wheelBodies[i].quaternion.y,
        wheelBodies[i].quaternion.z,
        wheelBodies[i].quaternion.w,
      )
    }

    // --- antenna wobble (his Car.setAntena) -------------------------------
    if (chassis) {
      const movement = chassis.position.clone().sub(current.lastChassisPosition)
      movement.multiplyScalar((1 / Math.max(deltaMs, 1)) * 17)
      current.movementAcceleration.copy(movement).sub(current.movementSpeed)
      current.movementSpeed.copy(movement)

      const max = 1
      const accelerationX = THREE.MathUtils.clamp(
        current.movementAcceleration.x,
        -max,
        max,
      )
      const accelerationY = THREE.MathUtils.clamp(
        current.movementAcceleration.y,
        -max,
        max,
      )

      current.antenaSpeed.x -= accelerationX * 10
      current.antenaSpeed.y -= accelerationY * 10

      const pull = current.antenaPosition
        .clone()
        .negate()
        .multiplyScalar(current.antenaPosition.length() * 0.02)
      current.antenaSpeed.add(pull)
      current.antenaSpeed.multiplyScalar(1 - 0.035)
      current.antenaPosition.add(current.antenaSpeed)

      const local = current.antenaPosition.clone()
      local.rotateAround(new THREE.Vector2(), -chassis.rotation.z)
      models.antena.rotation.y = local.x * 0.1
      models.antena.rotation.x = local.y * 0.1
    }

    // --- lights -----------------------------------------------------------
    materials.brake.opacity = input.brake ? 1 : 0.5
    materials.reverse.opacity = input.down ? 1 : 0.5
  })

  const setCarRef = (node: THREE.Object3D | null) => {
    chassisRef.current = node
    carRef.current = node
  }

  return (
    <group
      ref={rigRef}
      position={[SPAWN.x, SPAWN.y, SPAWN.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={CAR_SCALE}
    >
      <group ref={setCarRef}>
        <primitive object={models.chassis} />
        {/* The antenna keeps its own pivot from the model, so it is rotated
            directly instead of through a wrapper at the chassis origin. */}
        <primitive object={models.antena} />
        <primitive object={models.brakeLights} />
        <primitive object={models.reverseLights} />

        {!driving && (
          <Html
            position={[0, 0, 2.6]}
            center
            distanceFactor={3}
            zIndexRange={[20, 10]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <button
              type="button"
              className="rounded-full border border-white/25 bg-[#0f1113]/80 px-3 py-[0.45rem] font-['DM_Sans',system-ui,sans-serif] text-[0.62rem] font-semibold tracking-[0.12em] whitespace-nowrap text-white/75 uppercase backdrop-blur-xl transition-colors hover:border-[#ffea2b] hover:text-[#ffea2b] cursor-[url('/cursor-ring-active.svg')_16_16,_pointer]"
              onClick={(event) => {
                event.stopPropagation()
                onToggleDriving()
              }}
            >
              Chase cam
            </button>
          </Html>
        )}
      </group>

      {/* Each wheel model is recentered on its hub, so the physics transform is
          written straight onto it: a wrapper would double up the model offset. */}
      {models.wheels.map((wheel) => (
        <primitive key={wheel.uuid} object={wheel} />
      ))}
    </group>
  )
}

useGLTF.preload('/car/chassis.glb')
useGLTF.preload('/car/wheel.glb')
useGLTF.preload('/car/antena.glb')
useGLTF.preload('/car/backLightsBrake.glb')
useGLTF.preload('/car/backLightsReverse.glb')
