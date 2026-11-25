import { BALANCE, TIERS } from '@/data/balance'
import { DILEMMAS } from '@/data/dilemmas'
import { PASS_XP } from '@/data/economy'
import { INSPECTIONS } from '@/data/league'
import { emptyUpgradeLevels } from '@/data/upgrades'
import type {
  GameEvent,
  GameState,
  Modifiers,
  OfflineReport,
  ShiftAccumulator,
  ShiftEvaluation,
  StaffMember,
} from '@/types'
import { computeModifiers, offlineCapHours, tierFor } from './modifiers'
import { rand, randInt, seedFrom } from './rng'
import { starterStaff } from './staffFactory'
import { evaluateShift, isAvailable } from './synergy'
import { dayNumber, isoWeekKey, isoWeekNumber, MIN_PER_HOUR, MIN_PER_SHIFT, seasonId, shiftAt } from './time'

export const STATE_VERSION = 1

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Dyp kopi – GameState er ren JSON-data. */
export const cloneState = (state: GameState): GameState => structuredClone(state)

const newAccumulator = (minute: number): ShiftAccumulator => ({
  shift: shiftAt(minute),
  day: dayNumber(minute),
  fagpoeng: 0,
  budget: 0,
  avvik: 0,
  coverageSum: 0,
  hours: 0,
  synergyIds: [],
})

// ---------------------------------------------------------------------------
// Ny spilltilstand
// ---------------------------------------------------------------------------

