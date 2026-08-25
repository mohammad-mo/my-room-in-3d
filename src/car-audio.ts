/**
 * Car sound effects, synthesised with the Web Audio API rather than shipped as
 * files: a hit is a filtered noise burst plus a low thud, the horn is a pair of
 * detuned square waves. The context is created on the first sound so it starts
 * after a user gesture, which is what browsers require.
 */
let context: AudioContext | null = null
let noise: AudioBuffer | null = null
let lastHitAt = 0

function audio() {
  if (!context) {
    const legacy = window as unknown as { webkitAudioContext?: typeof AudioContext }
    const Context = window.AudioContext ?? legacy.webkitAudioContext
    if (!Context) return null
    context = new Context()
  }
  if (context.state === 'suspended') void context.resume()
  return context
}

function noiseBuffer(ctx: AudioContext) {
  if (noise) return noise
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.random() * 2 - 1
  }
  noise = buffer
  return buffer
}

/**
 * A bump. `strength` runs 0..1 and drives how loud and how bright the hit is,
 * so scraping a wall is a tap and a full speed crash is a bang.
 */
export function playCarHit(strength: number) {
  const ctx = audio()
  if (!ctx) return

  // Impacts arrive in bursts of contacts; one sound per bump is plenty.
  const now = ctx.currentTime
  if (now - lastHitAt < 0.08) return
  lastHitAt = now

  const force = Math.min(Math.max(strength, 0), 1)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.05 + force * 0.35, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12 + force * 0.1)
  gain.connect(ctx.destination)

  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 320 + force * 900
  filter.Q.value = 0.9
  source.connect(filter)
  filter.connect(gain)
  source.start(now)
  source.stop(now + 0.2)

  const thud = ctx.createOscillator()
  thud.type = 'sine'
  thud.frequency.setValueAtTime(150 + force * 70, now)
  thud.frequency.exponentialRampToValueAtTime(48, now + 0.16)
  thud.connect(gain)
  thud.start(now)
  thud.stop(now + 0.2)
}

/** Glass giving up: a bright crack, then shards ringing as they fall. */
export function playGlassBreak() {
  const ctx = audio()
  if (!ctx) return

  const now = ctx.currentTime
  const crack = ctx.createGain()
  crack.gain.setValueAtTime(0.4, now)
  crack.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)
  crack.connect(ctx.destination)

  const burst = ctx.createBufferSource()
  burst.buffer = noiseBuffer(ctx)
  const bright = ctx.createBiquadFilter()
  bright.type = 'highpass'
  bright.frequency.value = 2200
  burst.connect(bright)
  bright.connect(crack)
  burst.start(now)
  burst.stop(now + 0.25)

  for (let shard = 0; shard < 9; shard++) {
    const at = now + 0.05 + Math.random() * 0.7
    const ring = ctx.createGain()
    ring.gain.setValueAtTime(0.06 + Math.random() * 0.05, at)
    ring.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
    ring.connect(ctx.destination)

    const tone = ctx.createOscillator()
    tone.type = 'triangle'
    tone.frequency.value = 2400 + Math.random() * 3200
    tone.connect(ring)
    tone.start(at)
    tone.stop(at + 0.2)
  }
}

/** Two-tone honk. */
export function playCarHorn() {
  const ctx = audio()
  if (!ctx) return

  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(0.16, now + 0.02)
  gain.gain.setValueAtTime(0.16, now + 0.22)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)
  gain.connect(ctx.destination)

  for (const frequency of [440, 554]) {
    const tone = ctx.createOscillator()
    tone.type = 'square'
    tone.frequency.value = frequency
    tone.connect(gain)
    tone.start(now)
    tone.stop(now + 0.36)
  }
}
