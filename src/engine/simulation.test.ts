import { describe, expect, it } from 'vitest'
import { BALANCE, INSPECTION_TIERS, RARITY } from '@/data/balance'
import { DILEMMAS } from '@/data/dilemmas'
import { BANNERS } from '@/data/economy'
import { SKILL_ORDER } from '@/data/professions'
import { RESIDENT_PROFILES } from '@/data/residents'
import { WARD_TYPES } from '@/data/wards'
import type { GameState, SkillId, StaffMember } from '@/types'
import {
  assignStaff,
  buyUpgrade,
  canRotate,
  claimInspectionTier,
  exportSave,
  grantPurchase,
  importSave,
  parseSave,
  recruit,
  resetGame,
  resolveDilemma,
  restorePurchases,
  rotateWard,
  rotationPreview,
  startCourse,
  timeSkip,
  unassignSlot,
  updateProfile,
  updateSettings,
  validateWardName,
} from './actions'
import { migrateGameState } from './migrate'
import { bedsFor, maxSkillLevelFor, modifiersFor, tierThreshold } from './modifiers'
import { upcomingNotifications } from './notifications'
import { computeDemand, syncResidents } from './residents'
import { careerStats, driftScore, qualityIndex } from './scoring'
import { catchUp, createInitialState, defaultSettings, inspectionAverage, simulate, STATE_VERSION } from './simulation'
import { emptySkills } from './staffFactory'
import { evaluateShift } from './synergy'
import { liveMinute, shiftAt, STEP_MS } from './time'

const T0 = Date.UTC(2026, 10, 25, 8, 0, 0)
const HOUR = 3_600_000
const DAY = 24 * 60
const fresh = (): GameState => createInitialState(T0, 1234)
const mods = (s: GameState) => modifiersFor(s)

/** En enkel ansatt med akkurat de egenskapene testen trenger. */
function staffWith(id: string, profession: StaffMember['profession'], skills: Partial<Record<SkillId, number>>): StaffMember {
  return {
    id,
    name: `Test ${id}`,
    profession,
    rarity: 'vanlig',
    skills: { ...emptySkills(), ...skills },
    stamina: 80,
    energy: 80,
    stress: 10,
    level: 1,
    xp: 0,
    trait: null,
    sickUntil: null,
    course: null,
    avatar: { skin: 0, hair: 0, hairStyle: 0, accessory: 0 },
    badgeNo: '00000',
    hiredAt: 0,
  }
}

/** Bytter ut dagvakta med gitte ansatte. */
function withDayShift(base: GameState, staff: StaffMember[]): GameState {
  const s = structuredClone(base)
  for (const m of staff) {
    s.staff[m.id] = m
    if (!s.staffOrder.includes(m.id)) s.staffOrder.push(m.id)
  }
  s.roster.dag = [...staff.map((m) => m.id), null, null, null, null, null].slice(0, 5)
  return s
}

describe('tid og vakter', () => {
  it('deler døgnet i dag, aften og natt', () => {
    expect(shiftAt(0)).toBe('dag')
    expect(shiftAt(479)).toBe('dag')
    expect(shiftAt(480)).toBe('aften')
    expect(shiftAt(960)).toBe('natt')
    expect(shiftAt(1440)).toBe('dag')
  })

  it('UI-klokka interpolerer mellom stegene uten å passere neste steg', () => {
    const s = fresh()
    expect(liveMinute(s, T0)).toBe(0)
    expect(liveMinute(s, T0 + STEP_MS / 2)).toBeCloseTo(BALANCE.stepMin / 2)
    expect(liveMinute(s, T0 + STEP_MS * 5)).toBe(BALANCE.stepMin)
  })
})

describe('deterministisk tid', () => {
  it('bruker én fast steglengde', () => {
    const r = simulate(fresh(), 100)
    expect(r.simulated).toBe(90)
    expect(r.state.minute).toBe(90)
    expect(simulate(fresh(), 5 * DAY).state.minute % BALANCE.stepMin).toBe(0)
  })

  it('gir samme resultat for samme seed og tid', () => {
    expect(simulate(fresh(), 5 * DAY).state).toEqual(simulate(fresh(), 5 * DAY).state)
  })

  it('rører ikke input-tilstanden', () => {
    const s = fresh()
    const snapshot = structuredClone(s)
    simulate(s, 600)
    expect(s).toEqual(snapshot)
  })

  it('sekund-for-sekund gir nøyaktig samme tilstand som én lang innhenting', () => {
    const total = 40 * 60 * 1000 // 40 minutter = 6–7 døgn i spillet
    let ticked = fresh()
    for (let t = 1000; t <= total; t += 1000) ticked = catchUp(ticked, T0 + t).state
    const once = catchUp(fresh(), T0 + total).state
    expect(ticked).toEqual(once)
  })

  it('er uavhengig av hvor ujevnt klienten ticker', () => {
    const end = T0 + 25 * 60 * 1000
    let a = fresh()
    for (const t of [137, 4_211, 60_003, 61_000, 400_777, 1_499_999, 1_500_000]) a = catchUp(a, T0 + t).state
    expect(a).toEqual(catchUp(fresh(), end).state)
  })

  it('returnerer samme objekt når ingen hele steg har gått', () => {
    const s = fresh()
    expect(catchUp(s, T0 + STEP_MS - 1).state).toBe(s)
    const next = catchUp(s, T0 + STEP_MS).state
    expect(next.minute).toBe(BALANCE.stepMin)
    expect(next.lastTickAt).toBe(T0 + STEP_MS)
  })

  it('begrenser fravær til 8 timer uten VIP og 24 timer med', () => {
    const free = catchUp(fresh(), T0 + 20 * HOUR)
    expect(free.report?.capped).toBe(true)
    expect(free.report?.capHours).toBe(8)
    expect(free.state.minute).toBe(8 * 3600 * BALANCE.gameMinutesPerRealSecond)
    expect(free.state.lastTickAt).toBe(T0 + 20 * HOUR)

    const vipState = fresh()
    vipState.monetization.vip = true
    const vip = catchUp(vipState, T0 + 20 * HOUR)
    expect(vip.report?.capped).toBe(false)
    expect(vip.state.minute).toBe(20 * 3600 * BALANCE.gameMinutesPerRealSecond)
    expect(vip.report!.fagpoeng).toBeGreaterThan(free.report!.fagpoeng * 1.5)
  })

  it('gir ingen progresjon hvis klokka er stilt tilbake', () => {
    const s = fresh()
    const r = catchUp(s, T0 - 5 * HOUR)
    expect(r.state.minute).toBe(0)
    expect(r.state.resources).toEqual(s.resources)
    expect(r.state.lastTickAt).toBe(T0 - 5 * HOUR)
  })

  it('nullstiller tilsynet når en ny uke starter', () => {
    const s = fresh()
    s.monetization.vip = true
    const r = catchUp(s, T0 + 6 * HOUR)
    expect(r.state.inspection.shifts).toBeGreaterThan(0)
    const nextWeek = catchUp(r.state, T0 + 8 * 24 * HOUR)
    expect(nextWeek.state.inspection.weekKey).not.toBe(s.inspection.weekKey)
  })
})

