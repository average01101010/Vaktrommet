import type { SkillId } from './staff'

export type LeagueId = 'drift' | 'kvalitet'

/** Yrkesgruppe spilleren selv tilhører (brukes til filtrering i topplista). */
export type PlayerProfession =
  | 'sykepleier'
  | 'vernepleier'
  | 'helsefagarbeider'
  | 'assistent'
  | 'student'
  | 'annet'

export interface PlayerProfile {
  wardName: string
  county: string
  profession: PlayerProfession
  onboarded: boolean
}

export interface LeaderboardEntry {
  id: string
  wardName: string
  county: string
  profession: PlayerProfession
  score: number
  isPlayer?: boolean
}

export interface LeaderboardFilter {
  league: LeagueId
  county: string | 'alle'
  profession: PlayerProfession | 'alle'
}

/** Glidende kvalitetsstatistikk – grunnlaget for Kvalitetsindeksen. */
export interface QualityStats {
  trivsel: number
  /** Avvik per seng per døgn. */
  avvikPerBedDay: number
  /** Andel fravær (0–1) blant ansatte satt opp på vakt. */
  absence: number
  stress: number
  /** Pasientdekning per lønnskrone (normalisert) – nøytraliserer dyre staber. */
  efficiency: number
  /** Antall spilltimer med målinger. */
  hours: number
}

export interface InspectionDef {
  id: string
  title: string
  focus: SkillId[]
  description: string
  /** Hva tilsynet ser etter – vises som sjekkliste. */
  checklist: string[]
}

export interface InspectionState {
  /** ISO-uke, f.eks. «2026-W48». */
  weekKey: string
  points: number
  claimed: number[]
}
