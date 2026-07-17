type AudioControlsProps = {
  ready: boolean
  isPlaying: boolean
  onToggle: () => void | Promise<void>
}

function SoundIcon({ playing }: { playing: boolean }) {
  return (
    <svg className="w-[1.15rem] fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      {playing && (
        <path
          className="fill-none stroke-current stroke-[1.5] [stroke-linecap:round]"
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
        />
      )}
    </svg>
  )
}

export function AudioControls({ ready, isPlaying, onToggle }: AudioControlsProps) {
  return (
    <div
      className={`fixed right-[clamp(1.25rem,4vw,3.5rem)] bottom-[clamp(1.25rem,3vw,2.5rem)] z-10 flex items-center gap-[0.85rem] text-white transition-[opacity,transform] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] ${ready ? 'translate-y-0 opacity-100' : 'translate-y-[0.65rem] opacity-0'}`}
    >
      <div className="grid gap-[0.12rem] text-right max-[700px]:hidden">
        <span className="text-[0.62rem] font-semibold tracking-[0.12em] text-white/50 uppercase">
          {isPlaying ? 'Now playing' : 'Room ambience'}
        </span>
        <strong className="text-[0.72rem] font-medium">
          Ambient Gold — Harris Heller
        </strong>
      </div>
      <button
        className="grid size-[2.8rem] place-items-center rounded-full border border-white/30 bg-[#0f1113]/70 backdrop-blur-xl transition-[color,border-color,transform] duration-150 cursor-[url('/cursor-ring-active.svg')_16_16,_pointer] hover:scale-105 hover:border-[#ffea2b] hover:text-[#ffea2b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffea2b]"
        type="button"
        onClick={onToggle}
        aria-label={isPlaying ? 'Pause ambience' : 'Play ambience'}
      >
        <SoundIcon playing={isPlaying} />
      </button>
    </div>
  )
}
