import type { Profession, SkillId, TraitId } from '@/types'

export const SKILL_ORDER: SkillId[] = [
  'grunnstell',
  'ernaering',
  'medikament',
  'saarstell',
  'dokumentasjon',
  'miljoterapi',
  'deeskalering',
]

export const SKILLS: Record<SkillId, { name: string; short: string; description: string; color: string }> = {
  grunnstell: {
    name: 'Stell og omsorg',
    short: 'Stell',
    description: 'Morgenstell, forflytning og den gode praten på sengekanten.',
    color: '#2B5B6C',
  },
  ernaering: {
    name: 'Ernæring',
    short: 'Ernæring',
    description: 'Måltidsro, ernæringsscreening og næringstett kost.',
    color: '#7A9A3B',
  },
  medikament: {
    name: 'Medikamenthåndtering',
    short: 'Medisin',
    description: 'Istandgjøring, dobbeltkontroll og utdeling til rett tid.',
    color: '#B4533A',
  },
  saarstell: {
    name: 'Sårstell',
    short: 'Sår',
    description: 'Trykksårforebygging, sårskift og observasjon.',
    color: '#C2788A',
  },
  dokumentasjon: {
    name: 'Dokumentasjon',
    short: 'Dok.',
    description: 'Tiltaksplaner, rapport og sporbarhet i journalen.',
    color: '#5C6B73',
  },
  miljoterapi: {
    name: 'Miljøterapi',
    short: 'Miljø',
    description: 'Struktur, mestring og meningsfulle aktiviteter i hverdagen.',
    color: '#1E4D40',
  },
  deeskalering: {
    name: 'Ro i utagerende situasjoner',
    short: 'Ro',
    description: 'Trygghet, skjerming og rolig kommunikasjon når det koker.',
    color: '#D97736',
  },
}

export const PROFESSIONS: Record<
  Profession,
  { name: string; short: string; color: string; soft: string; skillWeights: Record<SkillId, number>; recruitWeight: number }
> = {
  sykepleier: {
    name: 'Sykepleier',
    short: 'SPL',
    color: '#2B5B6C',
    soft: '#D5E4EA',
    recruitWeight: 22,
    skillWeights: { medikament: 4, saarstell: 4, dokumentasjon: 3, grunnstell: 2, ernaering: 2, miljoterapi: 1, deeskalering: 1 },
  },
  vernepleier: {
    name: 'Vernepleier',
    short: 'VPL',
    color: '#1E4D40',
    soft: '#D3E5DC',
    recruitWeight: 18,
    skillWeights: { miljoterapi: 4, deeskalering: 4, medikament: 3, dokumentasjon: 2, grunnstell: 2, ernaering: 1, saarstell: 1 },
  },
  helsefagarbeider: {
    name: 'Helsefagarbeider',
    short: 'HFA',
    color: '#B4612A',
    soft: '#F3DEC9',
    recruitWeight: 32,
    skillWeights: { grunnstell: 4, ernaering: 3, saarstell: 2, miljoterapi: 2, deeskalering: 2, dokumentasjon: 2, medikament: 1 },
  },
  assistent: {
    name: 'Assistent',
    short: 'AST',
    color: '#7A6A4F',
    soft: '#EAE2D2',
    recruitWeight: 28,
    skillWeights: { grunnstell: 3, ernaering: 2, miljoterapi: 2, deeskalering: 1, dokumentasjon: 0.5, saarstell: 0.3, medikament: 0 },
  },
}

export const PROFESSION_ORDER: Profession[] = ['sykepleier', 'vernepleier', 'helsefagarbeider', 'assistent']

export const TRAITS: Record<TraitId, { name: string; description: string }> = {
  morgenfugl: { name: 'Morgenfugl', description: '+15 % effekt på dagvakt.' },
  kveldsmenneske: { name: 'Kveldsmenneske', description: '+15 % effekt på aftenvakt.' },
  nattugle: { name: 'Nattugle', description: '+15 % effekt på nattevakt.' },
  veileder: { name: 'Veileder', description: 'Kolleger på samme vakt får +25 % erfaring.' },
  kaffekjenner: { name: 'Kaffekjenner', description: 'Henter seg inn 20 % raskere mellom vakter.' },
  seigpining: { name: 'Seig', description: 'Bygger 20 % mindre stress på tunge vakter.' },
}

export const TRAIT_ORDER: TraitId[] = ['morgenfugl', 'kveldsmenneske', 'nattugle', 'veileder', 'kaffekjenner', 'seigpining']
