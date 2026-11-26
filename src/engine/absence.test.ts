import { describe, expect, it } from 'vitest'
import { ABSENCES } from '@/data/absence'
import { BALANCE, WAGE_PER_HOUR } from '@/data/balance'
import { DILEMMA_BY_ID } from '@/data/dilemmas'
import type { AbsenceKind, GameState, StaffMember } from '@/types'
import { absenceStatus, canWork, capacityOf, isAvailable, isAway, isGradert, startAbsence, syncGaps } from './absence'
import { assignStaff, grantStudyLeave, overtimeCandidates, overtimeCost, resolveGap, rotateWard, startCourse, studyLeaveCost, vikarCost } from './actions'
import { dilemmaContext, eligibleDilemmas, matchesTriggers } from './dilemmas'
import { migrateGameState } from './migrate'
import { modifiersFor } from './modifiers'
import { createInitialState, simulate, STATE_VERSION, xpForLevel } from './simulation'
import { evaluateShift, wageOf } from './synergy'

const T0 = Date.UTC(2026, 10, 25, 8)
const HOUR = 60
const DAY = 24 * HOUR
const fresh = (seed = 1234): GameState => {
  const s = createInitialState(T0, seed)
  s.dilemmas.active = []
  s.dilemmas.nextAt = 100_000_000
  return s
}
const mods = (s: GameState) => modifiersFor(s)
/** Akutt fravær fra nå, med hullene regnet ut – slik motoren gjør det. */
function away(s: GameState, id: string, kind: AbsenceKind, days: number, noticeHours = 0): GameState {
  startAbsence(s, s.staff[id], kind, days, noticeHours)
  syncGaps(s, mods(s))
  return s
}
const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  if (!r.ok) throw new Error((r as unknown as { reason: string }).reason)
  return r as Extract<T, { ok: true }>
}

