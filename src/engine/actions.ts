import { BALANCE, INSPECTION_TIERS, RARITY, RARITY_ORDER, SHIFT_ORDER, SHIFTS, WAGE_PER_HOUR } from '@/data/balance'
import { COUNTIES, PLAYER_PROFESSIONS } from '@/data/league'
import { emptyUpgradeLevels } from '@/data/upgrades'
import { WARD_TYPES } from '@/data/wards'
import { DILEMMA_BY_ID } from '@/data/dilemmas'
import {
  BANNERS,
  MORGENKAFFE_REWARDS,
  PASS_XP,
  PASS_XP_PER_LEVEL,
  SEASON_PASS_LEVELS,
  SHOP_BY_ID,
  softBannerCost,
} from '@/data/economy'
import { UPGRADE_BY_ID, upgradeCost } from '@/data/upgrades'
import type {
  BannerId,
  DilemmaResolution,
  Effect,
  GameState,
  PlayerProfession,
  Rarity,
  Requirement,
  Reward,
  Roster,
  RosterGap,
  Settings,
  ShiftId,
  SkillId,
  StaffId,
  StaffMember,
  UpgradeDef,
  UpgradeId,
  WardTypeId,
} from '@/types'
import { fillText } from './dilemmas'
import { migrateGameState } from './migrate'
import { maxSkillLevelFor, modifiersFor, slotsFor } from './modifiers'
import { syncResidents } from './residents'
import { qualityIndex, wardDriftScore } from './scoring'
import { rand, randInt } from './rng'
import {
  cloneState,
  createInitialState,
  defaultThanks,
  emptyLifetime,
  inspectionAverage,
  newAccumulator,
  pushEvent,
  simulate,
  STATE_VERSION,
  syncTier,
} from './simulation'
import { generateStaff } from './staffFactory'
import { absenceActive, canWork, isGradert, startAbsence, syncGaps } from './absence'
import { evaluateShift, shiftCountOf, wageOf } from './synergy'
import { dayNumber, MIN_PER_HOUR, MIN_PER_SHIFT, osloDayIndex, osloWeekKey, realMsToGameMinutes, seasonId, shiftAt } from './time'

/**
 * Alle spillerhandlinger som rene funksjoner: (state, …) → ny state eller feil.
 * UI-laget (store) kaller disse; serveren kan kjøre de samme for å validere.
 */
export type ActionResult<T = object> = ({ ok: true; state: GameState } & T) | { ok: false; reason: string }

const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason })

// ---------------------------------------------------------------------------
// Belønninger
// ---------------------------------------------------------------------------

/**
 * Spillerens inntjening per spilltime akkurat nå: snittet av de tre vaktene
 * slik turnusen står. Brukes til å skalere belønninger, med et gulv så en tom
 * turnus ikke gir null.
 */
export function incomeRates(state: GameState): { budget: number; fagpoeng: number } {
  const mods = modifiersFor(state)
  let budget = 0
  let fagpoeng = 0
  for (const shift of SHIFT_ORDER) {
    const ev = evaluateShift(state, shift, mods)
    budget += ev.rates.budgetNet
    fagpoeng += ev.rates.fagpoeng
  }
  return {
    budget: Math.max(BALANCE.rewardMinBudgetPerHour, budget / SHIFT_ORDER.length),
    fagpoeng: Math.max(BALANCE.rewardMinFagpoengPerHour, fagpoeng / SHIFT_ORDER.length),
  }
}

/**
 * Gjør om en belønning oppgitt i timer (budgetHours / fagpoengHours) til
 * faktiske beløp ut fra dagens inntjening. Faste beløp går uendret gjennom.
 */
export function resolveReward(state: GameState, r: Reward, knownRates?: { budget: number; fagpoeng: number }): Reward {
  if (!r.budgetHours && !r.fagpoengHours) return r
  const rates = knownRates ?? incomeRates(state)
  const out: Reward = {}
  const budget = (r.budget ?? 0) + Math.round(((r.budgetHours ?? 0) * rates.budget) / 50) * 50
  const fagpoeng = (r.fagpoeng ?? 0) + Math.round((r.fagpoengHours ?? 0) * rates.fagpoeng)
  if (budget) out.budget = budget
  if (fagpoeng) out.fagpoeng = fagpoeng
  if (r.kaffekopper) out.kaffekopper = r.kaffekopper
  if (r.passXp) out.passXp = r.passXp
  return out
}

/** Deler ut en belønning på utkastet og returnerer de faktiske beløpene. */
export function applyReward(d: GameState, reward: Reward): Reward {
  const r = resolveReward(d, reward)
  if (r.budget) {
    d.resources.budget += r.budget
    d.lifetime.budget += r.budget
  }
  if (r.fagpoeng) {
    d.resources.fagpoeng += r.fagpoeng
    d.lifetime.fagpoeng += r.fagpoeng
  }
  if (r.kaffekopper) d.resources.kaffekopper += r.kaffekopper
  if (r.passXp) d.monetization.seasonPass.xp += r.passXp
  syncTier(d)
  return r
}

// ---------------------------------------------------------------------------
// Turnus
// ---------------------------------------------------------------------------

export function assignStaff(state: GameState, shift: ShiftId, slot: number, staffId: StaffId): ActionResult {
  const slots = slotsFor(modifiersFor(state))
  if (slot < 0 || slot >= slots) return fail('Denne vaktplassen er ikke låst opp ennå.')
  const staff = state.staff[staffId]
  if (!staff) return fail('Fant ikke den ansatte.')

  // Gradert sykmeldte er tilrettelagt for dagvakt – ikke aften og natt.
  if (isGradert(staff, state.minute) && shift !== 'dag') {
    return fail(`${staff.name.split(' ')[0]} er gradert sykmeldt og kan bare gå dagvakt.`)
  }

  const d = cloneState(state)
  const row = d.roster[shift]
  const existing = row.indexOf(staffId)
  if (existing === slot) return { ok: true, state: d }
  if (existing >= 0) {
    // Flytt innad på vakta: bytt plass.
    row[existing] = row[slot]
    row[slot] = staffId
    return rostered(d)
  }
  if (shiftCountOf(state, staffId, slots) >= BALANCE.maxShiftsPerStaff) {
    return fail(`${staff.name.split(' ')[0]} står allerede på ${BALANCE.maxShiftsPerStaff} vakter i døgnet.`)
  }
  row[slot] = staffId
  return rostered(d)
}

