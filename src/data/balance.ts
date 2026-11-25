import type { Profession, Rarity, ShiftId, SkillId } from '@/types'

/**
 * Alle balansetall samlet på ett sted. Motoren leser kun herfra, slik at
 * klient og server (validering) alltid regner likt.
 */
export const BALANCE = {
  version: 1,

  // ---- Tid ----
  /** Ett reelt sekund = fire spillminutter → én vakt (8 t) varer to minutter. */
  gameMinutesPerRealSecond: 4,
  /** Steg i sanntid (spillminutter). Må gå opp i 60. */
  liveStepMin: 4,
  /** Grovere steg ved offline-/tidshopp-beregning. */
  offlineStepMin: 60,
  /** Dag 1 starter kl. 07:00. */
  startMinuteOfDay: 7 * 60,
  offlineCapHours: 8,
  offlineCapHoursVip: 24,
  /** Fravær kortere enn dette vises ikke som offline-rapport. */
  offlineReportMinMs: 60_000,

  // ---- Avdeling ----
  baseBeds: 8,
  baseSlots: 3,
  maxSlots: 5,
  maxShiftsPerStaff: 2,
  staffCap: 16,

  // ---- Økonomi (per spilltime) ----
  /** Grunnbevilgning per seng. Skaleres svakt med trivsel. */
  grantPerBed: 52,
  /** Andel av grunnbevilgningen som er uavhengig av trivsel. */
  grantFloorShare: 0.4,
  /** Under denne dekningen holder kommunen tilbake deler av bevilgningen. */
  grantFullCoverage: 0.4,
  /** Kvalitetstilskudd per seng ved 100 % dekning. */
  qualityGrantPerBed: 34,
  /** Minste netto som andel av grunnbevilgning (kommunen lar deg ikke gå helt tom). */
  minNetShare: 0.12,
  fagpoengPerHour: 6,
  tierFagpoengBonus: 0.06,
  tierBudgetBonus: 0.05,

  // ---- Bemanning ----
  maxCoverage: 1.25,
  /** Hvor mye arbeidsbelastningen øker per manglende dekningsandel. */
  workloadFromGap: 1.2,
  workloadFromSurplus: 0.8,
  /** Energi der den ansatte yter fullt. Under dette faller effekten mot 50 %. */
  fullEffectEnergy: 40,
  levelEffect: 0.04,
  maxLevel: 10,
  xpPerHour: 10,
  traitAffinityBonus: 0.15,

  // ---- Energi og stress (per spilltime) ----
  energyDrain: 4.6,
  energyDrainWorkloadExp: 0.5,
  energyRecovery: 5,
  stressFromWorkload: 6,
  stressBaseRelief: 0.6,
  stressWhenExhausted: 3,
  stressRecovery: 2.4,
  sickStressThreshold: 65,
  sickMaxChancePerHour: 0.12,
  sickMinHours: 24,
  sickMaxHours: 72,
  stressAfterSick: 40,

  // ---- Trivsel og avvik ----
  trivselBase: 22,
  trivselFromCoverage: 58,
  /** Tidskonstant (spilltimer) for hvor raskt trivsel følger målet. */
  trivselInertiaHours: 12,
  avvikBase: 0.015,
  avvikFromGap: 0.55,
  avvikTrivselHit: 1.2,

  // ---- Kurs ----
  courseBaseCost: 40,
  courseCostExp: 2,
  courseHoursPerLevel: 8,
  /** Spilltimer per Kaffekopp ved Hurtigkurs. */
  courseSkipHoursPerKaffe: 4,

  // ---- Dilemmaer ----
  dilemmaMinHours: 10,
  dilemmaMaxHours: 20,
  dilemmaMaxActive: 3,
  dilemmaBudgetTierScale: 1.5,
  dilemmaFagpoengTierScale: 1,

  // ---- Kvalitetsindeks ----
  /** Halveringstid (spilltimer) for de glidende kvalitetsmålingene. */
  qualityHalfLifeHours: 72,
  qualityMinHours: 24,
  efficiencyRef: 30,

  // ---- Start ----
  start: { budget: 1500, fagpoeng: 20, kaffekopper: 30, trivsel: 46 },
} as const

