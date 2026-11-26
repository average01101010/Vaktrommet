import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/data/balance'
import { DILEMMA_BY_ID } from '@/data/dilemmas'
import type { GameState } from '@/types'
import { avvikCheckStatus, openAvvikInspectionPenalty, openAvvikTrivselPenalty } from './avvik'
import { avvikCloseCost, holdNextOfKinMeeting, meetingCooldown, meetingCost, resolveAvvik, resolveDilemma, rotateWard } from './actions'
import { migrateGameState } from './migrate'
import { modifiersFor } from './modifiers'
import { createInitialState, simulate, STATE_VERSION } from './simulation'
import { evaluateShift } from './synergy'

const T0 = Date.UTC(2026, 10, 25, 8)
const HOUR = 60
const fresh = (): GameState => {
  const s = createInitialState(T0, 1234)
  s.dilemmas.active = []
  s.dilemmas.nextAt = 100_000_000
  s.resources.fagpoeng = 5000
  return s
}
const mods = (s: GameState) => modifiersFor(s)
const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  if (!r.ok) throw new Error((r as unknown as { reason: string }).reason)
  return r as Extract<T, { ok: true }>
}
/** Kjører én hel vakt fra vaktstart og gir vaktrapportens tilsynspoeng. */
function shiftScore(s: GameState): number {
  return simulate(s, 8 * HOUR).state.shift.last!.inspectionScore
}

describe('ulukkede avvik', () => {
  it('nye avvik i simuleringen øker både totalen og de ulukkede', () => {
    const s = fresh()
    s.ward.avvikProgress = 0.99
    const after = simulate(s, 15).state
    expect(after.ward.avvik).toBe(1)
    expect(after.ward.openAvvik).toBe(1)
    // Over tid følges de to tallene ad, så lenge ingen lukkes.
    const long = simulate(fresh(), 6 * 24 * HOUR).state
    expect(long.ward.avvik).toBeGreaterThan(0)
    expect(long.ward.openAvvik).toBe(long.ward.avvik)
  })

  it('et uheldig dilemmavalg melder avvik; et avvik som lukkes i et dilemma, teller ned de ulukkede', () => {
    const s = fresh()
    s.dilemmas.active = [{ uid: 9, defId: 'avvikskultur', postedAt: 0, tilt: 0 }]
    const bad = DILEMMA_BY_ID.avvikskultur.options.find((o) => o.id === 'glem_det')!
    const r = ok(resolveDilemma(s, 9, bad.id))
    expect(r.state.ward.avvik).toBe(bad.effect.avvik)
    expect(r.state.ward.openAvvik).toBe(bad.effect.avvik)

    // Et valg med negativt avvik lukker et avvik, men sletter ikke registreringen.
    const id = Object.values(DILEMMA_BY_ID).find((d) => d.options.some((o) => (o.effect.avvik ?? 0) < 0))!
    const closing = id.options.find((o) => (o.effect.avvik ?? 0) < 0)!
    const t = fresh()
    Object.assign(t.ward, { avvik: 4, openAvvik: 3 })
    t.dilemmas.active = [{ uid: 10, defId: id.id, postedAt: 0, tilt: 0 }]
    for (const sid of t.staffOrder) for (const k of Object.keys(t.staff[sid].skills)) (t.staff[sid].skills as Record<string, number>)[k] = 5
    const r2 = ok(resolveDilemma(t, 10, closing.id))
    expect(r2.state.ward.avvik).toBe(4)
    expect(r2.state.ward.openAvvik).toBe(3 + closing.effect.avvik!)
  })

  it('trekk på tilsyn og i trivselsmålet først over fem ulukkede, gradvis og med tak', () => {
    expect(openAvvikInspectionPenalty(0)).toBe(0)
    expect(openAvvikInspectionPenalty(BALANCE.openAvvikThreshold)).toBe(0)
    expect(openAvvikInspectionPenalty(BALANCE.openAvvikThreshold + 2)).toBe(2 * BALANCE.openAvvikInspectionPenalty)
    expect(openAvvikInspectionPenalty(100)).toBe(BALANCE.openAvvikInspectionMax)
    expect(openAvvikTrivselPenalty(BALANCE.openAvvikThreshold)).toBe(0)
    expect(openAvvikTrivselPenalty(BALANCE.openAvvikThreshold + 4)).toBeCloseTo(4 * BALANCE.openAvvikTrivselPer, 9)
    expect(openAvvikTrivselPenalty(100)).toBe(BALANCE.openAvvikTrivselMax)

    const s = fresh()
    const base = evaluateShift(s, 'dag', mods(s)).trivselTarget
    s.ward.openAvvik = BALANCE.openAvvikThreshold + 5
    expect(evaluateShift(s, 'dag', mods(s)).trivselTarget).toBeCloseTo(base - 5 * BALANCE.openAvvikTrivselPer, 6)
  })

  it('ulukkede avvik trekker tilsynspoengene for vakta', () => {
    const clean = fresh()
    const messy = fresh()
    messy.ward.openAvvik = BALANCE.openAvvikThreshold + 4
    const diff = shiftScore(clean) - shiftScore(messy)
    // Trekket er 2,5 poeng per avvik over terskelen (litt mer om trivselen gir et ekstra avvik).
    expect(diff).toBeGreaterThanOrEqual(4 * BALANCE.openAvvikInspectionPenalty - 0.01)
    expect(diff).toBeLessThan(4 * BALANCE.openAvvikInspectionPenalty + BALANCE.inspectionAvvikPenalty * 2 + 0.01)
  })

  it('sjekkpunktet «Avvik meldes og lukkes» er grønt opp til to, gult opp til fem og rødt over', () => {
    expect([0, 1, 2, 3, 5, 6, 12].map(avvikCheckStatus)).toEqual(['ok', 'ok', 'ok', 'advarsel', 'advarsel', 'kritisk', 'kritisk'])
  })
})

