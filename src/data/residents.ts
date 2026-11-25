import type { ResidentProfileDef, ResidentProfileId, ShiftId, SkillId } from '@/types'

type Row = [stell: number, ern: number, med: number, saar: number, dok: number, miljo: number, ro: number]

const row = ([grunnstell, ernaering, medikament, saarstell, dokumentasjon, miljoterapi, deeskalering]: Row): Record<SkillId, number> => ({
  grunnstell,
  ernaering,
  medikament,
  saarstell,
  dokumentasjon,
  miljoterapi,
  deeskalering,
})

const demand = (dag: Row, aften: Row, natt: Row): Record<ShiftId, Record<SkillId, number>> => ({
  dag: row(dag),
  aften: row(aften),
  natt: row(natt),
})

/**
 * Kliniske beboerprofiler. Tallene er behov per beboer per vakt
 * (Stell, Ernæring, Medisin, Sår, Dok., Miljø, Ro) ved pleietyngde 1,0.
 * Åtte beboere med sykehjemsmiks gir omtrent 33 / 30 / 18 i samlet behov.
 */
export const RESIDENT_PROFILES: Record<ResidentProfileId, ResidentProfileDef> = {
  kognitiv: {
    id: 'kognitiv',
    name: 'Kognitiv svikt og uro',
    short: 'Kognitiv svikt',
    description: 'Demens med vandring og uro mot kveld. Trenger struktur, skjerming og kjente fjes.',
    color: '#1E4D40',
    demand: demand([1.0, 0.6, 0.5, 0.1, 0.5, 1.0, 0.5], [0.6, 0.6, 0.5, 0, 0.3, 1.2, 1.1], [0.3, 0, 0.3, 0, 0.3, 0.4, 1.3]),
    stayDays: [20, 45],
  },
  saar: {
    id: 'saar',
    name: 'Komplekst sårstell',
    short: 'Sårstell',
    description: 'Trykksår eller leggsår som krever daglig skift, avlastning og dokumentasjon med bilde.',
    color: '#C2788A',
    demand: demand([1.1, 0.5, 0.6, 1.5, 0.8, 0.2, 0.1], [0.7, 0.5, 0.6, 0.7, 0.5, 0.3, 0.2], [0.5, 0, 0.3, 0.6, 0.4, 0.1, 0.3]),
    stayDays: [10, 24],
  },
  ernaering: {
    id: 'ernaering',
    name: 'Ernæringssvikt og dysfagi',
    short: 'Ernæring',
    description: 'Vekttap og svelgvansker. Tilpasset konsistens, hjelp ved måltid og kort nattfaste.',
    color: '#7A9A3B',
    demand: demand([1.0, 1.6, 0.5, 0.2, 0.7, 0.4, 0.1], [0.6, 1.5, 0.5, 0.1, 0.4, 0.5, 0.3], [0.3, 0.1, 0.3, 0.1, 0.3, 0.1, 0.4]),
    stayDays: [12, 28],
  },
  rehab: {
    id: 'rehab',
    name: 'Postoperativ rehabilitering',
    short: 'Rehab',
    description: 'Nyoperert hofte eller kne. Smertelindring, mobilisering og trening mot hjemreise.',
    color: '#2B5B6C',
    demand: demand([1.2, 0.5, 0.7, 0.5, 0.8, 0.7, 0.1], [0.7, 0.5, 0.7, 0.2, 0.4, 0.6, 0.2], [0.3, 0, 0.4, 0.2, 0.3, 0.1, 0.3]),
    stayDays: [5, 12],
  },
  palliasjon: {
    id: 'palliasjon',
    name: 'Palliasjon og trygghet',
    short: 'Palliasjon',
    description: 'Lindrende behandling i livets sluttfase. Symptomlindring døgnet rundt og ro for pårørende.',
    color: '#7B6A8E',
    demand: demand([1.1, 0.5, 1.0, 0.4, 0.7, 0.4, 0.3], [0.8, 0.4, 1.0, 0.3, 0.5, 0.5, 0.6], [0.6, 0, 0.9, 0.3, 0.5, 0.2, 0.9]),
    stayDays: [6, 18],
  },
  multisyk: {
    id: 'multisyk',
    name: 'Skrøpelig og multisyk',
    short: 'Multisyk',
    description: 'Flere kroniske sykdommer og lang legemiddelliste. Observasjon, oppfølging og legemiddelgjennomgang.',
    color: '#B4533A',
    demand: demand([1.0, 0.6, 0.9, 0.4, 0.7, 0.3, 0.1], [0.6, 0.6, 0.9, 0.2, 0.4, 0.4, 0.3], [0.4, 0, 0.5, 0.2, 0.4, 0.1, 0.5]),
    stayDays: [14, 32],
  },
  mestring: {
    id: 'mestring',
    name: 'Hverdagsmestring',
    short: 'Mestring',
    description: 'Utviklingshemming eller psykisk lidelse. Forutsigbarhet, mestring og tillitsskapende arbeid.',
    color: '#D97736',
    demand: demand([0.6, 0.5, 0.4, 0, 0.5, 1.3, 0.4], [0.4, 0.6, 0.4, 0, 0.3, 1.4, 0.8], [0.2, 0, 0.2, 0, 0.3, 0.3, 0.9]),
    stayDays: [30, 60],
  },
}

export const RESIDENT_PROFILE_ORDER: ResidentProfileId[] = [
  'kognitiv',
  'multisyk',
  'saar',
  'ernaering',
  'rehab',
  'palliasjon',
  'mestring',
]

export const RESIDENT_NAMES = [
  'Arne', 'Solveig', 'Gerd', 'Rolf', 'Ingeborg', 'Kåre', 'Astrid', 'Odd', 'Ruth', 'Bjørg',
  'Harald', 'Else', 'Reidar', 'Liv', 'Torbjørn', 'Aslaug', 'Magnhild', 'Einar', 'Borghild', 'Sverre',
  'Randi', 'Olaug', 'Leif', 'Gudrun', 'Trygve', 'Synnøve', 'Arvid', 'Kari', 'Alf', 'Eva',
  'Ragnhild', 'Finn', 'Jorunn', 'Egil', 'Turid', 'Asbjørn', 'Ingrid', 'Knut', 'Berit', 'Olav',
]

/** Kvinnenavnene i lista over – styrer pronomen når en beboer settes inn i en dilemmatekst. */
export const RESIDENT_FEMALE_NAMES: ReadonlySet<string> = new Set([
  'Solveig', 'Gerd', 'Ingeborg', 'Astrid', 'Ruth', 'Bjørg', 'Else', 'Liv', 'Aslaug', 'Magnhild', 'Borghild',
  'Randi', 'Olaug', 'Gudrun', 'Synnøve', 'Kari', 'Eva', 'Ragnhild', 'Jorunn', 'Turid', 'Ingrid', 'Berit',
])
