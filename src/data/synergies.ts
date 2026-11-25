import type { Profession, ShiftId, SkillId, StaffMember, SynergyEffect, SynergyTone } from '@/types'

/** Det en synergiregel får se når en vakt evalueres. */
export interface SynergyContext {
  shift: ShiftId
  /** Ansatte som faktisk er til stede. */
  present: StaffMember[]
  /** Antall som er satt opp, men fraværende (syk / kurs). */
  absent: number
  slots: number
  professions: Record<Profession, number>
  /** Summerte egenskapsnivåer (uten energi-/nivåfaktor). */
  skillSum: Record<SkillId, number>
  /** Høyeste nivå av en egenskap blant de som er på vakt. */
  skillMax: Record<SkillId, number>
  /** Antall på vakt med minst gitt nivå i en egenskap. */
  countWith: (skill: SkillId, min: number) => number
  avgEnergy: number
  avgStress: number
}

export interface SynergyDef {
  id: string
  name: string
  tone: SynergyTone
  description: string
  /** Kort oppskrift som vises i vaktplanleggeren. */
  recipe: string
  effect: SynergyEffect
  test: (ctx: SynergyContext) => boolean
}

const distinctProfessions = (ctx: SynergyContext) =>
  (Object.values(ctx.professions) as number[]).filter((n) => n > 0).length

