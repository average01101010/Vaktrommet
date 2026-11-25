import { useEffect } from 'react'
import { useGame } from './gameStore'

/**
 * Driver simuleringen: ett tick i sekundet mens fanen er synlig, og en
 * innhenting (offline-beregning) når spilleren kommer tilbake.
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
      } else if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
