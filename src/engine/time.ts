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

export function formatClock(minute: number): string {
  const m = minuteOfDay(minute)
  const hh = Math.floor(m / 60)
  const mm = Math.floor(m % 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export const gameMinutesToRealMs = (gameMinutes: number): number =>
  (gameMinutes / BALANCE.gameMinutesPerRealSecond) * 1000

export const realMsToGameMinutes = (ms: number): number => (ms / 1000) * BALANCE.gameMinutesPerRealSecond

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