describe('beboere og behov', () => {
  it('starter med fullt belegg og behov summert fra profilene', () => {
    const s = fresh()
    expect(s.residents).toHaveLength(BALANCE.baseBeds)
    expect(new Set(s.residents.map((r) => r.room)).size).toBe(BALANCE.baseBeds)
    for (const shift of ['dag', 'aften', 'natt'] as const) {
      const demand = computeDemand(s, shift, mods(s))
      for (const skill of SKILL_ORDER) {
        const expected = s.residents.reduce((n, r) => n + RESIDENT_PROFILES[r.profile].demand[shift][skill] * r.tyngde, 0)
        expect(demand[skill]).toBeCloseTo(expected)
      }
    }
  })

  it('behovet følger hvem som faktisk ligger på avdelingen', () => {
    const s = fresh()
    const before = computeDemand(s, 'dag', mods(s))
    const changed = structuredClone(s)
    changed.residents[0] = { ...changed.residents[0], profile: 'saar', tyngde: 1.3 }
    changed.residents[1] = { ...changed.residents[1], profile: 'saar', tyngde: 1.3 }
    changed.residents[2] = { ...changed.residents[2], profile: 'saar', tyngde: 1.3 }
    const after = computeDemand(changed, 'dag', mods(changed))
    expect(after.saarstell).toBeGreaterThan(before.saarstell + 1)

    const demens = structuredClone(s)
    for (const r of demens.residents) r.profile = 'kognitiv'
    const natt = computeDemand(demens, 'natt', mods(demens))
    expect(natt.deeskalering).toBeGreaterThan(natt.grunnstell * 3)
    expect(natt.saarstell).toBe(0)
  })

  it('tyngre beboere gir større behov, og natta krever mindre enn dagen', () => {
    const s = fresh()
    const heavy = structuredClone(s)
    for (const r of heavy.residents) r.tyngde = BALANCE.tyngdeMax
    const light = structuredClone(s)
    for (const r of light.residents) r.tyngde = BALANCE.tyngdeMin
    const sum = (d: Record<SkillId, number>) => SKILL_ORDER.reduce((n, k) => n + d[k], 0)
    expect(sum(computeDemand(heavy, 'dag', mods(s)))).toBeGreaterThan(sum(computeDemand(light, 'dag', mods(s))) * 1.5)
    expect(sum(computeDemand(s, 'natt', mods(s)))).toBeLessThan(sum(computeDemand(s, 'dag', mods(s))) * 0.75)
  })

  it('skriver ut beboere og tar inn nye, så behovet endrer seg over tid', () => {
    const s = fresh()
    const { state, totals } = simulate(s, 60 * DAY)
    expect(totals.discharged).toBeGreaterThan(BALANCE.baseBeds)
    expect(state.residents).toHaveLength(BALANCE.baseBeds)
    const startIds = new Set(s.residents.map((r) => r.id))
    expect(state.residents.every((r) => !startIds.has(r.id))).toBe(true)
    expect(state.residents.every((r) => r.dischargeAt > state.minute)).toBe(true)
    expect(computeDemand(state, 'dag', mods(state))).not.toEqual(computeDemand(s, 'dag', mods(s)))
  })

  it('ny fløy gir flere senger som fylles med en gang', () => {
    const s = fresh()
    s.resources.budget = 10_000_000
    s.tier = 2
    s.upgrades.dognrytmelys = 1
    const r = buyUpgrade(s, 'nyfloy')
    if (!r.ok) throw new Error(r.reason)
    expect(bedsFor(mods(r.state))).toBe(BALANCE.baseBeds + 3)
    expect(r.state.residents).toHaveLength(BALANCE.baseBeds + 3)
  })
})

describe('synergimotoren', () => {
  it('gir tverrfaglig bonus på startlagets dagvakt og straffer natt uten sykepleier', () => {
    const s = fresh()
    const dag = evaluateShift(s, 'dag', mods(s))
    const natt = evaluateShift(s, 'natt', mods(s))
    expect(dag.synergies.map((x) => x.id)).toContain('tverrfaglig')
    expect(dag.synergies.map((x) => x.id)).toContain('medisinrom')
    expect(natt.synergies.map((x) => x.id)).toContain('ingensykepleier')
    expect(dag.coverage).toBeGreaterThan(0.4)
    expect(dag.coverage).toBeLessThan(1)
  })

  it('riktigere bemanning gir bedre dekning, mer Fagpoeng og mindre stress', () => {
    const s = fresh()
    const before = evaluateShift(s, 'natt', mods(s))
    const r = assignStaff(s, 'natt', 1, 's1')
    if (!r.ok) throw new Error(r.reason)
    const after = evaluateShift(r.state, 'natt', mods(r.state))
    expect(after.coverage).toBeGreaterThan(before.coverage)
    expect(after.rates.fagpoeng).toBeGreaterThan(before.rates.fagpoeng)
    expect(after.rates.stress).toBeLessThan(before.rates.stress)
    expect(after.rates.avvik).toBeLessThan(before.rates.avvik)
  })

  it('ubemannet vakt gir ingen Fagpoeng og mange avvik', () => {
    let s = fresh()
    for (let i = 0; i < 3; i++) {
      const r = unassignSlot(s, 'dag', i)
      if (r.ok) s = r.state
    }
    const ev = evaluateShift(s, 'dag', mods(s))
    expect(ev.present).toHaveLength(0)
    expect(ev.rates.fagpoeng).toBe(0)
    expect(ev.rates.avvik).toBeGreaterThan(1)
    expect(ev.synergies.map((x) => x.id)).toContain('tomvakt')
  })

  it('hindrer mer enn to vakter per ansatt', () => {
    const s = fresh()
    const a = assignStaff(s, 'aften', 2, 's1')
    if (!a.ok) throw new Error(a.reason)
    expect(assignStaff(a.state, 'natt', 1, 's1').ok).toBe(false)
  })
})

