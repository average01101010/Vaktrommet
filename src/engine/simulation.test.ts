import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/data/balance'
import { BANNERS } from '@/data/economy'
import type { GameState } from '@/types'
import { assignStaff, buyUpgrade, recruit, resolveDilemma, startCourse, timeSkip, unassignSlot } from './actions'
import { computeModifiers } from './modifiers'
import { driftScore, qualityIndex } from './scoring'
import { catchUp, createInitialState, simulate } from './simulation'
import { evaluateShift } from './synergy'
import { shiftAt } from './time'

const T0 = Date.UTC(2026, 10, 25, 8, 0, 0)
const HOUR = 3_600_000
const fresh = (): GameState => createInitialState(T0, 1234)
const mods = (s: GameState) => computeModifiers(s.upgrades)

describe('tid og vakter', () => {
  it('deler døgnet i dag, aften og natt', () => {
    expect(shiftAt(0)).toBe('dag')
    expect(shiftAt(479)).toBe('dag')
    expect(shiftAt(480)).toBe('aften')
    expect(shiftAt(960)).toBe('natt')
    expect(shiftAt(1440)).toBe('dag')
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
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const after = evaluateShift(r.state, 'natt', mods(r.state))
    expect(after.coverage).toBeGreaterThan(before.coverage)
    expect(after.rates.fagpoeng).toBeGreaterThan(before.rates.fagpoeng)
    expect(after.rates.stress).toBeLessThan(before.rates.stress)
    expect(after.rates.avvik).toBeLessThan(before.rates.avvik)
  })

  it('ubemannet vakt gir nesten ingen inntekt og mange avvik', () => {
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
    expect(a.ok).toBe(true)
    if (!a.ok) return
    const b = assignStaff(a.state, 'natt', 1, 's1')
    expect(b.ok).toBe(false)
  })
})

