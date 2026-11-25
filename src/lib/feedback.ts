import type { Settings } from '@/types'

/**
 * Lyd og haptikk. Begge styres av spillerens innstillinger, og begge er
 * «best effort»: mangler nettleseren støtte, skjer det ingenting.
 */
export type Cue = 'tap' | 'good' | 'bad'

let audio: AudioContext | null = null

function tone(ctx: AudioContext, freq: number, start: number, duration: number, volume: number, type: OscillatorType): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = ctx.currentTime + start
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

/** Korte, dempede lydeffekter laget med Web Audio – ingen lydfiler å laste. */
function playSound(cue: Cue): void {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    audio ??= new Ctor()
    if (audio.state === 'suspended') void audio.resume()
    if (cue === 'tap') tone(audio, 620, 0, 0.07, 0.035, 'sine')
    else if (cue === 'good') {
      tone(audio, 660, 0, 0.12, 0.05, 'sine')
      tone(audio, 880, 0.09, 0.18, 0.05, 'sine')
    } else {
      tone(audio, 196, 0, 0.2, 0.06, 'triangle')
    }
  } catch {
    // Lyd er pynt – aldri la det stoppe spillet.
  }
}

const VIBRATION: Record<Cue, number | number[]> = { tap: 8, good: [10, 40, 14], bad: [24, 50, 24] }

export function haptic(settings: Pick<Settings, 'haptics'>, pattern: number | number[] = 8): void {
  if (!settings.haptics) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Ikke støttet.
  }
}

/** Gir lyd og/eller vibrasjon for en hendelse, etter innstillingene. */
export function cue(settings: Settings, kind: Cue): void {
  if (settings.sound) playSound(kind)
  haptic(settings, VIBRATION[kind])
}
