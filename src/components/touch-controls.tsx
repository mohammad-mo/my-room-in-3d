import { useCallback, useEffect, useRef, useState } from 'react'
import { honk, releaseTouchInput, setTouchInput } from '../car-input'

/**
 * On-screen driving controls, after the joystick in Bruno Simon's folio: drag
 * anywhere inside the ring to steer and accelerate, with boost and horn on the
 * other thumb. Shown on touch screens, where there is no keyboard to drive with.
 */
const RADIUS = 52
/** Fraction of the ring a thumb has to travel before an action counts. */
const THRESHOLD = 0.32

export function useTouchDevice() {
  const [touch, setTouch] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)')
    const update = () => setTouch(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return touch
}

function Joystick() {
  const ring = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const apply = useCallback((x: number, y: number) => {
    setTouchInput({
      up: y < -THRESHOLD,
      down: y > THRESHOLD,
      left: x < -THRESHOLD,
      right: x > THRESHOLD,
    })
  }, [])

  const move = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointer.current !== event.pointerId || !ring.current) return
      const box = ring.current.getBoundingClientRect()
      const dx = event.clientX - (box.left + box.width / 2)
      const dy = event.clientY - (box.top + box.height / 2)
      const distance = Math.hypot(dx, dy)
      const clamp = distance > RADIUS ? RADIUS / distance : 1
      setKnob({ x: dx * clamp, y: dy * clamp })
      apply((dx * clamp) / RADIUS, (dy * clamp) / RADIUS)
    },
    [apply],
  )

  const release = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return
    pointer.current = null
    setKnob({ x: 0, y: 0 })
    releaseTouchInput()
  }, [])

  useEffect(() => releaseTouchInput, [])

  return (
    <div
      ref={ring}
      className="pointer-events-auto relative grid size-[8.5rem] touch-none place-items-center rounded-full border border-white/20 bg-[#0d0f10]/55 backdrop-blur-xl select-none"
      onPointerDown={(event) => {
        pointer.current = event.pointerId
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // Capture keeps a thumb that slides off the ring in control of it;
          // without it the drag still works, it just ends at the edge.
        }
        move(event)
      }}
      onPointerMove={move}
      onPointerUp={release}
      onPointerCancel={release}
      aria-hidden="true"
    >
      <span className="absolute inset-[0.9rem] rounded-full border border-dashed border-white/10" />
      <span className="absolute top-[0.55rem] text-[0.55rem] tracking-[0.12em] text-white/35 uppercase">
        go
      </span>
      <span className="absolute bottom-[0.55rem] text-[0.55rem] tracking-[0.12em] text-white/35 uppercase">
        back
      </span>
      <span
        className="size-[3.4rem] rounded-full border border-[#ffea2b]/70 bg-[#ffea2b]/20 shadow-[0_0_1.5rem_rgb(255_234_43_/_25%)] transition-transform duration-75"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}

function PadButton({
  label,
  onPress,
  onRelease,
}: {
  label: string
  onPress: () => void
  onRelease?: () => void
}) {
  return (
    <button
      className="pointer-events-auto grid size-[3.6rem] touch-none place-items-center rounded-full border border-white/20 bg-[#0d0f10]/65 text-[0.58rem] font-semibold tracking-[0.1em] text-white/70 uppercase backdrop-blur-xl transition-colors select-none active:border-[#ffea2b] active:text-[#ffea2b]"
      type="button"
      onPointerDown={(event) => {
        event.preventDefault()
        onPress()
      }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onPointerLeave={onRelease}
    >
      {label}
    </button>
  )
}

export function TouchControls({ visible }: { visible: boolean }) {
  useEffect(() => {
    if (!visible) releaseTouchInput()
  }, [visible])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[1.1rem] z-[19] flex items-end justify-between px-[1.1rem]">
      <Joystick />
      {/* Lifted clear of the ambience button, which owns the bottom corner. */}
      <div className="grid gap-[0.6rem] justify-items-end pb-[4.4rem]">
        <PadButton label="horn" onPress={honk} />
        <PadButton
          label="boost"
          onPress={() => setTouchInput({ boost: true })}
          onRelease={() => setTouchInput({ boost: false })}
        />
        <PadButton
          label="brake"
          onPress={() => setTouchInput({ brake: true })}
          onRelease={() => setTouchInput({ brake: false })}
        />
      </div>
    </div>
  )
}
