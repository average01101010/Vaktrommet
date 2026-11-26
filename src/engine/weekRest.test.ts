import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/data/balance'
import type { GameState } from '@/types'
import { startAbsence, syncGaps } from './absence'
import { assignStaff, resolveGap, vikarCost } from './actions'
import { modifiersFor } from './modifiers'
import { restBreachFor, restBreachOf, shiftsWorked } from './rest'
import { createInitialState, simulate } from './simulation'
import { evaluateShift } from './synergy'
import { getTimeInfo, isWeekendShift, shiftStartFor, weekdayName } from './time'

const T0 = Date.UTC(2026, 10, 25, 8)
const HOUR = 60
const DAY = 24 * HOUR
/** Døgn n (1 = mandag), timer etter vaktdøgnets start kl. 07:00. */
const at = (day: number, hours = 1) => (day - 1) * DAY + hours * HOUR

const fresh = (minute = 0): GameState => {
  const s = createInitialState(T0, 1234)
  s.dilemmas.active = []
  s.dilemmas.nextAt = 100_000_000
  s.minute = minute
  return s
}
const mods = (s: GameState) => modifiersFor(s)
const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  if (!r.ok) throw new Error((r as unknown as { reason: string }).reason)
  return r as Extract<T, { ok: true }>
}

describe('ukedag og helg', () => {
  it('døgn 1 er mandag, og uka går rundt', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 14, 15].map((d) => weekdayName(at(d)))).toEqual([
      'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag', 'Mandag', 'Søndag', 'Mandag',
    ])
    expect(getTimeInfo(at(6, 3))).toMatchObject({ day: 6, weekday: 5, weekdayName: 'Lørdag', shift: 'dag', weekend: true, clock: '10:00' })
    // Ukedagen følger vaktdøgnet: lørdagsnatt klokka tre er fortsatt «lørdag».
    expect(getTimeInfo(at(6, 20))).toMatchObject({ weekdayName: 'Lørdag', shift: 'natt', clock: '03:00' })
  })

  it('helgevakter er de som for det meste ligger mellom lørdag 00:00 og søndag 24:00', () => {
    const weekend = (day: number, shift: 0 | 1 | 2) => isWeekendShift(at(day, shift * 8))
    // Fredag: dag og aften er hverdag, natta (23–07) er helg.
    expect([weekend(5, 0), weekend(5, 1), weekend(5, 2)]).toEqual([false, false, true])
    expect([weekend(6, 0), weekend(6, 1), weekend(6, 2)]).toEqual([true, true, true])
    // Søndagsnatta er for det meste mandag.
    expect([weekend(7, 0), weekend(7, 1), weekend(7, 2)]).toEqual([true, true, false])
    expect([1, 2, 3, 4].every((d) => !weekend(d, 0) && !weekend(d, 1) && !weekend(d, 2))).toBe(true)
  })

  it('planlagte vakter vurderes for den dagen de faktisk går', () => {
    // Fredag aften: neste natt er fredagsnatt (helg), neste dag er lørdag.
    const fridayEvening = at(5, 9)
    expect(shiftStartFor(fridayEvening, 'aften')).toBe(at(5, 8))
    expect(shiftStartFor(fridayEvening, 'natt')).toBe(at(5, 16))
    expect(shiftStartFor(fridayEvening, 'dag')).toBe(at(6, 0))
    const s = fresh(fridayEvening)
    expect(evaluateShift(s, 'aften', mods(s)).weekend).toBe(false)
    expect(evaluateShift(s, 'natt', mods(s)).weekend).toBe(true)
    expect(evaluateShift(s, 'dag', mods(s)).weekend).toBe(true)
  })

  it('helgetillegg: +25 % lønn på helgevakter, også for vikar', () => {
    const monday = fresh(at(1))
    const saturday = fresh(at(6))
    const weekday = evaluateShift(monday, 'dag', mods(monday))
    const weekend = evaluateShift(saturday, 'dag', mods(saturday))
    expect(weekday.weekend).toBe(false)
    expect(weekend.weekend).toBe(true)
    expect(weekend.rates.wages).toBeCloseTo(weekday.rates.wages * (1 + BALANCE.weekendWageBonus), 6)
    expect(BALANCE.weekendWageBonus).toBe(0.25)

    for (const s of [monday, saturday]) {
      startAbsence(s, s.staff.s1, 'egenmelding', 1)
      syncGaps(s, mods(s))
    }
    expect(vikarCost(saturday, saturday.gaps[0])).toBeGreaterThan(vikarCost(monday, monday.gaps[0]) * 1.2)
  })

  it('helgedrift: mindre dokumentasjon, mer miljøarbeid og ro', () => {
    const weekday = evaluateShift(fresh(at(3)), 'dag', mods(fresh()))
    const weekend = evaluateShift(fresh(at(7)), 'dag', mods(fresh()))
    expect(weekend.demand.dokumentasjon).toBeCloseTo(weekday.demand.dokumentasjon * 0.75, 6)
    expect(weekend.demand.miljoterapi).toBeCloseTo(weekday.demand.miljoterapi * 1.15, 6)
    expect(weekend.demand.deeskalering).toBeCloseTo(weekday.demand.deeskalering * 1.15, 6)
    expect(weekend.demand.medikament).toBeCloseTo(weekday.demand.medikament, 6)
  })

  it('«Trygg helgebemanning» når dag og aften er fulle, med sykepleier og uten hviletidsbrudd', () => {
    const secure = (minute: number): GameState => {
      const s = fresh(minute)
      s.roster.dag = ['s1', 's3', 's5', null, null]
      s.roster.aften = ['s2', 's6', 's4', null, null]
      s.roster.natt = [null, null, null, null, null]
      s.staff.s2.profession = 'sykepleier'
      return s
    }
    const ids = (s: GameState, shift: 'dag' | 'aften') => evaluateShift(s, shift, mods(s)).synergies.map((x) => x.id)
    expect(ids(secure(at(6)), 'dag')).toContain('helgebemanning')
    expect(ids(secure(at(6, 9)), 'aften')).toContain('helgebemanning')
    // Ikke på hverdager …
    expect(ids(secure(at(3)), 'dag')).not.toContain('helgebemanning')
    // … ikke uten sykepleier på aften …
    const noNurse = secure(at(6))
    noNurse.staff.s2.profession = 'helsefagarbeider'
    expect(ids(noNurse, 'dag')).not.toContain('helgebemanning')
    // … ikke med et åpent hull – men et hull dekket av vikar er greit.
    const gap = secure(at(6))
    gap.resources.budget = 9000
    startAbsence(gap, gap.staff.s6, 'egenmelding', 1)
    syncGaps(gap, mods(gap))
    expect(ids(gap, 'dag')).not.toContain('helgebemanning')
    expect(ids(ok(resolveGap(gap, gap.gaps[0].id, { cover: 'vikar' })).state, 'dag')).toContain('helgebemanning')
    // … og ikke når noen på helgeteamet bryter hviletiden.
    const tired = secure(at(6))
    tired.roster.aften[2] = 's1'
    expect(ids(tired, 'dag')).not.toContain('helgebemanning')
  })
})