/** Turnusen er endret: hullene regnes ut på nytt. */
function rostered(d: GameState): ActionResult {
  syncGaps(d, modifiersFor(d))
  return { ok: true, state: d }
}

/** Setter den ansatte på første ledige plass på vakta. */
export function assignToFirstFree(state: GameState, shift: ShiftId, staffId: StaffId): ActionResult {
  const slots = slotsFor(modifiersFor(state))
  const row = state.roster[shift]
  if (row.slice(0, slots).includes(staffId)) return fail('Står allerede på denne vakta.')
  const free = row.slice(0, slots).indexOf(null)
  if (free < 0) return fail('Vakta er full. Ta noen av først.')
  return assignStaff(state, shift, free, staffId)
}

export function unassignSlot(state: GameState, shift: ShiftId, slot: number): ActionResult {
  const d = cloneState(state)
  d.roster[shift][slot] = null
  return rostered(d)
}

/** Fyller ledige plasser på en vakt grådig med de som gir best dekning. Muterer utkastet. */
function fillShift(d: GameState, shift: ShiftId): number {
  const mods = modifiersFor(d)
  const slots = slotsFor(mods)
  let filled = 0
  for (let slot = 0; slot < slots; slot++) {
    if (d.roster[shift][slot]) continue
    let best: { id: StaffId; score: number } | null = null
    for (const id of d.staffOrder) {
      const s = d.staff[id]
      if (!canWork(s, shift, d.minute) || shiftCountOf(d, id, slots) > 0) continue
      d.roster[shift][slot] = id
      const ev = evaluateShift(d, shift, mods)
      const bonus = ev.synergies.reduce((n, syn) => n + (syn.tone === 'bonus' ? 0.04 : -0.06), 0)
      // Lønn teller svakt mot, så forslaget ikke fyller på med folk som ikke trengs.
      const score = ev.coverage + bonus - ev.rates.wages / 100_000
      if (!best || score > best.score) best = { id, score }
    }
    d.roster[shift][slot] = best ? best.id : null
    if (best) filled++
  }
  return filled
}

/** Fyller ledige plasser med de som gir best dekning – kun folk uten annen vakt. */
export function suggestShift(state: GameState, shift: ShiftId): ActionResult {
  const d = cloneState(state)
  if (fillShift(d, shift) === 0) {
    return fail('Ingen ledige ansatte uten vakt. Rekrutter flere, eller sett noen på dobbeltvakt.')
  }
  return rostered(d)
}

// ---------------------------------------------------------------------------
// Turnusmaler (VIP)
// ---------------------------------------------------------------------------

export function saveTemplate(state: GameState, name: string): ActionResult {
  if (!state.monetization.vip) return fail('Turnusmaler krever Avdelingsleder Pluss.')
  if (state.monetization.rosterTemplates.length >= 5) return fail('Du kan lagre maks 5 maler.')
  const d = cloneState(state)
  const roster: Roster = structuredClone(d.roster)
  d.monetization.rosterTemplates.push({ id: `t${d.minute}_${d.monetization.rosterTemplates.length}`, name, roster })
  return { ok: true, state: d }
}

export function applyTemplate(state: GameState, id: string): ActionResult {
  const tpl = state.monetization.rosterTemplates.find((t) => t.id === id)
  if (!tpl) return fail('Fant ikke malen.')
  const d = cloneState(state)
  for (const shift of SHIFT_ORDER) {
    d.roster[shift] = tpl.roster[shift].map((sid) => (sid && d.staff[sid] ? sid : null))
  }
  return rostered(d)
}

export function deleteTemplate(state: GameState, id: string): ActionResult {
  const d = cloneState(state)
  d.monetization.rosterTemplates = d.monetization.rosterTemplates.filter((t) => t.id !== id)
  return { ok: true, state: d }
}

// ---------------------------------------------------------------------------
// Oppgraderinger
// ---------------------------------------------------------------------------

export interface UpgradeStatus {
  level: number
  maxed: boolean
  cost: number
  affordable: boolean
  /** Årsak til at oppgraderingen er låst, ellers null. */
  locked: string | null
}

export function upgradeStatus(state: GameState, def: UpgradeDef): UpgradeStatus {
  const level = state.upgrades[def.id] ?? 0
  const maxed = level >= def.maxLevel
  const cost = upgradeCost(def, level)
  let locked: string | null = null
  if ((def.minTier ?? 0) > state.tier) locked = `Krever avdelingsnivå ${def.minTier! + 1}`
  for (const req of def.requires ?? []) {
    if ((state.upgrades[req.id] ?? 0) < req.level) {
      locked = `Krever ${UPGRADE_BY_ID[req.id].name}${req.level > 1 ? ` nivå ${req.level}` : ''}`
      break
    }
  }
  return { level, maxed, cost, affordable: state.resources[def.currency] >= cost, locked }
}

export function buyUpgrade(state: GameState, id: UpgradeId): ActionResult {
  const def = UPGRADE_BY_ID[id]
  if (!def) return fail('Ukjent oppgradering.')
  const st = upgradeStatus(state, def)
  if (st.maxed) return fail('Allerede på høyeste nivå.')
  if (st.locked) return fail(st.locked)
  if (!st.affordable) return fail(def.currency === 'budget' ? 'Ikke nok budsjettmidler.' : 'Ikke nok Fagpoeng.')
  const d = cloneState(state)
  d.resources[def.currency] -= st.cost
  d.upgrades[id] = st.level + 1
  // Nye senger tas i bruk med en gang.
  const admitted = syncResidents(d, modifiersFor(d)).admitted
  if (admitted.length > 0) pushEvent(d, 'beboer', `${admitted.length} nye beboere har flyttet inn i den nye fløyen.`)
  return { ok: true, state: d }
}

// ---------------------------------------------------------------------------
// Post-it-dilemmaer
// ---------------------------------------------------------------------------

export function meetsRequirement(state: GameState, req: Requirement | undefined): boolean {
  if (!req) return true
  const ev = evaluateShift(state, shiftAt(state.minute), modifiersFor(state))
  const present = ev.present.map((id) => state.staff[id])
  if (req.profession && !present.some((s) => s.profession === req.profession)) return false
  if (req.skill && !present.some((s) => s.skills[req.skill!.id] >= req.skill!.min)) return false
  return true
}

