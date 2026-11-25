import { useEffect, useState } from 'react'
import { driftScore, qualityIndex } from '@/engine/scoring'
import { fetchRival, type RivalInfo } from '@/services/leaderboard'
import { useGameState } from './selectors'

/** Nærmeste konkurrent foran spilleren i Driftsligaen. Oppdateres når poengsummen flytter seg. */
export function useRival(): { rival: RivalInfo | null; loaded: boolean; score: number } {
  const game = useGameState()
  const [state, setState] = useState<{ rival: RivalInfo | null; loaded: boolean }>({ rival: null, loaded: false })
  const score = driftScore(game)
  const bucket = Math.floor(score / 25)
  const { wardName, county, profession } = game.profile

  useEffect(() => {
    let alive = true
    const quality = qualityIndex(game)
    void fetchRival({ profile: game.profile, drift: score, kvalitet: quality.index, qualified: quality.qualified }).then((rival) => {
      if (alive) setState({ rival, loaded: true })
    })
    return () => {
      alive = false
    }
    // Bevisst grov oppdatering: lista hentes på nytt når poengsummen har flyttet seg merkbart.
  }, [bucket, wardName, county, profession])

  return { ...state, score }
}
