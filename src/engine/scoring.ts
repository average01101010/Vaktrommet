import { BALANCE } from '@/data/balance'
import type { GameState, LeaderboardEntry, LifetimeStats, QualityStats } from '@/types'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Driftspoeng for avdelingen du leder nå. */
export function wardDriftScore(state: GameState): number {
  let upgradeLevels = 0
  for (const level of Object.values(state.upgrades)) upgradeLevels += level
  return Math.floor(
    state.lifetime.fagpoeng +
      state.lifetime.budget / 40 +
      upgradeLevels * 300 +
      state.tier * 2500 +
      state.lifetime.dilemmasResolved * 40,
  )
}

/**
 * Driftsligaen: total poengsum over hele karrieren – nåværende avdeling pluss
 * alt som er banket fra avdelinger du har overlevert.
 */
export const driftScore = (state: GameState): number => state.prestige.bankedDrift + wardDriftScore(state)

/** Statistikk for hele karrieren: overleverte avdelinger pluss den du leder nå. */
export function careerStats(state: GameState): LifetimeStats {
  const banked = state.prestige.bankedLifetime
  const now = state.lifetime
  return {
    budget: banked.budget + now.budget,
    fagpoeng: banked.fagpoeng + now.fagpoeng,
    shiftsCompleted: banked.shiftsCompleted + now.shiftsCompleted,
    dilemmasResolved: banked.dilemmasResolved + now.dilemmasResolved,
    sickDays: banked.sickDays + now.sickDays,
    recruits: banked.recruits + now.recruits,
  }
}

export interface Rival<T extends { score: number }> {
  entry: T
  /** Poeng spilleren mangler for å gå forbi. */
  gap: number
}

/**
 * «Rivalen rett over deg»: konkurrenten med lavest poengsum som fortsatt er
 * strengt høyere enn spillerens. Null når spilleren leder utvalget.
 */
export function findRival<T extends Pick<LeaderboardEntry, 'score' | 'isPlayer'>>(entries: readonly T[], playerScore: number): Rival<T> | null {
  let best: T | null = null
  for (const e of entries) {
    if (e.isPlayer || e.score <= playerScore) continue
    if (!best || e.score < best.score) best = e
  }
  return best ? { entry: best, gap: best.score - playerScore + 1 } : null
}

export interface QualityBreakdown {
  /** 0–1000. */
  index: number
  qualified: boolean
  parts: { id: keyof Omit<QualityStats, 'hours'>; label: string; weight: number; score: number; display: string }[]
}

/**
 * Kvalitetsindeksen: ren effektivitet. Bygger kun på forholdstall, og 30 %
 * handler om hvor godt du bruker ressursene (dekning per lønnskrone og
 * kompetanseutnyttelse) – så en dyr, overkvalifisert stab ikke vinner på volum.
 */
export function qualityIndex(state: GameState): QualityBreakdown {
  const q = state.quality
  const parts: QualityBreakdown['parts'] = [
    {
      id: 'trivsel',
      label: 'Pasienttrivsel',
      weight: 0.25,
      score: clamp01(q.trivsel / 100),
      display: `${Math.round(q.trivsel)} %`,
    },
    {
      id: 'avvikPerBedDay',
      label: 'Avvik per beboer/døgn',
      weight: 0.2,
      score: clamp01(1 / (1 + q.avvikPerBedDay * 6)),
      display: q.avvikPerBedDay.toFixed(2).replace('.', ','),
    },
    {
      id: 'absence',
      label: 'Nærvær',
      weight: 0.15,
      score: clamp01(1 - q.absence * 4),
      display: `${Math.round((1 - q.absence) * 100)} %`,
    },
    {
      id: 'stress',
      label: 'Arbeidsbelastning',
      weight: 0.1,
      score: clamp01(1 - q.stress / 100),
      display: `${Math.round(q.stress)} stress`,
    },
    {
      id: 'efficiency',
      label: 'Dekning per lønnskrone',
      weight: 0.15,
      score: clamp01(q.efficiency / 1.2),
      display: `${Math.round(q.efficiency * 100)}`,
    },
    {
      id: 'competence',
      label: 'Kompetanseutnyttelse',
      weight: 0.15,
      score: clamp01(q.competence),
      display: `${Math.round(q.competence * 100)} %`,
    },
  ]
  let sum = 0
  for (const p of parts) sum += p.weight * p.score
  return { index: Math.round(sum * 1000), qualified: q.hours >= BALANCE.qualityMinHours, parts }
}
