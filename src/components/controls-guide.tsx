import { useEffect, useState } from 'react'

type GestureType = 'orbit' | 'zoom' | 'pan'
type Gesture = [type: GestureType, action: string, result: string]

const gestureIconClasses =
  'w-[1.55rem] shrink-0 fill-none stroke-[#ffea2b] stroke-[1.35] [stroke-linecap:round] [stroke-linejoin:round]'

function GestureIcon({ type }: { type: GestureType }) {
  if (type === 'zoom') {
    return (
      <svg className={gestureIconClasses} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M10 9 6 13m0-4v4h4M22 23l4-4m0 4v-4h-4" />
        <circle cx="16" cy="16" r="4" />
      </svg>
    )
  }

  if (type === 'pan') {
    return (
      <svg className={gestureIconClasses} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 5v22m0-22-3 3m3-3 3 3m-3 19-3-3m3 3 3-3M5 16h22M5 16l3-3m-3 3 3 3m19-3-3-3m3 3-3 3" />
      </svg>
    )
  }

  return (
    <svg className={gestureIconClasses} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 12a10 10 0 0 1 17-3l2 2m-1-5 1 5-5 1M25 20a10 10 0 0 1-17 3l-2-2m1 5-1-5 5-1" />
    </svg>
  )
}

export function ControlsGuide({ ready }: { ready: boolean }) {
  const [touch, setTouch] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)')
    const update = () => setTouch(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!ready) return undefined
    setOpen(true)
    const timer = window.setTimeout(() => setOpen(false), 8500)
    return () => window.clearTimeout(timer)
  }, [ready])

  const gestures: Gesture[] = touch
    ? [
        ['orbit', 'One finger', 'Orbit + tilt'],
        ['zoom', 'Pinch', 'Zoom in + out'],
        ['pan', 'Two fingers', 'Move the view'],
      ]
    : [
        ['orbit', 'Left drag', 'Orbit + tilt'],
        ['zoom', 'Scroll', 'Zoom in + out'],
        ['pan', 'Right drag', 'Move the view'],
      ]

  return (
    <>
      <aside
        className={`fixed bottom-[1.35rem] left-1/2 z-[18] w-[min(34rem,calc(100vw-15rem))] rounded-2xl border border-white/15 bg-[#0d0f10]/85 p-3 shadow-[0_1.5rem_4rem_rgb(0_0_0_/_35%)] backdrop-blur-2xl transition-[opacity,transform] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] max-[700px]:bottom-[4.8rem] max-[700px]:w-[calc(100vw-1.5rem)] max-[700px]:p-[0.7rem] ${open ? '-translate-x-1/2 translate-y-0 scale-100 opacity-100 pointer-events-auto' : '-translate-x-1/2 translate-y-4 scale-[0.97] opacity-0 pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-1 pt-[0.2rem] pb-[0.7rem]">
          <div className="grid gap-[0.08rem]">
            <span className="text-[0.58rem] font-bold tracking-[0.14em] text-[#ffea2b] uppercase">
              Explore freely
            </span>
            <strong className="font-['Manrope',system-ui,sans-serif] text-[0.78rem]">
              {touch ? 'Touch controls' : 'Mouse controls'}
            </strong>
          </div>
          <button
            className="grid size-[1.8rem] place-items-center rounded-full border border-white/15 bg-transparent text-[1.05rem] leading-none text-white/60 transition-colors duration-150 cursor-[url('/cursor-ring-active.svg')_16_16,_pointer] hover:border-[#ffea2b] hover:text-[#ffea2b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffea2b]"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Hide controls"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-3 gap-[0.45rem] max-[700px]:gap-[0.3rem]">
          {gestures.map(([type, action, result]) => (
            <div
              className="flex min-w-0 items-center gap-[0.55rem] rounded-[0.68rem] bg-white/5 p-[0.62rem] max-[700px]:grid max-[700px]:justify-items-center max-[700px]:gap-[0.35rem] max-[700px]:px-1 max-[700px]:py-[0.55rem] max-[700px]:text-center"
              key={type}
            >
              <GestureIcon type={type} />
              <div className="grid min-w-0 gap-[0.08rem] max-[700px]:justify-items-center">
                <strong className="max-w-full overflow-hidden text-[0.66rem] font-semibold text-ellipsis whitespace-nowrap">
                  {action}
                </strong>
                <span className="max-w-full overflow-hidden text-[0.57rem] text-ellipsis whitespace-nowrap text-white/40">
                  {result}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <button
        className={`fixed bottom-[1.55rem] left-1/2 z-[17] flex items-center gap-[0.45rem] rounded-full border border-white/20 bg-[#0f1113]/70 px-3 py-[0.55rem] text-[0.62rem] font-semibold tracking-[0.11em] text-white/60 uppercase backdrop-blur-xl transition-[color,border-color,opacity,transform] duration-300 cursor-[url('/cursor-ring-active.svg')_16_16,_pointer] hover:border-[#ffea2b] hover:text-[#ffea2b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffea2b] ${ready && !open ? '-translate-x-1/2 translate-y-0 opacity-100 pointer-events-auto' : '-translate-x-1/2 translate-y-2 opacity-0 pointer-events-none'}`}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show navigation controls"
      >
        <span className="text-base text-[#ffea2b]">⌁</span> Controls
      </button>
    </>
  )
}