describe('fraværsmodellen', () => {
  it('alle seks fraværstyper har varighet og meldinger', () => {
    const expected: Record<AbsenceKind, [number, number]> = {
      egenmelding: [1, 3],
      sykt_barn: [1, 2],
      langtidssyk: [7, 21],
      gradert_syk: [7, 14],
      studiepermisjon: [2, 4],
      velferdspermisjon: [1, 3],
    }
    expect(Object.keys(ABSENCES).sort()).toEqual(Object.keys(expected).sort())
    for (const kind of Object.keys(expected) as AbsenceKind[]) {
      expect(ABSENCES[kind].days, kind).toEqual(expected[kind])
      expect(ABSENCES[kind].messages.length, kind).toBeGreaterThan(0)
    }
    expect(ABSENCES.egenmelding.acute && ABSENCES.sykt_barn.acute && ABSENCES.langtidssyk.acute).toBe(true)
    expect(ABSENCES.studiepermisjon.acute || ABSENCES.velferdspermisjon.acute).toBe(false)
  })

  it('akutt fravær tar den ansatte ut med en gang, og varer til sluttidspunktet', () => {
    const s = away(fresh(), 's1', 'egenmelding', 2)
    const who = s.staff.s1
    expect(isAway(who, s.minute)).toBe(true)
    expect(isAvailable(who, s.minute)).toBe(false)
    expect(absenceStatus(who, s.minute)).toMatchObject({ kind: 'egenmelding', announced: false, daysLeft: 2, stamp: 'Egenmelding' })
    expect(evaluateShift(s, 'dag', mods(s)).absent).toContain('s1')

    // Tilbake etter to døgn – og fortsatt på plassen sin i turnusen.
    const later = simulate(s, 2 * DAY).state
    expect(later.staff.s1.absence?.kind).not.toBe('egenmelding')
    expect(later.roster.dag).toContain('s1')
    expect(later.events.some((e) => e.kind === 'frisk' && e.text.includes(who.name))).toBe(true)
  })

  it('varslet permisjon: jobber som vanlig til den starter', () => {
    const s = away(fresh(), 's1', 'velferdspermisjon', 2, 24)
    const who = s.staff.s1
    expect(isAway(who, s.minute)).toBe(false)
    expect(canWork(who, 'dag', s.minute)).toBe(true)
    expect(absenceStatus(who, s.minute)).toMatchObject({ announced: true, startsIn: DAY })
    expect(evaluateShift(s, 'dag', mods(s)).present).toContain('s1')
    expect(s.gaps).toHaveLength(0)

    const started = simulate(s, DAY).state
    expect(isAway(started.staff.s1, started.minute)).toBe(true)
    expect(started.events.some((e) => e.kind === 'fravaer' && e.text.includes('velferdspermisjon fra nå'))).toBe(true)
    expect(started.gaps.some((g) => g.staffId === 's1')).toBe(true)
  })

  it('gradert sykmelding: bare dagvakt, halv kapasitet og halv lønn', () => {
    const base = fresh()
    const before = evaluateShift(base, 'dag', mods(base))
    const s = away(fresh(), 's1', 'gradert_syk', 10)
    const who = s.staff.s1
    expect(isGradert(who, s.minute)).toBe(true)
    expect(isAway(who, s.minute)).toBe(false)
    expect(capacityOf(who, s.minute)).toBe(0.5)
    expect(canWork(who, 'dag', s.minute)).toBe(true)
    expect(canWork(who, 'aften', s.minute)).toBe(false)
    expect(canWork(who, 'natt', s.minute)).toBe(false)

    const ev = evaluateShift(s, 'dag', mods(s))
    expect(ev.present).toContain('s1')
    expect(ev.rates.wages).toBeCloseTo(before.rates.wages - wageOf(who) / 2, 5)
    expect(ev.coverage).toBeLessThan(before.coverage)
    // Den som mister minst, er den som fortsatt er der på halv tid – ikke den som er helt borte.
    const gone = away(fresh(), 's1', 'egenmelding', 1)
    expect(ev.coverage).toBeGreaterThan(evaluateShift(gone, 'dag', mods(gone)).coverage)

    // Kan ikke settes på natt, og står hen der fra før, blir det et hull.
    expect(assignStaff(s, 'natt', 1, 's1')).toMatchObject({ ok: false, reason: expect.stringContaining('bare gå dagvakt') })
    const onNight = fresh()
    onNight.minute = 16 * HOUR
    away(onNight, 's4', 'gradert_syk', 10)
    expect(evaluateShift(onNight, 'natt', mods(onNight)).absent).toContain('s4')
    expect(onNight.gaps).toMatchObject([{ shift: 'natt', staffId: 's4', cover: 'open' }])
  })

  it('for høyt stress på en gradert sykmeldt gir full sykmelding igjen', () => {
    const s = away(fresh(), 's1', 'gradert_syk', 10)
    s.staff.s1.stress = BALANCE.gradertStressCap + 5
    const after = simulate(s, HOUR).state
    expect(after.staff.s1.absence).toMatchObject({ kind: 'langtidssyk', endsAt: s.staff.s1.absence!.endsAt })
    expect(isAway(after.staff.s1, after.minute)).toBe(true)
  })

  it('langtidssykmelding kommer av stress over tid, ikke av én tung time', () => {
    const pressed = (): GameState => {
      const s = fresh(7)
      for (const id of s.staffOrder) s.staff[id].stress = 98
      return s
    }
    // De første timene bygges det bare opp slitasje.
    const early = simulate(pressed(), (BALANCE.strainHoursBeforeSick - 1) * HOUR).state
    expect(Object.values(early.staff).some((m) => m.absence?.kind === 'langtidssyk')).toBe(false)
    expect(Math.max(...Object.values(early.staff).map((m) => m.strain))).toBe(BALANCE.strainHoursBeforeSick - 1)

    // Holdes presset oppe, blir noen sykmeldt – i 7 til 21 døgn.
    let s = pressed()
    let sick: StaffMember | undefined
    for (let h = 0; h < 72 && !sick; h++) {
      s = simulate(s, HOUR).state
      for (const id of s.staffOrder) if (!s.staff[id].absence) s.staff[id].stress = 98
      sick = Object.values(s.staff).find((m) => m.absence?.kind === 'langtidssyk')
    }
    expect(sick).toBeDefined()
    const days = (sick!.absence!.endsAt - sick!.absence!.startsAt) / DAY
    expect(days).toBeGreaterThanOrEqual(7)
    expect(days).toBeLessThanOrEqual(21)
    expect(sick!.stress).toBeLessThanOrEqual(BALANCE.stressAfterSick + 10)
    expect(s.events.some((e) => e.kind === 'syk' && /sykmeld|stopp|klarer ikke/i.test(e.text))).toBe(true)
    expect(s.lifetime.sickDays).toBeGreaterThanOrEqual(7)
  })

  it('en lang økt gir egenmeldinger, sykt barn og varslede permisjoner med riktig varighet', () => {
    let s = fresh(42)
    const seen = new Map<AbsenceKind, { days: number; notice: number }[]>()
    const known = new Set<string>()
    for (let h = 0; h < 400 * 24; h++) {
      s = simulate(s, HOUR).state
      s.dilemmas.active = []
      for (const id of s.staffOrder) {
        const m = s.staff[id]
        // Hold stresset nede, så dette handler om hverdagsfraværet.
        m.stress = Math.min(m.stress, 40)
        const a = m.absence
        if (!a) continue
        const key = `${id}:${a.kind}:${a.startsAt}`
        if (known.has(key)) continue
        known.add(key)
        seen.set(a.kind, [...(seen.get(a.kind) ?? []), { days: (a.endsAt - a.startsAt) / DAY, notice: a.startsAt - s.minute }])
      }
    }
    for (const kind of ['egenmelding', 'sykt_barn', 'velferdspermisjon', 'studiepermisjon'] as AbsenceKind[]) {
      const list = seen.get(kind) ?? []
      expect(list.length, kind).toBeGreaterThan(0)
      for (const a of list) {
        expect(a.days, kind).toBeGreaterThanOrEqual(ABSENCES[kind].days[0])
        expect(a.days, kind).toBeLessThanOrEqual(ABSENCES[kind].days[1])
        // Akutt fravær gjelder fra nå; permisjoner er varslet et døgn i forveien.
        expect(a.notice, kind).toBe(ABSENCES[kind].acute ? 0 : BALANCE.leaveNoticeHours * HOUR)
      }
    }
    // Meldingene er skrevet slik de kommer på telefonen: «Navn (06:18): …»
    expect(s.events.some((e) => /^\S+ \(\d\d:\d\d\): /.test(e.text))).toBe(true)
    // Egenmelding kommer rett før vaktstart.
    const egen = [...known].filter((k) => k.includes(':egenmelding:')).map((k) => Number(k.split(':')[2]))
    for (const at of egen) expect(at % (8 * HOUR)).toBe(7 * HOUR)
  })

  it('egenmelding er mest sannsynlig for den som er stresset og sliten', () => {
    const count = (stress: number, energyShare: number): number => {
      let n = 0
      for (let seed = 1; seed <= 60; seed++) {
        const s = fresh(seed)
        s.minute = 6 * HOUR // neste hele time er én time før aftenvakta
        for (const id of s.staffOrder) Object.assign(s.staff[id], { stress, energy: s.staff[id].stamina * energyShare })
        const after = simulate(s, HOUR).state
        n += Object.values(after.staff).filter((m) => m.absence?.kind === 'egenmelding').length
      }
      return n
    }
    expect(count(60, 0.15)).toBeGreaterThan(count(10, 1) * 2)
  })
})

