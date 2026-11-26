import type { DilemmaState } from './dilemmas'
import type { MonetizationState, Resources } from './economy'
import type { InspectionState, PlayerProfile, QualityStats } from './leaderboard'
import type { PrestigeState, Resident, WardTypeId } from './residents'
import type { Roster, RosterGap, ShiftAccumulator, ShiftId, ShiftReport } from './roster'
import type { StaffId, StaffMember } from './staff'
import type { UpgradeLevels } from './upgrades'

export interface WardState {
  /** Pasienttrivsel 0–100. */
  trivsel: number
  /** Totalt antall registrerte avvik. */
  avvik: number
  /** Avvik som er meldt, men ikke behandlet og lukket ennå. */
  openAvvik: number
  /** Spillminuttet neste pårørendesamtale kan holdes (nedkjøling). */
  nextOfKinReadyAt: number
  /** Brøkdel av neste avvik (akkumulator). */
  avvikProgress: number
  /** Løpenummer for innkomster (gir beboer-id). */
  residentCounter: number
}

export interface LifetimeStats {
  budget: number
  fagpoeng: number
  shiftsCompleted: number
  dilemmasResolved: number
  sickDays: number
  recruits: number
}

/** Spillerens preferanser. Lagres sammen med spillet og følger med ved eksport. */
export interface Settings {
  /** Lydeffekter ved handlinger. */
  sound: boolean
  /** Bakgrunnsmusikk og vaktroms-atmosfære. */
  music: boolean
  /** Vibrasjon på mobil. */
  haptics: boolean
  /** Varsel når offline-bufferen er full eller et kurs er ferdig. */
  notifications: boolean
}

/**
 * Oppstart på vaktrommet: fire milepæler som viser hele kjerne-loopen.
 * Settes av handlingene selv – ingen egne veiledningssteg.
 */
export interface OnboardingState {
  /** Har satt en ansatt på en vaktplass (eller fått turnusen fylt ut). */
  filledShift: boolean
  /** Har løst et dilemma på korktavla. */
  resolvedDilemma: boolean
  /** Har sendt noen på kurs eller kjøpt en oppgradering. */
  trainedOrUpgraded: boolean
  /** Har signert en vaktrapport. */
  claimedReport: boolean
  /** Spilleren lukket sjekklista uten å fullføre. */
  dismissed: boolean
}

export type OnboardingStep = 'filledShift' | 'resolvedDilemma' | 'trainedOrUpgraded' | 'claimedReport'

/** Oppdagelsesboka: hvilke synergier spilleren har funnet. */
export interface DiscoveryState {
  synergies: string[]
  /** Nye funn som ikke er feiret i UI-et ennå. */
  unseen: string[]
}

export interface ThanksCard {
  id: number
  /** Spillminutt kortet kom. */
  minute: number
  resident: string
  /** F.eks. «Datteren til Solveig». */
  from: string
  text: string
}

/** Takkekort fra pårørende når en beboer skrives ut fra en avdeling med høy trivsel. */
export interface ThanksState {
  /** Trivselsmålet er løftet fram til dette spillminuttet. */
  activeUntil: number
  /** De siste kortene (nyeste først). */
  cards: ThanksCard[]
  total: number
}

/** Morgenkaffe: daglig innsjekk med én automatisk avspaseringsdag per uke. */
export interface StreakState {
  /** Dager på rad (avspaseringsdager bryter ikke rekka). */
  count: number
  /** Dagnummer (Europe/Oslo) for siste innsjekk, ellers null. */
  lastDay: number | null
  /** ISO-uka avspaseringsdagen sist ble brukt i. */
  freeWeek: string | null
  best: number
  total: number
}

export interface GameEvent {
  id: number
  /** Spillminutt. */
  at: number
  kind: 'syk' | 'frisk' | 'kurs' | 'nivaa' | 'avdeling' | 'beboer' | 'oppdagelse' | 'takk' | 'fravaer' | 'vikar' | 'avvik' | 'paaroerende'
  text: string
}

/**
 * Hele spilltilstanden. Ren data (JSON-serialiserbar) slik at den kan lagres lokalt,
 * synkes til Supabase og re-simuleres server-side for validering.
 */
export interface GameState {
  version: number
  createdAt: number
  /**
   * Epoch ms for siste simulerte steg. Flyttes bare i hele steg, så resten
   * (nå − lastTickAt) alltid er tiden inn i neste steg.
   */
  lastTickAt: number
  /** Spillminutter siden start (multiplum av steglengden). Dag 1 begynner kl. 07:00. */
  minute: number
  /** Seedet RNG-tilstand (mulberry32) – gir deterministisk simulering. */
  rng: number
  profile: PlayerProfile
  resources: Resources
  lifetime: LifetimeStats
  ward: WardState
  /** Avdelingstypen du leder nå – styrer beboerprofiler og modifikatorer. */
  wardType: WardTypeId
  /** Aktive beboere. Behovet på hver vakt summeres fra disse. */
  residents: Resident[]
  /** Renommé og fagbøker som følger deg mellom avdelinger. */
  prestige: PrestigeState
  staff: Record<StaffId, StaffMember>
  staffOrder: StaffId[]
  roster: Roster
  upgrades: UpgradeLevels
  /** Høyeste oppnådde avdelingsnivå (0–5). */
  tier: number
  dilemmas: DilemmaState
  shift: {
    current: ShiftAccumulator
    last: ShiftReport | null
    reportCounter: number
  }
  quality: QualityStats
  inspection: InspectionState
  monetization: MonetizationState
  discoveries: DiscoveryState
  thanks: ThanksState
  streak: StreakState
  settings: Settings
  onboarding: OnboardingState
  /** Velkomstbonusen er hentet (eller sjekklista er hoppet over av en erfaren spiller). */
  onboardingClaimed: boolean
  /** Hull i turnusen på inneværende og neste vakt. */
  gaps: RosterGap[]
  gapCounter: number
  events: GameEvent[]
  eventCounter: number
}

/** Rapport over hva som skjedde mens spilleren var borte. */
export interface OfflineReport {
  /** Reell fraværstid i ms. */
  awayMs: number
  /** Simulert tid i ms (begrenset av offline-buffer). */
  simulatedMs: number
  capHours: number
  capped: boolean
  fagpoeng: number
  budget: number
  avvik: number
  shifts: number
  sick: number
  /** Antall beboere som ble skrevet ut (og erstattet) i perioden. */
  discharged: number
  /** Takkekort fra pårørende i perioden. */
  thanks: number
  /** Nye synergier oppdaget i perioden. */
  discoveries: number
  trivselFrom: number
  trivselTo: number
  newDilemmas: number
}

export type { ShiftId }
