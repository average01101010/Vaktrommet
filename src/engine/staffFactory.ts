import { RARITY } from '@/data/balance'
import { FIRST_NAMES, LAST_NAMES } from '@/data/names'
import { PROFESSION_ORDER, PROFESSIONS, SKILL_ORDER, TRAIT_ORDER } from '@/data/professions'
import type { Avatar, Profession, Rarity, SkillLevels, StaffMember, TraitId } from '@/types'
import { pick, pickWeighted, rand, randInt, type RngHolder } from './rng'

export const emptySkills = (): SkillLevels =>
  Object.fromEntries(SKILL_ORDER.map((s) => [s, 0])) as SkillLevels

export const randomAvatar = (h: RngHolder): Avatar => ({
  skin: randInt(h, 0, 4),
  hair: randInt(h, 0, 5),
  hairStyle: randInt(h, 0, 6),
  accessory: rand(h) < 0.3 ? randInt(h, 1, 2) : 0,
})

const badge = (h: RngHolder): string => String(randInt(h, 10000, 99999))

export interface StaffSeed {
  id: string
  name?: string
  profession?: Profession
  rarity: Rarity
  professionWeights?: Partial<Record<Profession, number>>
  hiredAt: number
}

/** Genererer en ny ansatt. All tilfeldighet går via den seedede RNG-en. */
export function generateStaff(h: RngHolder, seed: StaffSeed): StaffMember {
  const profession =
    seed.profession ??
    pickWeighted(h, PROFESSION_ORDER, (p) => seed.professionWeights?.[p] ?? PROFESSIONS[p].recruitWeight)
  const r = RARITY[seed.rarity]
  const weights = PROFESSIONS[profession].skillWeights

  // Fordel egenskapspoeng etter yrkets profil, med tak per egenskap.
  const skills = emptySkills()
  let points = r.skillPoints
  let guard = 200
  while (points > 0 && guard-- > 0) {
    const skill = pickWeighted(h, SKILL_ORDER, (s) => (skills[s] < r.maxSkill ? weights[s] : 0))
    if (skills[skill] >= r.maxSkill) break
    skills[skill]++
    points--
  }

  const stamina = randInt(h, r.stamina[0], r.stamina[1])
  const trait: TraitId | null = rand(h) < r.traitChance ? pick(h, TRAIT_ORDER) : null
  const name = seed.name ?? `${pick(h, FIRST_NAMES)} ${pick(h, LAST_NAMES)}`

  return {
    id: seed.id,
    name,
    profession,
    rarity: seed.rarity,
    skills,
    stamina,
    energy: stamina,
    stress: 15,
    level: 1,
    xp: 0,
    trait,
    sickUntil: null,
    course: null,
    avatar: randomAvatar(h),
    badgeNo: badge(h),
    hiredAt: seed.hiredAt,
  }
}

/** Startlaget – håndplukket slik at første økt lærer bort synergiene. */
export function starterStaff(): StaffMember[] {
  const mk = (
    id: string,
    name: string,
    profession: Profession,
    rarity: Rarity,
    skills: Partial<SkillLevels>,
    stamina: number,
    trait: TraitId | null,
    avatar: Avatar,
    badgeNo: string,
    stress: number,
  ): StaffMember => ({
    id,
    name,
    profession,
    rarity,
    skills: { ...emptySkills(), ...skills },
    stamina,
    energy: stamina,
    stress,
    level: 1,
    xp: 0,
    trait,
    sickUntil: null,
    course: null,
    avatar,
    badgeNo,
    hiredAt: 0,
  })

  return [
    mk('s1', 'Ingrid Solberg', 'sykepleier', 'erfaren',
      { medikament: 3, saarstell: 3, dokumentasjon: 2, grunnstell: 1, ernaering: 1 },
      74, 'morgenfugl', { skin: 0, hair: 1, hairStyle: 3, accessory: 1 }, '10472', 34),
    mk('s2', 'Jonas Berg', 'vernepleier', 'vanlig',
      { miljoterapi: 3, deeskalering: 2, medikament: 1, dokumentasjon: 1 },
      68, null, { skin: 1, hair: 2, hairStyle: 0, accessory: 0 }, '21883', 28),
    mk('s3', 'Amina Ali', 'helsefagarbeider', 'vanlig',
      { grunnstell: 3, ernaering: 2, saarstell: 1, miljoterapi: 1 },
      70, null, { skin: 3, hair: 0, hairStyle: 5, accessory: 0 }, '30915', 30),
    mk('s4', 'Olav Haugen', 'helsefagarbeider', 'vanlig',
      { grunnstell: 2, ernaering: 1, deeskalering: 2, dokumentasjon: 1, medikament: 1 },
      66, 'nattugle', { skin: 0, hair: 4, hairStyle: 6, accessory: 2 }, '18240', 38),
    mk('s5', 'Thea Lund', 'assistent', 'vanlig',
      { grunnstell: 2, ernaering: 2, miljoterapi: 2, deeskalering: 1 },
      74, null, { skin: 1, hair: 3, hairStyle: 2, accessory: 0 }, '47701', 22),
    mk('s6', 'Sindre Moen', 'assistent', 'vanlig',
      { grunnstell: 3, ernaering: 1, miljoterapi: 1, deeskalering: 2 },
      66, null, { skin: 2, hair: 2, hairStyle: 1, accessory: 0 }, '52096', 26),
  ]
}
