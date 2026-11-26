import { BALANCE, TIERS } from '@/data/balance'
import { PASS_XP } from '@/data/economy'
import { INSPECTIONS } from '@/data/league'
import { RESIDENT_PROFILES } from '@/data/residents'
import { STARTER_SYNERGY_IDS, SYNERGY_BY_ID } from '@/data/synergies'
import { THANKS_FROM, THANKS_TEXTS, THANKS_TEXTS_BY_PROFILE } from '@/data/thanks'
import { emptyUpgradeLevels } from '@/data/upgrades'
import { WARD_TYPE_ORDER } from '@/data/wards'
import type {
  DiscoveryState,
  GameEvent,
  GameState,
  Modifiers,
  OfflineReport,
  LifetimeStats,
  PrestigeState,
  Resident,
  Settings,
  ShiftAccumulator,
  ShiftEvaluation,
  SkillId,
  StaffMember,
  StreakState,
  ThanksState,
  WardTypeId,
} from '@/types'
import { postDueFollowUps, spawnDilemma } from './dilemmas'
import { maxSkillLevelFor, modifiersFor, offlineCapHours, slotsFor, tierFor } from './modifiers'
import { computeDemand, syncResidents } from './residents'
import { pick, randInt, seedFrom } from './rng'
import { starterStaff } from './staffFactory'
import { hourlyAbsence } from './absence'
import { restBreachOf, shiftsWorked } from './rest'
import { evaluateShift } from './synergy'
import {
  dayNumber,
  isoWeekKey,
  isoWeekNumber,
  MIN_PER_HOUR,
  MIN_PER_SHIFT,
  msUntilNextSeason,
  msUntilNextWeek,
  seasonId,
  shiftAt,
  STEP_MS,
} from './time'

/** Versjon av lagringsformatet. Økes når GameState endrer form – se engine/migrate. */
export const STATE_VERSION = 7

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Dyp kopi – GameState er ren JSON-data. */
export const cloneState = (state: GameState): GameState => structuredClone(state)

export const newAccumulator = (minute: number): ShiftAccumulator => ({
  shift: shiftAt(minute),
  day: dayNumber(minute),
  fagpoeng: 0,
  budget: 0,
  avvik: 0,
  coverageSum: 0,
  focusSum: 0,
  hours: 0,
  synergyIds: [],
})

export const emptyLifetime = (): LifetimeStats => ({
  budget: 0,
  fagpoeng: 0,
  shiftsCompleted: 0,
  dilemmasResolved: 0,
  sickDays: 0,
  recruits: 0,
})

export const defaultSettings = (): Settings => ({ sound: true, music: true, haptics: true, notifications: false })

export const defaultDiscoveries = (): DiscoveryState => ({ synergies: [...STARTER_SYNERGY_IDS], unseen: [] })

export const defaultThanks = (): ThanksState => ({ activeUntil: 0, cards: [], total: 0 })

export const defaultStreak = (): StreakState => ({ count: 0, lastDay: null, freeWeek: null, best: 0, total: 0 })

export const defaultPrestige = (): PrestigeState => ({
  rotations: 0,
  renomme: 0,
  fagboker: Object.fromEntries(WARD_TYPE_ORDER.map((id) => [id, 0])) as Record<WardTypeId, number>,
  bankedDrift: 0,
  bankedLifetime: emptyLifetime(),
  history: [],
})

// ---------------------------------------------------------------------------
// Ny spilltilstand
// ---------------------------------------------------------------------------

