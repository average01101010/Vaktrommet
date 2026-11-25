import { BALANCE, RARITY, SHIFT_DEMAND, WAGE_PER_HOUR } from '@/data/balance'
import { PROFESSION_ORDER, SKILL_ORDER } from '@/data/professions'
import { SYNERGIES, type SynergyContext } from '@/data/synergies'
import type {
  ActiveSynergy,
  GameState,
  Modifiers,
  Profession,
  ShiftEvaluation,
  ShiftId,
  SkillId,
  StaffId,
  StaffMember,
} from '@/types'
import { bedsFor, slotsFor } from './modifiers'

const zeroSkills = (): Record<SkillId, number> =>
  Object.fromEntries(SKILL_ORDER.map((s) => [s, 0])) as Record<SkillId, number>

/** Er den ansatte på jobb-bar akkurat nå (ikke syk og ikke på kurs)? */
export const isAvailable = (s: StaffMember): boolean => s.sickUntil === null && s.course === null

const AFFINITY: Record<ShiftId, string> = { dag: 'morgenfugl', aften: 'kveldsmenneske', natt: 'nattugle' }

/** Hvor mye av egenskapene sine den ansatte får brukt (energi, nivå, døgnrytme). */
export function effectiveness(s: StaffMember, shift: ShiftId): number {
  const energy = 0.5 + 0.5 * Math.max(0, Math.min(1, s.energy / BALANCE.fullEffectEnergy))
  const level = 1 + BALANCE.levelEffect * (s.level - 1)
  const affinity = s.trait === AFFINITY[shift] ? 1 + BALANCE.traitAffinityBonus : 1
  return energy * level * affinity
}

export const wageOf = (s: StaffMember): number => WAGE_PER_HOUR[s.profession] * RARITY[s.rarity].wageMult

/** Hvor mange vakter i døgnet den ansatte står på. */
export function shiftCountOf(state: GameState, id: StaffId, slots: number): number {
  let n = 0
  for (const shift of ['dag', 'aften', 'natt'] as ShiftId[]) {
    if (state.roster[shift].slice(0, slots).includes(id)) n++
  }
  return n
}

/**
 * Kjernen i synergimotoren: gitt bemanningen på én vakt, regn ut dekning,
 * aktive synergier/problemer og alle rater per spilltime.
 */
