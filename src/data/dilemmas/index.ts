import type { DilemmaDef } from '@/types'
import { ARBEIDSMILJO } from './arbeidsmiljo'
import { GRUNN } from './grunn'
import { JUS } from './jus'
import { FRAVAER } from './fravaer'
import { DILEMMA_CHAINS, KJEDER } from './kjeder'
import { KLINISK } from './klinisk'
import { LEGEMIDLER } from './legemidler'
import { DOGNRYTME } from './natt'
import { SPESIAL } from './spesial'

export { DILEMMA_CHAINS }

/**
 * Dilemmabanken, gruppert etter tema. Beløp (kr / Fagpoeng) er grunnverdier
 * og skaleres med avdelingsnivå i motoren. Tekstene kan bruke plassholderne
 * `{beboer}`, `{rom}`, `{han}`, `{hans}`, `{ham}` og `{forelder}`; motoren
 * setter inn en av beboerne på avdelingen når lappen henges opp.
 */
export const DILEMMA_GROUPS: { id: string; title: string; dilemmas: DilemmaDef[] }[] = [
  { id: 'grunn', title: 'Hverdag på avdelingen', dilemmas: GRUNN },
  { id: 'klinisk', title: 'Klinisk observasjon og akutt forverring', dilemmas: KLINISK },
  { id: 'jus', title: 'Lovverk, etikk og tvang', dilemmas: JUS },
  { id: 'legemidler', title: 'Legemiddelhåndtering og pasientsikkerhet', dilemmas: LEGEMIDLER },
  { id: 'spesial', title: 'Spesialavdelinger', dilemmas: SPESIAL },
  { id: 'dognrytme', title: 'Natt, dag og aften', dilemmas: DOGNRYTME },
  { id: 'arbeidsmiljo', title: 'Arbeidsmiljø, ledelse og vaktromshumor', dilemmas: ARBEIDSMILJO },
  { id: 'fravaer', title: 'Fravær, vikarer og arbeidstid', dilemmas: FRAVAER },
  { id: 'kjeder', title: 'Historiekjeder', dilemmas: KJEDER },
]

export const DILEMMAS: DilemmaDef[] = DILEMMA_GROUPS.flatMap((g) => g.dilemmas)

export const DILEMMA_BY_ID: Record<string, DilemmaDef> = Object.fromEntries(DILEMMAS.map((d) => [d.id, d]))

/** Dilemmaer som kan dukke opp av seg selv. Oppfølginger og senere steg i kjeder er unntatt. */
export const RANDOM_DILEMMAS: DilemmaDef[] = DILEMMAS.filter((d) => !d.triggers?.isFollowUpOnly)
