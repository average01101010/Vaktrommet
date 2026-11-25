import { BALANCE, RARITY, TIERS } from '@/data/balance'
import { SKILL_ORDER } from '@/data/professions'
import { UPGRADES } from '@/data/upgrades'
import { WARD_TYPE_ORDER, WARD_TYPES } from '@/data/wards'
import type { GameState, ModifierDelta, Modifiers, ShiftId, SkillId, StaffMember } from '@/types'

const SHIFTS: ShiftId[] = ['dag', 'aften', 'natt']

export function baseModifiers(): Modifiers {
  return {
    fagpoengMult: 1,
    budgetMult: 1,
    trivselBonus: 0,
    stressMult: 1,
    energyDrainMult: 1,
    recoveryMult: 1,
    avvikMult: 1,
    xpMult: 1,
    courseSpeedMult: 1,
    demandMult: { dag: 1, aften: 1, natt: 1 },
    skillMult: Object.fromEntries(SKILL_ORDER.map((s) => [s, 1])) as Record<SkillId, number>,
    extraSlots: 0,
    extraBeds: 0,
    maxSkillLevel: 0,
  }
}

function applyDelta(m: Modifiers, d: ModifierDelta, level: number): void {
  const pow = (x: number | undefined) => (x === undefined ? 1 : Math.pow(x, level))
  m.fagpoengMult *= pow(d.fagpoengMult)
  m.budgetMult *= pow(d.budgetMult)
  m.stressMult *= pow(d.stressMult)
  m.energyDrainMult *= pow(d.energyDrainMult)
  m.recoveryMult *= pow(d.recoveryMult)
  m.avvikMult *= pow(d.avvikMult)
  m.xpMult *= pow(d.xpMult)
  m.courseSpeedMult *= pow(d.courseSpeedMult)
  m.trivselBonus += (d.trivselBonus ?? 0) * level
  m.extraSlots += (d.extraSlots ?? 0) * level
  m.extraBeds += (d.extraBeds ?? 0) * level
  m.maxSkillLevel += (d.maxSkillLevel ?? 0) * level
  if (d.demandMult) for (const s of SHIFTS) m.demandMult[s] *= pow(d.demandMult[s])
  if (d.skillMult) for (const s of SKILL_ORDER) m.skillMult[s] *= pow(d.skillMult[s])
}

export type ModifierSource = Pick<GameState, 'upgrades' | 'wardType' | 'prestige'>

/**
 * Summerer alt som påvirker motoren til ett sett modifikatorer:
 * kjøpte oppgraderinger, avdelingstypen, fagbøker og renommé.
 */
export function modifiersFor(state: ModifierSource): Modifiers {
  const m = baseModifiers()
  for (const def of UPGRADES) {
    const level = state.upgrades[def.id] ?? 0
    if (level > 0) applyDelta(m, def.perLevel, level)
  }
  applyDelta(m, WARD_TYPES[state.wardType].mods, 1)
  for (const id of WARD_TYPE_ORDER) {
    const level = state.prestige.fagboker[id] ?? 0
    if (level > 0) applyDelta(m, WARD_TYPES[id].fagbok.perLevel, level)
  }
  m.fagpoengMult *= 1 + state.prestige.renomme * BALANCE.renommeFagpoeng
  m.budgetMult *= 1 + state.prestige.renomme * BALANCE.renommeBudget
  return m
}

export const slotsFor = (m: Modifiers): number => Math.min(BALANCE.maxSlots, BALANCE.baseSlots + m.extraSlots)

export const bedsFor = (m: Modifiers): number => BALANCE.baseBeds + m.extraBeds

/**
 * Egenskapstaket for en ansatt: sjeldenheten setter grunntaket, og
 * videreutdanning (maxSkillLevel) løfter det – aldri over skillCeiling.
 */
export const maxSkillLevelFor = (s: Pick<StaffMember, 'rarity'>, m: Modifiers): number =>
  Math.min(BALANCE.skillCeiling, RARITY[s.rarity].maxSkill + Math.floor(m.maxSkillLevel + 1e-9))

/** Fagpoeng som kreves for et nivå. Tersklene øker for hver overleverte avdeling. */
export const tierThreshold = (tier: number, rotations: number): number =>
  Math.round(TIERS[tier].fagpoeng * (1 + rotations * BALANCE.tierScalePerRotation))

/** Avdelingsnivå (0–5) ut fra Fagpoeng opptjent på denne avdelingen. */
export function tierFor(lifetimeFagpoeng: number, rotations = 0): number {
  let tier = 0
  for (let i = 0; i < TIERS.length; i++) if (lifetimeFagpoeng >= tierThreshold(i, rotations)) tier = i
  return tier
}

export function tierProgress(state: GameState): { tier: number; next: number | null; progress: number } {
  const tier = state.tier
  if (tier + 1 >= TIERS.length) return { tier, next: null, progress: 1 }
  const from = tierThreshold(tier, state.prestige.rotations)
  const next = tierThreshold(tier + 1, state.prestige.rotations)
  return {
    tier,
    next,
    progress: Math.max(0, Math.min(1, (state.lifetime.fagpoeng - from) / (next - from))),
  }
}

export const offlineCapHours = (state: GameState): number =>
  state.monetization.vip ? BALANCE.offlineCapHoursVip : BALANCE.offlineCapHours
