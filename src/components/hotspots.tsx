import { Html } from '@react-three/drei'
import type { MouseEvent, ReactNode, RefObject } from 'react'
import { useState } from 'react'
import type * as THREE from 'three'

export type Vector3Tuple = [number, number, number]

export type CameraFocus = {
  target: Vector3Tuple
  position: Vector3Tuple
  waypoints?: Vector3Tuple[]
  targetDelay?: number
  instant?: boolean
}

type OccluderRef = RefObject<THREE.Object3D>

const hotspotButtonClasses =
  "relative grid size-[2.65rem] place-items-center rounded-full border bg-[#0b0d0e]/75 p-0 text-white shadow-none backdrop-blur-xl transition-[border-color,background,transform] duration-200 before:absolute before:inset-0 before:-z-10 before:animate-ping before:rounded-full before:border before:border-[#ffea2b]/35 before:content-[''] after:absolute after:inset-[0.32rem] after:rounded-full after:border after:border-[#ffea2b]/50 after:content-[''] motion-reduce:before:animate-none cursor-[url('/cursor-ring-active.svg')_16_16,_pointer] hover:scale-108 hover:border-[#ffea2b] hover:bg-[#16191a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffea2b]"

const socialLinkClasses =
  "flex items-center justify-between border-b border-white/10 py-[0.55rem] text-white no-underline transition-[color,padding] duration-150 last:border-0 hover:pl-[0.2rem] hover:text-[#ffea2b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffea2b] cursor-[url('/cursor-ring-active.svg')_16_16,_pointer]"

type HotspotProps = {
  position: Vector3Tuple
  icon: string
  label: string
  children: ReactNode
  open: boolean
  onToggle: () => void
  occluders: OccluderRef[]
}

function Hotspot({
  position,
  icon,
  label,
  children,
  open,
  onToggle,
  occluders,
}: HotspotProps) {
  return (
    <Html
      position={position}
      center
      occlude={occluders}
      eps={0.001}
      zIndexRange={[40, 30]}
    >
      <div className="relative isolate size-[2.65rem] [transform:translateZ(0)] [will-change:transform] font-['DM_Sans',system-ui,sans-serif]">
        <button
          className={`${hotspotButtonClasses} ${open ? 'scale-108 border-[#ffea2b] bg-[#16191a]' : 'border-white/40'}`}
          type="button"
          aria-label={label}
          aria-expanded={open}
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation()
            onToggle()
          }}
        >
          <span className="relative z-[1] text-[0.95rem] leading-none">{icon}</span>
        </button>
        {children && (
          <div
            className={`absolute top-[calc(100%+0.8rem)] left-1/2 w-[min(19rem,calc(100vw-2rem))] origin-top rounded-[0.9rem] border border-white/15 bg-[#111315]/80 px-[1.1rem] py-4 text-[0.82rem] leading-[1.55] text-white/75 shadow-[0_1.2rem_3rem_rgb(0_0_0_/_28%)] backdrop-blur-2xl transition-[opacity,transform] duration-200 max-[700px]:w-[min(17rem,calc(100vw-2rem))] ${open ? '-translate-x-1/2 translate-y-0 scale-100 opacity-100 pointer-events-auto' : '-translate-x-1/2 -translate-y-[0.35rem] scale-[0.97] opacity-0 pointer-events-none'}`}
          >
            {children}
          </div>
        )}
      </div>
    </Html>
  )
}

type HotspotsProps = {
  onPlayKeyboard: () => void | Promise<void>
  onFocus: (focus: CameraFocus) => void
  occluders: OccluderRef[]
}

export function Hotspots({ onPlayKeyboard, onFocus, occluders }: HotspotsProps) {
  const [active, setActive] = useState<'about' | 'contact' | null>(null)

  const toggleHotspot = (id: 'about' | 'contact', focus: CameraFocus) => {
    const willOpen = active !== id
    setActive(willOpen ? id : null)
    if (willOpen) onFocus(focus)
  }

  return (
    <>
      <Hotspot
        position={[-1, 0.5, 3.3]}
        icon="👋"
        label="About Mohammad"
        occluders={occluders}
        open={active === 'about'}
        onToggle={() =>
          toggleHotspot('about', {
            target: [-1, 0.7, 3.3],
            position: [-3.4, 2.45, -2.4],
          })
        }
      >
        <p className="mb-[0.38rem] text-[0.66rem] font-bold tracking-[0.14em] text-[#ffea2b] uppercase">
          Hello there
        </p>
        <p>
          I’m Mohammad, a creative front-end developer. Welcome to my room — built in
          Blender and brought to life on the web.
        </p>
      </Hotspot>

      <Hotspot
        position={[2.5, 0.8, 4.5]}
        icon="💬"
        label="Contact links"
        occluders={occluders}
        open={active === 'contact'}
        onToggle={() =>
          toggleHotspot('contact', {
            target: [2.35, 0.9, 4.4],
            // The post is outside the back wall. Mirror the old camera pose 180°
            // around the target on OrbitControls' horizontal (Y) axis.
            position: [4.15, 2.35, 10.45],
            // A camera path would have to cross the wall. Cut directly to the
            // unobstructed outside view instead of orbiting through geometry.
            instant: true,
          })
        }
      >
        <p className="mb-[0.38rem] text-[0.66rem] font-bold tracking-[0.14em] text-[#ffea2b] uppercase">
          Let’s connect
        </p>
        <nav className="mt-1 grid" aria-label="Social links">
          <a
            className={socialLinkClasses}
            href="https://github.com/mohammad-mo"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <span>↗</span>
          </a>
          <a className={socialLinkClasses} href="mailto:mohammadmahone@gmail.com">
            Email <span>↗</span>
          </a>
          <a
            className={socialLinkClasses}
            href="https://www.linkedin.com/in/mohammad-mohammadi-7a65a820a/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn <span>↗</span>
          </a>
        </nav>
      </Hotspot>

      <Html
        position={[-2.23, 0.4, 3.025]}
        center
        occlude={occluders}
        eps={0.001}
        zIndexRange={[40, 30]}
      >
        <div className="relative isolate size-[2.65rem] [transform:translateZ(0)] [will-change:transform] font-['DM_Sans',system-ui,sans-serif]">
          <button
            className={`${hotspotButtonClasses} border-white/40`}
            type="button"
            aria-label="Play the keyboard sample"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation()
              onPlayKeyboard()
            }}
          >
            <span className="relative z-[1] text-[0.95rem] leading-none">♫</span>
          </button>
        </div>
      </Html>
    </>
  )
}
