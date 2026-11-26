import { useEffect } from 'react'
import { modifiersFor } from '@/engine/modifiers'
import { evaluateShift } from '@/engine/synergy'
import { liveMinute, MIN_PER_SHIFT, shiftAt } from '@/engine/time'
import { sound } from '@/services/sound'
import { useGame } from './gameStore'

/**
 * Holder lydbildet i takt med spillet: vakt, avdelingstype, dekning og stress
 * bestemmer musikken, og innstillingene bestemmer hva som høres.
 *
 * Nettlesere lar ikke lyd starte av seg selv, så motoren startes ved første
 * berøring – og settes på vent når fanen skjules.
 */
export function useSoundscape(): void {
  useEffect(() => {
    const update = () => {
      const game = useGame.getState().game
      sound.setSettings(game.settings)
      const minute = liveMinute(game, Date.now())
      const shift = shiftAt(minute)
      const ev = evaluateShift(game, shift, modifiersFor(game))
      const stress = ev.present.map((id) => game.staff[id]?.stress ?? 0)
      sound.setScene({
        shift,
        ward: game.wardType,
        coverage: ev.coverage,
        avgStress: stress.length ? stress.reduce((a, b) => a + b, 0) / stress.length : 0,
        staffed: ev.present.length > 0,
        minutesToShiftEnd: MIN_PER_SHIFT - (((minute % MIN_PER_SHIFT) + MIN_PER_SHIFT) % MIN_PER_SHIFT),
      })
    }
    update()
    // Til utprøving i nettleserkonsollen: __vaktrommetSound.debug()
    if (import.meta.env.DEV) Object.assign(window, { __vaktrommetSound: sound })
    const timer = setInterval(update, 1000)
    // Innstillingene skal virke med en gang bryteren slås av eller på.
    const unsubscribe = useGame.subscribe((s, prev) => {
      if (s.game.settings !== prev.game.settings) sound.setSettings(s.game.settings)
    })

    const unlock = () => sound.unlock()
    const onVisibility = () => sound.setHidden(document.visibilityState !== 'visible')
    // Synligheten settes også ved oppstart, så en ny montering aldri arver «skjult» fra den forrige.
    onVisibility()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(timer)
      unsubscribe()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      document.removeEventListener('visibilitychange', onVisibility)
      sound.setHidden(true)
    }
  }, [])
}