describe('hviletid (AML § 10-8)', () => {
  it('klassifiserer kombinasjonene av vakter', () => {
    expect(restBreachOf([])).toBeNull()
    expect(restBreachOf(['dag'])).toBeNull()
    expect(restBreachOf(['dag', 'aften'])).toBe('kort')
    expect(restBreachOf(['aften', 'natt'])).toBe('dobbel')
    expect(restBreachOf(['dag', 'natt'])).toBe('dobbel')
  })

  it('aften og dag gir kort hviletid: advarsel, −5 % trivselsmål og mer avvik', () => {
    const s = fresh(at(2))
    expect(restBreachFor(s, 's1', 3)).toBeNull()
    const before = evaluateShift(s, 'dag', mods(s))
    expect(before.restBreaches).toEqual([])
    expect(before.synergies.map((x) => x.id)).not.toContain('hviletid')

    const r = ok(assignStaff(s, 'aften', 2, 's1'))
    expect(shiftsWorked(r.state, 's1', 3)).toEqual(['dag', 'aften'])
    expect(restBreachFor(r.state, 's1', 3)).toBe('kort')
    const after = evaluateShift(r.state, 'dag', mods(r.state))
    expect(after.restBreaches).toEqual([{ staffId: 's1', kind: 'kort', shifts: ['dag', 'aften'] }])
    expect(after.synergies.map((x) => x.id)).toContain('hviletid')
    expect(after.trivselTarget).toBeCloseTo(before.trivselTarget * 0.95, 6)
    expect(after.rates.avvik).toBeCloseTo(before.rates.avvik * 1.1, 6)
    // Det er den samme vakta – bare bruddet skiller.
    expect(after.coverage).toBeCloseTo(before.coverage, 9)
  })

  it('dobbeltvakt gjennom natta straffes tydeligere enn kort hviletid', () => {
    const s = fresh(at(2, 17))
    const before = evaluateShift(s, 'natt', mods(s))
    const r = ok(assignStaff(s, 'aften', 2, 's4'))
    expect(restBreachFor(r.state, 's4', 3)).toBe('dobbel')
    const after = evaluateShift(r.state, 'natt', mods(r.state))
    expect(after.synergies.map((x) => x.id)).toContain('dobbeltvakt')
    expect(after.synergies.map((x) => x.id)).not.toContain('hviletid')
    expect(after.trivselTarget).toBeCloseTo(before.trivselTarget * 0.9, 6)
    expect(after.rates.avvik).toBeCloseTo(before.rates.avvik * 1.25, 6)
    expect(BALANCE.restDoubleStress).toBeGreaterThan(BALANCE.restShortStress)
    expect(BALANCE.restDoubleRecovery).toBeLessThan(BALANCE.restShortRecovery)
  })

  it('kort hviletid gir +2,5 stress per time på vakt for den det gjelder', () => {
    const base = fresh(at(2))
    for (const id of base.staffOrder) base.staff[id].stress = 20
    const withBreach = ok(assignStaff(base, 'aften', 2, 's1')).state
    const hours = 4
    const normal = simulate(base, hours * HOUR).state
    const breached = simulate(withBreach, hours * HOUR).state
    const extra = breached.staff.s1.stress - normal.staff.s1.stress
    expect(extra).toBeCloseTo(BALANCE.restShortStress * hours, 0)
    // Kollegaene på samme vakt får bare følgene av synergien, ikke den personlige straffen.
    expect(breached.staff.s3.stress - normal.staff.s3.stress).toBeLessThan(1)
  })

  it('og dårligere restitusjon når hen har fri', () => {
    // Natt: s1 (dag + aften) har fri og skal hente seg inn.
    const base = fresh(at(2, 16))
    base.staff.s1.energy = 20
    base.staff.s1.stress = 60
    const breached = ok(assignStaff(base, 'aften', 2, 's1')).state
    const normal = simulate(base, 6 * HOUR).state.staff.s1
    const tired = simulate(breached, 6 * HOUR).state.staff.s1
    const gain = (m: typeof normal) => m.energy - 20
    expect(gain(tired)).toBeCloseTo(gain(normal) * BALANCE.restShortRecovery, 1)
    expect(tired.stress).toBeGreaterThan(normal.stress)
  })

  it('ekstravakt teller med, og den som er borte eller gradert, har ikke brudd', () => {
    const s = fresh(at(2, 9))
    s.resources.budget = 9000
    startAbsence(s, s.staff.s2, 'egenmelding', 1)
    syncGaps(s, mods(s))
    // s3 står på dag og tar ekstravakt på aften.
    const r = ok(resolveGap(s, s.gaps[0].id, { cover: 'overtid', staffId: 's3' }))
    expect(shiftsWorked(r.state, 's3', 3)).toEqual(['dag', 'aften'])
    expect(evaluateShift(r.state, 'aften', mods(r.state)).restBreaches.map((b) => b.staffId)).toContain('s3')

    // Står på to vakter, men er sykmeldt: ikke på jobb, ikke noe brudd.
    const sick = ok(assignStaff(fresh(at(2)), 'aften', 2, 's1')).state
    startAbsence(sick, sick.staff.s1, 'langtidssyk', 10)
    expect(restBreachFor(sick, 's1', 3)).toBeNull()
  })
})