describe('studiepermisjon', () => {
  it('innvilges av lederen, varsles et døgn før og gir erfaring og Fagpoeng etterpå', () => {
    const s = fresh()
    s.resources.budget = 5000
    const cost = studyLeaveCost(s)
    const r = ok(grantStudyLeave(s, 's3'))
    expect(r.state.resources.budget).toBe(5000 - cost)
    const a = r.state.staff.s3.absence!
    expect(a).toMatchObject({ kind: 'studiepermisjon', startsAt: s.minute + DAY, endsAt: s.minute + DAY + BALANCE.studyLeaveDays * DAY })
    expect(isAway(r.state.staff.s3, r.state.minute)).toBe(false)

    // Ikke to permisjoner oppå hverandre, og ikke uten penger.
    expect(grantStudyLeave(r.state, 's3').ok).toBe(false)
    expect(grantStudyLeave({ ...s, resources: { ...s.resources, budget: cost - 1 } }, 's3').ok).toBe(false)
    expect(startCourse(simulate(r.state, DAY).state, 's3', 'grunnstell').ok).toBe(false)

    const before = r.state.staff.s3
    const back = simulate(r.state, a.endsAt - s.minute).state
    const after = back.staff.s3
    expect(after.absence).toBeNull()
    const gained = (after.level - before.level) * 1000 + after.xp - before.xp
    expect(after.level > before.level || after.xp > before.xp + xpForLevel(before.level) * 0.5).toBe(true)
    expect(gained).toBeGreaterThan(0)
    expect(back.events.some((e) => e.text.includes('tilbake fra studiepermisjon'))).toBe(true)
  })

  it('er rimeligere enn å kjøpe seg til samme løft med hurtigkurs', () => {
    expect(studyLeaveCost(fresh())).toBeLessThan(WAGE_PER_HOUR.sykepleier * 8 * BALANCE.studyLeaveDays)
  })
})