export function createInitialState(nowMs: number, seed: number = nowMs): GameState {
  const staffList = starterStaff()
  const staff = Object.fromEntries(staffList.map((s) => [s.id, s]))
  const state: GameState = {
    version: STATE_VERSION,
    createdAt: nowMs,
    lastTickAt: nowMs,
    minute: 0,
    rng: seedFrom(seed),
    profile: { wardName: 'Solsiden, avd. 2', county: 'Oslo', profession: 'sykepleier', onboarded: false },
    resources: {
      budget: BALANCE.start.budget,
      fagpoeng: BALANCE.start.fagpoeng,
      kaffekopper: BALANCE.start.kaffekopper,
    },
    lifetime: emptyLifetime(),
    ward: { trivsel: BALANCE.start.trivsel, avvik: 0, avvikProgress: 0, residentCounter: 0 },
    wardType: 'sykehjem',
    residents: [],
    prestige: defaultPrestige(),
    staff,
    staffOrder: staffList.map((s) => s.id),
    roster: {
      dag: ['s1', 's3', 's5', null, null],
      aften: ['s2', 's6', null, null, null],
      natt: ['s4', null, null, null, null],
    },
    upgrades: emptyUpgradeLevels(),
    tier: 0,
    dilemmas: {
      active: [{ uid: 1, defId: 'kaffekasse', postedAt: 0, tilt: -2 }],
      nextAt: 6 * MIN_PER_HOUR,
      recent: ['kaffekasse'],
      counter: 1,
      followUps: [],
    },
    shift: { current: newAccumulator(0), last: null, reportCounter: 0 },
    quality: {
      trivsel: BALANCE.start.trivsel,
      avvikPerBedDay: 0.25,
      absence: 0,
      stress: 30,
      efficiency: 0.6,
      competence: 0.6,
      hours: 0,
    },
    inspection: { weekKey: isoWeekKey(nowMs), scoreSum: 0, shifts: 0, claimed: [] },
    monetization: {
      vip: false,
      seasonPass: { seasonId: seasonId(nowMs), xp: 0, premium: false, claimedFree: [], claimedPremium: [] },
      gacha: { pity: { stillingsannonse: 0, fagutlysning: 0 }, totalPulls: 0, lastPull: null },
      rosterTemplates: [],
      adsWatched: 0,
      purchases: [],
    },
    discoveries: defaultDiscoveries(),
    thanks: defaultThanks(),
    streak: defaultStreak(),
    settings: defaultSettings(),
    gaps: [],
    gapCounter: 0,
    events: [],
    eventCounter: 0,
  }
  syncResidents(state, modifiersFor(state), true)
  return state
}

// ---------------------------------------------------------------------------
// Hjelpere som muterer et utkast (draft) av tilstanden
// ---------------------------------------------------------------------------

export function pushEvent(d: GameState, kind: GameEvent['kind'], text: string): void {
  d.eventCounter++
  d.events.unshift({ id: d.eventCounter, at: d.minute, kind, text })
  if (d.events.length > 24) d.events.length = 24
}

export const xpForLevel = (level: number): number => Math.round(100 * Math.pow(level, 1.5))

export function gainXp(d: GameState, s: StaffMember, xp: number): void {
  if (s.level >= BALANCE.maxLevel) return
  s.xp += xp
  while (s.level < BALANCE.maxLevel && s.xp >= xpForLevel(s.level)) {
    s.xp -= xpForLevel(s.level)
    s.level++
    pushEvent(d, 'nivaa', `${s.name} er nå på nivå ${s.level}.`)
  }
}

/** Oppdaterer avdelingsnivå og deler ut Kaffekopper ved opprykk. */
export function syncTier(d: GameState): void {
  const tier = tierFor(d.lifetime.fagpoeng, d.prestige.rotations)
  while (d.tier < tier) {
    d.tier++
    const def = TIERS[d.tier]
    d.resources.kaffekopper += def.reward
    pushEvent(d, 'avdeling', `Avdelingen er nå «${def.name}»! +${def.reward} Kaffekopper.`)
  }
}

/** Ukens tilsyn ut fra ISO-uke. */
export const inspectionFor = (weekKey: string) => INSPECTIONS[isoWeekNumber(weekKey) % INSPECTIONS.length]

/** Ukens resultat: snitt tilsynspoeng (0–100) per fullførte vakt. */
export const inspectionAverage = (state: Pick<GameState, 'inspection'>): number =>
  state.inspection.shifts > 0 ? state.inspection.scoreSum / state.inspection.shifts : 0