describe('simulering', () => {
  it('er deterministisk for samme seed og tid', () => {
    const a = simulate(fresh(), 24 * 60 * 5).state
    const b = simulate(fresh(), 24 * 60 * 5).state
    expect(a).toEqual(b)
  })

  it('rører ikke input-tilstanden', () => {
    const s = fresh()
    const snapshot = structuredClone(s)
    simulate(s, 600)
    expect(s).toEqual(snapshot)
  })

  it('tjener Fagpoeng og budsjett og lager vaktrapport', () => {
    const { state, totals } = simulate(fresh(), 8 * 60)
    expect(totals.fagpoeng).toBeGreaterThan(10)
    expect(totals.budget).toBeGreaterThan(500)
    expect(state.shift.last?.shift).toBe('dag')
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

  it('grove offline-steg gir omtrent samme resultat som fine steg', () => {
    const fine = simulate(fresh(), 24 * 60 * 3, false)
    const coarse = simulate(fresh(), 24 * 60 * 3, true)
    const rel = Math.abs(fine.totals.fagpoeng - coarse.totals.fagpoeng) / fine.totals.fagpoeng
    expect(rel).toBeLessThan(0.05)
  })

  it('holder verdier innenfor gyldige grenser over lang tid', () => {
    const { state } = simulate(fresh(), 24 * 60 * 60, true)
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
  })
})

describe('offline-beregning', () => {
  it('ticker ett steg per sekund i sanntid uten rapport', () => {
    const s = fresh()
    const r = catchUp(s, T0 + 1000)
    expect(r.report).toBeNull()
    expect(r.state.minute).toBe(BALANCE.liveStepMin)
  })

  it('tar vare på millisekunder som ikke fyller et helt steg', () => {
    let s = fresh()
    s = catchUp(s, T0 + 600).state
    expect(s.minute).toBe(0)
    s = catchUp(s, T0 + 1200).state
    expect(s.minute).toBe(BALANCE.liveStepMin)
  })

  it('begrenser fravær til 8 timer uten VIP', () => {
    const s = fresh()
    const r = catchUp(s, T0 + 20 * HOUR)
    expect(r.report?.capped).toBe(true)
    expect(r.report?.capHours).toBe(8)
    expect(r.state.minute).toBe(8 * 3600 * BALANCE.gameMinutesPerRealSecond)
    expect(r.state.lastTickAt).toBe(T0 + 20 * HOUR)
  })

  it('gir 24 timers buffer med VIP', () => {
    const s = fresh()
    s.monetization.vip = true
    const r = catchUp(s, T0 + 20 * HOUR)
    expect(r.report?.capped).toBe(false)
    expect(r.state.minute).toBe(20 * 3600 * BALANCE.gameMinutesPerRealSecond)
    const free = catchUp(fresh(), T0 + 20 * HOUR)
    expect(r.report!.fagpoeng).toBeGreaterThan(free.report!.fagpoeng * 1.5)
  })

  it('gir ingen progresjon hvis klokka er stilt tilbake', () => {
    const s = fresh()
    const r = catchUp(s, T0 - 5 * HOUR)
    expect(r.state.minute).toBe(0)
    expect(r.state.resources).toEqual(s.resources)
  })

  it('nullstiller tilsynet når en ny uke starter', () => {
    const s = fresh()
    s.inspection.points = 999
    const r = catchUp(s, T0 + 8 * 24 * HOUR)
    expect(r.state.inspection.weekKey).not.toBe(s.inspection.weekKey)
    expect(r.state.inspection.points).toBe(0)
  })
})

describe('poeng', () => {
  it('Driftsligaen vokser med tid, Kvalitetsindeksen holder seg i 0–1000', () => {
    const s0 = fresh()
    const s1 = simulate(s0, 24 * 60 * 4, true).state
    expect(driftScore(s1)).toBeGreaterThan(driftScore(s0))
    const q = qualityIndex(s1)
    expect(q.index).toBeGreaterThan(0)
    expect(q.index).toBeLessThanOrEqual(1000)
    expect(q.qualified).toBe(true)
  })

  it('tidshopp flytter Driftsligaen, men ikke Kvalitetsindeksen nevneverdig', () => {
    const s = simulate(fresh(), 24 * 60 * 4, true).state
    s.resources.kaffekopper = 500
    const r = timeSkip(s, 'ekstravakt_8')
    if (!r.ok) throw new Error(r.reason)
    expect(driftScore(r.state)).toBeGreaterThan(driftScore(s) * 1.5)
    expect(Math.abs(qualityIndex(r.state).index - qualityIndex(s).index)).toBeLessThan(120)
  })
})

describe('handlinger', () => {
  it('kjøper oppgradering og trekker budsjett', () => {
    const s = fresh()
    s.resources.budget = 5000
    const r = buyUpgrade(s, 'espressomaskin')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.upgrades.espressomaskin).toBe(1)
    expect(r.state.resources.budget).toBe(5000 - 1800)
    expect(computeModifiers(r.state.upgrades).stressMult).toBeLessThan(1)
    expect(buyUpgrade(s, 'takheis').ok).toBe(false)
  })

  it('løser dilemma og fjerner lappen', () => {
    const s = fresh()
    const uid = s.dilemmas.active[0].uid
    const r = resolveDilemma(s, uid, 'vipps')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.dilemmas.active).toHaveLength(0)
    expect(r.state.resources.kaffekopper).toBe(s.resources.kaffekopper + 2)
  })

  it('kurs gjør den ansatte utilgjengelig og øker egenskapen når det er ferdig', () => {
    const s = fresh()
    s.resources.fagpoeng = 1000
    const r = startCourse(s, 's3', 'saarstell')
    if (!r.ok) throw new Error(r.reason)
    expect(evaluateShift(r.state, 'dag', mods(r.state)).absent).toContain('s3')
    const done = simulate(r.state, 24 * 60).state
    expect(done.staff.s3.course).toBeNull()
    expect(done.staff.s3.skills.saarstell).toBe(s.staff.s3.skills.saarstell + 1)
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
})