/** Skalerer kr/Fagpoeng etter avdelingsnivå så dilemmaene holder seg relevante. */
export function scaledEffect(state: GameState, e: Effect): Effect {
  const out: Effect = { ...e }
  if (e.budget) out.budget = Math.round((e.budget * (1 + state.tier * BALANCE.dilemmaBudgetTierScale)) / 50) * 50
  if (e.fagpoeng) out.fagpoeng = Math.round(e.fagpoeng * (1 + state.tier * BALANCE.dilemmaFagpoengTierScale))
  return out
}

export function resolveDilemma(
  state: GameState,
  uid: number,
  optionId: string,
): ActionResult<{ resolution: DilemmaResolution }> {
  const active = state.dilemmas.active.find((a) => a.uid === uid)
  if (!active) return fail('Lappen er allerede tatt ned.')
  const def = DILEMMA_BY_ID[active.defId]
  const option = def?.options.find((o) => o.id === optionId)
  if (!def || !option) return fail('Ukjent valg.')
  if (!meetsRequirement(state, option.requires)) return fail('Ingen på vakt har kompetansen dette krever.')

  const d = cloneState(state)
  const e = scaledEffect(state, option.effect)
  if (e.budget) {
    d.resources.budget = Math.max(0, d.resources.budget + e.budget)
    if (e.budget > 0) d.lifetime.budget += e.budget
  }
  if (e.fagpoeng) {
    d.resources.fagpoeng = Math.max(0, d.resources.fagpoeng + e.fagpoeng)
    if (e.fagpoeng > 0) d.lifetime.fagpoeng += e.fagpoeng
  }
  if (e.kaffekopper) d.resources.kaffekopper = Math.max(0, d.resources.kaffekopper + e.kaffekopper)
  if (e.trivsel) d.ward.trivsel = Math.max(0, Math.min(100, d.ward.trivsel + e.trivsel))
  if (e.avvik) d.ward.avvik = Math.max(0, d.ward.avvik + e.avvik)
  if (e.stress || e.energy) {
    const ev = evaluateShift(d, shiftAt(d.minute), modifiersFor(d))
    const targets = e.scope === 'paaVakt' ? ev.present : d.staffOrder
    for (const id of targets) {
      const s = d.staff[id]
      if (e.stress) s.stress = Math.max(0, Math.min(100, s.stress + e.stress))
      if (e.energy) s.energy = Math.max(0, Math.min(s.stamina, s.energy + e.energy))
    }
  }
  d.monetization.seasonPass.xp += PASS_XP.dilemma + (e.passXp ?? 0)
  d.dilemmas.active = d.dilemmas.active.filter((a) => a.uid !== uid)
  d.lifetime.dilemmasResolved++

  // Etterspill: en utsatt sak kommer tilbake strengere, og en historiekjede går videre
  // til neste steg. Beboeren saken gjelder følger med hele veien.
  let followUpKind: DilemmaResolution['followUpKind']
  const follow = option.followUp
  const next = follow && DILEMMA_BY_ID[follow.id]
  if (follow && next && !d.dilemmas.followUps.some((f) => f.defId === follow.id)) {
    const hours = randInt(d, follow.afterHours[0], follow.afterHours[1])
    d.dilemmas.followUps.push({
      defId: follow.id,
      dueAt: d.minute + hours * MIN_PER_HOUR,
      sourceId: def.id,
      ...(active.subject ? { subject: active.subject } : {}),
    })
    followUpKind = next.chain ? 'kjede' : 'utsatt'
  }

  syncTier(d)
  return {
    ok: true,
    state: d,
    resolution: {
      defId: def.id,
      optionId,
      outcome: fillText(option.outcome, active.subject),
      applied: e,
      followUpScheduled: Boolean(followUpKind),
      ...(followUpKind ? { followUpKind } : {}),
      ...(active.subject ? { subject: active.subject } : {}),
    },
  }
}

// ---------------------------------------------------------------------------
// Kurs
// ---------------------------------------------------------------------------

export const courseCost = (currentLevel: number): number =>
  Math.round(BALANCE.courseBaseCost * Math.pow(currentLevel + 1, BALANCE.courseCostExp))

export function courseDurationMin(currentLevel: number, courseSpeedMult: number): number {
  const hours = Math.max(1, Math.round((BALANCE.courseHoursPerLevel * (currentLevel + 1)) / courseSpeedMult))
  return hours * MIN_PER_HOUR
}

export const courseSkipCost = (state: GameState, s: StaffMember): number =>
  s.course
    ? Math.max(1, Math.ceil((s.course.endsAt - state.minute) / MIN_PER_HOUR / BALANCE.courseSkipHoursPerKaffe))
    : 0

export function startCourse(state: GameState, staffId: StaffId, skill: SkillId): ActionResult {
  const s = state.staff[staffId]
  if (!s) return fail('Fant ikke den ansatte.')
  if (absenceActive(s, state.minute)) return fail(`${s.name.split(' ')[0]} er borte fra jobb.`)
  if (s.course) return fail(`${s.name.split(' ')[0]} er allerede på kurs.`)
  const mods = modifiersFor(state)
  const level = s.skills[skill]
  const cap = maxSkillLevelFor(s, mods)
  if (level >= BALANCE.skillCeiling) return fail('Egenskapen er allerede på topp.')
  if (level >= cap) {
    return fail(`${RARITY[s.rarity].name} ansatte kan nå nivå ${cap}. Videreutdanning (Utstyr & Fag) løfter taket.`)
  }
  const cost = courseCost(level)
  if (state.resources.fagpoeng < cost) return fail('Ikke nok Fagpoeng.')
  const d = cloneState(state)
  d.resources.fagpoeng -= cost
  d.staff[staffId].course = {
    skill,
    startedAt: d.minute,
    endsAt: d.minute + courseDurationMin(level, mods.courseSpeedMult),
  }
  return { ok: true, state: d }
}

/** Hurtigkurs: fullfør pågående kurs med Kaffekopper. */
export function skipCourse(state: GameState, staffId: StaffId): ActionResult {
  const s = state.staff[staffId]
  if (!s?.course) return fail('Ingen kurs å fullføre.')
  const cost = courseSkipCost(state, s)
  if (state.resources.kaffekopper < cost) return fail('Ikke nok Kaffekopper.')
  const d = cloneState(state)
  const ds = d.staff[staffId]
  d.resources.kaffekopper -= cost
  ds.skills[ds.course!.skill] = Math.min(maxSkillLevelFor(ds, modifiersFor(d)), ds.skills[ds.course!.skill] + 1)
  ds.course = null
  pushEvent(d, 'kurs', `${ds.name} fullførte hurtigkurs.`)
  return { ok: true, state: d }
}

