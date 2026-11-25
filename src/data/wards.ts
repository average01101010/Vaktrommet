import type { WardTypeDef, WardTypeId } from '@/types'

/**
 * Avdelingstyper. Startavdelingen er en somatisk sykehjemsavdeling. Alle fem
 * kan velges når du overleverer en avdeling som har nådd toppnivået – også
 * den du nettopp har hatt, for å løfte fagboka dens videre.
 */
export const WARD_TYPES: Record<WardTypeId, WardTypeDef> = {
  sykehjem: {
    id: 'sykehjem',
    name: 'Somatisk sykehjemsavdeling',
    blurb: 'Langtidsavdeling med blandet beboergruppe. Litt av alt, hele døgnet.',
    profileWeights: { kognitiv: 30, multisyk: 25, saar: 15, ernaering: 15, palliasjon: 8, rehab: 7 },
    stayMult: 1,
    mods: {},
    modsText: 'Ingen særskilte modifikatorer.',
    fagbok: { name: 'Sykehjemshåndboka', effectText: '+10 % Fagpoeng', perLevel: { fagpoengMult: 1.1 } },
  },
  demens: {
    id: 'demens',
    name: 'Skjermet demensenhet',
    blurb: 'Små, skjermede bogrupper. Miljøterapi og ro er hele faget – særlig etter solnedgang.',
    profileWeights: { kognitiv: 70, ernaering: 12, multisyk: 10, palliasjon: 8 },
    stayMult: 1.3,
    mods: { demandMult: { aften: 1.1, natt: 1.15 }, fagpoengMult: 1.15 },
    modsText: '+10 % behov på aften, +15 % på natt, +15 % Fagpoeng',
    fagbok: {
      name: 'Personsentrert demensomsorg',
      effectText: '+12 % effekt av Miljø og Ro',
      perLevel: { skillMult: { miljoterapi: 1.12, deeskalering: 1.12 } },
    },
  },
  korttid: {
    id: 'korttid',
    name: 'Korttid og rehabilitering',
    blurb: 'Høyt tempo og rask utskiftning. Nye pasienter fra sykehuset nesten hver dag.',
    profileWeights: { rehab: 50, saar: 20, multisyk: 15, ernaering: 10, palliasjon: 5 },
    stayMult: 0.6,
    mods: { demandMult: { dag: 1.1 }, budgetMult: 1.2 },
    modsText: 'Kort liggetid, +10 % behov på dag, +20 % budsjett',
    fagbok: {
      name: 'Rehabilitering i praksis',
      effectText: '−8 % energibruk, +10 % erfaring',
      perLevel: { energyDrainMult: 0.92, xpMult: 1.1 },
    },
  },
  bofellesskap: {
    id: 'bofellesskap',
    name: 'Bofellesskap',
    blurb: 'Folk som bor her i årevis. Hverdagsmestring, forutsigbarhet og langsiktig relasjonsarbeid.',
    profileWeights: { mestring: 65, kognitiv: 15, ernaering: 10, multisyk: 10 },
    stayMult: 2,
    mods: { demandMult: { natt: 0.8 }, stressMult: 0.9, fagpoengMult: 1.05 },
    modsText: 'Lang botid, −20 % behov på natt, −10 % stress, +5 % Fagpoeng',
    fagbok: {
      name: 'Hverdagsmestring',
      effectText: '−8 % stress, +8 % restitusjon',
      perLevel: { stressMult: 0.92, recoveryMult: 1.08 },
    },
  },
  lindrende: {
    id: 'lindrende',
    name: 'Lindrende enhet',
    blurb: 'Livets siste fase. Faglig krevende, følelsesmessig tungt – og dypt meningsfullt.',
    profileWeights: { palliasjon: 60, multisyk: 15, saar: 15, ernaering: 10 },
    stayMult: 0.8,
    mods: { demandMult: { natt: 1.2 }, stressMult: 1.15, fagpoengMult: 1.25 },
    modsText: '+20 % behov på natt, +15 % stress, +25 % Fagpoeng',
    fagbok: {
      name: 'Lindring ved livets slutt',
      effectText: '−10 % avvik, +2 trivsel',
      perLevel: { avvikMult: 0.9, trivselBonus: 2 },
    },
  },
}

export const WARD_TYPE_ORDER: WardTypeId[] = ['sykehjem', 'demens', 'korttid', 'bofellesskap', 'lindrende']

/** Rekkefølgen i oppdragsvalget: spesialavdelingene først, den vanlige sykehjemsavdelingen til slutt. */
export const ROTATION_WARD_TYPES: WardTypeId[] = ['demens', 'korttid', 'bofellesskap', 'lindrende', 'sykehjem']
