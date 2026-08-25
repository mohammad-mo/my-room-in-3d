import { useProgress } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { AudioControls } from './components/audio-controls'
import { ControlsGuide } from './components/controls-guide'
import { Experience } from './components/experience'

type LoaderProps = {
  sceneReady: boolean
  onReady: (ready: boolean) => void
}

function Loader({ sceneReady, onReady }: LoaderProps) {
  const { active, progress } = useProgress()
  const [minimumElapsed, setMinimumElapsed] = useState(false)
  const assetsLoaded = !active && progress === 100
  const complete = assetsLoaded && sceneReady && minimumElapsed

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumElapsed(true), 3400)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (complete) onReady(true)
  }, [complete, onReady])

  const displayedProgress = complete
    ? 100
    : sceneReady && assetsLoaded
      ? 98
      : Math.min(progress, 94)

  const status = sceneReady
    ? 'Polishing the final frame'
    : progress > 70
      ? 'Arranging the furniture'
      : 'Brewing the room'

  return (
    <div
      className={`fixed inset-0 z-[999] grid place-items-center bg-[#0e1011] transition-transform duration-[720ms] ease-[cubic-bezier(0.76,0,0.24,1)] will-change-transform after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#ffea2b] after:shadow-[0_0_1.5rem_rgb(255_234_43_/_70%)] after:content-[''] ${
        complete
          ? 'invisible -translate-y-[102%] pointer-events-none'
          : 'visible translate-y-0'
      }`}
      aria-hidden={complete}
    >
      <div className="grid w-[min(16rem,calc(100vw-4rem))] justify-items-center">
        <div className="relative flex h-9 w-11 items-end justify-evenly rounded-[0.2rem_0.2rem_0.7rem_0.7rem] bg-[#ffea2b] px-[0.35rem] after:absolute after:top-[0.45rem] after:left-[calc(100%-0.15rem)] after:h-4 after:w-[0.85rem] after:rounded-r-lg after:border-[0.22rem] after:border-l-0 after:border-[#ffea2b] after:content-['']">
          <span className="mb-9 h-3 w-[0.22rem] animate-bounce rounded-full bg-[#ffea2b]/75 motion-reduce:animate-none" />
          <span className="mb-9 h-3 w-[0.22rem] animate-bounce rounded-full bg-[#ffea2b]/75 [animation-delay:220ms] motion-reduce:animate-none" />
          <span className="mb-9 h-3 w-[0.22rem] animate-bounce rounded-full bg-[#ffea2b]/75 [animation-delay:440ms] motion-reduce:animate-none" />
        </div>
        <p className="mt-5 mb-3 font-['Manrope',sans-serif] text-[0.8rem] tracking-[0.08em]">
          {status}
        </p>
        <div className="h-0.5 w-full overflow-hidden bg-white/10">
          <span
            className="block h-full w-full origin-left bg-[#ffea2b] transition-transform duration-200"
            style={{ transform: `scaleX(${displayedProgress / 100})` }}
          />
        </div>
        <small className="mt-2 text-[0.64rem] text-white/40">
          {Math.round(displayedProgress)}%
        </small>
      </div>
    </div>
  )
}

function useRoomAudio() {
  const ambientRef = useRef<HTMLAudioElement | null>(null)
  const keyboardRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const ambient = new Audio('/sound/Harris%20Heller%20-%20Ambient%20Gold.mp3')
    const keyboard = new Audio('/sound/music1.mp3')

    ambient.loop = true
    ambient.volume = 0.45
    keyboard.volume = 0.7
    ambientRef.current = ambient
    keyboardRef.current = keyboard

    return () => {
      ambient.pause()
      keyboard.pause()
    }
  }, [])

  const toggleAmbient = async () => {
    const ambient = ambientRef.current
    if (!ambient) return

    if (ambient.paused) {
      try {
        await ambient.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    } else {
      ambient.pause()
      setIsPlaying(false)
    }
  }

  const playKeyboard = async () => {
    const keyboard = keyboardRef.current
    if (!keyboard) return

    keyboard.currentTime = 0
    try {
      await keyboard.play()
    } catch {
      // Browsers can reject media playback before the first user gesture.
    }
  }

  return { isPlaying, toggleAmbient, playKeyboard }
}

export default function App() {
  const audio = useRoomAudio()
  const [ready, setReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [driving, setDriving] = useState(false)

  return (
    <main className="relative size-full overflow-hidden bg-[#282828] font-['DM_Sans',system-ui,sans-serif] text-[#f5f5ef] antialiased selection:bg-[#ffea2b] selection:text-[#111315] cursor-[url('/cursor-ring.svg')_12_12,_default]">
      <Loader sceneReady={sceneReady} onReady={setReady} />

      <header
        className={`pointer-events-none fixed top-[clamp(1.25rem,4vw,3.75rem)] left-[clamp(1.25rem,5vw,5rem)] z-10 w-[min(31rem,calc(100vw-2.5rem))] select-none drop-shadow-[0_2px_18px_rgb(0_0_0_/_35%)] transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] max-[700px]:top-5 max-[700px]:left-5 ${ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
      >
        <div className="mb-4 flex items-center gap-[0.65rem] text-[0.72rem] font-semibold tracking-[0.16em] text-white/65 uppercase">
          <span className="h-px w-[1.8rem] bg-[#ffea2b]" /> Interactive portfolio
        </div>
        <h1 className="m-0 font-['Manrope',system-ui,sans-serif] text-[clamp(2.15rem,4.8vw,5.2rem)] leading-[0.98] tracking-[-0.055em] max-[700px]:max-w-76">
          My room,
          <br />
          in three dimensions.
        </h1>
        <p className="mt-[1.1rem] max-w-[27rem] text-[clamp(0.84rem,1.1vw,1rem)] leading-[1.55] text-white/70 max-[700px]:max-w-72">
          Drag to look around. Tap the glowing markers — or hop in the car and take it for
          a drive.
        </p>
      </header>

      <Experience
        onPlayKeyboard={audio.playKeyboard}
        onSceneReady={setSceneReady}
        onDrivingChange={setDriving}
      />
      <ControlsGuide ready={ready} hidden={driving} />
      <AudioControls
        ready={ready}
        isPlaying={audio.isPlaying}
        onToggle={audio.toggleAmbient}
        compact={driving}
      />
    </main>
  )
}