// ---------------------------------------------------------------------------
// Fravær: hull i turnusen og studiepermisjon
// ---------------------------------------------------------------------------

/** Timer som gjenstår av vakta hullet gjelder (hele vakta hvis den ikke har begynt). */
export const gapHours = (state: GameState, gap: RosterGap): number =>
  Math.max(1, Math.min(MIN_PER_SHIFT, gap.until - state.minute) / MIN_PER_HOUR)

const roundKr = (kr: number): number => Math.max(10, Math.round(kr / 10) * 10)

/** Tilkallingsvikar: betales for timene som gjenstår, til vikarpris. */
export const vikarCost = (state: GameState, gap: RosterGap): number =>
  roundKr(WAGE_PER_HOUR.helsefagarbeider * BALANCE.vikarWageMult * gapHours(state, gap))

/** Ekstravakt: overtidstillegget kommer på toppen av den vanlige timelønna. */
export const overtimeCost = (state: GameState, gap: RosterGap, s: StaffMember): number =>
  roundKr(wageOf(s) * BALANCE.overtimeWageBonus * gapHours(state, gap))

/** Faste ansatte som kan spørres om ekstravakt: på jobb-bare, ikke allerede på vakta, ikke gradert. */
export function overtimeCandidates(state: GameState, gap: RosterGap): StaffId[] {
  const slots = slotsFor(modifiersFor(state))
  const onShift = new Set(state.roster[gap.shift].slice(0, slots))
  const covering = new Set(state.gaps.filter((g) => g.cover === 'overtid').map((g) => g.coverId))
  return state.staffOrder.filter((id) => {
    const s = state.staff[id]
    return canWork(s, gap.shift, state.minute) && !isGradert(s, state.minute) && !onShift.has(id) && !covering.has(id)
  })
}

export type GapChoice = { cover: 'vikar' } | { cover: 'overtid'; staffId: StaffId } | { cover: 'under' }

/** Løser et hull i turnusen for den ene vakta: vikar, ekstravakt eller bevisst underbemanning. */
export function resolveGap(state: GameState, gapId: number, choice: GapChoice): ActionResult {
  const gap = state.gaps.find((g) => g.id === gapId)
  if (!gap) return fail('Vakta er allerede over.')
  if (gap.cover === 'vikar' || gap.cover === 'overtid') return fail('Plassen er allerede dekket.')
  const absent = state.staff[gap.staffId]
  const d = cloneState(state)
  const dg = d.gaps.find((g) => g.id === gapId)!
  const shiftName = SHIFTS[gap.shift].name.toLowerCase()

  if (choice.cover === 'vikar') {
    const cost = vikarCost(state, gap)
    if (state.resources.budget < cost) return fail('Ikke nok budsjettmidler til vikar.')
    d.resources.budget -= cost
    dg.cover = 'vikar'
    pushEvent(d, 'vikar', `Tilkallingsvikar dekker ${shiftName} for ${absent?.name.split(' ')[0] ?? 'plassen'} (${cost} kr).`)
  } else if (choice.cover === 'overtid') {
    const s = d.staff[choice.staffId]
    if (!s || !overtimeCandidates(state, gap).includes(choice.staffId)) return fail('Den ansatte kan ikke ta denne vakta.')
    const cost = overtimeCost(state, gap, s)
    if (state.resources.budget < cost) return fail('Ikke nok budsjettmidler til overtid.')
    d.resources.budget -= cost
    s.stress = Math.min(100, s.stress + BALANCE.overtimeStress)
    s.energy = Math.max(0, s.energy - BALANCE.overtimeEnergy)
    dg.cover = 'overtid'
    dg.coverId = s.id
    pushEvent(d, 'vikar', `${s.name.split(' ')[0]} tar ekstravakt på ${shiftName} (overtid, +${cost} kr).`)
  } else {
    dg.cover = 'under'
  }
  return { ok: true, state: d }
}

/** Det studiepermisjon koster avdelingen (vikarmidler og kursavgift). */
export const studyLeaveCost = (state: GameState): number => BALANCE.studyLeaveCost * (1 + state.tier)

/** Innvilger studiepermisjon: varslet et døgn i forveien, og den ansatte kommer tilbake med et solid erfaringsløft. */
export function grantStudyLeave(state: GameState, staffId: StaffId): ActionResult {
  const s = state.staff[staffId]
  if (!s) return fail('Fant ikke den ansatte.')
  if (s.absence) return fail(`${s.name.split(' ')[0]} har allerede fravær eller permisjon.`)
  if (s.course) return fail(`${s.name.split(' ')[0]} er på kurs.`)
  if (s.level >= BALANCE.maxLevel) return fail(`${s.name.split(' ')[0]} er allerede på høyeste nivå.`)
  const cost = studyLeaveCost(state)
  if (state.resources.budget < cost) return fail('Ikke nok budsjettmidler.')
  const d = cloneState(state)
  d.resources.budget -= cost
  startAbsence(d, d.staff[staffId], 'studiepermisjon', BALANCE.studyLeaveDays, BALANCE.leaveNoticeHours)
  pushEvent(d, 'fravaer', `${s.name} har fått innvilget studiepermisjon (${BALANCE.studyLeaveDays} døgn, fra i morgen).`)
  return { ok: true, state: d }
}

// ---------------------------------------------------------------------------
// Rekruttering (gacha)
// ---------------------------------------------------------------------------

export function recruitCost(state: GameState, bannerId: BannerId): number {
  const banner = BANNERS[bannerId]
  return banner.cost.currency === 'budget'
    ? softBannerCost(banner.cost.amount, state.lifetime.recruits)
    : banner.cost.amount
}

