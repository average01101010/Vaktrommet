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
  /** Antall beboere som genererer behov akkurat nå. */
  residents: number
  /** Behov per egenskap – summert fra beboernes kliniske profiler. */
  demand: Record<SkillId, number>
  supply: Record<SkillId, number>
  /** Dekning per egenskap, 0..1. Overskudd teller ikke. */
  coverageBySkill: Record<SkillId, number>
  /** Behovsvektet totaldekning, 0..1 – uten krysskompensasjon mellom egenskaper. */
  coverage: number
  /** Arbeidsbelastning. 1 = i balanse, lavere bare når ALLE egenskaper er overdekket. */
  workload: number
  /** Er det sykepleier til stede? Uten reduseres kapasiteten i Medisin og Sår. */
  nurseOnDuty: boolean
  /** Faktor på Medisin-/Sår-kapasitet (1 med sykepleier). */
  nurseFactor: { medikament: number; saarstell: number }
  /** Udekket andel i de kritiske egenskapene (0 = fullt dekket). */
  criticalGap: { medikament: number; saarstell: number }
  /** Kompetanseutnyttelse: andel av lagets kapasitet som treffer et reelt behov. */
  utilization: number
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
  /** Tilsynspoeng for vakta (0–100): dekning på ukens fokusområder minus avvik. */
  inspectionScore: number
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
  /** Sum av fokusdekning × timer (for ukens tilsyn). */
  focusSum: number
  hours: number
  synergyIds: string[]
}
