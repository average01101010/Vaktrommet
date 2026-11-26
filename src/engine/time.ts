import { BALANCE, SHIFT_ORDER } from '@/data/balance'
import type { ShiftId } from '@/types'

export const MIN_PER_HOUR = 60
export const MIN_PER_SHIFT = 8 * 60
export const MIN_PER_DAY = 24 * 60

/** Spillminutt 0 = dag 1 kl. 07:00, så vaktene faller på hele 8-timersblokker. */
export const shiftAt = (minute: number): ShiftId =>
  SHIFT_ORDER[Math.floor((((minute % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY) / MIN_PER_SHIFT)]

/** Vaktdøgn nr. (starter på 1, skifter kl. 07:00). */
export const dayNumber = (minute: number): number => Math.floor(minute / MIN_PER_DAY) + 1

/** Andel (0–1) av inneværende vakt som er unnagjort. */
export const shiftProgress = (minute: number): number => (minute % MIN_PER_SHIFT) / MIN_PER_SHIFT

export const minutesLeftInShift = (minute: number): number => MIN_PER_SHIFT - (minute % MIN_PER_SHIFT)

export const minuteOfDay = (minute: number): number => (minute + BALANCE.startMinuteOfDay) % MIN_PER_DAY

// ---------------------------------------------------------------------------
// Ukedag og helg
// ---------------------------------------------------------------------------

export const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'] as const
export type Weekday = (typeof WEEKDAYS)[number]

const mod7 = (n: number): number => ((n % 7) + 7) % 7

/** Ukedag for vaktdøgnet (0 = mandag). Døgn 1 er en mandag, og vaktdøgnet skifter kl. 07:00. */
export const weekdayIndex = (minute: number): number => mod7(Math.floor(minute / MIN_PER_DAY))

export const weekdayName = (minute: number): Weekday => WEEKDAYS[weekdayIndex(minute)]

/** Ukedag etter klokka (skifter ved midnatt) – brukes til å avgjøre helgetillegg. */
const calendarWeekday = (minute: number): number => mod7(Math.floor((minute + BALANCE.startMinuteOfDay) / MIN_PER_DAY))

/** Spillminuttet vakta som går nå, startet. */
export const shiftStartAt = (minute: number): number => Math.floor(minute / MIN_PER_SHIFT) * MIN_PER_SHIFT

/** Starten på vakta som går nå, eller neste gang vakta `shift` kommer. */
export function shiftStartFor(minute: number, shift: ShiftId): number {
  let start = shiftStartAt(minute)
  for (let k = 0; k < SHIFT_ORDER.length; k++, start += MIN_PER_SHIFT) if (shiftAt(start) === shift) return start
  return start
}

/**
 * Helgevakt: vakta der flest timer faller på lørdag eller søndag, slik helgetillegget
 * regnes (lørdag 00:00 – søndag 24:00). Fredagsnatta er derfor helg, søndagsnatta ikke.
 */
export const isWeekendShift = (shiftStart: number): boolean => calendarWeekday(shiftStart + MIN_PER_SHIFT / 2) >= 5

export interface TimeInfo {
  /** Vaktdøgn nr. */
  day: number
  /** 0 = mandag … 6 = søndag (for vaktdøgnet). */
  weekday: number
  weekdayName: Weekday
  shift: ShiftId
  /** Vakta som går, er en helgevakt. */
  weekend: boolean
  clock: string
}

/** Alt klokkevisningen trenger om et tidspunkt. */
export function getTimeInfo(minute: number): TimeInfo {
  return {
    day: dayNumber(minute),
    weekday: weekdayIndex(minute),
    weekdayName: weekdayName(minute),
    shift: shiftAt(minute),
    weekend: isWeekendShift(shiftStartAt(minute)),
    clock: formatClock(minute),
  }
}

export function formatClock(minute: number): string {
  const m = minuteOfDay(minute)
  const hh = Math.floor(m / 60)
  const mm = Math.floor(m % 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export const gameMinutesToRealMs = (gameMinutes: number): number =>
  (gameMinutes / BALANCE.gameMinutesPerRealSecond) * 1000

export const realMsToGameMinutes = (ms: number): number => (ms / 1000) * BALANCE.gameMinutesPerRealSecond

/** Reelle millisekunder per simuleringssteg. */
export const STEP_MS = gameMinutesToRealMs(BALANCE.stepMin)

/**
 * Jevnt løpende spillminutt for visning: motorens minutt pluss tiden som er
 * gått inn i neste steg. Påvirker aldri simuleringen.
 */
export function liveMinute(state: { minute: number; lastTickAt: number }, nowMs: number): number {
  const into = realMsToGameMinutes(Math.max(0, nowMs - state.lastTickAt))
  return state.minute + Math.min(BALANCE.stepMin, into)
}

/** ISO-uke, f.eks. «2026-W48» (UTC). */
export function isoWeekKey(ms: number): string {
  const d = new Date(ms)
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export const isoWeekNumber = (weekKey: string): number => Number(weekKey.split('-W')[1] ?? 1)

/** Sesong-id for Tilsynspasset: «2026-11». */
export function seasonId(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Ms igjen til neste mandag 00:00 UTC. */
export function msUntilNextWeek(ms: number): number {
  const d = new Date(ms)
  const day = d.getUTCDay() || 7
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (8 - day))
  return next - ms
}

/** Ms igjen til første dag i neste måned (UTC). */
export function msUntilNextSeason(ms: number): number {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - ms
}

// ---------- Norsk kalenderdag (for daglig innsjekk) ----------

let osloFormat: Intl.DateTimeFormat | null = null

/**
 * Dagnummer for datoen i Norge (Europe/Oslo) – likt uansett hvilken tidssone
 * enheten eller serveren står i. To påfølgende datoer har nummer n og n + 1.
 */
export function osloDayIndex(ms: number): number {
  osloFormat ??= new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' })
  const parts = osloFormat.formatToParts(new Date(ms))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return Math.floor(Date.UTC(get('year'), get('month') - 1, get('day')) / 86_400_000)
}

/** ISO-uka den norske datoen ligger i. */
export const osloWeekKey = (ms: number): string => isoWeekKey(osloDayIndex(ms) * 86_400_000 + 43_200_000)
