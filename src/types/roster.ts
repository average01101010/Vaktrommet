import type { Profession, SkillId, StaffId } from './staff'

export type ShiftId = 'dag' | 'aften' | 'natt'

/** Vaktplanen: én rad med plasser per vaktlag. `null` = ubesatt plass. */
export type Roster = Record<ShiftId, (StaffId | null)[]>

export interface RosterTemplate {
  id: string
  name: string
  roster: Roster
}

export type SynergyTone = 'bonus' | 'malus'

/** Effekten av én synergi (eller ett problem) på en vakt. */
export interface SynergyEffect {
  /** Additiv bonus på Fagpoeng, f.eks. 0.15 = +15 %. */
  fagpoeng?: number
  /** Additiv bonus på kvalitetstilskuddet (kr). */
  budget?: number
  /** Poeng på trivselsmålet. */
  trivsel?: number
  /** Stress per time for alle på vakt (negativt = avlastning). */
  stress?: number
  /** Multiplikator på avviksrate (0.8 = 20 % færre). */
  avvik?: number
  /** Multiplikator på XP. */
  xp?: number
}

export interface ActiveSynergy {
  id: string
  name: string
  tone: SynergyTone
  description: string
  effect: SynergyEffect
}

/** Øyeblikksbilde av hvordan en vakt presterer med nåværende bemanning. */
export interface ShiftEvaluation {
  shift: ShiftId
  /** Ansatte som faktisk er på jobb (ikke syke / på kurs). */
  present: StaffId[]
  absent: StaffId[]
  slots: number
  beds: number
  demand: Record<SkillId, number>
  supply: Record<SkillId, number>
  /** Dekning per egenskap, 0..1.25. */
  coverageBySkill: Record<SkillId, number>
  /** Vektet totaldekning, 0..1.25. */
  coverage: number
  /** Arbeidsbelastning: behov / kapasitet. 1 = i balanse. */
  workload: number
  professions: Record<Profession, number>
  synergies: ActiveSynergy[]
  /** Rater per spilltime. */
  rates: {
    fagpoeng: number
    budgetGross: number
    wages: number
    budgetNet: number
    avvik: number
    stress: number
    energyDrain: number
    xp: number
  }
  trivselTarget: number
}

/** Oppsummering av en fullført vakt – vises som vaktrapport. */
export interface ShiftReport {
  id: number
  shift: ShiftId
  day: number
  fagpoeng: number
  budget: number
  avvik: number
  avgCoverage: number
  synergyIds: string[]
  /** Er utbetalingen doblet via rewarded ad? */
  doubled: boolean
  seen: boolean
}

export interface ShiftAccumulator {
  shift: ShiftId
  day: number
  fagpoeng: number
  budget: number
  avvik: number
  coverageSum: number
  hours: number
  synergyIds: string[]
}
