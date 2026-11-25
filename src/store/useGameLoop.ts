import { useEffect } from 'react'
import { flushSave, useGame } from './gameStore'

/**
 * Driver simuleringen. Ticket går hvert sekund, men motoren flytter seg bare i
 * hele, faste steg – så hvor ofte vi spør, påvirker aldri resultatet.
 * Når fanen skjules eller lukkes, skrives lagringen med en gang.
 */
export function useGameLoop(): void {
  useEffect(() => {
    const tick = () => useGame.getState().tick(Date.now())
    tick()
    let timer: ReturnType<typeof setInterval> | null = setInterval(tick, 1000)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick()
        timer ??= setInterval(tick, 1000)
      } else {
        flushSave()
        if (timer) {
          clearInterval(timer)
          timer = null
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flushSave)
    return () => {
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flushSave)
      flushSave()
    }
  }, [])
}