function rollRarity(d: GameState, bannerId: BannerId, usePity: boolean): Rarity {
  const banner = BANNERS[bannerId]
  let pool = RARITY_ORDER
  if (usePity && banner.pity && d.monetization.gacha.pity[bannerId] + 1 >= banner.pity.pulls) {
    const min = RARITY[banner.pity.rarity].order
    pool = RARITY_ORDER.filter((r) => RARITY[r].order >= min)
  }
  let total = 0
  for (const r of pool) total += banner.rates[r]
  let roll = rand(d) * total
  for (const r of pool) {
    roll -= banner.rates[r]
    if (roll < 0) return r
  }
  return pool[pool.length - 1]
}

function hire(d: GameState, bannerId: BannerId, rarity: Rarity): StaffMember {
  const banner = BANNERS[bannerId]
  d.monetization.gacha.totalPulls++
  const staff = generateStaff(d, {
    id: `n${d.monetization.gacha.totalPulls}`,
    rarity,
    professionWeights: banner.professionWeights,
    hiredAt: d.minute,
  })
  d.staff[staff.id] = staff
  d.staffOrder.push(staff.id)
  return staff
}

export function recruit(state: GameState, bannerId: BannerId): ActionResult<{ staffId: StaffId }> {
  const banner = BANNERS[bannerId]
  if (!banner) return fail('Ukjent utlysning.')
  if (state.staffOrder.length >= BALANCE.staffCap) return fail(`Staben er full (${BALANCE.staffCap}). Avslutt et arbeidsforhold først.`)
  const cost = recruitCost(state, bannerId)
  if (state.resources[banner.cost.currency] < cost) {
    return fail(banner.cost.currency === 'budget' ? 'Ikke nok budsjettmidler.' : 'Ikke nok Kaffekopper.')
  }
  const d = cloneState(state)
  d.resources[banner.cost.currency] -= cost
  const rarity = rollRarity(d, bannerId, true)
  if (banner.pity) {
    const hit = RARITY[rarity].order >= RARITY[banner.pity.rarity].order
    d.monetization.gacha.pity[bannerId] = hit ? 0 : d.monetization.gacha.pity[bannerId] + 1
  }
  const staff = hire(d, bannerId, rarity)
  d.lifetime.recruits++
  d.monetization.gacha.lastPull = { banner: bannerId, staffId: staff.id, rerolled: false }
  return { ok: true, state: d, staffId: staff.id }
}

function removeStaff(d: GameState, staffId: StaffId): void {
  delete d.staff[staffId]
  d.staffOrder = d.staffOrder.filter((id) => id !== staffId)
  for (const shift of SHIFT_ORDER) d.roster[shift] = d.roster[shift].map((id) => (id === staffId ? null : id))
  for (const tpl of d.monetization.rosterTemplates) {
    for (const shift of SHIFT_ORDER) tpl.roster[shift] = tpl.roster[shift].map((id) => (id === staffId ? null : id))
  }
}

/** Bytter ut siste søker med et nytt trekk (belønning for rewarded ad). */
export function rerollLastRecruit(state: GameState): ActionResult<{ staffId: StaffId }> {
  const last = state.monetization.gacha.lastPull
  if (!last || !state.staff[last.staffId]) return fail('Ingen søker å bytte ut.')
  if (last.rerolled) return fail('Denne søkeren er allerede byttet én gang.')
  const d = cloneState(state)
  removeStaff(d, last.staffId)
  const staff = hire(d, last.banner, rollRarity(d, last.banner, false))
  d.monetization.gacha.lastPull = { banner: last.banner, staffId: staff.id, rerolled: true }
  d.monetization.adsWatched++
  return { ok: true, state: d, staffId: staff.id }
}

export function dismissStaff(state: GameState, staffId: StaffId): ActionResult {
  if (!state.staff[staffId]) return fail('Fant ikke den ansatte.')
  if (state.staffOrder.length <= 3) return fail('Du må ha minst tre ansatte.')
  const d = cloneState(state)
  removeStaff(d, staffId)
  if (d.monetization.gacha.lastPull?.staffId === staffId) d.monetization.gacha.lastPull = null
  return { ok: true, state: d }
}

// ---------------------------------------------------------------------------
// Butikk, tidshopp, pass og tilsyn
// ---------------------------------------------------------------------------

/** Ekstravakt: simuler `hours` reelle timer med en gang, betalt med Kaffekopper. */
export function timeSkip(state: GameState, itemId: string): ActionResult<{ gained: { fagpoeng: number; budget: number } }> {
  const item = SHOP_BY_ID[itemId]
  if (!item || item.kind !== 'tidshopp' || !item.hours || !item.priceKaffe) return fail('Ukjent tidshopp.')
  if (state.resources.kaffekopper < item.priceKaffe) return fail('Ikke nok Kaffekopper.')
  const { state: d, totals } = simulate(state, realMsToGameMinutes(item.hours * 3_600_000))
  d.resources.kaffekopper -= item.priceKaffe
  return { ok: true, state: d, gained: { fagpoeng: totals.fagpoeng, budget: totals.budget } }
}

/**
 * Innvilger et kjøp for ekte penger. Kalles først når betalingsleverandøren
 * (eller serveren) har bekreftet kvitteringen.
 */
export function grantPurchase(state: GameState, itemId: string, nowMs: number): ActionResult {
  const item = SHOP_BY_ID[itemId]
  if (!item || item.priceNok === undefined) return fail('Ukjent vare.')
  const d = cloneState(state)
  if (item.kind === 'vip') {
    if (d.monetization.vip) return fail('Du har allerede Avdelingsleder Pluss.')
    d.monetization.vip = true
  } else if (item.kind === 'tilsynspass') {
    if (d.monetization.seasonPass.premium) return fail('Tilsynspasset er allerede aktivt.')
    d.monetization.seasonPass.premium = true
  }
  if (item.grants) applyReward(d, item.grants)
  d.monetization.purchases.push({ itemId, at: nowMs })
  return { ok: true, state: d }
}

export const passLevel = (state: GameState): number =>
  Math.min(SEASON_PASS_LEVELS.length, Math.floor(state.monetization.seasonPass.xp / PASS_XP_PER_LEVEL))

export function claimPassReward(state: GameState, level: number, track: 'free' | 'premium'): ActionResult<{ reward: Reward }> {
  const def = SEASON_PASS_LEVELS.find((l) => l.level === level)
  const pass = state.monetization.seasonPass
  if (!def) return fail('Ukjent nivå.')
  if (level > passLevel(state)) return fail('Nivået er ikke nådd ennå.')
  if (track === 'premium' && !pass.premium) return fail('Krever Tilsynspasset.')
  const claimed = track === 'free' ? pass.claimedFree : pass.claimedPremium
  if (claimed.includes(level)) return fail('Allerede hentet.')
  const d = cloneState(state)
  const dp = d.monetization.seasonPass
  ;(track === 'free' ? dp.claimedFree : dp.claimedPremium).push(level)
  const reward = applyReward(d, def[track])
  return { ok: true, state: d, reward }
}