export function evaluateShift(state: GameState, shift: ShiftId, mods: Modifiers): ShiftEvaluation {
  const slots = slotsFor(mods)
  const beds = bedsFor(mods)
  const bedScale = beds / BALANCE.baseBeds

  const present: StaffMember[] = []
  const presentIds: StaffId[] = []
  const absentIds: StaffId[] = []
  for (const id of state.roster[shift].slice(0, slots)) {
    if (!id) continue
    const s = state.staff[id]
    if (!s) continue
    if (isAvailable(s)) {
      present.push(s)
      presentIds.push(id)
    } else {
      absentIds.push(id)
    }
  }

  // ---- Behov og kapasitet per egenskap ----
  const demand = zeroSkills()
  const supply = zeroSkills()
  const skillSum = zeroSkills()
  const skillMax = zeroSkills()
  const coverageBySkill = zeroSkills()
  const professions = Object.fromEntries(PROFESSION_ORDER.map((p) => [p, 0])) as Record<Profession, number>

  let energySum = 0
  let stressSum = 0
  let wages = 0
  for (const s of present) {
    const eff = effectiveness(s, shift)
    professions[s.profession]++
    energySum += s.energy
    stressSum += s.stress
    wages += wageOf(s)
    for (const skill of SKILL_ORDER) {
      const lvl = s.skills[skill]
      supply[skill] += lvl * eff * mods.skillMult[skill]
      skillSum[skill] += lvl
      if (lvl > skillMax[skill]) skillMax[skill] = lvl
    }
  }

  let demandTotal = 0
  let covered = 0
  for (const skill of SKILL_ORDER) {
    const need = SHIFT_DEMAND[shift][skill] * bedScale * mods.demandMult[shift]
    demand[skill] = need
    if (need <= 0) {
      coverageBySkill[skill] = present.length > 0 ? 1 : 0
      continue
    }
    const c = Math.min(BALANCE.maxCoverage, supply[skill] / need)
    coverageBySkill[skill] = c
    demandTotal += need
    covered += need * c
  }
  const coverage = demandTotal > 0 ? covered / demandTotal : 0
  const workload =
    present.length === 0
      ? 1
      : coverage < 1
        ? 1 + (1 - coverage) * BALANCE.workloadFromGap
        : 1 - (coverage - 1) * BALANCE.workloadFromSurplus

  // ---- Synergier og problemer ----
  const ctx: SynergyContext = {
    shift,
    present,
    absent: absentIds.length,
    slots,
    professions,
    skillSum,
    skillMax,
    countWith: (skill, min) => present.reduce((n, s) => n + (s.skills[skill] >= min ? 1 : 0), 0),
    avgEnergy: present.length ? energySum / present.length : 0,
    avgStress: present.length ? stressSum / present.length : 0,
  }

  const synergies: ActiveSynergy[] = []
  let fagBonus = 0
  let budgetBonus = 0
  let trivselBonus = 0
  let stressDelta = 0
  let avvikMult = 1
  let xpMult = 1
  for (const def of SYNERGIES) {
    if (!def.test(ctx)) continue
    synergies.push({ id: def.id, name: def.name, tone: def.tone, description: def.description, effect: def.effect })
    fagBonus += def.effect.fagpoeng ?? 0
    budgetBonus += def.effect.budget ?? 0
    trivselBonus += def.effect.trivsel ?? 0
    stressDelta += def.effect.stress ?? 0
    avvikMult *= def.effect.avvik ?? 1
    xpMult *= def.effect.xp ?? 1
  }
  if (present.some((s) => s.trait === 'veileder')) xpMult *= 1.25

  // ---- Rater per spilltime ----
  const tier = state.tier
  const fagpoeng =
    BALANCE.fagpoengPerHour *
    bedScale *
    coverage *
    Math.max(0.2, 1 + fagBonus) *
    mods.fagpoengMult *
    (1 + tier * BALANCE.tierFagpoengBonus)

  const trivselShare = BALANCE.grantFloorShare + (1 - BALANCE.grantFloorShare) * (state.ward.trivsel / 100)
  const staffedFactor = Math.min(1, coverage / BALANCE.grantFullCoverage)
  const grant = beds * BALANCE.grantPerBed * trivselShare * staffedFactor
  const qualityGrant = beds * BALANCE.qualityGrantPerBed * coverage * Math.max(0.2, 1 + budgetBonus)
  const budgetGross = (grant + qualityGrant) * mods.budgetMult * (1 + tier * BALANCE.tierBudgetBonus)
  const minNet = beds * BALANCE.grantPerBed * BALANCE.minNetShare
  const budgetNet = Math.max(minNet, budgetGross - wages)

  const gap = Math.max(0, 1 - coverage)
  const stressedTeam = ctx.avgStress > 70 ? 1.4 : 1
  const avvik =
    bedScale * (BALANCE.avvikBase + BALANCE.avvikFromGap * gap * gap) * avvikMult * mods.avvikMult * stressedTeam

  let stress = (workload - 1) * BALANCE.stressFromWorkload - BALANCE.stressBaseRelief + stressDelta
  if (stress > 0) stress *= mods.stressMult

  const energyDrain =
    BALANCE.energyDrain * Math.pow(workload, BALANCE.energyDrainWorkloadExp) * mods.energyDrainMult

  const trivselTarget = Math.max(
    0,
    Math.min(
      100,
      BALANCE.trivselBase + BALANCE.trivselFromCoverage * Math.min(1, coverage) + trivselBonus + mods.trivselBonus,
    ),
  )

  return {
    shift,
    present: presentIds,
    absent: absentIds,
    slots,
    beds,
    demand,
    supply,
    coverageBySkill,
    coverage,
    workload,
    professions,
    synergies,
    rates: {
      fagpoeng,
      budgetGross,
      wages,
      budgetNet,
      avvik,
      stress,
      energyDrain,
      xp: BALANCE.xpPerHour * xpMult * mods.xpMult,
    },
    trivselTarget,
  }
}