describe('ingen krysskompensasjon', () => {
  it('overdekning i Stell veier ikke opp for manglende Medisin og Sår', () => {
    const s = fresh()
    const demand = computeDemand(s, 'dag', mods(s))
    // Fem assistenter som bare kan stell: Stell er mer enn dekket, resten udekket.
    const crew = [1, 2, 3, 4, 5].map((i) => staffWith(`x${i}`, 'assistent', { grunnstell: 5 }))
    s.upgrades.nyfloy = 2 // åpner alle fem vaktplassene
    const state = withDayShift(s, crew)
    const ev = evaluateShift(state, 'dag', mods(state), demand)

    expect(ev.supply.grunnstell).toBeGreaterThan(demand.grunnstell * 2)
    expect(ev.coverageBySkill.grunnstell).toBe(1)
    expect(ev.coverageBySkill.medikament).toBe(0)
    expect(ev.coverageBySkill.saarstell).toBe(0)
    const total = SKILL_ORDER.reduce((n, k) => n + demand[k], 0)
    expect(ev.coverage).toBeCloseTo(demand.grunnstell / total)
    expect(ev.workload).toBeGreaterThan(1.5)
  })

  it('mer av en egenskap som allerede er dekket, endrer verken dekning eller Fagpoeng', () => {
    const s = fresh()
    s.upgrades.nyfloy = 2
    const demand = computeDemand(s, 'dag', mods(s))
    const base = [
      staffWith('a', 'sykepleier', { medikament: 3, saarstell: 3, dokumentasjon: 2 }),
      staffWith('b', 'assistent', { grunnstell: 5 }),
      staffWith('c', 'assistent', { grunnstell: 5 }),
      staffWith('d', 'assistent', { grunnstell: 5 }),
    ]
    const without = withDayShift(s, base)
    const withExtra = withDayShift(s, [...base, staffWith('e', 'assistent', { grunnstell: 5 })])
    const a = evaluateShift(without, 'dag', mods(without), demand)
    const b = evaluateShift(withExtra, 'dag', mods(withExtra), demand)
    expect(a.coverageBySkill.grunnstell).toBe(1)
    expect(b.coverage).toBeCloseTo(a.coverage, 10)
    expect(b.workload).toBeCloseTo(a.workload, 10)
    expect(b.rates.budgetNet).toBeLessThan(a.rates.budgetNet) // den ekstra lønna er ren kostnad
    expect(b.utilization).toBeLessThan(a.utilization)
  })

  it('belastningen letter bare når den svakeste egenskapen også er overdekket', () => {
    const s = fresh()
    s.upgrades.nyfloy = 2
    const demand = computeDemand(s, 'dag', mods(s))
    const all = Object.fromEntries(SKILL_ORDER.map((k) => [k, 5])) as Record<SkillId, number>
    const strong = [1, 2, 3, 4, 5].map((i) => staffWith(`s${i}x`, 'sykepleier', all))
    const state = withDayShift(s, strong)
    const ev = evaluateShift(state, 'dag', mods(state), demand)
    expect(ev.coverage).toBe(1)
    expect(ev.workload).toBeLessThan(1)

    const weakOne = structuredClone(strong)
    for (const m of weakOne) m.skills.saarstell = 0
    const gapState = withDayShift(s, weakOne)
    const gap = evaluateShift(gapState, 'dag', mods(gapState), demand)
    expect(gap.coverage).toBeLessThan(1)
    expect(gap.workload).toBeGreaterThan(1)
  })

  it('udekket Medisin slår direkte ut på avvik og trivsel', () => {
    const s = fresh()
    const crew = (med: number) => [
      staffWith('a', 'sykepleier', { medikament: med, saarstell: 4, dokumentasjon: 4, grunnstell: 3 }),
      staffWith('b', 'helsefagarbeider', { grunnstell: 5, ernaering: 5, miljoterapi: 4 }),
      staffWith('c', 'vernepleier', { miljoterapi: 4, deeskalering: 4, dokumentasjon: 3, medikament: med }),
    ]
    const ok = withDayShift(s, crew(4))
    const none = withDayShift(s, crew(0))
    const a = evaluateShift(ok, 'dag', mods(ok))
    const b = evaluateShift(none, 'dag', mods(none))
    expect(b.criticalGap.medikament).toBe(1)
    expect(b.rates.avvik).toBeGreaterThan(a.rates.avvik * 3)
    expect(a.trivselTarget - b.trivselTarget).toBeGreaterThan(BALANCE.trivselCriticalMed)
  })

  it('uten sykepleier halveres Medisin-kapasiteten, vernepleier demper tapet', () => {
    const s = fresh()
    const skills = { medikament: 4, saarstell: 4, grunnstell: 3 }
    const nurse = withDayShift(s, [staffWith('a', 'sykepleier', skills)])
    const hfa = withDayShift(s, [staffWith('a', 'helsefagarbeider', skills)])
    const vpl = withDayShift(s, [staffWith('a', 'vernepleier', skills)])
    const n = evaluateShift(nurse, 'dag', mods(s))
    const h = evaluateShift(hfa, 'dag', mods(s))
    const v = evaluateShift(vpl, 'dag', mods(s))
    expect(n.nurseOnDuty).toBe(true)
    expect(h.nurseOnDuty).toBe(false)
    expect(h.supply.medikament).toBeCloseTo(n.supply.medikament * BALANCE.noNurseMedFactor)
    expect(h.supply.saarstell).toBeCloseTo(n.supply.saarstell * BALANCE.noNurseSaarFactor)
    expect(v.supply.medikament).toBeCloseTo(n.supply.medikament * BALANCE.noNurseMedFactorVernepleier)
    expect(h.supply.grunnstell).toBeCloseTo(n.supply.grunnstell)
    expect(h.rates.avvik).toBeGreaterThan(n.rates.avvik)
  })
})