describe('resolveAvvik', () => {
  it('lukker ett avvik: koster Fagpoeng, gir +1 trivsel, tilsynsbonus og en kvittering', () => {
    const s = fresh()
    Object.assign(s.ward, { avvik: 7, openAvvik: 7, trivsel: 50 })
    const cost = avvikCloseCost(s)
    const r = ok(resolveAvvik(s, 1))
    expect(r.closed).toBe(1)
    expect(r.cost).toBe(cost)
    expect(r.state.resources.fagpoeng).toBe(5000 - cost)
    expect(r.state.ward.openAvvik).toBe(6)
    expect(r.state.ward.avvik).toBe(7)
    expect(r.state.ward.trivsel).toBe(51)
    expect(r.state.shift.current.inspectionBonus).toBe(BALANCE.avvikCloseInspectionBonus)
    expect(r.state.events[0]).toMatchObject({ kind: 'avvik', text: expect.stringMatching(/^Avvik lukket/) })
  })

  it('«Behandle alle» lukker hele haugen; trivselen stopper på 100', () => {
    const s = fresh()
    Object.assign(s.ward, { avvik: 9, openAvvik: 9, trivsel: 95 })
    const r = ok(resolveAvvik(s, 'alle'))
    expect(r.closed).toBe(9)
    expect(r.state.ward.openAvvik).toBe(0)
    expect(r.state.ward.trivsel).toBe(100)
    expect(r.state.resources.fagpoeng).toBe(5000 - 9 * avvikCloseCost(s))
    expect(r.state.events[0].text).toMatch(/^9 avvik lukket/)
  })

  it('koster 15 Fagpoeng på første nivå, og blir billigere med Stille rapport og dokumentasjonskompetanse', () => {
    const s = fresh()
    for (const id of s.staffOrder) s.staff[id].skills.dokumentasjon = 0
    expect(avvikCloseCost(s)).toBe(BALANCE.avvikCloseCost)
    s.upgrades.stillerapport = 2
    const stille = avvikCloseCost(s)
    expect(stille).toBeLessThan(BALANCE.avvikCloseCost)
    s.staff.s1.skills.dokumentasjon = BALANCE.avvikCloseDokMin // s1 står på dagvakta som går
    expect(avvikCloseCost(s)).toBeLessThan(stille)
    // Høyere avdelingsnivå: dyrere, så det fortsatt er et valg.
    const t = fresh()
    for (const id of t.staffOrder) t.staff[id].skills.dokumentasjon = 0
    t.tier = 3
    expect(avvikCloseCost(t)).toBe(BALANCE.avvikCloseCost * 4)
  })

  it('avvises uten ulukkede avvik, med for mange, eller uten nok Fagpoeng', () => {
    const s = fresh()
    expect(resolveAvvik(s, 1).ok).toBe(false)
    Object.assign(s.ward, { avvik: 3, openAvvik: 3 })
    expect(resolveAvvik(s, 4).ok).toBe(false)
    expect(resolveAvvik(s, 0).ok).toBe(false)
    s.resources.fagpoeng = avvikCloseCost(s) * 3 - 1
    expect(resolveAvvik(s, 'alle').ok).toBe(false)
    expect(resolveAvvik(s, 2).ok).toBe(true)
  })

  it('lukkede avvik teller mot Ukens tilsyn, med et tak per vakt', () => {
    const before = fresh()
    Object.assign(before.ward, { avvik: 5, openAvvik: 5 })
    const closed = ok(resolveAvvik(before, 'alle')).state
    expect(shiftScore(closed) - shiftScore(before)).toBeCloseTo(5 * BALANCE.avvikCloseInspectionBonus, 0)
    // Tak: mange lukkede på én vakt gir ikke mer enn maksbonusen.
    const many = fresh()
    Object.assign(many.ward, { avvik: 40, openAvvik: 40 })
    many.resources.fagpoeng = 100_000
    const all = ok(resolveAvvik(many, 'alle')).state
    expect(all.shift.current.inspectionBonus).toBe(40 * BALANCE.avvikCloseInspectionBonus)
    const reference = fresh()
    expect(shiftScore(all) - shiftScore(reference)).toBeLessThanOrEqual(BALANCE.inspectionBonusMax + 0.01)
  })
})