/** Nullstiller ukentlig tilsyn og månedlig pass når kalenderen har gått videre. */
export function syncCalendar(d: GameState, nowMs: number): void {
  const week = isoWeekKey(nowMs)
  if (d.inspection.weekKey !== week) d.inspection = { weekKey: week, scoreSum: 0, shifts: 0, claimed: [] }
  const season = seasonId(nowMs)
  if (d.monetization.seasonPass.seasonId !== season) {
    d.monetization.seasonPass = { seasonId: season, xp: 0, premium: false, claimedFree: [], claimedPremium: [] }
  }
}

/** Første gang en bonus-synergi treffes: lås den opp i oppdagelsesboka. */
function discoverSynergies(d: GameState, ev: ShiftEvaluation, totals: StepTotals): void {
  for (const syn of ev.synergies) {
    if (syn.tone !== 'bonus' || d.discoveries.synergies.includes(syn.id)) continue
    d.discoveries.synergies.push(syn.id)
    d.discoveries.unseen.push(syn.id)
    d.resources.kaffekopper += BALANCE.discoveryKaffekopper
    totals.discoveries++
    pushEvent(d, 'oppdagelse', `Ny synergi oppdaget: ${SYNERGY_BY_ID[syn.id]?.name ?? syn.name}. +${BALANCE.discoveryKaffekopper} Kaffekopp.`)
  }
}

/** Takkekort fra pårørende når en beboer skrives ut fra en avdeling med høy trivsel. */
function sendThanksCard(d: GameState, r: Resident, totals: StepTotals): void {
  const texts = THANKS_TEXTS_BY_PROFILE[r.profile] ?? THANKS_TEXTS
  d.thanks.total++
  d.thanks.cards.unshift({
    id: d.thanks.total,
    minute: d.minute,
    resident: r.name,
    from: `${pick(d, THANKS_FROM)} ${r.name}`,
    text: pick(d, texts),
  })
  if (d.thanks.cards.length > 6) d.thanks.cards.length = 6
  d.thanks.activeUntil = d.minute + BALANCE.thanksHours * MIN_PER_HOUR
  totals.thanks++
  const from = d.thanks.cards[0].from
  pushEvent(d, 'takk', `Takkekort fra ${from.charAt(0).toLowerCase()}${from.slice(1)}. Trivselsmålet løftes i ${BALANCE.thanksHours} timer.`)
}

// ---------------------------------------------------------------------------
// Ett simuleringssteg
// ---------------------------------------------------------------------------

export interface StepTotals {
  fagpoeng: number
  budget: number
  avvik: number
  shifts: number
  sick: number
  discharged: number
  thanks: number
  discoveries: number
}

interface SimContext {
  mods: Modifiers
  totals: StepTotals
  /** Hurtigbuffer: behovet endres bare ved vaktskifte og når beboere byttes ut. */
  demandKey: string
  demand: Record<SkillId, number> | null
}

/**
 * Flytter spillet ett steg (BALANCE.stepMin spillminutter) fram. Dette er den
 * eneste veien tiden går i motoren – sanntid, offline og tidshopp er alle
 * bare et antall slike steg, og gir derfor identisk resultat hos klient og server.
 */