describe('simulering', () => {
  it('tjener Fagpoeng og budsjett og lager vaktrapport med tilsynspoeng', () => {
    const { state, totals } = simulate(fresh(), 8 * 60)
    expect(totals.fagpoeng).toBeGreaterThan(10)
    expect(totals.budget).toBeGreaterThan(500)
    expect(state.shift.last?.shift).toBe('dag')
    expect(state.shift.last?.inspectionScore).toBeGreaterThan(0)
    expect(state.shift.last?.inspectionScore).toBeLessThanOrEqual(100)
    expect(state.shift.current.shift).toBe('aften')
    expect(state.lifetime.shiftsCompleted).toBe(1)
  })

  it('dobbeltvakter sliter ut folk: lavere energi og mer stress', () => {
    const base = fresh()
    const r = assignStaff(base, 'aften', 2, 's1')
    if (!r.ok) throw new Error(r.reason)
    const single = simulate(base, 16 * 60).state.staff.s1
    const double = simulate(r.state, 16 * 60).state.staff.s1
    expect(double.energy).toBeLessThan(single.energy)
    expect(double.stress).toBeGreaterThan(single.stress)
  })

  it('holder verdier innenfor gyldige grenser over lang tid', () => {
    const { state } = simulate(fresh(), 60 * DAY)
    expect(state.ward.trivsel).toBeGreaterThanOrEqual(0)
    expect(state.ward.trivsel).toBeLessThanOrEqual(100)
    for (const id of state.staffOrder) {
      const s = state.staff[id]
      expect(s.energy).toBeGreaterThanOrEqual(0)
      expect(s.energy).toBeLessThanOrEqual(s.stamina)
      expect(s.stress).toBeGreaterThanOrEqual(0)
      expect(s.stress).toBeLessThanOrEqual(100)
    }
    expect(state.dilemmas.active.length).toBeLessThanOrEqual(BALANCE.dilemmaMaxActive)
    expect(Number.isFinite(state.resources.budget)).toBe(true)
    expect(state.quality.competence).toBeGreaterThan(0)
    expect(state.quality.competence).toBeLessThanOrEqual(1)
  })
})

describe('egenskapstak', () => {
  it('sjeldenhet setter taket, og videreutdanning løfter det', () => {
    const s = fresh()
    expect(maxSkillLevelFor({ rarity: 'vanlig' }, mods(s))).toBe(RARITY.vanlig.maxSkill)
    expect(maxSkillLevelFor({ rarity: 'ildsjel' }, mods(s))).toBe(5)
    s.upgrades.videreutdanning = 2
    expect(maxSkillLevelFor({ rarity: 'vanlig' }, mods(s))).toBe(4)
    s.upgrades.videreutdanning = 5
    expect(maxSkillLevelFor({ rarity: 'vanlig' }, mods(s))).toBe(5)
    expect(maxSkillLevelFor({ rarity: 'spesialist' }, mods(s))).toBe(BALANCE.skillCeiling)
  })

  it('kurs kan ikke løfte en vanlig ansatt over taket uten videreutdanning', () => {
    const s = fresh()
    s.resources.fagpoeng = 100_000
    expect(s.staff.s3.rarity).toBe('vanlig')
    expect(s.staff.s3.skills.grunnstell).toBe(3)
    expect(startCourse(s, 's3', 'grunnstell').ok).toBe(false)
    expect(startCourse(s, 's3', 'saarstell').ok).toBe(true)

    s.upgrades.videreutdanning = 2
    const r = startCourse(s, 's3', 'grunnstell')
    if (!r.ok) throw new Error(r.reason)
    expect(evaluateShift(r.state, 'dag', mods(r.state)).absent).toContain('s3')
    const done = simulate(r.state, 3 * DAY).state
    expect(done.staff.s3.course).toBeNull()
    expect(done.staff.s3.skills.grunnstell).toBe(4)
  })
})

describe('tilsyn og kvalitetsindeks', () => {
  it('måler snitt per fullførte vakt, så tidshopp gir ikke bedre resultat', () => {
    const s = simulate(fresh(), 10 * DAY).state
    expect(s.inspection.shifts).toBe(30)
    const avg = inspectionAverage(s)
    expect(avg).toBeGreaterThan(0)
    expect(avg).toBeLessThanOrEqual(100)

    s.resources.kaffekopper = 500
    const r = timeSkip(s, 'ekstravakt_8')
    if (!r.ok) throw new Error(r.reason)
    expect(r.state.inspection.shifts).toBeGreaterThan(s.inspection.shifts * 5)
    expect(Math.abs(inspectionAverage(r.state) - avg)).toBeLessThan(12)
    expect(driftScore(r.state)).toBeGreaterThan(driftScore(s) * 1.5)
  })

  it('belønning krever nok vakter og høyt nok snitt', () => {
    const s = fresh()
    s.inspection.scoreSum = 95 * 3
    s.inspection.shifts = 3
    expect(claimInspectionTier(s, 0).ok).toBe(false)
    s.inspection.scoreSum = 60 * BALANCE.inspectionMinShifts
    s.inspection.shifts = BALANCE.inspectionMinShifts
    expect(claimInspectionTier(s, 0).ok).toBe(true)
    expect(claimInspectionTier(s, INSPECTION_TIERS.length - 1).ok).toBe(false)
  })

  it('Kvalitetsindeksen vekter ressursbruk 30 % og holder seg i 0–1000', () => {
    const s = simulate(fresh(), 4 * DAY).state
    const q = qualityIndex(s)
    expect(q.parts.reduce((n, p) => n + p.weight, 0)).toBeCloseTo(1)
    const resource = q.parts.filter((p) => p.id === 'efficiency' || p.id === 'competence')
    expect(resource.reduce((n, p) => n + p.weight, 0)).toBeCloseTo(0.3)
    expect(q.index).toBeGreaterThan(0)
    expect(q.index).toBeLessThanOrEqual(1000)
    expect(q.qualified).toBe(true)
  })

  it('en overkvalifisert stab taper på kompetanseutnyttelse', () => {
    const s = fresh()
    s.upgrades.nyfloy = 2
    const all = Object.fromEntries(SKILL_ORDER.map((k) => [k, 5])) as Record<SkillId, number>
    const lean = withDayShift(s, [1, 2, 3].map((i) => staffWith(`l${i}`, 'sykepleier', all)))
    const bloated = withDayShift(s, [1, 2, 3, 4, 5].map((i) => staffWith(`l${i}`, 'sykepleier', all)))
    const demand = computeDemand(s, 'dag', mods(s))
    const a = evaluateShift(lean, 'dag', mods(lean), demand)
    const b = evaluateShift(bloated, 'dag', mods(bloated), demand)
    expect(b.utilization).toBeLessThan(a.utilization)
  })
})