/** Har uka nok fullførte vakter til at resultatet teller? */
export const inspectionQualified = (state: GameState): boolean =>
  state.inspection.shifts >= BALANCE.inspectionMinShifts

export function claimInspectionTier(state: GameState, index: number): ActionResult<{ reward: Reward }> {
  const tier = INSPECTION_TIERS[index]
  if (!tier) return fail('Ukjent terskel.')
  if (!inspectionQualified(state)) {
    return fail(`Tilsynet trenger ${BALANCE.inspectionMinShifts} fullførte vakter før resultatet teller.`)
  }
  if (inspectionAverage(state) < tier.score) return fail('Snittet er ikke høyt nok ennå.')
  if (state.inspection.claimed.includes(index)) return fail('Allerede hentet.')
  const d = cloneState(state)
  d.inspection.claimed.push(index)
  const reward: Reward = { kaffekopper: tier.kaffekopper, passXp: tier.passXp }
  applyReward(d, reward)
  return { ok: true, state: d, reward }
}

/** Rewarded ad: dobler utbetalingen fra forrige vakt. */
export function doubleLastShift(state: GameState): ActionResult<{ reward: Reward }> {
  const last = state.shift.last
  if (!last) return fail('Ingen fullført vakt ennå.')
  if (last.doubled) return fail('Vakta er allerede doblet.')
  const d = cloneState(state)
  const reward: Reward = { fagpoeng: Math.max(0, last.fagpoeng), budget: Math.max(0, last.budget) }
  applyReward(d, reward)
  d.shift.last!.doubled = true
  d.shift.last!.seen = true
  d.monetization.adsWatched++
  return { ok: true, state: d, reward }
}

export function markShiftReportSeen(state: GameState): ActionResult {
  const d = cloneState(state)
  if (d.shift.last) d.shift.last.seen = true
  return { ok: true, state: d }
}

// ---------------------------------------------------------------------------
// Profil og innstillinger
// ---------------------------------------------------------------------------

/** Returnerer en feilmelding hvis avdelingsnavnet ikke er gyldig, ellers null. */
export function validateWardName(name: string): string | null {
  const length = [...name.trim()].length
  if (length < BALANCE.wardNameMin) return `Avdelingsnavnet må ha minst ${BALANCE.wardNameMin} tegn.`
  if (length > BALANCE.wardNameMax) return `Avdelingsnavnet kan ha høyst ${BALANCE.wardNameMax} tegn.`
  return null
}

export interface ProfileInput {
  wardName: string
  county: string
  profession: PlayerProfession
}

/** Lagrer avdelingsnavn, fylke og yrkesgruppe. Fullfører også onboarding første gang. */
export function updateProfile(state: GameState, input: ProfileInput): ActionResult {
  const nameError = validateWardName(input.wardName)
  if (nameError) return fail(nameError)
  if (!COUNTIES.includes(input.county)) return fail('Velg et fylke fra lista.')
  if (!(input.profession in PLAYER_PROFESSIONS)) return fail('Velg en yrkesgruppe fra lista.')
  const d = cloneState(state)
  d.profile = { wardName: input.wardName.trim(), county: input.county, profession: input.profession, onboarded: true }
  return { ok: true, state: d }
}

const SETTING_KEYS: (keyof Settings)[] = ['sound', 'music', 'haptics', 'notifications']

export function updateSettings(state: GameState, patch: Partial<Settings>): ActionResult {
  const d = cloneState(state)
  for (const key of SETTING_KEYS) {
    const value = patch[key]
    if (typeof value === 'boolean') d.settings[key] = value
  }
  return { ok: true, state: d }
}

// ---------------------------------------------------------------------------
// Eksport, import og nullstilling av lagring
// ---------------------------------------------------------------------------

export const SAVE_FILE_APP = 'vaktrommet'
const SAVE_MAX_CHARS = 5_000_000

/** Lagringsfilen betatestere kan kopiere, laste ned og sende over. */
export interface SaveFile {
  app: typeof SAVE_FILE_APP
  formatVersion: number
  exportedAt: number
  game: GameState
}

export function exportSave(state: GameState, nowMs: number): string {
  const file: SaveFile = { app: SAVE_FILE_APP, formatVersion: STATE_VERSION, exportedAt: nowMs, game: state }
  return JSON.stringify(file)
}

/** Det viktigste om en lagring – vises før spilleren bekrefter en import. */
export interface SaveSummary {
  wardName: string
  wardType: WardTypeId
  tier: number
  day: number
  rotations: number
  staff: number
  /** Formatversjonen fila hadde før den ble løftet til dagens. */
  sourceVersion: number
  exportedAt: number | null
}

export type ParsedSave = { ok: true; game: GameState; summary: SaveSummary } | { ok: false; reason: string }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Leser og validerer en lagringsfil uten å endre noe. Godtar eksportformatet,
 * rå localStorage-verdi ({ state: { game } }) og en ren GameState, og løfter
 * eldre versjoner med migrateGameState.
 */
export function parseSave(json: string, nowMs: number): ParsedSave {
  const text = json.trim()
  if (!text) return { ok: false, reason: 'Lim inn lagringen først.' }
  if (text.length > SAVE_MAX_CHARS) return { ok: false, reason: 'Fila er for stor til å være en Vaktrommet-lagring.' }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'Dette er ikke gyldig JSON. Sjekk at hele teksten ble med.' }
  }
  if (!isRecord(data)) return { ok: false, reason: 'Fant ingen lagring i teksten.' }

  let raw: unknown = data
  let exportedAt: number | null = null
  if (data.app === SAVE_FILE_APP && isRecord(data.game)) {
    raw = data.game
    exportedAt = typeof data.exportedAt === 'number' ? data.exportedAt : null
  } else if (isRecord(data.state) && isRecord(data.state.game)) {
    raw = data.state.game
  }

  if (
    !isRecord(raw) ||
    !isRecord(raw.resources) ||
    typeof raw.resources.budget !== 'number' ||
    !isRecord(raw.staff) ||
    Object.keys(raw.staff).length === 0 ||
    typeof raw.minute !== 'number'
  ) {
    return { ok: false, reason: 'Teksten ser ikke ut som en Vaktrommet-lagring.' }
  }
  const sourceVersion = typeof raw.version === 'number' ? raw.version : 1
  if (sourceVersion > STATE_VERSION) {
    return { ok: false, reason: 'Lagringen kommer fra en nyere versjon av spillet. Oppdater og prøv igjen.' }
  }

  const game = migrateGameState(raw, nowMs)
  return {
    ok: true,
    game,
    summary: {
      wardName: game.profile.wardName,
      wardType: game.wardType,
      tier: game.tier,
      day: dayNumber(game.minute),
      rotations: game.prestige.rotations,
      staff: game.staffOrder.length,
      sourceVersion,
      exportedAt,
    },
  }
}

