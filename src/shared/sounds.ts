/**
 * Sound effects synthesized with the Web Audio API (T-009) – own sounds, no files, nothing from the TV show.
 * Browsers start audio only after a user gesture in the window, hence `unlock()`.
 */

import type { SoundCue } from './soundCues'

interface Tone {
  freq: number
  /** Start offset in seconds. */
  at?: number
  duration: number
  type?: OscillatorType
  gain?: number
  /** Frequency at the end of the tone (pitch slide). */
  slideTo?: number
}

const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, G4: 392 }

const RECIPES: Record<SoundCue, Tone[]> = {
  buzz: [
    { freq: 220, duration: 0.35, type: 'square', gain: 0.25 },
    { freq: 330, duration: 0.35, type: 'square', gain: 0.15 },
  ],
  correct: [
    { freq: 880, duration: 0.5, type: 'sine', gain: 0.5 },
    { freq: 1320, at: 0.12, duration: 0.7, type: 'sine', gain: 0.45 },
  ],
  reveal: [{ freq: 520, duration: 0.25, type: 'sine', gain: 0.25 }],
  strike: [
    { freq: 110, duration: 0.75, type: 'sawtooth', gain: 0.35 },
    { freq: 116, duration: 0.75, type: 'sawtooth', gain: 0.35 },
  ],
  duplicate: [
    { freq: 300, duration: 0.15, type: 'square', gain: 0.3 },
    { freq: 300, at: 0.22, duration: 0.15, type: 'square', gain: 0.3 },
  ],
  zero: [{ freq: 180, duration: 0.45, type: 'sine', gain: 0.5, slideTo: 70 }],
  roundWin: [
    { freq: NOTE.C5, duration: 0.18, type: 'triangle', gain: 0.4 },
    { freq: NOTE.E5, at: 0.13, duration: 0.18, type: 'triangle', gain: 0.4 },
    { freq: NOTE.G5, at: 0.26, duration: 0.18, type: 'triangle', gain: 0.4 },
    { freq: NOTE.C6, at: 0.39, duration: 0.5, type: 'triangle', gain: 0.4 },
  ],
  victory: [
    { freq: NOTE.G4, duration: 0.2, type: 'triangle', gain: 0.4 },
    { freq: NOTE.C5, at: 0.2, duration: 0.2, type: 'triangle', gain: 0.4 },
    { freq: NOTE.E5, at: 0.4, duration: 0.2, type: 'triangle', gain: 0.4 },
    { freq: NOTE.G5, at: 0.6, duration: 0.35, type: 'triangle', gain: 0.4 },
    { freq: NOTE.E5, at: 0.95, duration: 0.15, type: 'triangle', gain: 0.4 },
    { freq: NOTE.G5, at: 1.1, duration: 0.9, type: 'triangle', gain: 0.4 },
    { freq: NOTE.C6, at: 1.1, duration: 0.9, type: 'triangle', gain: 0.25 },
  ],
  timeUp: [
    { freq: 1000, duration: 0.12, type: 'square', gain: 0.25 },
    { freq: 1000, at: 0.2, duration: 0.12, type: 'square', gain: 0.25 },
    { freq: 440, at: 0.4, duration: 0.6, type: 'sawtooth', gain: 0.3 },
  ],
}

export interface SoundPlayer {
  /** Resumes audio after a user gesture; resolves when sound can play. */
  unlock(): Promise<void>
  readonly ready: boolean
  play(cue: SoundCue): void
}

export function createSoundPlayer(volume = 0.6): SoundPlayer {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null

  function context(): AudioContext | null {
    if (ctx) return ctx
    if (typeof AudioContext === 'undefined') return null
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = volume
    master.connect(ctx.destination)
    return ctx
  }

  function tone(audio: AudioContext, t: Tone) {
    const start = audio.currentTime + (t.at ?? 0)
    const end = start + t.duration
    const osc = audio.createOscillator()
    const env = audio.createGain()
    osc.type = t.type ?? 'sine'
    osc.frequency.setValueAtTime(t.freq, start)
    if (t.slideTo) osc.frequency.exponentialRampToValueAtTime(t.slideTo, end)
    env.gain.setValueAtTime(0.0001, start)
    env.gain.exponentialRampToValueAtTime(t.gain ?? 0.3, start + 0.015)
    env.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(env).connect(master!)
    osc.start(start)
    osc.stop(end + 0.05)
  }

  return {
    async unlock() {
      await context()?.resume()
    },
    get ready() {
      return ctx?.state === 'running'
    },
    play(cue) {
      const audio = context()
      if (!audio || audio.state !== 'running') return
      for (const t of RECIPES[cue]) tone(audio, t)
    },
  }
}