describe('holdNextOfKinMeeting', () => {
  it('koster Fagpoeng, gir stress på vakta, +6 trivsel og tilsynspoeng når trivselen er under 80', () => {
    const s = fresh()
    s.ward.trivsel = 55
    const ev = evaluateShift(s, 'dag', mods(s))
    const cost = meetingCost(s)
    const r = ok(holdNextOfKinMeeting(s))
    expect(r.state.resources.fagpoeng).toBe(5000 - cost)
    expect(r.state.ward.trivsel).toBe(55 + BALANCE.meetingTrivsel)
    expect(r.inspectionBonus).toBe(BALANCE.meetingInspectionBonus)
    expect(r.state.shift.current.inspectionBonus).toBe(BALANCE.meetingInspectionBonus)
    for (const id of ev.present) expect(r.state.staff[id].stress).toBe(Math.min(100, s.staff[id].stress + BALANCE.meetingStress))
    // De som har fri, merker ingenting.
    const offDuty = s.staffOrder.find((id) => !ev.present.includes(id))!
    expect(r.state.staff[offDuty].stress).toBe(s.staff[offDuty].stress)
    expect(r.state.events[0]).toMatchObject({ kind: 'paaroerende' })
  })

  it('gir ikke tilsynspoeng når trivselen allerede er høy, og trivselen stopper på 100', () => {
    const s = fresh()
    s.ward.trivsel = 97
    const r = ok(holdNextOfKinMeeting(s))
    expect(r.inspectionBonus).toBe(0)
    expect(r.state.ward.trivsel).toBe(100)
  })

  it('kan holdes én gang per 24 spilltimer', () => {
    const s = fresh()
    const r = ok(holdNextOfKinMeeting(s))
    expect(meetingCooldown(r.state)).toBe(24 * HOUR)
    expect(holdNextOfKinMeeting(r.state)).toMatchObject({ ok: false, reason: expect.stringContaining('24 spilltimer') })
    const later = simulate(r.state, 23 * HOUR).state
    expect(holdNextOfKinMeeting(later).ok).toBe(false)
    const ready = simulate(r.state, 24 * HOUR).state
    expect(meetingCooldown(ready)).toBe(0)
    expect(holdNextOfKinMeeting(ready).ok).toBe(true)
  })

  it('avvises uten nok Fagpoeng', () => {
    const s = fresh()
    s.resources.fagpoeng = meetingCost(s) - 1
    expect(holdNextOfKinMeeting(s).ok).toBe(false)
  })
})

describe('migrering og ny avdeling', () => {
  it('eldre lagringer får ulukkede avvik og pårørendesamtale – eldre avvik regnes som behandlet', () => {
    const old = JSON.parse(JSON.stringify(fresh())) as Record<string, any>
    old.version = 7
    old.ward = { trivsel: 61, avvik: 23, avvikProgress: 0.4, residentCounter: 9 }
    delete old.shift.current.inspectionBonus
    const m = migrateGameState(old, T0)
    expect(m.version).toBe(STATE_VERSION)
    expect(STATE_VERSION).toBe(8)
    expect(m.ward).toMatchObject({ trivsel: 61, avvik: 23, openAvvik: 0, nextOfKinReadyAt: 0 })
    expect(m.shift.current.inspectionBonus).toBe(0)
    expect(holdNextOfKinMeeting({ ...m, resources: { ...m.resources, fagpoeng: 5000 } }).ok).toBe(true)
    expect(migrateGameState(JSON.parse(JSON.stringify(m)), T0)).toEqual(m)
  })

  it('skadede verdier ryddes', () => {
    const broken = JSON.parse(JSON.stringify(fresh())) as Record<string, any>
    broken.ward.openAvvik = -4.7
    broken.ward.nextOfKinReadyAt = broken.minute + 999_999
    const m = migrateGameState(broken, T0)
    expect(m.ward.openAvvik).toBe(0)
    expect(meetingCooldown(m)).toBeLessThanOrEqual(24 * HOUR)
  })

  it('en ny avdeling starter uten ulukkede avvik', () => {
    const s = fresh()
    s.tier = 5
    Object.assign(s.ward, { avvik: 12, openAvvik: 8, nextOfKinReadyAt: s.minute + 600 })
    const r = ok(rotateWard(s, { wardType: 'demens', keepStaff: [] }))
    expect(r.state.ward).toMatchObject({ avvik: 0, openAvvik: 0, nextOfKinReadyAt: 0 })
  })
})
