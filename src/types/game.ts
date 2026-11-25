import type { DilemmaState } from './dilemmas'
import type { MonetizationState, Resources } from './economy'
import type { InspectionState, PlayerProfile, QualityStats } from './leaderboard'
import type { Roster, ShiftAccumulator, ShiftId, ShiftReport } from './roster'
import type { StaffId, StaffMember } from './staff'
import type { UpgradeLevels } from './upgrades'

export interface WardState {
  /** Pasienttrivsel 0–100. */
  trivsel: number
  /** Totalt antall registrerte avvik. */
  avvik: number
  /** Brøkdel av neste avvik (akkumulator). */
  avvikProgress: number
}

export interface LifetimeStats {
  budget: number
  fagpoeng: number
  shiftsCompleted: number
  dilemmasResolved: number
  sickDays: number
  recruits: number
}

export interface GameEvent {
  id: number
  /** Spillminutt. */
  at: number
  kind: 'syk' | 'frisk' | 'kurs' | 'nivaa' | 'avdeling' | 'avvik'
  text: string
}

/**
 * Hele spilltilstanden. Ren data (JSON-serialiserbar) slik at den kan lagres lokalt,
 * synkes til Supabase og re-simuleres server-side for validering.
 */
export interface GameState {
  version: number
  createdAt: number
  /** Epoch ms for siste simulerte øyeblikk. */
  lastTickAt: number
  /** Ubrukt rest av sanntid (ms) som ikke fylte et helt simuleringssteg. */
  carryMs: number
  /** Spillminutter siden start. Dag 1 begynner kl. 07:00. */
  minute: number
  /** Seedet RNG-tilstand (mulberry32) – gir deterministisk simulering. */
  rng: number
  profile: PlayerProfile
  resources: Resources
  lifetime: LifetimeStats
  ward: WardState
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
  trivselFrom: number
  trivselTo: number
  newDilemmas: number
}

export type { ShiftId }
