import { sound, type SoundCue } from '@/services/sound'
import type { Settings } from '@/types'

/**
 * Lyd og haptikk for spillerens handlinger. Lyden lages av lydtjenesten
 * (services/sound.ts). Begge styres av innstillingene, og begge er «best
 * effort»: mangler nettleseren støtte, skjer det ingenting.
 */
export type Cue = SoundCue

/** Vibrasjonsmønster for de lydene som også skal kjennes. */
const VIBRATION: Partial<Record<Cue, number | number[]>> = { tap: 8, good: [10, 40, 14], bad: [24, 50, 24], card: 10, stamp: [14, 30, 10], cup: 8, fanfare: [10, 40, 14, 40, 20] }

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
  sound.setSettings(settings)
  sound.play(kind)
  const pattern = VIBRATION[kind]
  if (pattern !== undefined) haptic(settings, pattern)
}
