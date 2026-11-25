import { COUNTIES, PLAYER_PROFESSION_ORDER } from '@/data/league'
import { pick, rand, type RngHolder } from '@/engine/rng'
import type { LeaderboardEntry, LeaderboardFilter, LeagueId, PlayerProfile } from '@/types'
import { getSupabase } from './supabase'

/**
 * Topplister. I MVP-en fylles lista med deterministiske demo-avdelinger;
 * med Supabase konfigurert hentes de fra `leaderboard_scores`, som kun
 * skrives av server-side validering (se supabase/migrations).
 */
export interface PlayerScore {
  profile: PlayerProfile
  drift: number
  kvalitet: number
  qualified: boolean
}

const WARD_PREFIX = [
  'Solsiden', 'Furutoppen', 'Bjørkelia', 'Fjordgløtt', 'Elvebakken', 'Lyngheia', 'Rognebærtunet', 'Strandparken',
  'Åsly', 'Kveldssol', 'Granåsen', 'Havblikk', 'Tyttebærstien', 'Sjøgløtt', 'Midtbygda', 'Nordlys',
]
const WARD_SUFFIX = ['sykehjem', 'omsorgssenter', 'bo- og behandlingssenter', 'helsehus', 'bofellesskap']

let demoCache: Record<LeagueId, LeaderboardEntry[]> | null = null

function demoEntries(): Record<LeagueId, LeaderboardEntry[]> {
  if (demoCache) return demoCache
  const h: RngHolder = { rng: 20261125 }
  const drift: LeaderboardEntry[] = []
  const kvalitet: LeaderboardEntry[] = []
  for (let i = 0; i < 140; i++) {
    const wardName = `${pick(h, WARD_PREFIX)} ${pick(h, WARD_SUFFIX)}, avd. ${1 + Math.floor(rand(h) * 6)}`
    const county = pick(h, COUNTIES)
    const profession = pick(h, PLAYER_PROFESSION_ORDER)
    // Driftsligaen: tung hale (noen har spilt lenge). Kvalitet: klokkeformet rundt ~640.
    const driftScore = Math.floor(400 * Math.pow(10, rand(h) * 3.4))
    const q = 420 + (rand(h) + rand(h) + rand(h)) * 170
    drift.push({ id: `d${i}`, wardName, county, profession, score: driftScore })
    kvalitet.push({ id: `k${i}`, wardName, county, profession, score: Math.round(Math.min(985, q)) })
  }
  demoCache = { drift, kvalitet }
  return demoCache
}

export interface LeaderboardResult {
  entries: (LeaderboardEntry & { rank: number })[]
  playerRank: number | null
  total: number
  source: 'demo' | 'supabase'
}

function rankWithPlayer(rows: LeaderboardEntry[], filter: LeaderboardFilter, player: PlayerScore, source: 'demo' | 'supabase'): LeaderboardResult {
  const matches = (e: { county: string; profession: string }) =>
    (filter.county === 'alle' || e.county === filter.county) &&
    (filter.profession === 'alle' || e.profession === filter.profession)

  const list = rows.filter(matches)
  const includePlayer =
    matches(player.profile) && (filter.league === 'drift' || player.qualified)
  if (includePlayer) {
    list.push({
      id: 'meg',
      wardName: player.profile.wardName,
      county: player.profile.county,
      profession: player.profile.profession,
      score: filter.league === 'drift' ? player.drift : player.kvalitet,
      isPlayer: true,
    })
  }
  list.sort((a, b) => b.score - a.score)
  const entries = list.map((e, i) => ({ ...e, rank: i + 1 }))
  return {
    entries,
    playerRank: entries.find((e) => e.isPlayer)?.rank ?? null,
    total: entries.length,
    source,
  }
}

export async function fetchLeaderboard(filter: LeaderboardFilter, player: PlayerScore): Promise<LeaderboardResult> {
  const supabase = getSupabase()
  if (supabase) {
    try {
      const client = await supabase
      let query = client
        .from('leaderboard_scores')
        .select('id, ward_name, county, profession, score')
        .eq('league', filter.league)
        .order('score', { ascending: false })
        .limit(200)
      if (filter.county !== 'alle') query = query.eq('county', filter.county)
      if (filter.profession !== 'alle') query = query.eq('profession', filter.profession)
      const { data, error } = await query
      if (!error && data) {
        const rows: LeaderboardEntry[] = data.map((r) => ({
          id: String(r.id),
          wardName: r.ward_name,
          county: r.county,
          profession: r.profession,
          score: r.score,
        }))
        return rankWithPlayer(rows, filter, player, 'supabase')
      }
    } catch {
      // Faller tilbake til demo-lista under.
    }
  }
  return rankWithPlayer(demoEntries()[filter.league], filter, player, 'demo')
}