function step(d: GameState, ctx: SimContext): void {
  const dt = BALANCE.stepMin
  const h = dt / MIN_PER_HOUR
  const { mods, totals } = ctx
  const shift = shiftAt(d.minute)

  const key = `${shift}:${d.ward.residentCounter}:${d.residents.length}`
  if (ctx.demandKey !== key || !ctx.demand) {
    ctx.demand = computeDemand(d, shift, mods)
    ctx.demandKey = key
  }
  const ev = evaluateShift(d, shift, mods, ctx.demand)
  const acc = d.shift.current
  discoverSynergies(d, ev, totals)

  // ---- Økonomi ----
  const fp = ev.rates.fagpoeng * h
  const kr = ev.rates.budgetNet * h
  d.resources.fagpoeng += fp
  d.resources.budget += kr
  d.lifetime.fagpoeng += fp
  d.lifetime.budget += kr
  acc.fagpoeng += fp
  acc.budget += kr
  acc.coverageSum += ev.coverage * h
  acc.hours += h
  for (const s of ev.synergies) if (!acc.synergyIds.includes(s.id)) acc.synergyIds.push(s.id)
  totals.fagpoeng += fp
  totals.budget += kr

  // ---- Trivsel og avvik ----
  const k = 1 - Math.exp(-h / BALANCE.trivselInertiaHours)
  d.ward.trivsel += (ev.trivselTarget - d.ward.trivsel) * k
  d.ward.avvikProgress += ev.rates.avvik * h
  while (d.ward.avvikProgress >= 1) {
    d.ward.avvikProgress -= 1
    d.ward.avvik++
    acc.avvik++
    totals.avvik++
    d.ward.trivsel -= BALANCE.avvikTrivselHit
  }
  d.ward.trivsel = clamp(d.ward.trivsel, 0, 100)

  // ---- Ansatte: energi, stress og erfaring ----
  const onDuty = new Set(ev.present)
  const slots = slotsFor(mods)
  for (const id of d.staffOrder) {
    const s = d.staff[id]
    // For lite hvile mellom vaktene (AML § 10-8) koster: mer stress på jobb, dårligere restitusjon hjemme.
    const breach = restBreachOf(shiftsWorked(d, id, slots))
    if (onDuty.has(id)) {
      s.energy = clamp(s.energy - ev.rates.energyDrain * h, 0, s.stamina)
      let stress = ev.rates.stress
      if (breach) stress += breach === 'dobbel' ? BALANCE.restDoubleStress : BALANCE.restShortStress
      if (s.energy < 15) stress += BALANCE.stressWhenExhausted
      if (stress > 0 && s.trait === 'seigpining') stress *= 0.8
      s.stress = clamp(s.stress + stress * h, 0, 100)
      gainXp(d, s, ev.rates.xp * h)
    } else {
      const rested = breach === 'dobbel' ? BALANCE.restDoubleRecovery : breach === 'kort' ? BALANCE.restShortRecovery : 1
      const boost = (s.trait === 'kaffekjenner' ? 1.2 : 1) * mods.recoveryMult * rested
      s.energy = clamp(s.energy + BALANCE.energyRecovery * boost * h, 0, s.stamina)
      s.stress = clamp(s.stress - BALANCE.stressRecovery * boost * h, 0, 100)
    }
  }

  // ---- Ukens tilsyn: dekning på fokusområdene, samles per vakt ----
  const insp = inspectionFor(d.inspection.weekKey)
  let focus = 0
  for (const skill of insp.focus) focus += ev.coverageBySkill[skill]
  acc.focusSum += (focus / insp.focus.length) * h

  d.minute += dt

  if (d.minute % MIN_PER_HOUR === 0) hourly(d, ev, ctx)
  if (d.minute % MIN_PER_SHIFT === 0) endShift(d, totals)
}