export const SHIFT_ORDER: ShiftId[] = ['dag', 'aften', 'natt']

export const SHIFTS: Record<ShiftId, { name: string; short: string; start: number; end: number; hours: string }> = {
  dag: { name: 'Dagvakt', short: 'Dag', start: 7 * 60, end: 15 * 60, hours: '07:00–15:00' },
  aften: { name: 'Aftenvakt', short: 'Aften', start: 15 * 60, end: 23 * 60, hours: '15:00–23:00' },
  natt: { name: 'Nattevakt', short: 'Natt', start: 23 * 60, end: 7 * 60, hours: '23:00–07:00' },
}

/**
 * Faglig behov per vakt for en avdeling med `baseBeds` senger.
 * Skaleres lineært med antall senger.
 */
export const SHIFT_DEMAND: Record<ShiftId, Record<SkillId, number>> = {
  dag: { grunnstell: 8, ernaering: 5, medikament: 5, saarstell: 4, dokumentasjon: 5, miljoterapi: 4, deeskalering: 2 },
  aften: { grunnstell: 5, ernaering: 5, medikament: 5, saarstell: 2, dokumentasjon: 3, miljoterapi: 6, deeskalering: 5 },
  natt: { grunnstell: 3, ernaering: 0, medikament: 3, saarstell: 2, dokumentasjon: 3, miljoterapi: 2, deeskalering: 6 },
}

export const WAGE_PER_HOUR: Record<Profession, number> = {
  assistent: 48,
  helsefagarbeider: 60,
  vernepleier: 76,
  sykepleier: 80,
}

export const RARITY: Record<
  Rarity,
  { name: string; order: number; skillPoints: number; maxSkill: number; stamina: [number, number]; wageMult: number; traitChance: number }
> = {
  vanlig: { name: 'Vanlig', order: 0, skillPoints: 7, maxSkill: 3, stamina: [58, 74], wageMult: 1, traitChance: 0.15 },
  erfaren: { name: 'Erfaren', order: 1, skillPoints: 10, maxSkill: 4, stamina: [66, 84], wageMult: 1.1, traitChance: 0.4 },
  spesialist: { name: 'Spesialist', order: 2, skillPoints: 14, maxSkill: 5, stamina: [74, 94], wageMult: 1.25, traitChance: 0.75 },
  ildsjel: { name: 'Ildsjel', order: 3, skillPoints: 18, maxSkill: 5, stamina: [84, 100], wageMult: 1.45, traitChance: 1 },
}

export const RARITY_ORDER: Rarity[] = ['vanlig', 'erfaren', 'spesialist', 'ildsjel']

/** Avdelingsnivå – låses opp av opptjente Fagpoeng totalt. */
export const TIERS: { name: string; tagline: string; fagpoeng: number; reward: number }[] = [
  { name: 'Sliten avdeling', tagline: 'Flekkete linoleum og en kaffetrakter fra 1998.', fagpoeng: 0, reward: 0 },
  { name: 'Stabil drift', tagline: 'Vaktene går rundt. Stort sett.', fagpoeng: 300, reward: 10 },
  { name: 'Faglig løft', tagline: 'Fagdager, sjekklister og færre brannslukkinger.', fagpoeng: 2500, reward: 15 },
  { name: 'Læringsavdeling', tagline: 'Studentene ber om praksisplass hos dere.', fagpoeng: 15000, reward: 25 },
  { name: 'Fyrtårnsavdeling', tagline: 'Nabokommunene kommer på studiebesøk.', fagpoeng: 75000, reward: 40 },
  { name: 'Kompetansesenter', tagline: 'Prestisjetungt, faglig ledende – og fortsatt varmt.', fagpoeng: 300000, reward: 75 },
]

/** Belønningsterskler for ukens tilsyn (tilsynspoeng). */
export const INSPECTION_TIERS: { name: string; points: number; kaffekopper: number; passXp: number }[] = [
  { name: 'Bestått', points: 5000, kaffekopper: 5, passXp: 60 },
  { name: 'God praksis', points: 30000, kaffekopper: 10, passXp: 120 },
  { name: 'Fremragende', points: 90000, kaffekopper: 20, passXp: 240 },
]
