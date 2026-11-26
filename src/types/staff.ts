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

/**
 * Fravær og permisjoner – slik de faktisk kommer i en turnus:
 * akutt (egenmelding, sykt barn, sykmelding), delvis (gradert) eller varslet (permisjon).
 */
export type AbsenceKind = 'egenmelding' | 'sykt_barn' | 'langtidssyk' | 'gradert_syk' | 'studiepermisjon' | 'velferdspermisjon'

export interface Absence {
  kind: AbsenceKind
  /** Spillminutt fraværet starter. Ligger det fram i tid, er fraværet varslet og den ansatte jobber som vanlig til da. */
  startsAt: number
  /** Spillminutt den ansatte er tilbake. */
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
  /** Pågående eller varslet fravær, ellers null. */
  absence: Absence | null
  /** Timer med høyt stress den siste tida. Blir det for mange, ender det med sykmelding. */
  strain: number
  course: Course | null
  avatar: Avatar
  /** Ansattnummer som vises på ID-kortet. */
  badgeNo: string
  hiredAt: number
}