/** Hendelser som vurderes hver hele spilltime. */
function hourly(d: GameState, ev: ShiftEvaluation, ctx: SimContext): void {
  const { mods, totals } = ctx
  const onDuty = new Set(ev.present)

  for (const id of d.staffOrder) {
    const s = d.staff[id]

    // Fullført kurs
    if (s.course && d.minute >= s.course.endsAt) {
      s.skills[s.course.skill] = Math.min(maxSkillLevelFor(s, mods), s.skills[s.course.skill] + 1)
      s.course = null
      pushEvent(d, 'kurs', `${s.name} har fullført kurs.`)
    }
  }

  // ---- Fravær: tilbakekomst, egenmeldinger før vaktstart, permisjoner og hull i turnusen ----
  hourlyAbsence(d, onDuty, mods, totals)

  // ---- Utskrivning og innkomst ----
  const trivselAtDischarge = d.ward.trivsel
  const change = syncResidents(d, mods)
  totals.discharged += change.discharged.length
  for (const r of change.discharged) {
    // Bare endt liggetid teller – ikke rom som legges ned.
    if (r.dischargeAt <= d.minute && trivselAtDischarge > BALANCE.thanksTrivselThreshold) sendThanksCard(d, r, totals)
  }
  for (const r of change.admitted) {
    const out = change.discharged.find((x) => x.room === r.room)
    const who = `${r.name} (${RESIDENT_PROFILES[r.profile].short.toLowerCase()})`
    pushEvent(d, 'beboer', out ? `Rom ${r.room}: ${out.name} er skrevet ut. Inn: ${who}.` : `Rom ${r.room}: ${who} har flyttet inn.`)
  }

  // ---- Glidende kvalitetsmålinger ----
  const q = d.quality
  const a = 1 - Math.pow(0.5, 1 / BALANCE.qualityHalfLifeHours)
  const rostered = ev.present.length + ev.absent.length
  let stressSum = 0
  for (const id of d.staffOrder) stressSum += d.staff[id].stress
  const avgStress = d.staffOrder.length ? stressSum / d.staffOrder.length : 0
  const efficiency =
    ev.rates.wages > 0 ? Math.min(1.5, (ev.coverage * ev.residents * BALANCE.efficiencyRef) / ev.rates.wages) : 0
  q.trivsel += (d.ward.trivsel - q.trivsel) * a
  q.avvikPerBedDay += ((ev.rates.avvik * 24) / Math.max(1, ev.residents) - q.avvikPerBedDay) * a
  q.absence += ((rostered ? ev.absent.length / rostered : 1) - q.absence) * a
  q.stress += (avgStress - q.stress) * a
  q.efficiency += (efficiency - q.efficiency) * a
  q.competence += (ev.utilization - q.competence) * a
  q.hours++

  // ---- Post-it-lapper: utsatte saker først, så nye ----
  postDueFollowUps(d)
  if (d.minute >= d.dilemmas.nextAt) {
    if (d.dilemmas.active.length < BALANCE.dilemmaMaxActive) spawnDilemma(d)
    d.dilemmas.nextAt = d.minute + randInt(d, BALANCE.dilemmaMinHours, BALANCE.dilemmaMaxHours) * MIN_PER_HOUR
  }

  syncTier(d)
}

/** Vaktskifte: lag vaktrapport, før tilsynspoeng og start ny akkumulator. */
function endShift(d: GameState, totals: StepTotals): void {
  const acc = d.shift.current
  const avgCoverage = acc.hours > 0 ? acc.coverageSum / acc.hours : 0
  const focus = acc.hours > 0 ? acc.focusSum / acc.hours : 0
  const inspectionScore = clamp(focus * 100 - acc.avvik * BALANCE.inspectionAvvikPenalty, 0, 100)
  d.inspection.scoreSum += inspectionScore
  d.inspection.shifts++

  d.shift.reportCounter++
  d.shift.last = {
    id: d.shift.reportCounter,
    shift: acc.shift,
    day: acc.day,
    fagpoeng: acc.fagpoeng,
    budget: acc.budget,
    avvik: acc.avvik,
    avgCoverage,
    inspectionScore,
    synergyIds: acc.synergyIds,
    doubled: false,
    seen: false,
  }
  d.lifetime.shiftsCompleted++
  d.monetization.seasonPass.xp += PASS_XP.shiftCompleted + (avgCoverage >= 0.8 ? PASS_XP.goodShiftBonus : 0)
  d.shift.current = newAccumulator(d.minute)
  totals.shifts++
}

// ---------------------------------------------------------------------------
// Offentlig API
// ---------------------------------------------------------------------------

export interface SimulationResult {
  state: GameState
  totals: StepTotals
  /** Antall spillminutter som faktisk ble simulert. */
  simulated: number
}