describe('hull i turnusen', () => {
  it('akutt fravær åpner et hull på vakta som går og den som kommer', () => {
    const s = away(fresh(), 's1', 'egenmelding', 1)
    expect(s.gaps).toMatchObject([{ shift: 'dag', slot: 0, staffId: 's1', cover: 'open', until: 8 * HOUR }])
    // Den som står på neste vakt, gir et hull der.
    const t = away(fresh(), 's2', 'sykt_barn', 1)
    expect(t.gaps).toMatchObject([{ shift: 'aften', staffId: 's2', until: 16 * HOUR }])
    // Plassen står fortsatt i den ansattes navn.
    expect(s.roster.dag[0]).toBe('s1')
  })

  it('tilkallingsvikar: koster kroner og gir lavere fagdekning enn den faste', () => {
    const full = evaluateShift(fresh(), 'dag', mods(fresh()))
    const s = away(fresh(), 's1', 'egenmelding', 1)
    s.resources.budget = 5000
    const open = evaluateShift(s, 'dag', mods(s))
    const gap = s.gaps[0]
    const cost = vikarCost(s, gap)
    expect(cost).toBe(Math.round((WAGE_PER_HOUR.helsefagarbeider * BALANCE.vikarWageMult * 8) / 10) * 10)

    const r = ok(resolveGap(s, gap.id, { cover: 'vikar' }))
    expect(r.state.resources.budget).toBe(5000 - cost)
    expect(r.state.gaps[0].cover).toBe('vikar')
    const covered = evaluateShift(r.state, 'dag', mods(r.state))
    expect(covered.vikarer).toBe(1)
    expect(covered.present).not.toContain('s1')
    expect(covered.coverage).toBeGreaterThan(open.coverage)
    expect(covered.coverage).toBeLessThan(full.coverage)
    // Vikaren har ikke legemiddelansvar.
    expect(covered.supply.medikament).toBe(open.supply.medikament)
    expect(covered.supply.grunnstell).toBeGreaterThan(open.supply.grunnstell)
    // Lønna er betalt ved tilkalling, ikke en gang til per time.
    expect(covered.rates.wages).toBe(open.rates.wages)
    expect(r.state.events[0]).toMatchObject({ kind: 'vikar' })

    expect(resolveGap(r.state, gap.id, { cover: 'vikar' }).ok).toBe(false)
    expect(resolveGap({ ...s, resources: { ...s.resources, budget: cost - 10 } }, gap.id, { cover: 'vikar' }).ok).toBe(false)
  })

  it('utpå vakta koster vikaren bare for timene som gjenstår', () => {
    const s = fresh()
    s.minute = 5 * HOUR
    away(s, 's1', 'egenmelding', 1)
    expect(vikarCost(s, s.gaps[0])).toBe(Math.round((WAGE_PER_HOUR.helsefagarbeider * BALANCE.vikarWageMult * 3) / 10) * 10)
  })

  it('ekstravakt: full kompetanse, overtidstillegg, og det koster den ansatte stress og energi', () => {
    const s = away(fresh(), 's1', 'egenmelding', 1)
    s.resources.budget = 5000
    const gap = s.gaps[0]
    const candidates = overtimeCandidates(s, gap)
    // De som allerede står på vakta, og den som er borte, kan ikke spørres.
    expect(candidates).not.toContain('s1')
    for (const id of s.roster.dag) if (id) expect(candidates).not.toContain(id)
    expect(candidates).toContain('s2')

    const before = s.staff.s2
    const cost = overtimeCost(s, gap, before)
    expect(cost).toBe(Math.round((wageOf(before) * BALANCE.overtimeWageBonus * 8) / 10) * 10)
    const r = ok(resolveGap(s, gap.id, { cover: 'overtid', staffId: 's2' }))
    const after = r.state.staff.s2
    expect(r.state.resources.budget).toBe(5000 - cost)
    expect(after.stress).toBe(Math.min(100, before.stress + BALANCE.overtimeStress))
    expect(after.energy).toBe(Math.max(0, before.energy - BALANCE.overtimeEnergy))
    expect(r.state.gaps[0]).toMatchObject({ cover: 'overtid', coverId: 's2' })

    const ev = evaluateShift(r.state, 'dag', mods(r.state))
    expect(ev.present).toContain('s2')
    expect(ev.overtime).toEqual(['s2'])
    expect(ev.rates.wages).toBeCloseTo(evaluateShift(s, 'dag', mods(s)).rates.wages + wageOf(after), 5)
    // På egen vakt (aften) står hen som før.
    expect(evaluateShift(r.state, 'aften', mods(r.state)).present).toContain('s2')

    // Én ekstravakt om gangen, og bare for den som faktisk kan.
    expect(overtimeCandidates(r.state, { ...gap, id: 99 })).not.toContain('s2')
    expect(resolveGap(s, gap.id, { cover: 'overtid', staffId: 's3' }).ok).toBe(false)
    expect(resolveGap(s, gap.id, { cover: 'overtid', staffId: 'finnes-ikke' }).ok).toBe(false)
    const gradert = away(fresh(), 's1', 'egenmelding', 1)
    startAbsence(gradert, gradert.staff.s2, 'gradert_syk', 8)
    expect(overtimeCandidates(gradert, gradert.gaps[0])).not.toContain('s2')
  })

  it('underbemanning: ingen kostnad, men vaktlaget får det tyngre', () => {
    const base = fresh()
    const s = away(fresh(), 's1', 'egenmelding', 1)
    const r = ok(resolveGap(s, s.gaps[0].id, { cover: 'under' }))
    expect(r.state.resources.budget).toBe(s.resources.budget)
    expect(r.state.gaps[0].cover).toBe('under')
    const short = evaluateShift(r.state, 'dag', mods(r.state))
    const full = evaluateShift(base, 'dag', mods(base))
    expect(short.rates.wages).toBeLessThan(full.rates.wages)
    expect(short.workload).toBeGreaterThan(full.workload)
    expect(short.rates.stress).toBeGreaterThan(full.rates.stress)
    expect(short.rates.avvik).toBeGreaterThan(full.rates.avvik)
    // Valget kan gjøres om så lenge vakta varer.
    r.state.resources.budget = 5000
    expect(resolveGap(r.state, s.gaps[0].id, { cover: 'vikar' }).ok).toBe(true)
  })

  it('hullet gjelder bare den ene vakta, og kommer igjen hvis fraværet varer', () => {
    const s = away(fresh(), 's1', 'egenmelding', 2)
    s.resources.budget = 5000
    const r = ok(resolveGap(s, s.gaps[0].id, { cover: 'vikar' }))
    const firstId = r.state.gaps[0].id
    // Samme vakt, time etter time: vikaren står der.
    expect(simulate(r.state, 4 * HOUR).state.gaps.find((g) => g.id === firstId)?.cover).toBe('vikar')
    // Vakta er over: hullet er borte.
    expect(simulate(r.state, 8 * HOUR).state.gaps.some((g) => g.id === firstId)).toBe(false)
    // Neste dagvakt er hen fortsatt borte – nytt hull, nytt valg.
    const nextDay = simulate(r.state, DAY).state
    expect(nextDay.gaps.filter((g) => g.staffId === 's1')).toMatchObject([{ shift: 'dag', cover: 'open' }])
    expect(nextDay.gaps[0].id).not.toBe(firstId)
    // Når fraværet er over, er hullene borte og den ansatte tilbake på plassen.
    const back = simulate(r.state, 2 * DAY + HOUR).state
    expect(back.gaps.some((g) => g.staffId === 's1')).toBe(false)
    expect(evaluateShift(back, 'dag', mods(back)).present).toContain('s1')
  })

  it('tas noen av vakta, eller byttes ut, forsvinner hullet', () => {
    const s = away(fresh(), 's1', 'egenmelding', 2)
    expect(s.gaps).toHaveLength(1)
    expect(ok(assignStaff(s, 'dag', 0, 's2')).state.gaps).toHaveLength(0)
    // Et dekket hull regnes ikke som fravær på vakta (synergien «Fullt lag» kan slå inn igjen).
    s.resources.budget = 5000
    const covered = ok(resolveGap(s, s.gaps[0].id, { cover: 'vikar' })).state
    expect(evaluateShift(covered, 'dag', mods(covered)).synergies.some((x) => x.id === 'underbemannet')).toBe(false)
  })

  it('ny avdeling starter uten fravær og hull', () => {
    const s = away(fresh(), 's1', 'langtidssyk', 10)
    s.tier = 5
    const r = ok(rotateWard(s, { wardType: 'demens', keepStaff: ['s1'] }))
    expect(r.state.staff.s1.absence).toBeNull()
    expect(r.state.gaps).toHaveLength(0)
  })
})

