import type { ShiftId } from './roster'
import type { SkillId } from './staff'
import type { ModifierDelta } from './upgrades'

/** Klinisk profil som bestemmer hvilke faglige behov en beboer genererer. */
export type ResidentProfileId =
  | 'kognitiv'
  | 'saar'
  | 'ernaering'
  | 'rehab'
  | 'palliasjon'
  | 'multisyk'
  | 'mestring'

export interface ResidentProfileDef {
  id: ResidentProfileId
  name: string
  short: string
  description: string
  color: string
  /** Behov per vakt og egenskap for én beboer med pleietyngde 1,0. */
  demand: Record<ShiftId, Record<SkillId, number>>
  /** Typisk liggetid i døgn [min, maks]. */
  stayDays: [number, number]
}

export interface Resident {
  id: number
  name: string
  room: number
  profile: ResidentProfileId
  /** Pleietyngde: multipliserer profilens behov (ca. 0,8–1,3). */
  tyngde: number
  /** Spillminutt for innkomst og planlagt utskrivning. */
  admittedAt: number
  dischargeAt: number
}

export type WardTypeId = 'sykehjem' | 'demens' | 'korttid' | 'bofellesskap' | 'lindrende'

export interface WardTypeDef {
  id: WardTypeId
  name: string
  blurb: string
  /** Kan velges ved avdelingsrotasjon (startavdelingen kan ikke velges på nytt). */
  selectable: boolean
  /** Fordeling av beboerprofiler ved innkomst. */
  profileWeights: Partial<Record<ResidentProfileId, number>>
  /** Multiplikator på liggetid (korttid < 1, bofellesskap > 1). */
  stayMult: number
  /** Avdelingstypens egne modifikatorer – gjelder så lenge du leder den. */
  mods: ModifierDelta
  modsText: string
  /** Fagboka du tar med deg videre når avdelingen overleveres. */
  fagbok: { name: string; effectText: string; perLevel: ModifierDelta }
}

export interface CompletedWard {
  wardType: WardTypeId
  wardName: string
  drift: number
  quality: number
  /** Spillminutt ved overlevering. */
  minute: number
}

/** Permanent progresjon på tvers av avdelinger. */
export interface PrestigeState {
  /** Antall overleverte avdelinger. */
  rotations: number
  /** Renommé: hvert poeng gir en liten, varig bonus på Fagpoeng og budsjett. */
  renomme: number
  /** Fagbøker (nivå 0–3) – én per avdelingstype du har bygget opp. */
  fagboker: Record<WardTypeId, number>
  /** Driftspoeng fra tidligere avdelinger (teller i Driftsligaen). */
  bankedDrift: number
  history: CompletedWard[]
}
