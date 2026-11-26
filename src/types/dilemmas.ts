import type { ResidentProfileId, WardTypeId } from './residents'
import type { ShiftId } from './roster'
import type { AbsenceKind, Profession, SkillId } from './staff'

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
  /**
   * Valget får et etterspill: et nytt dilemma dukker opp etter så mange
   * spilltimer [min, maks]. Peker det på en utsatt sak, kommer den tilbake
   * strengere; peker det på neste steg i en historiekjede, fortsetter historien.
   */
  followUp?: { id: string; afterHours: [number, number] }
}

/**
 * Kontekst som må stemme for at et dilemma skal kunne dukke opp av seg selv.
 * Alle felter er valgfrie, og alle som er satt må være oppfylt.
 */
export interface DilemmaTriggers {
  /** Bare på disse avdelingstypene. */
  wardTypes?: WardTypeId[]
  /** Bare mens en av disse vaktene går. */
  shifts?: ShiftId[]
  /**
   * Krever minst én beboer med denne profilen. Beboeren settes inn i tekstene
   * via plassholderne `{beboer}` og `{rom}`.
   */
  residentProfile?: ResidentProfileId
  /**
   * Snittstress i hele staben må være minst dette (0–100). Snittet teller også
   * dem som har fri, så 30 er allerede en presset avdeling.
   */
  minStress?: number
  /** Trivselen på avdelingen må være høyst dette (0–100). */
  maxTrivsel?: number
  /** Minst én ansatt har (eller er varslet om) et fravær av en av disse typene. */
  absence?: AbsenceKind[]
  /** Dukker bare opp som oppfølging eller neste steg i en kjede – aldri tilfeldig. */
  isFollowUpOnly?: boolean
}

/** Plassen et dilemma har i en flertrinns historie. */
export interface DilemmaChainRef {
  /** Nøkkel i `DILEMMA_CHAINS`. */
  id: string
  step: 1 | 2 | 3
}

/** Beboeren et dilemma handler om – et øyeblikksbilde, så teksten står seg selv etter utskrivning. */
export interface DilemmaSubject {
  residentId: number
  name: string
  room: number
  profile: ResidentProfileId
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
  /** Når dilemmaet kan dukke opp. Uten triggere passer det overalt. */
  triggers?: DilemmaTriggers
  /** Steg i en historiekjede. */
  chain?: DilemmaChainRef
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
  /** Id-en til dilemmaet denne lappen er en oppfølging av. */
  followUpOf?: string
  /** Beboeren lappen handler om, hvis teksten bruker `{beboer}`/`{rom}`. */
  subject?: DilemmaSubject
}

/** En utsatt sak som kommer tilbake. */
export interface ScheduledFollowUp {
  defId: string
  /** Spillminutt oppfølgingen henges opp. */
  dueAt: number
  /** Dilemmaet der saken ble utsatt. */
  sourceId: string
  /** Beboeren saken gjelder – følger med gjennom hele kjeden. */
  subject?: DilemmaSubject
}

export interface DilemmaState {
  active: ActiveDilemma[]
  /** Spillminutt neste lapp tidligst dukker opp. */
  nextAt: number
  /** De sist brukte dilemmaene (unngå gjentakelser). */
  recent: string[]
  counter: number
  followUps: ScheduledFollowUp[]
}

export interface DilemmaResolution {
  defId: string
  optionId: string
  outcome: string
  applied: Effect
  /** Valget får et etterspill som dukker opp senere. */
  followUpScheduled: boolean
  /** `utsatt`: saken kommer tilbake strengere. `kjede`: historien fortsetter. */
  followUpKind?: 'utsatt' | 'kjede'
  /** Beboeren saken gjaldt, så lappen kan vises også etter at den er tatt ned. */
  subject?: DilemmaSubject
}
