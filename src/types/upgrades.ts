import type { ShiftId } from './roster'
import type { SkillId } from './staff'

export type UpgradeTrack = 'utstyr' | 'fag'

export type UpgradeId =
  // Fysisk utstyr
  | 'espressomaskin'
  | 'ergonomi'
  | 'takheis'
  | 'blaerescanner'
  | 'medisintralle'
  | 'dognrytmelys'
  | 'sansehage'
  | 'nyfloy'
  // Faglig metodikk
  | 'stillerapport'
  | 'miljoterapi'
  | 'ernaeringsrutiner'
  | 'legemiddelgjennomgang'
  | 'velferdsteknologi'
  | 'videreutdanning'
  | 'heltidskultur'
  | 'kompetansesenter'

/**
 * Samlede modifikatorer fra oppgraderinger (og VIP). Multiplikatorer starter på 1,
 * additive verdier på 0.
 */
export interface Modifiers {
  fagpoengMult: number
  budgetMult: number
  trivselBonus: number
  stressMult: number
  energyDrainMult: number
  recoveryMult: number
  avvikMult: number
  xpMult: number
  courseSpeedMult: number
  demandMult: Record<ShiftId, number>
  skillMult: Record<SkillId, number>
  extraSlots: number
  extraBeds: number
  maxSkillLevel: number
}

/** Delmengde av Modifiers som ett oppgraderingsnivå bidrar med. */
export interface ModifierDelta {
  fagpoengMult?: number
  budgetMult?: number
  trivselBonus?: number
  stressMult?: number
  energyDrainMult?: number
  recoveryMult?: number
  avvikMult?: number
  xpMult?: number
  courseSpeedMult?: number
  demandMult?: Partial<Record<ShiftId, number>>
  skillMult?: Partial<Record<SkillId, number>>
  extraSlots?: number
  extraBeds?: number
  maxSkillLevel?: number
}

export interface UpgradeDef {
  id: UpgradeId
  track: UpgradeTrack
  name: string
  /** Kort, gjenkjennelig beskrivelse. */
  blurb: string
  /** Effekt per nivå, vist i UI. */
  effectText: string
  maxLevel: number
  /** Pris for nivå 1; hvert nivå ganges med `costGrowth`. */
  baseCost: number
  costGrowth: number
  /** Valuta: utstyr koster kr, metodikk koster Fagpoeng. */
  currency: 'budget' | 'fagpoeng'
  requires?: { id: UpgradeId; level: number }[]
  /** Minste avdelingsnivå (tier) for å låse opp. */
  minTier?: number
  /** Effekt per nivå (stables). Multiplikatorer oppgis som faktor per nivå. */
  perLevel: ModifierDelta
  /** Plassering i treet (kolonne 0–2, rad 0..n). */
  pos: { col: number; row: number }
  /** Om oppgraderingen tegnes i avdelingsvisningen. */
  visual?: boolean
}

export type UpgradeLevels = Record<UpgradeId, number>