/**
 * Simulerer `gameMinutes` fram i tid (rundet ned til hele steg) og returnerer
 * ny tilstand – input røres ikke. Med `startMs` følger simuleringen også
 * kalenderen (ukeskifte for tilsyn, månedsskifte for pass) steg for steg.
 */
export function simulate(state: GameState, gameMinutes: number, startMs?: number): SimulationResult {
  const d = cloneState(state)
  const totals: StepTotals = { fagpoeng: 0, budget: 0, avvik: 0, shifts: 0, sick: 0, discharged: 0, thanks: 0, discoveries: 0 }
  const ctx: SimContext = { mods: modifiersFor(d), totals, demandKey: '', demand: null }
  const steps = Math.max(0, Math.floor(gameMinutes / BALANCE.stepMin))

  let nextCalendarAt = Infinity
  const scheduleCalendar = (t: number) => {
    nextCalendarAt = Math.min(t + msUntilNextWeek(t), t + msUntilNextSeason(t))
  }
  if (startMs !== undefined) scheduleCalendar(startMs)

  for (let i = 0; i < steps; i++) {
    if (startMs !== undefined) {
      const t = startMs + i * STEP_MS
      if (t >= nextCalendarAt) {
        syncCalendar(d, t)
        scheduleCalendar(t)
      }
    }
    step(d, ctx)
  }
  return { state: d, totals, simulated: steps * BALANCE.stepMin }
}

export interface CatchUpResult {
  state: GameState
  report: OfflineReport | null
}

/**
 * Henter spillet inn til `nowMs`. Samme funksjon for sekund-ticket og for
 * hjemkomst etter fravær. Resultatet avhenger bare av (state, nowMs):
 * catchUp(catchUp(s, t1), t2) er lik catchUp(s, t2) så lenge offline-bufferen
 * ikke er sprengt, og en server kan derfor regne ut nøyaktig det samme.
 *
 * Returnerer samme state-objekt når ingen hele steg har gått.
 */
export function catchUp(state: GameState, nowMs: number): CatchUpResult {
  const elapsed = nowMs - state.lastTickAt
  if (elapsed < 0) {
    // Klokka er stilt tilbake – ikke gi progresjon, bare flytt referansen.
    const d = cloneState(state)
    d.lastTickAt = nowMs
    return { state: d, report: null }
  }

  const capHours = offlineCapHours(state)
  const capMs = capHours * 3_600_000
  const capped = elapsed > capMs
  const steps = Math.floor(Math.min(elapsed, capMs) / STEP_MS)
  if (steps === 0) return { state, report: null }

  const before = state
  const { state: d, totals } = simulate(state, steps * BALANCE.stepMin, state.lastTickAt)
  // Bare hele steg flytter referansen; resten blir stående til neste kall.
  d.lastTickAt = capped ? nowMs : state.lastTickAt + steps * STEP_MS
  // Kalenderen følger stegtiden (ikke «nå»), så resultatet er likt uansett hvor ofte vi kalles.
  syncCalendar(d, d.lastTickAt)

  const report: OfflineReport | null =
    elapsed >= BALANCE.offlineReportMinMs
      ? {
          awayMs: elapsed,
          simulatedMs: steps * STEP_MS,
          capHours,
          capped,
          fagpoeng: totals.fagpoeng,
          budget: totals.budget,
          avvik: totals.avvik,
          shifts: totals.shifts,
          sick: totals.sick,
          discharged: totals.discharged,
          thanks: totals.thanks,
          discoveries: totals.discoveries,
          trivselFrom: before.ward.trivsel,
          trivselTo: d.ward.trivsel,
          newDilemmas: Math.max(0, d.dilemmas.active.length - before.dilemmas.active.length),
        }
      : null

  return { state: d, report }
}

/** Evaluering av vakta som går akkurat nå – for visning i UI. */
export function evaluateCurrentShift(state: GameState): ShiftEvaluation {
  return evaluateShift(state, shiftAt(state.minute), modifiersFor(state))
}