/** Erstatter spillet med en importert lagring. */
export function importSave(_state: GameState, json: string, nowMs: number): ActionResult<{ summary: SaveSummary }> {
  const parsed = parseSave(json, nowMs)
  if (!parsed.ok) return fail(parsed.reason)
  return { ok: true, state: parsed.game, summary: parsed.summary }
}

/**
 * Starter helt på nytt. Innstillinger og betalte medlemskap (Pluss, sesongens
 * pass og kjøpsloggen) beholdes; alt annet – også Kaffekopper – nullstilles.
 */
export function resetGame(state: GameState, nowMs: number): ActionResult {
  const d = createInitialState(nowMs)
  d.settings = { ...state.settings }
  d.profile = { ...state.profile, onboarded: false }
  d.monetization.vip = state.monetization.vip
  d.monetization.purchases = state.monetization.purchases.map((p) => ({ ...p }))
  if (state.monetization.seasonPass.seasonId === d.monetization.seasonPass.seasonId) {
    d.monetization.seasonPass.premium = state.monetization.seasonPass.premium
  }
  return { ok: true, state: d }
}

/**
 * Gjenoppretter medlemskap ut fra kjøp butikken kjenner til (`ownedItemIds`)
 * og kjøpsloggen i lagringen. Forbruksvarer som Kaffekopper gjenopprettes ikke.
 */
export function restorePurchases(
  state: GameState,
  ownedItemIds: string[],
  nowMs: number,
): ActionResult<{ restored: string[] }> {
  const d = cloneState(state)
  const restored: string[] = []
  const season = seasonId(nowMs)
  const logged = (kind: string, inSeasonOnly: boolean) =>
    state.monetization.purchases.some(
      (p) => SHOP_BY_ID[p.itemId]?.kind === kind && (!inSeasonOnly || seasonId(p.at) === season),
    )
  const owned = (kind: string) => ownedItemIds.some((id) => SHOP_BY_ID[id]?.kind === kind)

  if (!d.monetization.vip && (owned('vip') || logged('vip', false))) {
    d.monetization.vip = true
    restored.push('vip')
  }
  const pass = d.monetization.seasonPass
  if (!pass.premium && pass.seasonId === season && (owned('tilsynspass') || logged('tilsynspass', true))) {
    pass.premium = true
    restored.push('tilsynspass')
  }
  return { ok: true, state: d, restored }
}

// ---------------------------------------------------------------------------
// Oppdagelsesbok
// ---------------------------------------------------------------------------

/** Markerer nye synergifunn som sett (etter at UI-et har feiret dem). */
export function acknowledgeDiscoveries(state: GameState): ActionResult {
  if (state.discoveries.unseen.length === 0) return { ok: true, state }
  const d = cloneState(state)
  d.discoveries.unseen = []
  return { ok: true, state: d }
}

// ---------------------------------------------------------------------------
// Morgenkaffe (daglig innsjekk)
// ---------------------------------------------------------------------------

export interface StreakStatus {
  /** Kan spilleren sjekke inn nå (ikke gjort i dag)? */
  canCheckIn: boolean
  /** Rekka slik den står hvis spilleren sjekker inn nå. */
  nextCount: number
  /** Dag 1–7 i belønningsuka for neste innsjekk. */
  rewardDay: number
  /** Rekka slik den vises nå (0 hvis den er brutt). */
  count: number
  /** Ukas avspaseringsdag er ubrukt. */
  freeDayAvailable: boolean
  /** Neste innsjekk bruker avspaseringsdagen for å redde rekka. */
  usesFreeDay: boolean
  /** Rekka er brutt og starter på nytt ved neste innsjekk. */
  broken: boolean
}

/**
 * Status for Morgenkaffe-rekka. Datoen regnes i norsk tid. Går det én dag uten
 * innsjekk, brukes ukas avspaseringsdag automatisk – turnusarbeidere mister
 * ikke rekka på grunn av én nattevakt. To dager uten, eller en ny glipp i
 * samme uke, starter rekka på nytt.
 */
export function streakStatus(state: GameState, nowMs: number): StreakStatus {
  const { count, lastDay, freeWeek } = state.streak
  const today = osloDayIndex(nowMs)
  const freeDayAvailable = freeWeek !== osloWeekKey(nowMs)
  const gap = lastDay === null ? Infinity : today - lastDay
  const canCheckIn = gap !== 0 && gap > 0
  const usesFreeDay = gap === 2 && freeDayAvailable
  const continues = gap === 1 || usesFreeDay
  const alive = gap === 0 || continues
  const nextCount = gap === 0 ? count : continues ? count + 1 : 1
  return {
    canCheckIn,
    nextCount,
    rewardDay: ((Math.max(1, nextCount) - 1) % MORGENKAFFE_REWARDS.length) + 1,
    count: alive ? count : 0,
    freeDayAvailable,
    usesFreeDay,
    broken: lastDay !== null && !alive,
  }
}

export function checkInMorgenkaffe(
  state: GameState,
  nowMs: number,
): ActionResult<{ reward: Reward; status: StreakStatus }> {
  const status = streakStatus(state, nowMs)
  if (!status.canCheckIn) return fail('Du har allerede tatt morgenkaffen i dag.')
  const d = cloneState(state)
  d.streak.count = status.nextCount
  d.streak.lastDay = osloDayIndex(nowMs)
  if (status.usesFreeDay) d.streak.freeWeek = osloWeekKey(nowMs)
  d.streak.best = Math.max(d.streak.best, d.streak.count)
  d.streak.total++
  const reward = applyReward(d, MORGENKAFFE_REWARDS[status.rewardDay - 1])
  return { ok: true, state: d, reward, status }
}

