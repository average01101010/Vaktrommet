import type { InspectionDef, PlayerProfession } from '@/types'

export const COUNTIES = [
  'Agder',
  'Akershus',
  'Buskerud',
  'Finnmark',
  'Innlandet',
  'Møre og Romsdal',
  'Nordland',
  'Oslo',
  'Rogaland',
  'Telemark',
  'Troms',
  'Trøndelag',
  'Vestfold',
  'Vestland',
  'Østfold',
]

export const PLAYER_PROFESSIONS: Record<PlayerProfession, string> = {
  sykepleier: 'Sykepleier',
  vernepleier: 'Vernepleier',
  helsefagarbeider: 'Helsefagarbeider',
  assistent: 'Assistent',
  student: 'Student',
  annet: 'Annet',
}

/** Flertallsform til setninger som «sykepleiere i Oslo». */
export const PLAYER_PROFESSION_PLURAL: Record<PlayerProfession, string> = {
  sykepleier: 'sykepleiere',
  vernepleier: 'vernepleiere',
  helsefagarbeider: 'helsefagarbeidere',
  assistent: 'assistenter',
  student: 'studenter',
  annet: 'andre yrker',
}

export const PLAYER_PROFESSION_ORDER: PlayerProfession[] = [
  'sykepleier',
  'vernepleier',
  'helsefagarbeider',
  'assistent',
  'student',
  'annet',
]

/** Ukentlige tilsyn. Roterer på ISO-ukenummer. */
export const INSPECTIONS: InspectionDef[] = [
  {
    id: 'legemidler',
    title: 'Legemiddelhåndtering',
    focus: ['medikament', 'dokumentasjon'],
    description: 'Statsforvalteren ser på istandgjøring, dobbeltkontroll og sporbarhet.',
    checklist: ['Rett medisin til rett tid', 'To signaturer ved istandgjøring', 'Avvik meldes og lukkes'],
  },
  {
    id: 'ernaering',
    title: 'Ernæring og måltider',
    focus: ['ernaering', 'grunnstell'],
    description: 'Tilsynet følger måltidene: screening, ønskekost og ro rundt bordet.',
    checklist: ['Ernæringsscreening ved innkomst', 'Nattfaste under 11 timer', 'Hjelp til de som trenger det'],
  },
  {
    id: 'tvang',
    title: 'Tillitsskapende tiltak',
    focus: ['deeskalering', 'miljoterapi'],
    description: 'Hvordan forebygges tvang? Tilsynet ser på miljøtiltak og dokumenterte vurderinger.',
    checklist: ['Tiltak prøvd før tvang', 'Kjente utløsende årsaker', 'Evaluering etter hendelser'],
  },
  {
    id: 'saar',
    title: 'Trykksår og hud',
    focus: ['saarstell', 'grunnstell'],
    description: 'Forebygging, risikovurdering og oppfølging av sår.',
    checklist: ['Risikovurdering innen 24 timer', 'Snuplan følges', 'Sår dokumenteres med bilde'],
  },
  {
    id: 'journal',
    title: 'Journal og tiltaksplaner',
    focus: ['dokumentasjon', 'miljoterapi'],
    description: 'Stikkprøver i journalen: er planene oppdaterte og i bruk?',
    checklist: ['Oppdatert tiltaksplan', 'Evaluering hver 14. dag', 'Pårørendekontakt dokumentert'],
  },
  {
    id: 'natt',
    title: 'Nattjeneste',
    focus: ['deeskalering', 'medikament'],
    description: 'Uanmeldt tilsyn klokka 02. Er bemanningen forsvarlig om natta?',
    checklist: ['Forsvarlig kompetanse på natt', 'Tilsynsrunder dokumentert', 'Rask respons på alarmer'],
  },
]
