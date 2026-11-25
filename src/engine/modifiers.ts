import { BALANCE, TIERS } from '@/data/balance'
import { SKILL_ORDER } from '@/data/professions'
import { UPGRADES } from '@/data/upgrades'
import type { GameState, ModifierDelta, Modifiers, ShiftId, SkillId, UpgradeLevels } from '@/types'

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
    maxSkillLevel: 5,
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

/** Summerer alle kjøpte oppgraderinger til ett sett modifikatorer. */
export function computeModifiers(upgrades: UpgradeLevels): Modifiers {
  const m = baseModifiers()
  for (const def of UPGRADES) {
    const level = upgrades[def.id] ?? 0
    if (level > 0) applyDelta(m, def.perLevel, level)
  }
  return m
}

export const slotsFor = (m: Modifiers): number => Math.min(BALANCE.maxSlots, BALANCE.baseSlots + m.extraSlots)

export const bedsFor = (m: Modifiers): number => BALANCE.baseBeds + m.extraBeds

/** Avdelingsnivå (0–5) ut fra Fagpoeng opptjent totalt. */
export function tierFor(lifetimeFagpoeng: number): number {
  let tier = 0
  for (let i = 0; i < TIERS.length; i++) if (lifetimeFagpoeng >= TIERS[i].fagpoeng) tier = i
  return tier
}

export function tierProgress(state: GameState): { tier: number; next: number | null; progress: number } {
  const tier = state.tier
  const nextDef = TIERS[tier + 1]
  if (!nextDef) return { tier, next: null, progress: 1 }
  const from = TIERS[tier].fagpoeng
  return {
    tier,
    next: nextDef.fagpoeng,
    progress: Math.max(0, Math.min(1, (state.lifetime.fagpoeng - from) / (nextDef.fagpoeng - from))),
  }
}

export const offlineCapHours = (state: GameState): number =>
  state.monetization.vip ? BALANCE.offlineCapHoursVip : BALANCE.offlineCapHours
