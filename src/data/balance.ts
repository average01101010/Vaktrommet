import type { Profession, Rarity, ShiftId } from '@/types'

/**
 * Alle balansetall samlet på ett sted. Motoren leser kun herfra, slik at
 * klient og server (validering) alltid regner likt.
 */
export const BALANCE = {
  version: 8,

  // ---- Tid ----
  /** Ett reelt sekund = fire spillminutter → én vakt (8 t) varer to minutter. */
  gameMinutesPerRealSecond: 4,
  /**
   * Fast steglengde i spillminutter – den ENESTE som brukes, både i sanntid,
   * ved offline-innhenting og tidshopp. Må gå opp i 60.
   */
  stepMin: 15,
  /** Dag 1 starter kl. 07:00. */
  startMinuteOfDay: 7 * 60,
  offlineCapHours: 8,
  offlineCapHoursVip: 24,
  /** Fravær kortere enn dette vises ikke som offline-rapport. */
  offlineReportMinMs: 60_000,

  // ---- Profil ----
  wardNameMin: 3,
  wardNameMax: 32,

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

  // ---- Beboere ----
  /** Pleietyngde trekkes jevnt i dette intervallet ved innkomst. */
  tyngdeMin: 0.8,
  tyngdeMax: 1.3,

  // ---- Bemanning ----
  /** Overskudd utover dette gir ikke mer avlastning. */
  surplusCap: 1.25,
  /** Hvor mye arbeidsbelastningen øker per manglende dekningsandel. */
  workloadFromGap: 1.2,
  /** Avlastning når ALLE egenskaper er overdekket (per andel overskudd i den svakeste). */
  workloadFromSurplus: 0.8,
  /** Uten sykepleier til stede: andel av Medisin-/Sår-kapasiteten som kan brukes. */
  noNurseMedFactor: 0.5,
  /** Vernepleier har legemiddelkompetanse og demper tapet noe. */
  noNurseMedFactorVernepleier: 0.7,
  noNurseSaarFactor: 0.75,
  /** Høyeste egenskapsnivå uansett sjeldenhet og oppgraderinger. */
  skillCeiling: 5,
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
  // ---- Helg ----
  /** Helgetillegg på lønn for helgevakter. */
  weekendWageBonus: 0.25,
  /** Behovet på helgevakter: ingen kontordrift og legevisitt, men besøk og helgeuro. */
  weekendDemand: { dokumentasjon: 0.75, miljoterapi: 1.15, deeskalering: 1.15 },

  // ---- Hviletid (AML § 10-8) ----
  /** Kort hviletid (aften → dag, 8 t fri): ekstra stress per time på vakt og dårligere restitusjon. */
  restShortStress: 2.5,
  restShortRecovery: 0.6,
  /** Dobbeltvakt (16 t i strekk gjennom natta): tydeligere straff. */
  restDoubleStress: 4,
  restDoubleRecovery: 0.4,

  // ---- Fravær og permisjoner (varigheter står i data/absence.ts) ----
  /** Egenmelding vurderes én time før hver vakt, for dem som står på den. */
  egenmeldingBase: 0.012,
  egenmeldingFromStress: 0.05,
  egenmeldingFromFatigue: 0.045,
  /** Sykt barn: samme tidspunkt, men bare før dag- og aftenvakt. */
  syktBarnChance: 0.012,
  /** Stress over terskelen bygger opp slitasje time for time. Nok slitasje gir risiko for sykmelding. */
  sickStressThreshold: 65,
  strainHoursBeforeSick: 6,
  strainMax: 24,
  sickMaxChancePerHour: 0.12,
  stressAfterSick: 40,
  /** Etter en lang sykmelding kommer mange tilbake gradert. */
  gradertAfterSickChance: 0.5,
  gradertCapacity: 0.5,
  /** Blir en gradert sykmeldt så stresset, ender det med full sykmelding igjen. */
  gradertStressCap: 50,
  /** Permisjoner varsles så mange timer i forveien. */
  leaveNoticeHours: 24,
  velferdChancePerDay: 0.012,
  studyChancePerDay: 0.006,
  /** Studiepermisjon innvilget av lederen: varighet, pris og utbytte når den ansatte er tilbake. */
  studyLeaveDays: 3,
  studyLeaveCost: 500,
  /** Erfaring som andel av det som trengs til neste nivå. */
  studyXpShare: 0.9,
  studyFagpoeng: 45,
  /** Tilkallingsvikar: timepris i forhold til en fast helsefagarbeider, og hvor mye vikaren får ut av ferdighetene sine. */
  vikarWageMult: 1.75,
  vikarEffect: 0.85,
  /** Ekstravakt: overtidstillegg, og hva det koster den ansatte. */
  overtimeWageBonus: 0.5,
  overtimeStress: 15,
  overtimeEnergy: 15,

  // ---- Trivsel og avvik ----
  trivselBase: 24,
  trivselFromCoverage: 58,
  /** Tidskonstant (spilltimer) for hvor raskt trivsel følger målet. */
  trivselInertiaHours: 12,
  avvikBase: 0.015,
  avvikFromGap: 0.55,
  /** Ekstra avvik per time per udekket behovspoeng × udekket andel i Medisin/Sår. */
  avvikCritical: 0.025,
  /** Fradrag i trivselsmålet ved helt udekket Medisin / Sår. */
  trivselCriticalMed: 6,
  trivselCriticalSaar: 4,
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
  /** Så mange av de siste dilemmaene som ikke gjentas. */
  dilemmaRecent: 30,
  /** Vekt i trekningen: avdelingsspesifikke og andre kontekstuelle dilemmaer prioriteres foran de generelle. */
  dilemmaWeightWard: 3,
  dilemmaWeightContext: 1.6,
  dilemmaBudgetTierScale: 1.5,
  dilemmaFagpoengTierScale: 1,

  // ---- Kvalitetsindeks ----
  /** Halveringstid (spilltimer) for de glidende kvalitetsmålingene. */
  qualityHalfLifeHours: 72,
  qualityMinHours: 24,
  efficiencyRef: 30,

  // ---- Belønninger som skalerer med inntjening ----
  /** Minste timeinntekt som legges til grunn, så en tom turnus ikke gir null. */
  rewardMinBudgetPerHour: 250,
  rewardMinFagpoengPerHour: 5,

  // ---- Oppdagelsesbok ----
  discoveryKaffekopper: 1,

  // ---- Takkekort ----
  /** Trivsel må være OVER dette når beboeren skrives ut. */
  thanksTrivselThreshold: 75,
  /** Trivselsmålet ganges med 1 + dette mens kortet virker. */
  thanksTrivselBoost: 0.1,
  thanksHours: 4,

  // ---- Ukens tilsyn ----
  /** Antall fullførte vakter før ukens resultat teller. */
  inspectionMinShifts: 24,
  /** Trekk i vaktas tilsynspoeng per avvik. */
  inspectionAvvikPenalty: 4,

  // ---- Avviksbehandling og pårørendesamtaler ----
  /** Flere ulukkede avvik enn dette gir trekk på tilsynet og i trivselsmålet. */
  openAvvikThreshold: 5,
  /** Tilsynspoeng per ulukket avvik over terskelen, og største trekk per vakt. */
  openAvvikInspectionPenalty: 2.5,
  openAvvikInspectionMax: 25,
  /** Trivselspoeng per ulukket avvik over terskelen, og største trekk. */
  openAvvikTrivselPer: 0.6,
  openAvvikTrivselMax: 6,
  /** Ulukkede avvik regnes som «under kontroll» på tilsynets sjekkliste opp til dette. */
  openAvvikOk: 2,
  /** Fagpoeng for å behandle og lukke ett avvik (skaleres med avdelingsnivå). */
  avvikCloseCost: 15,
  /** Rabatt per nivå av Stille rapport, og med noen på vakt som har Dok. 3+. */
  avvikCloseDiscountPerStille: 0.08,
  avvikCloseDokDiscount: 0.25,
  avvikCloseDokMin: 3,
  /** Tilsynspoeng vakta får per lukket avvik, og største bonus per vakt (avvik og samtaler til sammen). */
  avvikCloseInspectionBonus: 3,
  inspectionBonusMax: 20,
  /** Pårørendesamtale: pris i Fagpoeng (skaleres med nivå), stress på vakta, trivselsløft og tilsynsbonus. */
  meetingCost: 40,
  meetingStress: 6,
  meetingTrivsel: 6,
  meetingInspectionBonus: 8,
  /** Tilsynsbonusen gis bare når trivselen har falt under dette. */
  meetingTrivselLimit: 80,
  meetingCooldownHours: 24,

  // ---- Avdelingsrotasjon ----
  rotationUnlockTier: 5,
  rotationKeepStaff: 3,
  rotationStaffCount: 6,
  rotationKaffekopper: 25,
  renommeBase: 2,
  /** Ett ekstra renommé per så mange poeng på Kvalitetsindeksen. */
  renommePerQuality: 250,
  renommeFagpoeng: 0.03,
  renommeBudget: 0.03,
  fagbokMaxLevel: 3,
  /** Nivåtersklene øker så mye per overleverte avdeling. */
  tierScalePerRotation: 0.6,

  // ---- Start ----
  start: { budget: 1500, fagpoeng: 20, kaffekopper: 30, trivsel: 46 },
} as const