describe('avdelingsrotasjon', () => {
  const endgame = (): GameState => {
    const s = simulate(fresh(), 2 * DAY).state
    s.lifetime.fagpoeng = 400_000
    s.lifetime.budget = 5_000_000
    s.tier = 5
    s.upgrades.espressomaskin = 5
    s.upgrades.stillerapport = 5
    s.resources.kaffekopper = 77
    s.staff.s1.level = 8
    s.staff.s1.stress = 60
    return s
  }

  it('låses opp først på toppnivået', () => {
    expect(canRotate(fresh())).toBe(false)
    expect(rotateWard(fresh(), { wardType: 'demens', keepStaff: [] }).ok).toBe(false)
    expect(canRotate(endgame())).toBe(true)
  })

  it('avviser ugyldige valg', () => {
    const s = endgame()
    expect(rotateWard(s, { wardType: 'sykehjem', keepStaff: [] }).ok).toBe(false)
    expect(rotateWard(s, { wardType: 'demens', keepStaff: ['s1', 's2', 's3', 's4'] }).ok).toBe(false)
    expect(rotateWard(s, { wardType: 'demens', keepStaff: ['finnes-ikke'] }).ok).toBe(false)
  })

  it('beholder renommé, fagbok, Kaffekopper og nøkkelansatte – resten starter på nytt', () => {
    const s = endgame()
    const preview = rotationPreview(s)
    const before = driftScore(s)
    const r = rotateWard(s, { wardType: 'lindrende', keepStaff: ['s1', 's2'], wardName: 'Lindrende enhet, 3. etg.' })
    if (!r.ok) throw new Error(r.reason)
    const n = r.state

    expect(n.wardType).toBe('lindrende')
    expect(n.profile.wardName).toBe('Lindrende enhet, 3. etg.')
    expect(n.prestige.rotations).toBe(1)
    expect(n.prestige.renomme).toBe(preview.renommeGain)
    expect(preview.renommeGain).toBeGreaterThanOrEqual(BALANCE.renommeBase)
    expect(n.prestige.fagboker.sykehjem).toBe(1)
    expect(n.prestige.history).toHaveLength(1)
    expect(n.resources.kaffekopper).toBe(77 + BALANCE.rotationKaffekopper)

    expect(n.tier).toBe(0)
    expect(n.lifetime.fagpoeng).toBe(0)
    expect(n.resources.budget).toBe(BALANCE.start.budget)
    expect(Object.values(n.upgrades).every((l) => l === 0)).toBe(true)

    expect(n.staffOrder).toHaveLength(BALANCE.rotationStaffCount)
    expect(n.staff.s1.level).toBe(8)
    expect(n.staff.s1.stress).toBe(15)
    expect(n.staff.s2).toBeDefined()
    expect(n.staff.s3).toBeUndefined()
    const rostered = Object.values(n.roster).flat().filter(Boolean)
    expect(rostered.length).toBeGreaterThan(3)
    expect(rostered.every((id) => id! in n.staff)).toBe(true)

    // Driftsligaen mister ikke det du har bygget.
    expect(driftScore(n)).toBeGreaterThanOrEqual(before)
    expect(n.minute).toBe(s.minute)
  })

  it('ny avdelingstype gir egne beboerprofiler og modifikatorer', () => {
    const r = rotateWard(endgame(), { wardType: 'demens', keepStaff: [] })
    if (!r.ok) throw new Error(r.reason)
    const allowed = Object.keys(WARD_TYPES.demens.profileWeights)
    expect(r.state.residents).toHaveLength(BALANCE.baseBeds)
    expect(r.state.residents.every((x) => allowed.includes(x.profile))).toBe(true)
    expect(r.state.residents.filter((x) => x.profile === 'kognitiv').length).toBeGreaterThanOrEqual(3)
    const m = mods(r.state)
    expect(m.demandMult.natt).toBeCloseTo(1.15)
    // Renommé og fagbok virker fra første vakt på den nye avdelingen.
    const base = modifiersFor({ ...r.state, prestige: fresh().prestige })
    expect(m.fagpoengMult).toBeGreaterThan(base.fagpoengMult * 1.1)
  })

  it('nivåtersklene øker for hver overleverte avdeling, og spillet går videre', () => {
    expect(tierThreshold(5, 1)).toBeGreaterThan(tierThreshold(5, 0))
    const r = rotateWard(endgame(), { wardType: 'korttid', keepStaff: ['s1'] })
    if (!r.ok) throw new Error(r.reason)
    const later = simulate(r.state, 20 * DAY).state
    expect(later.lifetime.fagpoeng).toBeGreaterThan(0)
    expect(later.residents).toHaveLength(BALANCE.baseBeds)
    expect(later.tier).toBeGreaterThanOrEqual(1)
  })

  it('fagbøker stiger i nivå, men ikke over maks', () => {
    let s = endgame()
    for (let i = 0; i < BALANCE.fagbokMaxLevel + 2; i++) {
      const r = rotateWard(s, { wardType: 'demens', keepStaff: [] })
      if (!r.ok) throw new Error(r.reason)
      s = r.state
      s.tier = 5
    }
    expect(s.prestige.fagboker.demens).toBe(BALANCE.fagbokMaxLevel)
    expect(s.prestige.fagboker.sykehjem).toBe(1)
  })
})

