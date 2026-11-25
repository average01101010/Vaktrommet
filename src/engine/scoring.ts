import { BALANCE } from '@/data/balance'
import type { GameState, QualityStats } from '@/types'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * Driftsligaen: total poengsum. Belønner volum og progresjon over tid.
 */
export function driftScore(state: GameState): number {
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

export interface QualityBreakdown {
  /** 0–1000. */
  index: number
  qualified: boolean
  parts: { id: keyof Omit<QualityStats, 'hours'>; label: string; weight: number; score: number; display: string }[]
}

/**
 * Kvalitetsindeksen: ren effektivitet – høy trivsel, få avvik, lavt fravær,
 * lav belastning og god dekning per lønnskrone. Bygger kun på forholdstall,
 * så verken kjøpt tid, flere senger eller dyre staber gir fordel.
 */
export function qualityIndex(state: GameState): QualityBreakdown {
  const q = state.quality
  const parts: QualityBreakdown['parts'] = [
    {
      id: 'trivsel',
      label: 'Pasienttrivsel',
      weight: 0.35,
      score: clamp01(q.trivsel / 100),
      display: `${Math.round(q.trivsel)} %`,
    },
    {
      id: 'avvikPerBedDay',
      label: 'Avvik per seng/døgn',
      weight: 0.25,
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
  ]
  let sum = 0
  for (const p of parts) sum += p.weight * p.score
  return { index: Math.round(sum * 1000), qualified: q.hours >= BALANCE.qualityMinHours, parts }
}