describe('migrering til fraværsmodellen', () => {
  it('eldre sykmeldinger føres over, med riktig type etter varighet', () => {
    const old = JSON.parse(JSON.stringify(fresh())) as Record<string, any>
    old.version = 6
    delete old.gaps
    delete old.gapCounter
    for (const id of Object.keys(old.staff)) {
      delete old.staff[id].absence
      delete old.staff[id].strain
      old.staff[id].sickUntil = null
    }
    old.staff.s1.sickUntil = old.minute + 2 * DAY
    old.staff.s4.sickUntil = old.minute + 9 * DAY
    old.staff.s2.sickUntil = old.minute - 60 // allerede utløpt

    const m = migrateGameState(old, T0)
    expect(m.version).toBe(STATE_VERSION)
    expect(STATE_VERSION).toBeGreaterThanOrEqual(7)
    expect(m.staff.s1.absence).toEqual({ kind: 'egenmelding', startsAt: m.minute, endsAt: m.minute + 2 * DAY })
    expect(m.staff.s4.absence).toMatchObject({ kind: 'langtidssyk', endsAt: m.minute + 9 * DAY })
    expect(m.staff.s2.absence).toBeNull()
    expect(m.staff.s3).toMatchObject({ absence: null, strain: 0 })
    expect('sickUntil' in m.staff.s1).toBe(false)
    // Hullene regnes ut med en gang: s1 står på dagvakta som går.
    expect(m.gaps).toMatchObject([{ shift: 'dag', staffId: 's1', cover: 'open' }])
    expect(m.gapCounter).toBe(1)
    // Idempotent, og spillet går videre uten feil.
    expect(migrateGameState(JSON.parse(JSON.stringify(m)), T0)).toEqual(m)
    expect(simulate(m, 3 * DAY).state.staff.s1.absence?.kind).not.toBe('egenmelding')
  })

  it('skadet fraværsdata ryddes bort i stedet for å krasje', () => {
    const broken = JSON.parse(JSON.stringify(fresh())) as Record<string, any>
    broken.staff.s1.absence = { kind: 'ferie', startsAt: 'i går' }
    broken.staff.s3.strain = 'mye'
    broken.gaps = [{ id: 1, shift: 'dag', slot: 0, staffId: 'finnes-ikke', until: 480, cover: 'vikar' }, 'tull']
    const m = migrateGameState(broken, T0)
    expect(m.staff.s1.absence).toBeNull()
    expect(m.staff.s3.strain).toBe(0)
    expect(m.gaps).toEqual([])
  })
})

