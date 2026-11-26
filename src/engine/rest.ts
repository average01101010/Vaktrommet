import { SHIFT_ORDER } from '@/data/balance'
import type { GameState, RestBreach, ShiftId, StaffId } from '@/types'
import { canWork } from './absence'

/**
 * Hviletid etter arbeidsmiljøloven § 10-8: minst 11 timer sammenhengende fri
 * mellom to arbeidsperioder. Turnusen gjentas hvert døgn, så to vakter i
 * turnusen betyr 16 timer på og 8 timer fri – hver dag.
 */

/**
 * Vaktene den ansatte faktisk går: plassene i turnusen hen kan jobbe på,
 * pluss ekstravakter hen har tatt for å dekke et hull.
 */
export function shiftsWorked(state: Pick<GameState, 'roster' | 'staff' | 'gaps' | 'minute'>, id: StaffId, slots: number): ShiftId[] {
  const s = state.staff[id]
  if (!s) return []
  const worked = new Set<ShiftId>()
  for (const shift of SHIFT_ORDER) {
    if (state.roster[shift].slice(0, slots).includes(id) && canWork(s, shift, state.minute)) worked.add(shift)
  }
  for (const g of state.gaps) if (g.cover === 'overtid' && g.coverId === id && canWork(s, g.shift, state.minute)) worked.add(g.shift)
  return SHIFT_ORDER.filter((sh) => worked.has(sh))
}

/**
 * Hvilket brudd en kombinasjon av vakter gir:
 * - natt sammen med en annen vakt: dobbeltvakt, 16 timer i strekk gjennom natta;
 * - aften og dag: kort hviletid, fri fra 23:00 til 07:00.
 */
export function restBreachOf(shifts: readonly ShiftId[]): RestBreach | null {
  if (shifts.length < 2) return null
  if (shifts.includes('natt')) return 'dobbel'
  if (shifts.includes('dag') && shifts.includes('aften')) return 'kort'
  return null
}

/** Bruddet en ansatt har med turnusen slik den står nå. */
export const restBreachFor = (state: Pick<GameState, 'roster' | 'staff' | 'gaps' | 'minute'>, id: StaffId, slots: number): RestBreach | null =>
  restBreachOf(shiftsWorked(state, id, slots))

/** Kort forklaring til turnusplanleggeren. */
export function restBreachText(kind: RestBreach, shifts: readonly ShiftId[]): string {
  if (kind === 'kort') return 'Aften og dag: fri fra 23:00 til 07:00 – bare 8 timer, loven krever 11.'
  const other = shifts.find((s) => s !== 'natt')
  return other === 'aften'
    ? 'Aften og natt: 16 timer i strekk fra 15:00 til 07:00, og bare 8 timer fri.'
    : 'Natt og dag: 16 timer i strekk fra 23:00 til 15:00, og bare 8 timer fri.'
}