// ---------------------------------------------------------------------------
// Avdelingsrotasjon (endgame)
// ---------------------------------------------------------------------------

export const canRotate = (state: GameState): boolean => state.tier >= BALANCE.rotationUnlockTier

export interface RotationPreview {
  renommeGain: number
  /** Fagboka du får for avdelingen du overleverer, og nivået den havner på. */
  fagbok: { wardType: WardTypeId; name: string; level: number; maxed: boolean }
  bankedDrift: number
  quality: number
}

/** Hva en overlevering gir akkurat nå. */
export function rotationPreview(state: GameState): RotationPreview {
  const quality = qualityIndex(state).index
  const current = state.prestige.fagboker[state.wardType] ?? 0
  return {
    renommeGain: BALANCE.renommeBase + Math.floor(quality / BALANCE.renommePerQuality),
    fagbok: {
      wardType: state.wardType,
      name: WARD_TYPES[state.wardType].fagbok.name,
      level: Math.min(BALANCE.fagbokMaxLevel, current + 1),
      maxed: current >= BALANCE.fagbokMaxLevel,
    },
    bankedDrift: wardDriftScore(state),
    quality,
  }
}

/** Sjeldenhet og nivå avgjør hvem som er mest verdt å ta med videre: høyest nivå først, så sjeldenhet. */
export function staffByMerit(state: GameState): StaffId[] {
  const pos = new Map(state.staffOrder.map((id, i) => [id, i]))
  return [...state.staffOrder].sort((a, b) => {
    const x = state.staff[a]
    const y = state.staff[b]
    return y.level - x.level || RARITY[y.rarity].order - RARITY[x.rarity].order || pos.get(a)! - pos.get(b)!
  })
}

export interface RotationChoice {
  wardType: WardTypeId
  /** Inntil tre nøkkelansatte som blir med videre. */
  keepStaff: StaffId[]
  wardName?: string
}

/**
 * Overleverer avdelingen og starter et nytt oppdrag. Renommé, fagbøker,
 * Kaffekopper, kjøp og inntil tre nøkkelansatte blir med; budsjett, Fagpoeng,
 * oppgraderinger, nivå og resten av staben starter på nytt.
 */
export function rotateWard(state: GameState, choice: RotationChoice): ActionResult {
  if (!canRotate(state)) return fail('Avdelingen må være Kompetansesenter før den kan overleveres.')
  const ward = WARD_TYPES[choice.wardType]
  if (!ward) return fail('Ukjent avdelingstype.')
  const keep = [...new Set(choice.keepStaff)]
  if (keep.length > BALANCE.rotationKeepStaff) return fail(`Du kan ta med inntil ${BALANCE.rotationKeepStaff} ansatte.`)
  if (keep.some((id) => !state.staff[id])) return fail('Fant ikke alle de valgte ansatte.')

  const name = choice.wardName?.trim()
  if (name) {
    const nameError = validateWardName(name)
    if (nameError) return fail(nameError)
  }

  const preview = rotationPreview(state)
  const d = cloneState(state)

  // ---- Det du tar med deg ----
  const banked = d.prestige.bankedLifetime
  for (const key of Object.keys(banked) as (keyof typeof banked)[]) banked[key] += state.lifetime[key]
  d.prestige.rotations++
  d.prestige.renomme += preview.renommeGain
  d.prestige.fagboker[state.wardType] = preview.fagbok.level
  d.prestige.bankedDrift += preview.bankedDrift
  d.prestige.history.push({
    wardType: state.wardType,
    wardName: state.profile.wardName,
    drift: preview.bankedDrift,
    quality: preview.quality,
    minute: state.minute,
  })
  d.resources.kaffekopper += BALANCE.rotationKaffekopper

  // ---- Ny avdeling ----
  d.wardType = choice.wardType
  if (name) d.profile.wardName = name
  d.resources.budget = BALANCE.start.budget
  d.resources.fagpoeng = BALANCE.start.fagpoeng
  d.lifetime = emptyLifetime()
  d.ward.trivsel = BALANCE.start.trivsel
  d.ward.avvik = 0
  d.ward.avvikProgress = 0
  d.upgrades = emptyUpgradeLevels()
  d.tier = 0
  d.quality = { trivsel: BALANCE.start.trivsel, avvikPerBedDay: 0.25, absence: 0, stress: 30, efficiency: 0.6, competence: 0.6, hours: 0 }
  d.shift.current = newAccumulator(d.minute)
  d.shift.last = null
  d.dilemmas.active = []
  d.dilemmas.followUps = []
  d.gaps = []
  d.thanks = { ...defaultThanks(), total: d.thanks.total }
  d.dilemmas.nextAt = d.minute + 4 * MIN_PER_HOUR
  d.monetization.rosterTemplates = []
  d.monetization.gacha.lastPull = null

  // ---- Stab: nøkkelansatte + nye kolleger som allerede jobber der ----
  const staff: Record<StaffId, StaffMember> = {}
  for (const id of keep) {
    const s = d.staff[id]
    s.energy = s.stamina
    s.stress = 15
    s.absence = null
    s.strain = 0
    s.course = null
    staff[id] = s
  }
  d.staff = staff
  d.staffOrder = keep
  while (d.staffOrder.length < BALANCE.rotationStaffCount) {
    d.monetization.gacha.totalPulls++
    const s = generateStaff(d, { id: `n${d.monetization.gacha.totalPulls}`, rarity: 'vanlig', hiredAt: d.minute })
    d.staff[s.id] = s
    d.staffOrder.push(s.id)
  }
  for (const shift of SHIFT_ORDER) d.roster[shift] = Array.from({ length: BALANCE.maxSlots }, () => null)

  // ---- Beboere etter den nye avdelingens profil, og et første turnusforslag ----
  d.residents = []
  syncResidents(d, modifiersFor(d), true)
  for (const shift of SHIFT_ORDER) fillShift(d, shift)

  d.events = []
  pushEvent(d, 'avdeling', `Nytt oppdrag: ${ward.name}. +${preview.renommeGain} renommé, fagbok «${preview.fagbok.name}».`)
  return { ok: true, state: d }
}