export const SHIFT_ORDER: ShiftId[] = ['dag', 'aften', 'natt']

export const SHIFTS: Record<ShiftId, { name: string; short: string; start: number; end: number; hours: string }> = {
  dag: { name: 'Dagvakt', short: 'Dag', start: 7 * 60, end: 15 * 60, hours: '07:00–15:00' },
  aften: { name: 'Aftenvakt', short: 'Aften', start: 15 * 60, end: 23 * 60, hours: '15:00–23:00' },
  natt: { name: 'Nattevakt', short: 'Natt', start: 23 * 60, end: 7 * 60, hours: '23:00–07:00' },
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
  { name: 'Stabil drift', tagline: 'Vaktene går rundt. Stort sett.', fagpoeng: 300, reward: 4 },
  { name: 'Faglig løft', tagline: 'Fagdager, sjekklister og færre brannslukkinger.', fagpoeng: 2500, reward: 6 },
  { name: 'Læringsavdeling', tagline: 'Studentene ber om praksisplass hos dere.', fagpoeng: 15000, reward: 10 },
  { name: 'Fyrtårnsavdeling', tagline: 'Nabokommunene kommer på studiebesøk.', fagpoeng: 75000, reward: 15 },
  { name: 'Kompetansesenter', tagline: 'Prestisjetungt, faglig ledende – og fortsatt varmt.', fagpoeng: 300000, reward: 25 },
]

/** Belønningsterskler for ukens tilsyn: snitt tilsynspoeng (0–100) per fullførte vakt. */
export const INSPECTION_TIERS: { name: string; score: number; kaffekopper: number; passXp: number }[] = [
  { name: 'Bestått', score: 55, kaffekopper: 5, passXp: 60 },
  { name: 'God praksis', score: 75, kaffekopper: 10, passXp: 120 },
  { name: 'Fremragende', score: 90, kaffekopper: 20, passXp: 240 },
]