describe('dilemmaer om fravær og bemanning', () => {
  it('fem nye dilemmaer, og de kontekstuelle krever riktig fravær i staben', () => {
    const ids = ['egenmelding_monster', 'vikarbudsjett', 'overtid_grense', 'gradert_tilrettelegging', 'sykt_barn_kvote']
    for (const id of ids) expect(DILEMMA_BY_ID[id], id).toBeDefined()

    const calm = fresh()
    const none = eligibleDilemmas(calm).map((d) => d.id)
    expect(none).not.toContain('egenmelding_monster')
    expect(none).not.toContain('gradert_tilrettelegging')
    expect(none).not.toContain('sykt_barn_kvote')

    const withEgen = away(fresh(), 's1', 'egenmelding', 1)
    expect(dilemmaContext(withEgen).absences.has('egenmelding')).toBe(true)
    expect(eligibleDilemmas(withEgen).map((d) => d.id)).toContain('egenmelding_monster')
    expect(eligibleDilemmas(withEgen).map((d) => d.id)).not.toContain('gradert_tilrettelegging')

    const withGradert = away(fresh(), 's1', 'gradert_syk', 8)
    expect(eligibleDilemmas(withGradert).map((d) => d.id)).toContain('gradert_tilrettelegging')
    const ctx = dilemmaContext(away(fresh(), 's1', 'sykt_barn', 1))
    expect(matchesTriggers(DILEMMA_BY_ID.sykt_barn_kvote, ctx)).toBe(true)
    expect(matchesTriggers(DILEMMA_BY_ID.egenmelding_monster, ctx)).toBe(false)
  })
})