describe('trygg lagringsmigrering', () => {
  /** En lagring slik versjon 1 så ut. */
  const v1Save = (): Record<string, unknown> => {
    const s = simulate(fresh(), DAY).state as unknown as Record<string, any>
    s.version = 1
    s.carryMs = 512
    s.minute = 14_644
    s.resources = { budget: 123_456, fagpoeng: 789, kaffekopper: 42 }
    s.upgrades = { espressomaskin: 2, takheis: 1 }
    s.inspection = { weekKey: s.inspection.weekKey, points: 31_000, claimed: [0] }
    delete s.staff.s6
    s.staffOrder = s.staffOrder.filter((id: string) => id !== 's6')
    s.roster.aften = ['s2', 's6', null, null, null]
    delete s.residents
    delete s.prestige
    delete s.wardType
    delete s.quality.competence
    delete s.ward.residentCounter
    delete s.shift.current.focusSum
    delete s.shift.last.inspectionScore
    delete s.settings
    return s
  }

  it('beholder spillerens framdrift og fyller nye felter med trygge verdier', () => {
    const m = migrateGameState(v1Save(), T0 + 5000)
    expect(m.version).toBe(STATE_VERSION)
    expect(m.resources).toEqual({ budget: 123_456, fagpoeng: 789, kaffekopper: 42 })
    expect(m.upgrades.espressomaskin).toBe(2)
    expect(m.upgrades.takheis).toBe(1)
    expect(m.upgrades.kompetansesenter).toBe(0)

    // Stab: akkurat de spilleren hadde – oppsagte kommer ikke tilbake.
    expect(m.staffOrder).toEqual(['s1', 's2', 's3', 's4', 's5'])
    expect(m.staff.s6).toBeUndefined()
    expect(m.roster.aften).toEqual(['s2', null, null, null, null])

    // Nye felter
    expect(m.wardType).toBe('sykehjem')
    expect(m.prestige.rotations).toBe(0)
    expect(m.residents).toHaveLength(BALANCE.baseBeds)
    expect(m.residents.every((r) => r.dischargeAt > m.minute)).toBe(true)
    expect(m.quality.competence).toBeGreaterThan(0)
    expect(m.inspection).toEqual({ weekKey: m.inspection.weekKey, scoreSum: 0, shifts: 0, claimed: [] })
    expect(m.shift.last?.inspectionScore).toBe(0)
    expect(m.shift.current.focusSum).toBe(0)
    expect(m.settings).toEqual(defaultSettings())
    expect(m.prestige.bankedLifetime.shiftsCompleted).toBe(0)

    // Tid: minuttet ligger på et helt steg, og gamle felter er borte.
    expect(m.minute).toBe(14_640)
    expect('carryMs' in m).toBe(false)
  })

  it('er idempotent og gir en tilstand motoren kan kjøre videre på', () => {
    const once = migrateGameState(v1Save(), T0 + 5000)
    expect(migrateGameState(structuredClone(once), T0 + 5000)).toEqual(once)
    const later = simulate(once, 5 * DAY).state
    expect(later.lifetime.shiftsCompleted).toBeGreaterThan(once.lifetime.shiftsCompleted)
    expect(Number.isFinite(later.resources.fagpoeng)).toBe(true)
  })

  it('endrer ikke en gyldig lagring av dagens versjon', () => {
    const s = simulate(fresh(), 3 * DAY).state
    expect(migrateGameState(structuredClone(s), s.lastTickAt)).toEqual(s)
  })

  it('tåler skadet lagring og tidsstempel fra framtida', () => {
    expect(migrateGameState(null, T0).version).toBe(STATE_VERSION)
    expect(migrateGameState('tull', T0).staffOrder.length).toBeGreaterThan(0)
    const broken = migrateGameState({ version: 1, resources: { budget: 'mye' }, staff: 7, lastTickAt: T0 + 10 * HOUR }, T0)
    expect(broken.resources.budget).toBe(BALANCE.start.budget)
    expect(broken.staffOrder.length).toBeGreaterThan(0)
    expect(broken.lastTickAt).toBe(T0)
  })
})

describe('handlinger og innhold', () => {
  it('kjøper oppgradering og trekker budsjett', () => {
    const s = fresh()
    s.resources.budget = 5000
    const r = buyUpgrade(s, 'espressomaskin')
    if (!r.ok) throw new Error(r.reason)
    expect(r.state.upgrades.espressomaskin).toBe(1)
    expect(r.state.resources.budget).toBe(5000 - 1800)
    expect(mods(r.state).stressMult).toBeLessThan(1)
    expect(buyUpgrade(s, 'takheis').ok).toBe(false)
  })

  it('løser dilemma og fjerner lappen', () => {
    const s = fresh()
    const uid = s.dilemmas.active[0].uid
    const r = resolveDilemma(s, uid, 'vipps')
    if (!r.ok) throw new Error(r.reason)
    expect(r.state.dilemmas.active).toHaveLength(0)
    expect(r.state.resources.kaffekopper).toBe(s.resources.kaffekopper + 2)
  })

  it('alle dilemmaer har faglig begrunnelse, kilde og tre unike valg', () => {
    expect(DILEMMAS).toHaveLength(24)
    expect(new Set(DILEMMAS.map((d) => d.id)).size).toBe(24)
    for (const d of DILEMMAS) {
      expect(d.fagligBegrunnelse.length, d.id).toBeGreaterThan(60)
      expect(d.kilde.length, d.id).toBeGreaterThan(3)
      expect(d.options, d.id).toHaveLength(3)
      expect(new Set(d.options.map((o) => o.id)).size, d.id).toBe(3)
      // Minst ett valg må alltid være tilgjengelig uten kompetansekrav.
      expect(d.options.some((o) => !o.requires), d.id).toBe(true)
    }
  })

  it('rekruttering følger droprates og pity-garanti', () => {
    let s = fresh()
    s.resources.kaffekopper = 100_000
    const counts: Record<string, number> = { vanlig: 0, erfaren: 0, spesialist: 0, ildsjel: 0 }
    let sinceRare = 0
    let worstGap = 0
    for (let i = 0; i < 600; i++) {
      const r = recruit(s, 'fagutlysning')
      if (!r.ok) throw new Error(r.reason)
      const hired = r.state.staff[r.staffId]
      counts[hired.rarity]++
      if (hired.rarity === 'spesialist' || hired.rarity === 'ildsjel') sinceRare = 0
      else sinceRare++
      worstGap = Math.max(worstGap, sinceRare)
      for (const skill of SKILL_ORDER) expect(hired.skills[skill]).toBeLessThanOrEqual(RARITY[hired.rarity].maxSkill)
      s = r.state
      // Rydd staben så vi ikke treffer taket.
      delete s.staff[r.staffId]
      s.staffOrder = s.staffOrder.filter((id) => id !== r.staffId)
    }
    expect(worstGap).toBeLessThan(BANNERS.fagutlysning.pity!.pulls)
    expect(counts.vanlig / 600).toBeGreaterThan(0.3)
    expect(counts.vanlig / 600).toBeLessThan(0.55)
    expect(counts.spesialist + counts.ildsjel).toBeGreaterThan(60)
  })

  it('syncResidents er stabil når ingenting skal endres', () => {
    const s = fresh()
    const d = structuredClone(s)
    const change = syncResidents(d, mods(d))
    expect(change.admitted).toHaveLength(0)
    expect(change.discharged).toHaveLength(0)
    expect(d.residents).toEqual(s.residents)
  })
})