export function createInitialState(nowMs: number, seed: number = nowMs): GameState {
  const staffList = starterStaff()
  const staff = Object.fromEntries(staffList.map((s) => [s.id, s]))
  return {
    version: STATE_VERSION,
    createdAt: nowMs,
    lastTickAt: nowMs,
    carryMs: 0,
    minute: 0,
    rng: seedFrom(seed),
    profile: { wardName: 'Solsiden, avd. 2', county: 'Oslo', profession: 'sykepleier', onboarded: false },
    resources: {
      budget: BALANCE.start.budget,
      fagpoeng: BALANCE.start.fagpoeng,
      kaffekopper: BALANCE.start.kaffekopper,
    },
    lifetime: { budget: 0, fagpoeng: 0, shiftsCompleted: 0, dilemmasResolved: 0, sickDays: 0, recruits: 0 },
    ward: { trivsel: BALANCE.start.trivsel, avvik: 0, avvikProgress: 0 },
    staff,
    staffOrder: staffList.map((s) => s.id),
    roster: {
      dag: ['s1', 's3', 's5', null, null],
      aften: ['s2', 's6', null, null, null],
      natt: ['s4', null, null, null, null],
    },
    upgrades: emptyUpgradeLevels(),
    tier: 0,
    dilemmas: { active: [{ uid: 1, defId: 'kaffekasse', postedAt: 0, tilt: -2 }], nextAt: 6 * MIN_PER_HOUR, recent: ['kaffekasse'], counter: 1 },
    shift: { current: newAccumulator(0), last: null, reportCounter: 0 },
    quality: { trivsel: BALANCE.start.trivsel, avvikPerBedDay: 0.25, absence: 0, stress: 30, efficiency: 0.6, hours: 0 },
    inspection: { weekKey: isoWeekKey(nowMs), points: 0, claimed: [] },
    monetization: {
      vip: false,
      seasonPass: { seasonId: seasonId(nowMs), xp: 0, premium: false, claimedFree: [], claimedPremium: [] },
      gacha: { pity: { stillingsannonse: 0, fagutlysning: 0 }, totalPulls: 0, lastPull: null },
      rosterTemplates: [],
      adsWatched: 0,
      purchases: [],
    },
    events: [],
    eventCounter: 0,
  }
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

function gainXp(d: GameState, s: StaffMember, xp: number): void {
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
  const tier = tierFor(d.lifetime.fagpoeng)
  while (d.tier < tier) {
    d.tier++
    const def = TIERS[d.tier]
    d.resources.kaffekopper += def.reward
    pushEvent(d, 'avdeling', `Avdelingen er nå «${def.name}»! +${def.reward} Kaffekopper.`)
  }
}

/** Ukens tilsyn ut fra ISO-uke. */
export const inspectionFor = (weekKey: string) => INSPECTIONS[isoWeekNumber(weekKey) % INSPECTIONS.length]

/** Nullstiller ukentlig tilsyn og månedlig pass når kalenderen har gått videre. */
export function syncCalendar(d: GameState, nowMs: number): void {
  const week = isoWeekKey(nowMs)
  if (d.inspection.weekKey !== week) d.inspection = { weekKey: week, points: 0, claimed: [] }
  const season = seasonId(nowMs)
  if (d.monetization.seasonPass.seasonId !== season) {
    d.monetization.seasonPass = { seasonId: season, xp: 0, premium: false, claimedFree: [], claimedPremium: [] }
  }
}

function spawnDilemma(d: GameState): void {
  const active = new Set(d.dilemmas.active.map((a) => a.defId))
  const recent = new Set(d.dilemmas.recent)
  let pool = DILEMMAS.filter((def) => (def.minTier ?? 0) <= d.tier && !active.has(def.id) && !recent.has(def.id))
  if (pool.length === 0) pool = DILEMMAS.filter((def) => (def.minTier ?? 0) <= d.tier && !active.has(def.id))
  if (pool.length === 0) return
  const def = pool[Math.floor(rand(d) * pool.length)]
  d.dilemmas.counter++
  d.dilemmas.active.push({
    uid: d.dilemmas.counter,
    defId: def.id,
    postedAt: d.minute,
    tilt: Math.round((rand(d) * 8 - 4) * 10) / 10,
  })
  d.dilemmas.recent.push(def.id)
  if (d.dilemmas.recent.length > 6) d.dilemmas.recent.shift()
}

// ---------------------------------------------------------------------------
// Ett simuleringssteg
// ---------------------------------------------------------------------------

interface StepTotals {
  fagpoeng: number
  budget: number
  avvik: number
  shifts: number
  sick: number
}

/**
 * Flytter spillet `dt` spillminutter fram. Steget må ligge innenfor én vakt
 * (dt går opp i 60, og minute er alltid et multiplum av steglengden).
 */
function step(d: GameState, dt: number, mods: Modifiers, totals: StepTotals): void {
  const h = dt / MIN_PER_HOUR
  const ev = evaluateShift(d, shiftAt(d.minute), mods)
  const acc = d.shift.current

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
  for (const id of d.staffOrder) {
    const s = d.staff[id]
    if (onDuty.has(id)) {
      s.energy = clamp(s.energy - ev.rates.energyDrain * h, 0, s.stamina)
      let stress = ev.rates.stress
      if (s.energy < 15) stress += BALANCE.stressWhenExhausted
      if (stress > 0 && s.trait === 'seigpining') stress *= 0.8
      s.stress = clamp(s.stress + stress * h, 0, 100)
      gainXp(d, s, ev.rates.xp * h)
    } else {
      const boost = (s.trait === 'kaffekjenner' ? 1.2 : 1) * mods.recoveryMult
      s.energy = clamp(s.energy + BALANCE.energyRecovery * boost * h, 0, s.stamina)
      s.stress = clamp(s.stress - BALANCE.stressRecovery * boost * h, 0, 100)
    }
  }

  // ---- Ukens tilsyn ----
  const insp = inspectionFor(d.inspection.weekKey)
  let focus = 0
  for (const skill of insp.focus) focus += ev.coverageBySkill[skill]
  focus /= insp.focus.length
  d.inspection.points += focus * 10 * (ev.beds / BALANCE.baseBeds) * h

  d.minute += dt

  if (d.minute % MIN_PER_HOUR === 0) hourly(d, ev, mods, totals)
  if (d.minute % MIN_PER_SHIFT === 0) endShift(d, totals)
}

/** Hendelser som vurderes hver hele spilltime. */
function hourly(d: GameState, ev: ShiftEvaluation, mods: Modifiers, totals: StepTotals): void {
  const onDuty = new Set(ev.present)

  for (const id of d.staffOrder) {
    const s = d.staff[id]

    // Friskmelding
    if (s.sickUntil !== null && d.minute >= s.sickUntil) {
      s.sickUntil = null
      pushEvent(d, 'frisk', `${s.name} er tilbake på jobb.`)
    }
    // Fullført kurs
    if (s.course && d.minute >= s.course.endsAt) {
      s.skills[s.course.skill] = Math.min(mods.maxSkillLevel, s.skills[s.course.skill] + 1)
      s.course = null
      pushEvent(d, 'kurs', `${s.name} har fullført kurs.`)
    }
    // Sykmelding ved høyt stress
    if (isAvailable(s) && s.stress > BALANCE.sickStressThreshold) {
      const over = (s.stress - BALANCE.sickStressThreshold) / (100 - BALANCE.sickStressThreshold)
      const chance = over * over * BALANCE.sickMaxChancePerHour * (onDuty.has(id) ? 1 : 0.25)
      if (rand(d) < chance) {
        const hours = randInt(d, BALANCE.sickMinHours, BALANCE.sickMaxHours)
        s.sickUntil = d.minute + hours * MIN_PER_HOUR
        s.stress = BALANCE.stressAfterSick
        d.lifetime.sickDays += hours / 24
        totals.sick++
        pushEvent(d, 'syk', `${s.name} er sykmeldt (${Math.round(hours / 24) || 1} døgn).`)
      }
    }
  }

  // ---- Glidende kvalitetsmålinger ----
  const q = d.quality
  const a = 1 - Math.pow(0.5, 1 / BALANCE.qualityHalfLifeHours)
  const rostered = ev.present.length + ev.absent.length
  let stressSum = 0
  for (const id of d.staffOrder) stressSum += d.staff[id].stress
  const avgStress = d.staffOrder.length ? stressSum / d.staffOrder.length : 0
  const efficiency =
    ev.rates.wages > 0 ? Math.min(1.5, (ev.coverage * ev.beds * BALANCE.efficiencyRef) / ev.rates.wages) : 0
  q.trivsel += (d.ward.trivsel - q.trivsel) * a
  q.avvikPerBedDay += ((ev.rates.avvik * 24) / ev.beds - q.avvikPerBedDay) * a
  q.absence += ((rostered ? ev.absent.length / rostered : 1) - q.absence) * a
  q.stress += (avgStress - q.stress) * a
  q.efficiency += (efficiency - q.efficiency) * a
  q.hours++

  // ---- Nye Post-it-lapper ----
  if (d.minute >= d.dilemmas.nextAt) {
    if (d.dilemmas.active.length < BALANCE.dilemmaMaxActive) spawnDilemma(d)
    d.dilemmas.nextAt = d.minute + randInt(d, BALANCE.dilemmaMinHours, BALANCE.dilemmaMaxHours) * MIN_PER_HOUR
  }

  syncTier(d)
}

/** Vaktskifte: lag vaktrapport og start ny akkumulator. */
function endShift(d: GameState, totals: StepTotals): void {
  const acc = d.shift.current
  const avgCoverage = acc.hours > 0 ? acc.coverageSum / acc.hours : 0
  d.shift.reportCounter++
  d.shift.last = {
    id: d.shift.reportCounter,
    shift: acc.shift,
    day: acc.day,
    fagpoeng: acc.fagpoeng,
    budget: acc.budget,
    avvik: acc.avvik,
    avgCoverage,
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
 * Simulerer `gameMinutes` fram i tid og returnerer ny tilstand (input røres ikke).
 * Med `coarse` brukes timessteg der det er mulig – for offline og tidshopp.
 */
export function simulate(state: GameState, gameMinutes: number, coarse = false): SimulationResult {
  const d = cloneState(state)
  const totals: StepTotals = { fagpoeng: 0, budget: 0, avvik: 0, shifts: 0, sick: 0 }
  const mods = computeModifiers(d.upgrades)
  const fine = BALANCE.liveStepMin
  let remaining = Math.floor(gameMinutes / fine) * fine
  const simulated = remaining
  while (remaining > 0) {
    const dt =
      coarse && remaining >= BALANCE.offlineStepMin && d.minute % BALANCE.offlineStepMin === 0
        ? BALANCE.offlineStepMin
        : fine
    step(d, dt, mods, totals)
    remaining -= dt
  }
  return { state: d, totals, simulated }
}

export interface CatchUpResult {
  state: GameState
  report: OfflineReport | null
}

/**
 * Henter spillet inn til `nowMs`. Brukes både for det løpende sekund-ticket og
 * når spilleren kommer tilbake etter fravær (begrenset av offline-bufferen).
 */
export function catchUp(state: GameState, nowMs: number): CatchUpResult {
  const elapsed = nowMs - state.lastTickAt
  if (elapsed <= 0) {
    // Klokka er stilt tilbake – ikke gi progresjon, bare nullstill referansen.
    const d = cloneState(state)
    d.lastTickAt = nowMs
    d.carryMs = 0
    return { state: d, report: null }
  }

  const capHours = offlineCapHours(state)
  const capMs = capHours * 3_600_000
  const total = elapsed + state.carryMs
  const capped = total > capMs
  const simMs = Math.min(total, capMs)
  const stepMs = (BALANCE.liveStepMin / BALANCE.gameMinutesPerRealSecond) * 1000
  const steps = Math.floor(simMs / stepMs)
  const isOffline = elapsed >= BALANCE.offlineReportMinMs

  const before = state
  const { state: d, totals } = simulate(state, steps * BALANCE.liveStepMin, isOffline)
  d.lastTickAt = nowMs
  d.carryMs = capped ? 0 : simMs - steps * stepMs
  syncCalendar(d, nowMs)

  const report: OfflineReport | null = isOffline
    ? {
        awayMs: elapsed,
        simulatedMs: steps * stepMs,
        capHours,
        capped,
        fagpoeng: totals.fagpoeng,
        budget: totals.budget,
        avvik: totals.avvik,
        shifts: totals.shifts,
        sick: totals.sick,
        trivselFrom: before.ward.trivsel,
        trivselTo: d.ward.trivsel,
        newDilemmas: Math.max(0, d.dilemmas.active.length - before.dilemmas.active.length),
      }
    : null

  return { state: d, report }
}

/** Evaluering av vakta som går akkurat nå – for visning i UI. */
export function evaluateCurrentShift(state: GameState): ShiftEvaluation {
  return evaluateShift(state, shiftAt(state.minute), computeModifiers(state.upgrades))
}
