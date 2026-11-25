/** Yrkestitler i staben. */
export type Profession = 'sykepleier' | 'vernepleier' | 'helsefagarbeider' | 'assistent'

/** Sjeldenhetsgrad – styrer egenskapspoeng, utholdenhet og lønn. */
export type Rarity = 'vanlig' | 'erfaren' | 'spesialist' | 'ildsjel'

/** Faglige egenskaper. Nivå 0–5 per ansatt. */
export type SkillId =
  | 'grunnstell'
  | 'ernaering'
  | 'medikament'
  | 'saarstell'
  | 'dokumentasjon'
  | 'miljoterapi'
  | 'deeskalering'

export type SkillLevels = Record<SkillId, number>

/** Personlige særtrekk som gir små, situasjonsbestemte fordeler. */
export type TraitId = 'morgenfugl' | 'kveldsmenneske' | 'nattugle' | 'veileder' | 'kaffekjenner' | 'seigpining'

export type StaffId = string

export interface Avatar {
  skin: number
  hair: number
  hairStyle: number
  accessory: number
}

export interface Course {
  skill: SkillId
  /** Spillminutt (absolutt) kurset startet og er ferdig. */
  startedAt: number
  endsAt: number
}

export interface StaffMember {
  id: StaffId
  name: string
  profession: Profession
  rarity: Rarity
  skills: SkillLevels
  /** Utholdenhet = maks energi (50–100). */
  stamina: number
  /** Nåværende energi, 0..stamina. */
  energy: number
  /** Stress 0–100. Høyt stress gir risiko for sykefravær. */
  stress: number
  level: number
  xp: number
  trait: TraitId | null
  /** Sykmeldt til og med dette spillminuttet (absolutt), ellers null. */
  sickUntil: number | null
  course: Course | null
  avatar: Avatar
  /** Ansattnummer som vises på ID-kortet. */
  badgeNo: string
  hiredAt: number
}
