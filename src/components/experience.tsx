import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ComponentRef, RefObject } from 'react'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { createGlassCracks } from '../glass-cracks'
import { Car } from './car'
import type { CameraFocus } from './hotspots'
import { Hotspots } from './hotspots'
import { Room } from './room'
import { TouchControls, useTouchDevice } from './touch-controls'

const DEFAULT_CAMERA = new THREE.Vector3(-8, 8, -20)
const DEFAULT_TARGET = new THREE.Vector3(0, 0.6, 2.7)

type CameraRequest =
  | { id: number; reset: true }
  | ({ id: number; reset?: false } & CameraFocus)

type CameraTransition = {
  elapsed: number
  duration: number
  path: THREE.Curve<THREE.Vector3>
  startTarget: THREE.Vector3
  endTarget: THREE.Vector3
  targetDelay: number
}

const MIRROR_POSITION = new THREE.Vector3(-4.23, 0.5, 3.585)
const MIRROR_ROTATION = new THREE.Euler(-Math.PI + 0.031, 0, 0)

function WallMirror({ broken }: { broken: boolean }) {
  const mirror = useMemo(
    () =>
      new Reflector(new THREE.PlaneGeometry(1, 2.5), {
        clipBias: 0.003,
        textureWidth: 1024,
        textureHeight: 1024,
        color: 0x9aa2a6,
      }),
    [],
  )

  const cracks = useMemo(() => (broken ? createGlassCracks() : null), [broken])

  useEffect(() => {
    if (!cracks) return undefined
    return () => cracks.dispose()
  }, [cracks])

  // Broken glass reflects a lot less of the room than it did.
  useEffect(() => {
    const material = mirror.material
    if (!(material instanceof THREE.ShaderMaterial)) return
    material.uniforms.color?.value.setHex(broken ? 0x4d5457 : 0x9aa2a6)
  }, [broken, mirror])

  useEffect(
    () => () => {
      mirror.getRenderTarget().dispose()
      mirror.geometry.dispose()
      const materials = Array.isArray(mirror.material)
        ? mirror.material
        : [mirror.material]
      materials.forEach((material) => {
        material.dispose()
      })
    },
    [mirror],
  )

  return (
    <>
      <primitive
        object={mirror}
        position={MIRROR_POSITION}
        rotation={MIRROR_ROTATION}
        renderOrder={2}
      />
      {cracks && (
        <mesh
          position={[MIRROR_POSITION.x, MIRROR_POSITION.y, MIRROR_POSITION.z - 0.012]}
          rotation={MIRROR_ROTATION}
          renderOrder={3}
        >
          <planeGeometry args={[1, 2.5]} />
          <meshBasicMaterial
            map={cracks}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </>
  )
}

function DriveCamera({
  driving,
  carRef,
}: {
  driving: boolean
  carRef: RefObject<THREE.Object3D | null>
}) {
  const camera = useThree((state) => state.camera)
  const currentOffset = useRef(new THREE.Vector3())
  const currentLook = useRef(new THREE.Vector3())
  const started = useRef(false)
  const carPosition = useMemo(() => new THREE.Vector3(), [])
  const carQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const carScale = useMemo(() => new THREE.Vector3(), [])
  const forward = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(), [])
  const desiredOffset = useMemo(() => new THREE.Vector3(), [])
  const desiredLook = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (!driving) started.current = false
  }, [driving])

  useFrame((_, delta) => {
    const car = carRef.current
    if (!driving || !car) return

    // The car lives in a rotated, scaled physics rig, so read world transform.
    car.updateWorldMatrix(true, false)
    car.matrixWorld.decompose(carPosition, carQuaternion, carScale)

    // Bruno's car space: +X is forward, +Z is up.
    forward.set(1, 0, 0).applyQuaternion(carQuaternion).setY(0).normalize()
    up.set(0, 0, 1).applyQuaternion(carQuaternion)

    // The scene camera is a 25mm-ish 25° lens, so the chase view has to sit
    // well back to keep the car and some room in frame.
    desiredOffset
      .copy(carPosition)
      .addScaledVector(forward, -4.2)
      .addScaledVector(up, 1.7)
    desiredLook.copy(carPosition).addScaledVector(forward, 1.5)

    // Snap instead of sweeping across the room when the car teleports home.
    if (!started.current || currentLook.current.distanceTo(desiredLook) > 2.5) {
      started.current = true
      currentOffset.current.copy(desiredOffset)
      currentLook.current.copy(desiredLook)
    }

    const lerp = 1 - Math.exp(-4.5 * delta)
    currentOffset.current.lerp(desiredOffset, lerp)
    currentLook.current.lerp(desiredLook, lerp)
    camera.position.copy(currentOffset.current)
    camera.lookAt(currentLook.current)
  })

  return null
}

