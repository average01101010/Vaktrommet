import type { AbsenceKind, SkillLevels } from '@/types'

/** Det som er likt for alle fravær av samme type: navn, varighet og hvordan det oppstår. */
export interface AbsenceDef {
  kind: AbsenceKind
  name: string
  /** Kort merkelapp til ID-kortet. */
  stamp: string
  /** Varighet i spilldøgn [min, maks]. */
  days: [number, number]
  /** Akutt fravær kommer uten varsel og lager hull i turnusen med en gang. */
  acute: boolean
  /** Teller som sykefravær i statistikken. */
  sick: boolean
  /** Meldingene den ansatte sender. `{navn}` er fornavnet. */
  messages: string[]
}

export const ABSENCES: Record<AbsenceKind, AbsenceDef> = {
  egenmelding: {
    kind: 'egenmelding',
    name: 'Egenmelding',
    stamp: 'Egenmelding',
    days: [1, 3],
    acute: true,
    sick: true,
    messages: [
      'Våknet med feber, må ta egenmelding i dag.',
      'Har vært oppe med omgangssyke i hele natt. Kommer ikke.',
      'Ryggen låste seg da jeg skulle stå opp. Tar egenmelding.',
      'Kraftig migrene, klarer ikke lyset. Blir hjemme.',
      'Hals og hode er helt tett. Tør ikke komme og smitte beboerne.',
    ],
  },
  sykt_barn: {
    kind: 'sykt_barn',
    name: 'Sykt barn',
    stamp: 'Sykt barn',
    days: [1, 2],
    acute: true,
    sick: false,
    messages: [
      'Barnehagen ringte – minsten har feber. Må hente og bli hjemme.',
      'Sønnen har kastet opp i natt. Jeg må bruke en sykt barn-dag.',
      'Datteren har vannkopper, og ingen andre kan passe henne i dag.',
    ],
  },
  langtidssyk: {
    kind: 'langtidssyk',
    name: 'Sykmeldt',
    stamp: 'Sykmeldt',
    days: [7, 21],
    acute: true,
    sick: true,
    messages: [
      'Har vært hos fastlegen. Jeg er sykmeldt – det har vært for mye over for lang tid.',
      'Legen har sykmeldt meg. Kroppen sa stopp.',
      'Jeg klarer ikke mer akkurat nå. Fastlegen har skrevet sykmelding.',
    ],
  },
  gradert_syk: {
    kind: 'gradert_syk',
    name: 'Gradert sykmelding',
    stamp: 'Gradert 50 %',
    days: [7, 14],
    acute: false,
    sick: true,
    messages: ['Jeg er tilbake på 50 %. Legen sier dagvakter, rolig tempo og ingen netter.'],
  },
  studiepermisjon: {
    kind: 'studiepermisjon',
    name: 'Studiepermisjon',
    stamp: 'Studieperm.',
    days: [2, 4],
    acute: false,
    sick: false,
    messages: ['Jeg har samling på videreutdanningen og har søkt studiepermisjon.', 'Eksamen nærmer seg – jeg trenger lesedager.'],
  },
  velferdspermisjon: {
    kind: 'velferdspermisjon',
    name: 'Velferdspermisjon',
    stamp: 'Permisjon',
    days: [1, 3],
    acute: false,
    sick: false,
    messages: [
      'Jeg skal i begravelse og har søkt velferdspermisjon.',
      'Vi flytter denne uka. Har søkt om velferdspermisjon.',
      'Jeg skal følge mor til sykehuset og trenger fri.',
      'Tilvenning i barnehagen – jeg har søkt permisjon de første dagene.',
    ],
  },
}

/**
 * Tilkallingsvikaren: en trygg ekstra hånd i stell og måltider, men uten
 * kjennskap til beboerne og uten legemiddelansvar.
 */
export const VIKAR_SKILLS: SkillLevels = {
  grunnstell: 2,
  ernaering: 2,
  medikament: 0,
  saarstell: 1,
  dokumentasjon: 1,
  miljoterapi: 1,
  deeskalering: 1,
}
