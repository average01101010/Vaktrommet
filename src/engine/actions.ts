import { BALANCE, INSPECTION_TIERS, RARITY, RARITY_ORDER, SHIFT_ORDER } from '@/data/balance'
import { DILEMMA_BY_ID } from '@/data/dilemmas'
import { BANNERS, PASS_XP, PASS_XP_PER_LEVEL, SEASON_PASS_LEVELS, SHOP_BY_ID, softBannerCost } from '@/data/economy'
import { UPGRADE_BY_ID, upgradeCost } from '@/data/upgrades'
import type {
  BannerId,
  DilemmaResolution,
  Effect,
  GameState,
  PlayerProfile,
  Rarity,
  Requirement,
  Reward,
  Roster,
  ShiftId,
  SkillId,
  StaffId,
  StaffMember,
  UpgradeDef,
  UpgradeId,
} from '@/types'
import { computeModifiers, slotsFor } from './modifiers'
import { rand } from './rng'
import { cloneState, pushEvent, simulate, syncTier } from './simulation'
import { generateStaff } from './staffFactory'
import { evaluateShift, isAvailable, shiftCountOf } from './synergy'
import { MIN_PER_HOUR, realMsToGameMinutes, shiftAt } from './time'

/**
 * Alle spillerhandlinger som rene funksjoner: (state, …) → ny state eller feil.
 * UI-laget (store) kaller disse; serveren kan kjøre de samme for å validere.
 */
export type ActionResult<T = object> = ({ ok: true; state: GameState } & T) | { ok: false; reason: string }

const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason })

// ---------------------------------------------------------------------------
// Belønninger
// ---------------------------------------------------------------------------

export function applyReward(d: GameState, r: Reward): void {
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
}

// ---------------------------------------------------------------------------
// Turnus
// ---------------------------------------------------------------------------

export function assignStaff(state: GameState, shift: ShiftId, slot: number, staffId: StaffId): ActionResult {
  const slots = slotsFor(computeModifiers(state.upgrades))
  if (slot < 0 || slot >= slots) return fail('Denne vaktplassen er ikke låst opp ennå.')
  const staff = state.staff[staffId]
  if (!staff) return fail('Fant ikke den ansatte.')

  const d = cloneState(state)
  const row = d.roster[shift]
  const existing = row.indexOf(staffId)
  if (existing === slot) return { ok: true, state: d }
  if (existing >= 0) {
    // Flytt innad på vakta: bytt plass.
    row[existing] = row[slot]
    row[slot] = staffId
    return { ok: true, state: d }
  }
  if (shiftCountOf(state, staffId, slots) >= BALANCE.maxShiftsPerStaff) {
    return fail(`${staff.name.split(' ')[0]} står allerede på ${BALANCE.maxShiftsPerStaff} vakter i døgnet.`)
  }
  row[slot] = staffId
  return { ok: true, state: d }
}

/** Setter den ansatte på første ledige plass på vakta. */
export function assignToFirstFree(state: GameState, shift: ShiftId, staffId: StaffId): ActionResult {
  const slots = slotsFor(computeModifiers(state.upgrades))
  const row = state.roster[shift]
  if (row.slice(0, slots).includes(staffId)) return fail('Står allerede på denne vakta.')
  const free = row.slice(0, slots).indexOf(null)
  if (free < 0) return fail('Vakta er full. Ta noen av først.')
  return assignStaff(state, shift, free, staffId)
}

export function unassignSlot(state: GameState, shift: ShiftId, slot: number): ActionResult {
  const d = cloneState(state)
  d.roster[shift][slot] = null
  return { ok: true, state: d }
}

/** Fyller ledige plasser grådig med de som gir best dekning – kun folk uten annen vakt. */
export function suggestShift(state: GameState, shift: ShiftId): ActionResult {
  const mods = computeModifiers(state.upgrades)
  const slots = slotsFor(mods)
  const d = cloneState(state)
  let filled = 0
  for (let slot = 0; slot < slots; slot++) {
    if (d.roster[shift][slot]) continue
    let best: { id: StaffId; score: number } | null = null
    for (const id of d.staffOrder) {
      const s = d.staff[id]
      if (!isAvailable(s) || shiftCountOf(d, id, slots) > 0) continue
      d.roster[shift][slot] = id
      const ev = evaluateShift(d, shift, mods)
      const bonus = ev.synergies.reduce((n, syn) => n + (syn.tone === 'bonus' ? 0.04 : -0.06), 0)
      const score = ev.coverage + bonus
      if (!best || score > best.score) best = { id, score }
    }
    d.roster[shift][slot] = best ? best.id : null
    if (best) filled++
  }
  if (filled === 0) return fail('Ingen ledige ansatte uten vakt. Rekrutter flere, eller sett noen på dobbeltvakt.')
  return { ok: true, state: d }
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
  return { ok: true, state: d }
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
  return { ok: true, state: d }
}

// ---------------------------------------------------------------------------
// Post-it-dilemmaer
// ---------------------------------------------------------------------------

export function meetsRequirement(state: GameState, req: Requirement | undefined): boolean {
  if (!req) return true
  const ev = evaluateShift(state, shiftAt(state.minute), computeModifiers(state.upgrades))
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
    const ev = evaluateShift(d, shiftAt(d.minute), computeModifiers(d.upgrades))
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
  syncTier(d)
  return { ok: true, state: d, resolution: { defId: def.id, optionId, outcome: option.outcome, applied: e } }
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
  if (s.sickUntil !== null) return fail(`${s.name.split(' ')[0]} er sykmeldt.`)
  if (s.course) return fail(`${s.name.split(' ')[0]} er allerede på kurs.`)
  const mods = computeModifiers(state.upgrades)
  const level = s.skills[skill]
  if (level >= mods.maxSkillLevel) return fail('Egenskapen er allerede på topp.')
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
  ds.skills[ds.course!.skill] = Math.min(computeModifiers(d.upgrades).maxSkillLevel, ds.skills[ds.course!.skill] + 1)
  ds.course = null
  pushEvent(d, 'kurs', `${ds.name} fullførte hurtigkurs.`)
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
  const { state: d, totals } = simulate(state, realMsToGameMinutes(item.hours * 3_600_000), true)
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
  applyReward(d, def[track])
  return { ok: true, state: d, reward: def[track] }
}

export function claimInspectionTier(state: GameState, index: number): ActionResult<{ reward: Reward }> {
  const tier = INSPECTION_TIERS[index]
  if (!tier) return fail('Ukjent terskel.')
  if (state.inspection.points < tier.points) return fail('Terskelen er ikke nådd ennå.')
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

export function setProfile(state: GameState, profile: Partial<PlayerProfile>): ActionResult {
  const d = cloneState(state)
  d.profile = { ...d.profile, ...profile }
  return { ok: true, state: d }
}
