import { useEffect, useId, useRef, useState } from 'react'
import { releaseKeyboardInput } from '../car-input'
import { sendRoomEmail } from '../mail'

const NOTE_AFTER_MS = 90_000
const STORAGE_KEY = 'room-note'

type SuggestionModalProps = {
  ready: boolean
  paused: boolean
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

function remember(value: 'sent' | 'dismissed') {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Private browsing can block storage. The note still sends.
  }
}

export function SuggestionModal({ ready, paused }: SuggestionModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [due, setDue] = useState(false)
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [instagram, setInstagram] = useState('')
  const [github, setGithub] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready || readDismissed()) return

    const delay =
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get('note') === 'now'
        ? 0
        : NOTE_AFTER_MS
    if (delay === 0) {
      setDue(true)
      return
    }

    let elapsed = 0
    let last = document.visibilityState === 'visible' ? performance.now() : null
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        last = null
        return
      }
      const now = performance.now()
      if (last !== null) elapsed += now - last
      last = now
      if (elapsed >= delay) {
        setDue(true)
        window.clearInterval(timer)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [ready])

  useEffect(() => {
    if (due && !paused) setOpen(true)
  }, [due, paused])

  useEffect(() => {
    if (!open) return
    releaseKeyboardInput()
    const frame = window.requestAnimationFrame(() => setShown(true))
    const previouslyFocused = document.activeElement
    dialogRef.current?.querySelector<HTMLElement>('textarea')?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        remember('dismissed')
        setOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const node = dialogRef.current
      if (!node) return
      const focusable = [
        ...node.querySelectorAll<HTMLElement>('textarea, input, button'),
      ].filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open])

  if (!open) return null

  const dismiss = () => {
    remember('dismissed')
    setOpen(false)
  }

  const send = async () => {
    const note = suggestion.trim()
    if (!note) {
      setStatus('error')
      setError('Write a suggestion first.')
      return
    }

    setStatus('sending')
    setError('')
    try {
      const response = await fetch('/api/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion: note,
          instagram: instagram.trim(),
          github: github.trim(),
          website,
          page: window.location.href,
          referrer: document.referrer,
          language: navigator.language,
        }),
      })
      const body = (await response.json().catch(() => null)) as {
        error?: string
        subject?: string
        message?: string
      } | null
      if (!response.ok || !body?.subject || !body.message) {
        setStatus('error')
        setError(body?.error || 'The note could not be sent. Try again.')
        return
      }
      const sent = await sendRoomEmail({ subject: body.subject, message: body.message })
      if ('error' in sent) {
        setStatus('error')
        setError(sent.error)
        return
      }
      remember('sent')
      setStatus('sent')
    } catch {
      setStatus('error')
      setError('The note could not be sent. Try again.')
    }
  }

  return (
    <div
      className={`fixed inset-0 z-30 grid place-items-center bg-black/55 p-5 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0'}`}
    >
      <button
        className="absolute inset-0 cursor-[url('/cursor-ring.svg')_12_12,_default]"
        type="button"
        aria-label="Close suggestion form"
        onClick={dismiss}
      />
      <div
        ref={dialogRef}
        className={`relative w-[min(26rem,calc(100vw-2.5rem))] max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl border border-white/20 bg-[#0f1113]/85 p-6 text-[#f5f5ef] shadow-[0_24px_80px_rgb(0_0_0_/_45%)] backdrop-blur-xl transition-transform duration-300 motion-reduce:transition-none ${shown ? 'translate-y-0' : 'translate-y-2'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <button
          className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-white/60 transition-colors cursor-[url('/cursor-ring-active.svg')_16_16,_pointer] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffea2b]"
          type="button"
          onClick={dismiss}
          aria-label="Close"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </button>

        {status === 'sent' ? (
          <div className="py-6 pr-6">
            <h2
              id={titleId}
              className="m-0 font-['Manrope',system-ui,sans-serif] text-2xl tracking-[-0.04em]"
            >
              Sent.
            </h2>
            <p
              id={descriptionId}
              className="mt-2 mb-0 text-sm leading-relaxed text-white/70"
            >
              I’ll read it.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void send()
            }}
          >
            <h2
              id={titleId}
              className="m-0 pr-8 font-['Manrope',system-ui,sans-serif] text-[1.65rem] leading-none tracking-[-0.04em]"
            >
              Got a suggestion?
            </h2>
            <p
              id={descriptionId}
              className="mt-3 mb-5 text-sm leading-relaxed text-white/70"
            >
              Tell me what to change. Instagram and GitHub are optional, if you want me to
              know who it’s from.
            </p>

            <label className="grid gap-1.5 text-sm" htmlFor="room-suggestion">
              Suggestion
              <textarea
                id="room-suggestion"
                className="min-h-28 resize-y rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm leading-relaxed text-[#f5f5ef] outline-none transition-colors placeholder:text-white/30 focus:border-[#ffea2b]"
                name="suggestion"
                value={suggestion}
                maxLength={2000}
                required
                placeholder="The lamp is too bright"
                onChange={(event) => setSuggestion(event.target.value)}
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1.5 text-sm" htmlFor="room-instagram">
                <span>
                  Instagram <span className="text-white/40">optional</span>
                </span>
                <input
                  id="room-instagram"
                  className="w-full min-w-0 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-[#f5f5ef] outline-none transition-colors placeholder:text-white/30 focus:border-[#ffea2b]"
                  name="instagram"
                  value={instagram}
                  autoComplete="off"
                  inputMode="text"
                  maxLength={120}
                  placeholder="@handle"
                  onChange={(event) => setInstagram(event.target.value)}
                />
              </label>
              <label className="grid min-w-0 gap-1.5 text-sm" htmlFor="room-github">
                <span>
                  GitHub <span className="text-white/40">optional</span>
                </span>
                <input
                  id="room-github"
                  className="w-full min-w-0 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-[#f5f5ef] outline-none transition-colors placeholder:text-white/30 focus:border-[#ffea2b]"
                  name="github"
                  value={github}
                  autoComplete="off"
                  inputMode="text"
                  maxLength={120}
                  placeholder="username"
                  onChange={(event) => setGithub(event.target.value)}
                />
              </label>
            </div>

            <input
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
              name="website"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />

            <p className="mt-4 mb-0 text-xs leading-relaxed text-white/45">
              Sending includes the browser and city this page can see.
            </p>
            {status === 'error' ? (
              <p className="mt-3 mb-0 text-sm text-[#ffb4b4]" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                className="rounded-full px-3 py-2 text-sm text-white/70 cursor-[url('/cursor-ring-active.svg')_16_16,_pointer] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffea2b]"
                type="button"
                onClick={dismiss}
              >
                Keep looking
              </button>
              <button
                className="rounded-full bg-[#ffea2b] px-4 py-2 text-sm font-medium text-[#111315] cursor-[url('/cursor-ring-active.svg')_16_16,_pointer] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffea2b] disabled:cursor-default disabled:opacity-60 disabled:hover:scale-100"
                type="submit"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Sending…' : 'Send note'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