describe('profil og innstillinger', () => {
  it('validerer avdelingsnavn på 3–32 tegn', () => {
    expect(validateWardName('AB')).not.toBeNull()
    expect(validateWardName('  AB  ')).not.toBeNull()
    expect(validateWardName('Åsly')).toBeNull()
    expect(validateWardName('x'.repeat(32))).toBeNull()
    expect(validateWardName('x'.repeat(33))).not.toBeNull()
  })

  it('lagrer navn, fylke og yrkesgruppe og fullfører onboarding', () => {
    const s = fresh()
    expect(s.profile.onboarded).toBe(false)
    const r = updateProfile(s, { wardName: '  Fjordgløtt, 2. etasje ', county: 'Vestland', profession: 'vernepleier' })
    if (!r.ok) throw new Error(r.reason)
    expect(r.state.profile).toEqual({ wardName: 'Fjordgløtt, 2. etasje', county: 'Vestland', profession: 'vernepleier', onboarded: true })
    expect(s.profile.wardName).toBe('Solsiden, avd. 2') // input urørt
  })

  it('avviser ugyldig navn, fylke og yrkesgruppe', () => {
    const s = fresh()
    const ok = { wardName: 'Solsiden', county: 'Oslo', profession: 'sykepleier' as const }
    expect(updateProfile(s, { ...ok, wardName: 'ab' }).ok).toBe(false)
    expect(updateProfile(s, { ...ok, wardName: 'x'.repeat(40) }).ok).toBe(false)
    expect(updateProfile(s, { ...ok, county: 'Atlantis' }).ok).toBe(false)
    expect(updateProfile(s, { ...ok, profession: 'kirurg' as never }).ok).toBe(false)
    expect(rotateWard({ ...fresh(), tier: 5 }, { wardType: 'demens', keepStaff: [], wardName: 'x' }).ok).toBe(false)
  })

  it('endrer bare kjente innstillinger', () => {
    const s = fresh()
    expect(s.settings).toEqual(defaultSettings())
    const r = updateSettings(s, { sound: false, notifications: true, ...({ haptics: 'ja', tull: true } as object) })
    if (!r.ok) throw new Error(r.reason)
    expect(r.state.settings).toEqual({ sound: false, haptics: true, notifications: true })
    expect('tull' in r.state.settings).toBe(false)
  })

  it('karrieretall summerer overleverte avdelinger og den nåværende', () => {
    const s = simulate(fresh(), 3 * DAY).state
    s.tier = 5
    s.lifetime.dilemmasResolved = 7
    s.lifetime.recruits = 4
    const before = careerStats(s)
    const r = rotateWard(s, { wardType: 'korttid', keepStaff: [] })
    if (!r.ok) throw new Error(r.reason)
    expect(r.state.lifetime.shiftsCompleted).toBe(0)
    expect(careerStats(r.state)).toEqual(before)
    const later = simulate(r.state, 2 * DAY).state
    expect(careerStats(later).shiftsCompleted).toBe(before.shiftsCompleted + 6)
    expect(careerStats(later).dilemmasResolved).toBe(7)
  })

  it('planlegger varsel for full buffer og ferdige kurs', () => {
    const s = fresh()
    s.resources.fagpoeng = 1000
    const r = startCourse(s, 's3', 'saarstell')
    if (!r.ok) throw new Error(r.reason)
    const plan = upcomingNotifications(r.state, T0)
    const course = plan.find((n) => n.id === 'kurs-s3')!
    const buffer = plan.find((n) => n.id === 'buffer')!
    // Kurs fra nivå 1 → 2 varer 16 spilltimer = 4 minutter i sanntid.
    expect(course.at).toBe(T0 + 4 * 60 * 1000)
    expect(course.body).toContain('Amina')
    expect(buffer.at).toBe(T0 + 8 * HOUR)
    expect(plan[0].id).toBe('kurs-s3')

    r.state.monetization.vip = true
    expect(upcomingNotifications(r.state, T0).find((n) => n.id === 'buffer')!.at).toBe(T0 + 24 * HOUR)
    expect(upcomingNotifications(fresh(), T0)).toHaveLength(1)
  })
})

