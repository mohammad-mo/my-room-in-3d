import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ComponentRef, RefObject } from 'react'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import type { CameraFocus } from './hotspots'
import { Hotspots } from './hotspots'
import { Room } from './room'

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

function WallMirror() {
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
    <primitive
      object={mirror}
      position={[-4.23, 0.5, 3.585]}
      rotation={[-Math.PI + 0.031, 0, 0]}
      renderOrder={2}
    />
  )
}

function CameraDirector({ request }: { request: CameraRequest | null }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const transition = useRef<CameraTransition | null>(null)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!request || !controls.current) return

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
  }, [camera, request])

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
      controls.current.enabled = true
      transition.current = null
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
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
}

export function Experience({ onPlayKeyboard, onSceneReady }: ExperienceProps) {
  const requestId = useRef(0)
  const roomOccluder = useRef<THREE.Group>(null)
  const hotspotOccluders = useMemo(() => [roomOccluder as RefObject<THREE.Object3D>], [])
  const [cameraRequest, setCameraRequest] = useState<CameraRequest | null>(null)
  const [focused, setFocused] = useState(false)

  const focusHotspot = useCallback((focus: CameraFocus) => {
    requestId.current += 1
    setCameraRequest({ ...focus, id: requestId.current })
    setFocused(true)
  }, [])

  const resetView = useCallback(() => {
    requestId.current += 1
    setCameraRequest({ reset: true, id: requestId.current })
    setFocused(false)
  }, [])

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

        <Suspense fallback={null}>
          <Room onReady={() => onSceneReady?.(true)} occluderRef={roomOccluder} />
          <WallMirror />
          <Hotspots
            onPlayKeyboard={onPlayKeyboard}
            onFocus={focusHotspot}
            occluders={hotspotOccluders}
          />
        </Suspense>

        <CameraDirector request={cameraRequest} />
      </Canvas>

      <button
        className={`fixed top-[clamp(1.25rem,3vw,2.5rem)] right-[clamp(1.25rem,3vw,2.5rem)] z-[15] flex items-center gap-[0.45rem] rounded-full border border-white/20 bg-[#0f1113]/70 px-[0.85rem] py-[0.65rem] text-[0.66rem] font-semibold tracking-[0.1em] text-white/70 uppercase backdrop-blur-xl transition-[color,border-color,opacity,transform] duration-300 max-[700px]:top-4 max-[700px]:right-4 cursor-[url('/cursor-ring-active.svg')_16_16,_pointer] hover:border-[#ffea2b] hover:text-[#ffea2b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffea2b] ${focused ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-2 opacity-0 pointer-events-none'}`}
        type="button"
        onClick={resetView}
        aria-label="Return to the full room view"
      >
        <span className="text-[0.95rem] text-[#ffea2b]">↙</span> Full room
      </button>
    </div>
  )
}
