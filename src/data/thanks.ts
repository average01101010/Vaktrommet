import type { ResidentProfileId } from '@/types'

/** Hvem takkekortet kommer fra. Settes foran beboerens navn: «Datteren til Solveig». */
export const THANKS_FROM = ['Datteren til', 'Sønnen til', 'Ektefellen til', 'Barnebarna til', 'Søsteren til', 'Familien til']

export const THANKS_TEXTS = [
  'Takk for at dere så hele mennesket, ikke bare diagnosen.',
  'Dere ga oss trygghet i en vanskelig tid. Vi glemmer det ikke.',
  'Tusen takk for varmen, tålmodigheten og de gode samtalene.',
  'Vi snakker fortsatt om vaflene og sangen på søndagene.',
  'Takk for at dere alltid hadde tid til en kopp kaffe og et smil.',
  'Dere gjorde en forskjell. Hjertelig takk fra oss alle.',
]

/** Egne ord for profiler der oppholdet ender annerledes enn med hjemreise. */
export const THANKS_TEXTS_BY_PROFILE: Partial<Record<ResidentProfileId, string[]>> = {
  palliasjon: [
    'Takk for en verdig og rolig avslutning. Dere var der hele veien.',
    'Dere tok vare på oss alle de siste dagene. Det betydde alt.',
  ],
  rehab: ['Hun går trappa selv nå. Takk for at dere trodde på det før vi gjorde.', 'Takk for treningen, tålmodigheten og heiaropene.'],
}
