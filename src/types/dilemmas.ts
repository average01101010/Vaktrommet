import type { Profession, SkillId } from './staff'

/** Umiddelbar konsekvens av et valg. Beløp skaleres med avdelingsnivå i motoren. */
export interface Effect {
  budget?: number
  fagpoeng?: number
  kaffekopper?: number
  trivsel?: number
  /** Stressendring for ansatte i `scope`. */
  stress?: number
  /** Energiendring for ansatte i `scope`. */
  energy?: number
  /** Antall avvik som registreres (kan være negativt = lukket avvik). */
  avvik?: number
  scope?: 'alle' | 'paaVakt'
  passXp?: number
}

/** Faglig krav for at et valg skal være tilgjengelig – sjekkes mot aktiv vakt. */
export interface Requirement {
  profession?: Profession
  skill?: { id: SkillId; min: number }
}

export interface DilemmaOption {
  id: string
  label: string
  /** Kort hint om hva valget innebærer. */
  hint?: string
  requires?: Requirement
  effect: Effect
  /** Vises etter at valget er tatt. */
  outcome: string
}

export type PostItColor = 'gul' | 'rosa' | 'mint' | 'bla'

export interface DilemmaDef {
  id: string
  title: string
  /** Håndskrevet tekst på lappen. */
  body: string
  /** Hvem som har skrevet lappen. */
  from: string
  color: PostItColor
  minTier?: number
  /** Faglig begrunnelse som vises sammen med utfallet. */
  fagligBegrunnelse: string
  /** Kort kildehenvisning (lov, retningslinje eller verktøy). */
  kilde: string
  options: DilemmaOption[]
}

export interface ActiveDilemma {
  uid: number
  defId: string
  /** Spillminutt lappen ble hengt opp. */
  postedAt: number
  /** Liten rotasjon/plassering for korktavla (deterministisk fra uid). */
  tilt: number
}

export interface DilemmaState {
  active: ActiveDilemma[]
  /** Spillminutt neste lapp tidligst dukker opp. */
  nextAt: number
  /** De sist brukte dilemmaene (unngå gjentakelser). */
  recent: string[]
  counter: number
}

export interface DilemmaResolution {
  defId: string
  optionId: string
  outcome: string
  applied: Effect
}
