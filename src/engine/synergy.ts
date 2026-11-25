import { BALANCE, RARITY, WAGE_PER_HOUR } from '@/data/balance'
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
import { computeDemand } from './residents'

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
 * Kjernen i synergimotoren: gitt bemanningen på én vakt og beboernes behov,
 * regn ut dekning per egenskap, aktive synergier/problemer og alle rater.
 *
 * Dekningen har ingen krysskompensasjon: hver egenskap kappes på 100 %, så
 * overskudd i Stell aldri veier opp for manglende Medisin eller Sår.
 */
export function evaluateShift(
  state: GameState,
  shift: ShiftId,
  mods: Modifiers,
  /** Ferdig beregnet behov (hurtigbuffer i simuleringsløkka). */
  demandOverride?: Record<SkillId, number>,
): ShiftEvaluation {
  const slots = slotsFor(mods)
  const beds = bedsFor(mods)
  const residents = state.residents.length
  const scale = residents / BALANCE.baseBeds

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

  // ---- Kapasitet per egenskap ----
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

  // Uten sykepleier kan bare delegerte legemiddel- og såroppgaver utføres.
  const nurseOnDuty = professions.sykepleier > 0
  const nurseFactor = nurseOnDuty
    ? { medikament: 1, saarstell: 1 }
    : {
        medikament: professions.vernepleier > 0 ? BALANCE.noNurseMedFactorVernepleier : BALANCE.noNurseMedFactor,
        saarstell: BALANCE.noNurseSaarFactor,
      }
  supply.medikament *= nurseFactor.medikament
  supply.saarstell *= nurseFactor.saarstell

  // ---- Behov fra beboerne og dekning uten krysskompensasjon ----
  const demand = demandOverride ?? computeDemand(state, shift, mods)
  let demandTotal = 0
  let covered = 0
  let supplyTotal = 0
  let minRatio = Infinity
  for (const skill of SKILL_ORDER) {
    const need = demand[skill]
    supplyTotal += supply[skill]
    if (need <= 0) {
      coverageBySkill[skill] = present.length > 0 ? 1 : 0
      continue
    }
    const ratio = supply[skill] / need
    const c = Math.min(1, ratio)
    coverageBySkill[skill] = c
    demandTotal += need
    covered += need * c
    if (ratio < minRatio) minRatio = ratio
  }
  const coverage = demandTotal > 0 ? covered / demandTotal : present.length > 0 ? 1 : 0
  const utilization = supplyTotal > 0 ? covered / supplyTotal : 0

  // Belastningen letter bare når den SVAKESTE egenskapen også er overdekket.
  let workload = 1
  if (present.length > 0) {
    if (coverage < 1) workload = 1 + (1 - coverage) * BALANCE.workloadFromGap
    else if (Number.isFinite(minRatio)) {
      workload = 1 - (Math.min(BALANCE.surplusCap, minRatio) - 1) * BALANCE.workloadFromSurplus
    }
  }

  const criticalGap = {
    medikament: demand.medikament > 0 ? 1 - coverageBySkill.medikament : 0,
    saarstell: demand.saarstell > 0 ? 1 - coverageBySkill.saarstell : 0,
  }

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
    scale *
    coverage *
    Math.max(0.2, 1 + fagBonus) *
    mods.fagpoengMult *
    (1 + tier * BALANCE.tierFagpoengBonus)

  const trivselShare = BALANCE.grantFloorShare + (1 - BALANCE.grantFloorShare) * (state.ward.trivsel / 100)
  const staffedFactor = Math.min(1, coverage / BALANCE.grantFullCoverage)
  const grant = residents * BALANCE.grantPerBed * trivselShare * staffedFactor
  const qualityGrant = residents * BALANCE.qualityGrantPerBed * coverage * Math.max(0.2, 1 + budgetBonus)
  const budgetGross = (grant + qualityGrant) * mods.budgetMult * (1 + tier * BALANCE.tierBudgetBonus)
  const minNet = residents * BALANCE.grantPerBed * BALANCE.minNetShare
  const budgetNet = Math.max(minNet, budgetGross - wages)

  // Avvik: generell underdekning + direkte utslag av udekket Medisin og Sår.
  const gap = Math.max(0, 1 - coverage)
  const stressedTeam = ctx.avgStress > 70 ? 1.4 : 1
  const criticalAvvik =
    BALANCE.avvikCritical *
    (demand.medikament * criticalGap.medikament * criticalGap.medikament +
      demand.saarstell * criticalGap.saarstell * criticalGap.saarstell)
  const avvik =
    (scale * (BALANCE.avvikBase + BALANCE.avvikFromGap * gap * gap) + criticalAvvik) *
    avvikMult *
    mods.avvikMult *
    stressedTeam

  let stress = (workload - 1) * BALANCE.stressFromWorkload - BALANCE.stressBaseRelief + stressDelta
  if (stress > 0) stress *= mods.stressMult

  const energyDrain =
    BALANCE.energyDrain * Math.pow(workload, BALANCE.energyDrainWorkloadExp) * mods.energyDrainMult

  // Et ferskt takkekort fra pårørende løfter hele trivselsmålet en liten stund.
  const thanksBoost = state.minute < state.thanks.activeUntil
  const trivselTarget = Math.max(
    0,
    Math.min(
      100,
      (BALANCE.trivselBase +
        BALANCE.trivselFromCoverage * coverage -
        BALANCE.trivselCriticalMed * criticalGap.medikament -
        BALANCE.trivselCriticalSaar * criticalGap.saarstell +
        trivselBonus +
        mods.trivselBonus) *
        (thanksBoost ? 1 + BALANCE.thanksTrivselBoost : 1),
    ),
  )

  return {
    shift,
    present: presentIds,
    absent: absentIds,
    slots,
    beds,
    residents,
    demand,
    supply,
    coverageBySkill,
    coverage,
    workload,
    nurseOnDuty,
    nurseFactor,
    criticalGap,
    utilization,
    thanksBoost,
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