export const SYNERGIES: SynergyDef[] = [
  // ---------- Bonuser ----------
  {
    id: 'tverrfaglig',
    name: 'Tverrfaglig team',
    tone: 'bonus',
    description: 'Tre ulike yrkesgrupper ser pasienten fra hver sin vinkel.',
    recipe: 'Minst 3 ulike yrkesgrupper på vakt',
    effect: { fagpoeng: 0.2, trivsel: 4 },
    test: (c) => distinctProfessions(c) >= 3,
  },
  {
    id: 'medisinrom',
    name: 'Orden på medisinrommet',
    tone: 'bonus',
    description: 'En sykepleier med stø hånd har kontroll på istandgjøring og utdeling.',
    recipe: 'Sykepleier med Medisin 3+',
    effect: { fagpoeng: 0.1, avvik: 0.8 },
    test: (c) => c.present.some((s) => s.profession === 'sykepleier' && s.skills.medikament >= 3),
  },
  {
    id: 'dobbeltkontroll',
    name: 'Dobbeltkontroll',
    tone: 'bonus',
    description: 'To med legemiddelkompetanse kvitterer for hverandre.',
    recipe: 'To på vakt med Medisin 2+',
    effect: { avvik: 0.75, budget: 0.05 },
    test: (c) => c.countWith('medikament', 2) >= 2,
  },
  {
    id: 'miljotospann',
    name: 'Miljøterapeutisk tospann',
    tone: 'bonus',
    description: 'Vernepleier og helsefagarbeider holder struktur og ro gjennom vakta.',
    recipe: 'Vernepleier + helsefagarbeider, Miljø 5+ til sammen',
    effect: { trivsel: 6, stress: -0.8 },
    test: (c) => c.professions.vernepleier > 0 && c.professions.helsefagarbeider > 0 && c.skillSum.miljoterapi >= 5,
  },
  {
    id: 'saarteam',
    name: 'Sårteam',
    tone: 'bonus',
    description: 'Sår følges opp likt hver gang – færre infeksjoner og innleggelser.',
    recipe: 'To på vakt med Sår 3+',
    effect: { budget: 0.15, fagpoeng: 0.08 },
    test: (c) => c.countWith('saarstell', 3) >= 2,
  },
  {
    id: 'maaltidsro',
    name: 'Måltidsro',
    tone: 'bonus',
    description: 'Nok hender og kunnskap rundt bordet – maten blir spist.',
    recipe: 'Ernæring 6+ til sammen (dag/aften)',
    effect: { trivsel: 5, budget: 0.05 },
    test: (c) => c.shift !== 'natt' && c.skillSum.ernaering >= 6,
  },
  {
    id: 'tryggnatt',
    name: 'Trygg natt',
    tone: 'bonus',
    description: 'Nattevakta møter uro med ro. Færre alarmer, mer søvn.',
    recipe: 'Nattevakt med Ro 5+ til sammen',
    effect: { stress: -1.2, trivsel: 4, avvik: 0.85 },
    test: (c) => c.shift === 'natt' && c.skillSum.deeskalering >= 5,
  },
  {
    id: 'stoeiaften',
    name: 'Rolig kveld',
    tone: 'bonus',
    description: 'Solnedgangsuroen fanges opp før den eskalerer.',
    recipe: 'Aftenvakt med noen på Ro 4+ og Miljø 4+ til sammen',
    effect: { trivsel: 4, stress: -0.6 },
    test: (c) => c.shift === 'aften' && c.skillMax.deeskalering >= 4 && c.skillSum.miljoterapi >= 4,
  },
  {
    id: 'veiledning',
    name: 'Veiledning i praksis',
    tone: 'bonus',
    description: 'En erfaren fagperson tar med seg en fersk kollega.',
    recipe: 'Spesialist/ildsjel sammen med en vanlig ansatt',
    effect: { xp: 1.4, fagpoeng: 0.06 },
    test: (c) =>
      c.present.some((s) => s.rarity === 'spesialist' || s.rarity === 'ildsjel') &&
      c.present.some((s) => s.rarity === 'vanlig'),
  },
  {
    id: 'journalflyt',
    name: 'Stille rapport',
    tone: 'bonus',
    description: 'Dokumentasjonen er så god at rapporten leses, ikke fortelles.',
    recipe: 'Dokumentasjon 7+ til sammen',
    effect: { fagpoeng: 0.12 },
    test: (c) => c.skillSum.dokumentasjon >= 7,
  },
  {
    id: 'fulltlag',
    name: 'Fullt lag',
    tone: 'bonus',
    description: 'Alle plasser besatt, alle til stede. Det merkes.',
    recipe: 'Alle vaktplasser besatt og ingen fravær',
    effect: { stress: -0.5, trivsel: 2 },
    test: (c) => c.absent === 0 && c.present.length >= c.slots && c.slots >= 3,
  },

  // ---------- Problemer ----------
  {
    id: 'tomvakt',
    name: 'Ubemannet vakt',
    tone: 'malus',
    description: 'Ingen på jobb. Pårørende ringer kommunedirektøren.',
    recipe: 'Ingen til stede',
    effect: { trivsel: -25, avvik: 3 },
    test: (c) => c.present.length === 0,
  },
  {
    id: 'underbemannet',
    name: 'Underbemannet',
    tone: 'malus',
    description: 'For få hender. Alt tar lengre tid, og pausen ryker.',
    recipe: 'Færre enn 2 på dag/aften',
    effect: { stress: 2, trivsel: -6, avvik: 1.3 },
    test: (c) => c.present.length > 0 && c.shift !== 'natt' && c.present.length < 2,
  },
  {
    id: 'ingensykepleier',
    name: 'Ingen sykepleier på vakt',
    tone: 'malus',
    description: 'Ingen kan ta de sykepleiefaglige vurderingene. Bakvakta ringes ned.',
    recipe: 'Ingen sykepleier til stede',
    effect: { stress: 1.2, avvik: 1.35, fagpoeng: -0.1 },
    test: (c) => c.present.length > 0 && c.professions.sykepleier === 0,
  },
  {
    id: 'ufaglaert',
    name: 'Bare ufaglærte',
    tone: 'malus',
    description: 'Assistentene gjør så godt de kan, men mangler noen å spørre.',
    recipe: 'Kun assistenter til stede',
    effect: { stress: 1.5, avvik: 1.25, trivsel: -5 },
    test: (c) => c.present.length > 0 && c.professions.assistent === c.present.length,
  },
  {
    id: 'slitne',
    name: 'Slitne folk',
    tone: 'malus',
    description: 'Laget går på reservetanken. Småfeil sniker seg inn.',
    recipe: 'Snittenergi under 25',
    effect: { avvik: 1.3, trivsel: -4 },
    test: (c) => c.present.length > 0 && c.avgEnergy < 25,
  },
  {
    id: 'hull',
    name: 'Hull i vaktplanen',
    tone: 'malus',
    description: 'Noen som var satt opp, er ikke på jobb. De andre løper.',
    recipe: 'Fravær blant de som er satt opp',
    effect: { stress: 1, trivsel: -2 },
    test: (c) => c.absent > 0 && c.present.length > 0,
  },
]

export const SYNERGY_BY_ID: Record<string, SynergyDef> = Object.fromEntries(SYNERGIES.map((s) => [s.id, s]))