describe('eksport og import av lagring', () => {
  const played = (): GameState => {
    const s = simulate(fresh(), 4 * DAY).state
    s.profile = { wardName: 'Betatest, avd. 4', county: 'Troms', profession: 'student', onboarded: true }
    s.resources.kaffekopper = 61
    s.settings.sound = false
    return s
  }

  it('eksport og import gir nøyaktig samme spill tilbake', () => {
    const s = played()
    const json = exportSave(s, T0 + 999)
    const file = JSON.parse(json)
    expect(file.app).toBe('vaktrommet')
    expect(file.formatVersion).toBe(STATE_VERSION)

    const r = importSave(fresh(), json, s.lastTickAt)
    if (!r.ok) throw new Error(r.reason)
    expect(r.state).toEqual(s)
    expect(r.summary).toMatchObject({ wardName: 'Betatest, avd. 4', staff: 6, sourceVersion: STATE_VERSION, exportedAt: T0 + 999 })
  })

  it('godtar rå localStorage-verdi og ren GameState', () => {
    const s = played()
    const fromStorage = parseSave(JSON.stringify({ state: { game: s }, version: STATE_VERSION }), s.lastTickAt)
    const bare = parseSave(JSON.stringify(s), s.lastTickAt)
    expect(fromStorage.ok && fromStorage.game).toEqual(s)
    expect(bare.ok && bare.game).toEqual(s)
  })

  it('løfter en eldre lagring ved import', () => {
    const old = played() as unknown as Record<string, any>
    old.version = 1
    delete old.residents
    delete old.prestige
    delete old.wardType
    delete old.settings
    const r = parseSave(JSON.stringify(old), T0)
    if (!r.ok) throw new Error(r.reason)
    expect(r.summary.sourceVersion).toBe(1)
    expect(r.game.version).toBe(STATE_VERSION)
    expect(r.game.resources.kaffekopper).toBe(61)
    expect(r.game.residents).toHaveLength(BALANCE.baseBeds)
    expect(r.game.settings).toEqual(defaultSettings())
  })

  it('avviser tekst som ikke er en lagring', () => {
    const s = fresh()
    const bad = (text: string) => {
      const r = importSave(s, text, T0)
      expect(r.ok, text.slice(0, 30)).toBe(false)
      return r.ok ? '' : r.reason
    }
    expect(bad('   ')).toMatch(/Lim inn/)
    expect(bad('{"game": ')).toMatch(/gyldig JSON/)
    expect(bad('[1,2,3]')).toMatch(/Fant ingen/)
    expect(bad('{"hei": "på deg"}')).toMatch(/ser ikke ut/)
    expect(bad(JSON.stringify({ app: 'vaktrommet', game: { resources: { budget: 'mye' }, staff: {}, minute: 0 } }))).toMatch(/ser ikke ut/)
    expect(bad(JSON.stringify({ ...played(), version: STATE_VERSION + 1 }))).toMatch(/nyere versjon/)
    expect(bad('"' + 'x'.repeat(5_000_001) + '"')).toMatch(/for stor/)
  })

  it('en importert lagring kan spilles videre', () => {
    const r = importSave(fresh(), exportSave(played(), T0), T0)
    if (!r.ok) throw new Error(r.reason)
    const later = simulate(r.state, 2 * DAY).state
    expect(later.lifetime.shiftsCompleted).toBe(r.state.lifetime.shiftsCompleted + 6)
  })
})

describe('nullstilling og gjenoppretting av kjøp', () => {
  it('nullstiller spillet, men beholder innstillinger og medlemskap', () => {
    let s = simulate(fresh(), 6 * DAY).state
    s.resources.kaffekopper = 400
    s.settings = { sound: false, haptics: false, notifications: true }
    s.profile = { wardName: 'Gamle avdeling', county: 'Nordland', profession: 'assistent', onboarded: true }
    const vip = grantPurchase(s, 'vip', T0)
    if (!vip.ok) throw new Error(vip.reason)
    s = vip.state

    const r = resetGame(s, T0 + 5 * HOUR)
    if (!r.ok) throw new Error(r.reason)
    const n = r.state
    expect(n.minute).toBe(0)
    expect(n.lastTickAt).toBe(T0 + 5 * HOUR)
    expect(n.resources).toEqual({
      budget: BALANCE.start.budget,
      fagpoeng: BALANCE.start.fagpoeng,
      kaffekopper: BALANCE.start.kaffekopper,
    })
    expect(n.lifetime.shiftsCompleted).toBe(0)
    expect(n.prestige.rotations).toBe(0)
    expect(n.settings).toEqual({ sound: false, haptics: false, notifications: true })
    expect(n.profile).toEqual({ wardName: 'Gamle avdeling', county: 'Nordland', profession: 'assistent', onboarded: false })
    expect(n.monetization.vip).toBe(true)
    expect(n.monetization.purchases).toHaveLength(1)
  })

  it('gjenoppretter medlemskap fra kjøpsloggen og fra butikken', () => {
    const s = fresh()
    expect(restorePurchases(s, [], T0)).toMatchObject({ ok: true, restored: [] })

    const logged = structuredClone(s)
    logged.monetization.purchases = [
      { itemId: 'vip', at: T0 - 90 * 24 * HOUR },
      { itemId: 'tilsynspass', at: T0 - 1000 },
      { itemId: 'kaffe_m', at: T0 - 500 },
    ]
    const a = restorePurchases(logged, [], T0)
    if (!a.ok) throw new Error(a.reason)
    expect(a.restored).toEqual(['vip', 'tilsynspass'])
    expect(a.state.monetization.vip).toBe(true)
    expect(a.state.monetization.seasonPass.premium).toBe(true)
    expect(a.state.resources.kaffekopper).toBe(s.resources.kaffekopper) // forbruksvarer gjenopprettes ikke

    // Et pass kjøpt i en tidligere sesong gjelder ikke denne.
    const oldPass = structuredClone(s)
    oldPass.monetization.purchases = [{ itemId: 'tilsynspass', at: T0 - 60 * 24 * HOUR }]
    expect(restorePurchases(oldPass, [], T0)).toMatchObject({ restored: [] })

    // Butikken (betalingsleverandøren) kan også bekrefte eierskap.
    const b = restorePurchases(s, ['vip'], T0)
    expect(b).toMatchObject({ restored: ['vip'] })
    expect(restorePurchases(a.state, ['vip', 'tilsynspass'], T0)).toMatchObject({ restored: [] })
  })
})
