import { BALANCE } from '@/data/balance'
import { SKILL_ORDER } from '@/data/professions'
import { RESIDENT_NAMES, RESIDENT_PROFILE_ORDER, RESIDENT_PROFILES } from '@/data/residents'
import { WARD_TYPES } from '@/data/wards'
import type { GameState, Modifiers, Resident, ResidentProfileId, ShiftId, SkillId } from '@/types'
import { bedsFor } from './modifiers'
import { pickWeighted, rand, randInt } from './rng'
import { MIN_PER_DAY } from './time'

const zeroSkills = (): Record<SkillId, number> =>
  Object.fromEntries(SKILL_ORDER.map((s) => [s, 0])) as Record<SkillId, number>

/**
 * Faglig behov på en vakt: summen av alle beboeres profilbehov × pleietyngde,
 * justert for avdelingens og oppgraderingenes behovsmodifikatorer.
 */
export function computeDemand(state: Pick<GameState, 'residents'>, shift: ShiftId, mods: Modifiers): Record<SkillId, number> {
  const demand = zeroSkills()
  for (const r of state.residents) {
    const profile = RESIDENT_PROFILES[r.profile].demand[shift]
    for (const skill of SKILL_ORDER) demand[skill] += profile[skill] * r.tyngde
  }
  const mult = mods.demandMult[shift]
  for (const skill of SKILL_ORDER) demand[skill] *= mult
  return demand
}

/** Tar inn én ny beboer på et rom. Muterer utkastet og bruker spillets RNG. */
function admit(d: GameState, room: number, initial: boolean): Resident {
  const ward = WARD_TYPES[d.wardType]
  const profile = pickWeighted(d, RESIDENT_PROFILE_ORDER, (p) => ward.profileWeights[p] ?? 0)
  const def = RESIDENT_PROFILES[profile]
  const taken = new Set(d.residents.map((r) => r.name))
  const free = RESIDENT_NAMES.filter((n) => !taken.has(n))
  const pool = free.length > 0 ? free : RESIDENT_NAMES
  const name = pool[Math.floor(rand(d) * pool.length)]
  const tyngde = Math.round((BALANCE.tyngdeMin + rand(d) * (BALANCE.tyngdeMax - BALANCE.tyngdeMin)) * 20) / 20
  const stayDays = Math.max(1, Math.round(randInt(d, def.stayDays[0], def.stayDays[1]) * ward.stayMult))
  // Ved oppstart er beboerne kommet ulikt langt i oppholdet, så de ikke skrives ut samtidig.
  const remaining = initial ? Math.max(1, Math.round(stayDays * (0.15 + rand(d) * 0.85))) : stayDays
  d.ward.residentCounter++
  const resident: Resident = {
    id: d.ward.residentCounter,
    name,
    room,
    profile,
    tyngde,
    admittedAt: d.minute - (stayDays - remaining) * MIN_PER_DAY,
    dischargeAt: d.minute + remaining * MIN_PER_DAY,
  }
  d.residents.push(resident)
  return resident
}

export interface ResidentChange {
  discharged: Resident[]
  admitted: Resident[]
}

/**
 * Holder beboerlista i takt med antall senger: skriver ut de som er ferdige,
 * og fyller ledige rom med nye innkomster. Muterer utkastet.
 */
export function syncResidents(d: GameState, mods: Modifiers, initial = false): ResidentChange {
  const beds = bedsFor(mods)
  const change: ResidentChange = { discharged: [], admitted: [] }

  const staying: Resident[] = []
  for (const r of d.residents) {
    if (r.dischargeAt <= d.minute || r.room > beds) change.discharged.push(r)
    else staying.push(r)
  }
  d.residents = staying

  const occupied = new Set(staying.map((r) => r.room))
  for (let room = 1; room <= beds; room++) {
    if (!occupied.has(room)) change.admitted.push(admit(d, room, initial))
  }
  d.residents.sort((a, b) => a.room - b.room)
  return change
}

/** Antall beboere per profil – for visning. */
export function residentMix(state: Pick<GameState, 'residents'>): { profile: ResidentProfileId; count: number }[] {
  const counts = new Map<ResidentProfileId, number>()
  for (const r of state.residents) counts.set(r.profile, (counts.get(r.profile) ?? 0) + 1)
  return RESIDENT_PROFILE_ORDER.filter((p) => counts.has(p))
    .map((profile) => ({ profile, count: counts.get(profile)! }))
    .sort((a, b) => b.count - a.count)
}

/** Én beboers behov på en vakt (uten avdelingsmodifikatorer) – for visning. */
export function residentDemand(r: Resident, shift: ShiftId): Record<SkillId, number> {
  const out = zeroSkills()
  const profile = RESIDENT_PROFILES[r.profile].demand[shift]
  for (const skill of SKILL_ORDER) out[skill] = profile[skill] * r.tyngde
  return out
}