function CameraDirector({
  request,
  driving,
}: {
  request: CameraRequest | null
  driving: boolean
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const transition = useRef<CameraTransition | null>(null)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (controls.current) controls.current.enabled = !driving
  }, [driving])

  useEffect(() => {
    if (!request || !controls.current || driving) return

    const startTarget = controls.current.target.clone()
    const endTarget = request.reset
      ? DEFAULT_TARGET.clone()
      : new THREE.Vector3(...request.target)

    let endPosition: THREE.Vector3
    if (request.reset) {
      endPosition = DEFAULT_CAMERA.clone()
    } else {
      endPosition = new THREE.Vector3(...request.position)
    }

    if (!request.reset && request.instant) {
      transition.current = null
      camera.position.copy(endPosition)
      controls.current.target.copy(endTarget)
      controls.current.update()
      return
    }

    const controlPoint = new THREE.Vector3(
      (camera.position.x + endPosition.x) * 0.5,
      Math.max(camera.position.y, endPosition.y) + 2.4,
      Math.min(camera.position.z, endPosition.z, -8),
    )

    const path =
      !request.reset && request.waypoints?.length
        ? new THREE.CatmullRomCurve3(
            [
              camera.position.clone(),
              ...request.waypoints.map((point) => new THREE.Vector3(...point)),
              endPosition,
            ],
            false,
            'centripetal',
          )
        : new THREE.QuadraticBezierCurve3(
            camera.position.clone(),
            controlPoint,
            endPosition,
          )

    controls.current.enabled = false
    transition.current = {
      elapsed: 0,
      duration: request.reset ? 1.2 : request.waypoints?.length ? 2.4 : 1.35,
      path,
      startTarget,
      endTarget,
      targetDelay: request.reset ? 0 : (request.targetDelay ?? 0),
    }
  }, [camera, driving, request])

  useFrame((_, delta) => {
    const current = transition.current
    if (!current || !controls.current) return

    current.elapsed += delta
    const progress = THREE.MathUtils.clamp(current.elapsed / current.duration, 0, 1)
    const eased =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - (-2 * progress + 2) ** 3 / 2

    current.path.getPoint(eased, camera.position)
    const targetProgress = THREE.MathUtils.clamp(
      (eased - current.targetDelay) / (1 - current.targetDelay),
      0,
      1,
    )
    const targetEased = targetProgress * targetProgress * (3 - 2 * targetProgress)

    controls.current.target.lerpVectors(
      current.startTarget,
      current.endTarget,
      targetEased,
    )
    controls.current.update()

    if (progress === 1) {
      controls.current.enabled = !driving
      transition.current = null
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={!driving}
      enableDamping
      dampingFactor={0.06}
      zoomSpeed={0.8}
      minDistance={3}
      maxDistance={40}
      maxPolarAngle={Math.PI / 2}
      target={DEFAULT_TARGET.toArray()}
    />
  )
}

type ExperienceProps = {
  onPlayKeyboard: () => void | Promise<void>
  onSceneReady?: (ready: boolean) => void
  onDrivingChange?: (driving: boolean) => void
}

export function Experience({
  onPlayKeyboard,
  onSceneReady,
  onDrivingChange,
}: ExperienceProps) {
  const requestId = useRef(0)
  const roomOccluder = useRef<THREE.Group>(null)
  const carRef = useRef<THREE.Object3D>(null)
  const hotspotOccluders = useMemo(() => [roomOccluder as RefObject<THREE.Object3D>], [])
  const [cameraRequest, setCameraRequest] = useState<CameraRequest | null>(null)
  const [focused, setFocused] = useState(false)
  const [driving, setDriving] = useState(false)
  const [mirrorBroken, setMirrorBroken] = useState(false)
  const touch = useTouchDevice()

  const breakMirror = useCallback(() => setMirrorBroken(true), [])

  const focusHotspot = useCallback(
    (focus: CameraFocus) => {
      if (driving) return
      requestId.current += 1
      setCameraRequest({ ...focus, id: requestId.current })
      setFocused(true)
    },
    [driving],
  )

  const resetView = useCallback(() => {
    requestId.current += 1
    setCameraRequest({ reset: true, id: requestId.current })
    setFocused(false)
  }, [])

  const toggleDriving = useCallback(() => {
    setDriving((active) => {
      const next = !active
      if (next) setFocused(false)
      else {
        requestId.current += 1
        setCameraRequest({ reset: true, id: requestId.current })
      }
      return next
    })
  }, [])

  useEffect(() => {
    onDrivingChange?.(driving)
  }, [driving, onDrivingChange])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && driving) {
        event.preventDefault()
        toggleDriving()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [driving, toggleDriving])

  return (
    <div className="fixed inset-0 size-full touch-none cursor-[url('/cursor-ring.svg')_12_12,_grab] active:cursor-[url('/cursor-ring-active.svg')_16_16,_grabbing]">
      <Canvas
        className="block size-full touch-none"
        flat
        dpr={[1, 2]}
        camera={{ position: [-8, 8, -20], fov: 25, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#282828']} />
        <ambientLight intensity={0.9} />

        <Suspense fallback={null}>
          <Room onReady={() => onSceneReady?.(true)} occluderRef={roomOccluder} />
          <WallMirror broken={mirrorBroken} />
          <Car
            driving={driving}
            onToggleDriving={toggleDriving}
            onHitMirror={breakMirror}
            carRef={carRef}
          />
          {!driving && (
            <Hotspots
              onPlayKeyboard={onPlayKeyboard}
              onFocus={focusHotspot}
              occluders={hotspotOccluders}
            />
          )}
        </Suspense>

        <DriveCamera driving={driving} carRef={carRef} />
        <CameraDirector request={cameraRequest} driving={driving} />
      </Canvas>

      <button
        className={`fixed top-[clamp(1.25rem,3vw,2.5rem)] right-[clamp(1.25rem,3vw,2.5rem)] z-[15] flex items-center gap-[0.45rem] rounded-full border border-white/20 bg-[#0f1113]/70 px-[0.85rem] py-[0.65rem] text-[0.66rem] font-semibold tracking-[0.1em] text-white/70 uppercase backdrop-blur-xl transition-[color,border-color,opacity,transform] duration-300 max-[700px]:top-4 max-[700px]:right-4 cursor-[url('/cursor-ring-active.svg')_16_16,_pointer] hover:border-[#ffea2b] hover:text-[#ffea2b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffea2b] ${focused && !driving ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-2 opacity-0 pointer-events-none'}`}
        type="button"
        onClick={resetView}
        aria-label="Return to the full room view"
      >
        <span className="text-[0.95rem] text-[#ffea2b]">↙</span> Full room
      </button>

      <button
        className={`fixed top-[clamp(1.25rem,3vw,2.5rem)] right-[clamp(1.25rem,3vw,2.5rem)] z-[16] flex items-center gap-[0.45rem] rounded-full border px-[0.85rem] py-[0.65rem] text-[0.66rem] font-semibold tracking-[0.1em] uppercase backdrop-blur-xl transition-[color,border-color,background,opacity,transform] duration-300 max-[700px]:top-4 max-[700px]:right-4 cursor-[url('/cursor-ring-active.svg')_16_16,_pointer] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffea2b] ${
          driving
            ? 'translate-y-0 opacity-100 pointer-events-auto border-[#ffea2b] bg-[#0f1113]/85 text-[#ffea2b]'
            : 'translate-y-0 opacity-100 pointer-events-auto border-white/20 bg-[#0f1113]/70 text-white/70 hover:border-[#ffea2b] hover:text-[#ffea2b]'
        } ${focused && !driving ? 'right-[clamp(8.5rem,18vw,11.5rem)]' : ''}`}
        type="button"
        onClick={toggleDriving}
        aria-label={driving ? 'Leave the chase camera' : 'Follow the car'}
      >
        <span className="text-[0.95rem] text-[#ffea2b]">{driving ? '⎋' : '▣'}</span>
        {driving ? 'Exit · Esc' : 'Drive car'}
      </button>

      {/* Keys are for keyboards; a phone gets the joystick instead. */}
      {driving && !touch && (
        <div className="pointer-events-none fixed bottom-[1.5rem] left-1/2 z-[18] flex max-w-[calc(100vw-13rem)] -translate-x-1/2 flex-wrap justify-center gap-x-[0.85rem] gap-y-[0.3rem] rounded-2xl border border-white/15 bg-[#0d0f10]/80 px-4 py-2 text-[0.64rem] tracking-[0.08em] text-white/70 uppercase backdrop-blur-xl">
          {[
            ['W / S', 'drive'],
            ['A / D', 'steer'],
            ['Space', 'brake'],
            ['Shift', 'boost'],
            ['H', 'horn'],
            ['Esc', 'exit'],
          ].map(([key, action]) => (
            <span className="whitespace-nowrap" key={key}>
              <b className="text-[#ffea2b]">{key}</b> {action}
            </span>
          ))}
        </div>
      )}

      <TouchControls visible={touch} />
    </div>
  )
}
