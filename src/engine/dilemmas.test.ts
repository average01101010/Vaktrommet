import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/data/balance'
import { DILEMMA_BY_ID, DILEMMA_CHAINS, DILEMMA_GROUPS, DILEMMAS, RANDOM_DILEMMAS } from '@/data/dilemmas'
import { renderDilemmaDoc } from '@/data/dilemmas/doc'
import { RESIDENT_FEMALE_NAMES, RESIDENT_NAMES } from '@/data/residents'
import { WARD_TYPES } from '@/data/wards'
import type { DilemmaSubject, GameState, Resident, ResidentProfileId, WardTypeId } from '@/types'
import { resolveDilemma } from './actions'
import {
  DILEMMA_PLACEHOLDERS,
  dilemmaContext,
  dilemmaWeight,
  eligibleDilemmas,
  fillText,
  matchesTriggers,
  placeholdersIn,
  postDilemma,
  renderDilemma,
  spawnDilemma,
  usesResident,
  type DilemmaContext,
} from './dilemmas'
import { migrateGameState } from './migrate'
import { modifiersFor } from './modifiers'
import { syncResidents } from './residents'
import { createInitialState, simulate, STATE_VERSION } from './simulation'

const T0 = Date.UTC(2026, 10, 25, 8, 0, 0)
const HOUR = 60
const DAY = 24 * HOUR
const NIGHT = 16 * HOUR + 120
const SPECIAL_WARDS: WardTypeId[] = ['demens', 'korttid', 'bofellesskap', 'lindrende']

/** Ny avdeling uten lapper, og uten at det dukker opp tilfeldige. */
function quiet(seed = 1234): GameState {
  const s = createInitialState(T0, seed)
  s.dilemmas.active = []
  s.dilemmas.recent = []
  s.dilemmas.nextAt = 100_000_000
  return s
}

/** Samme avdeling, men som en annen avdelingstype med egne beboere. */
function onWard(wardType: WardTypeId, seed = 1234): GameState {
  const s = quiet(seed)
  s.wardType = wardType
  s.residents = []
  syncResidents(s, modifiersFor(s), true)
  return s
}

const resident = (id: number, name: string, room: number, profile: ResidentProfileId): Resident => ({
  id,
  name,
  room,
  profile,
  tyngde: 1,
  admittedAt: 0,
  dischargeAt: 1_000_000,
})

const ctx = (over: Partial<DilemmaContext> = {}): DilemmaContext => ({
  wardType: 'sykehjem',
  shift: 'dag',
  tier: 5,
  profiles: new Set<ResidentProfileId>(['kognitiv', 'multisyk', 'saar', 'ernaering', 'palliasjon', 'rehab', 'mestring']),
  avgStress: 20,
  trivsel: 60,
  absences: new Set(),
  ...over,
})

/** Tar et valg og gir tilstanden etterpå. */
function choose(s: GameState, defId: string, optionId: string) {
  const note = s.dilemmas.active.find((a) => a.defId === defId)
  if (!note) throw new Error(`Lappen ${defId} henger ikke på tavla`)
  const r = resolveDilemma(s, note.uid, optionId)
  if (!r.ok) throw new Error(r.reason)
  return r
}

/** Spoler fram til neste planlagte steg henger på tavla. */
function untilFollowUp(s: GameState): GameState {
  const due = s.dilemmas.followUps[0]?.dueAt
  if (due === undefined) throw new Error('Ingen oppfølging er planlagt')
  return simulate(s, Math.ceil((due - s.minute) / BALANCE.stepMin) * BALANCE.stepMin).state
}

describe('dilemmabanken', () => {
  it('har minst 85 dilemmaer, hvorav over 60 utenfor grunnbanken', () => {
    const grunn = DILEMMA_GROUPS.find((g) => g.id === 'grunn')!.dilemmas.length
    expect(DILEMMAS.length).toBeGreaterThanOrEqual(85)
    expect(DILEMMAS.length - grunn).toBeGreaterThanOrEqual(60)
    expect(new Set(DILEMMAS.map((d) => d.id)).size).toBe(DILEMMAS.length)
  })

  it('hver spesialavdeling har minst fem egne situasjoner', () => {
    for (const ward of SPECIAL_WARDS) {
      const own = RANDOM_DILEMMAS.filter((d) => d.triggers?.wardTypes?.length === 1 && d.triggers.wardTypes[0] === ward)
      expect(own.length, ward).toBeGreaterThanOrEqual(5)
    }
  })

  it('har egne nattevakt-situasjoner og dilemmaer som utløses av press', () => {
    const nightOnly = RANDOM_DILEMMAS.filter((d) => d.triggers?.shifts?.length === 1 && d.triggers.shifts[0] === 'natt')
    expect(nightOnly.length).toBeGreaterThanOrEqual(6)
    expect(RANDOM_DILEMMAS.some((d) => d.triggers?.minStress !== undefined)).toBe(true)
    expect(RANDOM_DILEMMAS.some((d) => d.triggers?.maxTrivsel !== undefined)).toBe(true)
  })

  it('bruker bare kjente plassholdere, og alle med profilkrav nevner beboeren', () => {
    for (const d of DILEMMAS) {
      for (const p of placeholdersIn(d)) expect(DILEMMA_PLACEHOLDERS as readonly string[], `${d.id}: {${p}}`).toContain(p)
      if (d.triggers?.residentProfile) expect(placeholdersIn(d), d.id).toContain('beboer')
      // Ferdig utfylt står det ingen klammer igjen noe sted.
      const shown = renderDilemma(d, { residentId: 1, name: 'Astrid', room: 3, profile: 'kognitiv' })
      const texts = [shown.title, shown.body, shown.fagligBegrunnelse, ...shown.options.flatMap((o) => [o.label, o.hint ?? '', o.outcome])]
      for (const t of texts) expect(t, d.id).not.toMatch(/[{}]/)
    }
  })

  it('alle beboernavn har et kjent kjønn for pronomen', () => {
    for (const name of RESIDENT_FEMALE_NAMES) expect(RESIDENT_NAMES, name).toContain(name)
    expect(RESIDENT_FEMALE_NAMES.size).toBeGreaterThan(10)
    expect(RESIDENT_NAMES.length - RESIDENT_FEMALE_NAMES.size).toBeGreaterThan(10)
  })

  it('har minst seks historiekjeder der hvert steg leder til det neste', () => {
    const chains = Object.entries(DILEMMA_CHAINS)
    expect(chains.length).toBeGreaterThanOrEqual(6)
    expect(chains.filter(([, c]) => c.steps === 3).length).toBeGreaterThanOrEqual(3)
    expect(chains.filter(([, c]) => c.steps === 2).length).toBeGreaterThanOrEqual(2)

    for (const [id, chain] of chains) {
      const steps = DILEMMAS.filter((d) => d.chain?.id === id)
      for (let step = 1; step <= chain.steps; step++) {
        const here = steps.filter((d) => d.chain!.step === step)
        expect(here.length, `${id} steg ${step}`).toBeGreaterThanOrEqual(1)
        for (const d of here) {
          // Bare første steg dukker opp av seg selv.
          expect(Boolean(d.triggers?.isFollowUpOnly), d.id).toBe(step > 1)
          const next = d.options.filter((o) => o.followUp).map((o) => DILEMMA_BY_ID[o.followUp!.id])
          if (step === chain.steps) expect(next, d.id).toHaveLength(0)
          else expect(next.length, d.id).toBeGreaterThanOrEqual(1)
          for (const n of next) expect(n?.chain, `${d.id} → ${n?.id}`).toEqual({ id, step: step + 1 })
        }
      }
      expect(steps.every((d) => d.chain!.step <= chain.steps), id).toBe(true)
    }
    // Ingen peker inn i en kjede utenfra.
    for (const d of DILEMMAS.filter((x) => !x.chain)) {
      for (const o of d.options) if (o.followUp) expect(DILEMMA_BY_ID[o.followUp.id]?.chain, d.id).toBeUndefined()
    }
  })

  it('gjennomgangsdokumentet dekker hele banken og er oppdatert', async () => {
    const doc = renderDilemmaDoc()
    for (const d of DILEMMAS) expect(doc, d.id).toContain(`\`${d.id}\``)
    expect(doc).toContain(`**${DILEMMAS.length} dilemmaer**`)
    // Modulnavnet settes sammen slik at typesjekken for nettleserkoden ikke trenger Node-typer.
    const fs = (await import(/* @vite-ignore */ ['node', 'fs'].join(':'))) as { readFileSync(path: URL, enc: string): string }
    const onDisk = fs.readFileSync(new URL('../../docs/dilemma-gjennomgang.md', import.meta.url), 'utf8')
    expect(onDisk === doc, 'docs/dilemma-gjennomgang.md er utdatert – kjør «npm run docs:dilemmas»').toBe(true)
  })
})

describe('kontekstuell utvelgelse', () => {
  it('filtrerer på avdelingstype', () => {
    const demens = DILEMMA_BY_ID.demens_robotkatt
    expect(matchesTriggers(demens, ctx({ wardType: 'demens' }))).toBe(true)
    expect(matchesTriggers(demens, ctx({ wardType: 'sykehjem' }))).toBe(false)

    for (const ward of Object.keys(WARD_TYPES) as WardTypeId[]) {
      const ids = eligibleDilemmas(onWard(ward))
      for (const d of ids) if (d.triggers?.wardTypes) expect(d.triggers.wardTypes, `${ward}: ${d.id}`).toContain(ward)
    }
    const onDemens = eligibleDilemmas(onWard('demens')).map((d) => d.id)
    expect(onDemens).toContain('demens_feil_seng')
    expect(onDemens).not.toContain('korttid_fredag_kl15')
    expect(onDemens).not.toContain('bo_pizza')
    // Den vanlige sykehjemsavdelingen får ingen av spesialavdelingenes situasjoner.
    expect(eligibleDilemmas(onWard('sykehjem')).some((d) => d.triggers?.wardTypes)).toBe(false)
  })

  it('filtrerer på vakt', () => {
    const night = DILEMMA_BY_ID.natt_strombrudd
    expect(matchesTriggers(night, ctx({ shift: 'natt' }))).toBe(true)
    expect(matchesTriggers(night, ctx({ shift: 'dag' }))).toBe(false)
    expect(matchesTriggers(night, ctx({ shift: 'aften' }))).toBe(false)

    const s = quiet()
    expect(dilemmaContext(s).shift).toBe('dag')
    const byDay = eligibleDilemmas(s).map((d) => d.id)
    expect(byDay).toContain('dag_legevisitt')
    expect(byDay).not.toContain('natt_strombrudd')
    expect(byDay).not.toContain('aften_nattfaste')

    s.minute = NIGHT
    expect(dilemmaContext(s).shift).toBe('natt')
    const byNight = eligibleDilemmas(s).map((d) => d.id)
    expect(byNight).toContain('natt_strombrudd')
    expect(byNight).toContain('natt_sover')
    expect(byNight).not.toContain('dag_legevisitt')
  })

  it('krever en beboer med riktig profil', () => {
    const def = DILEMMA_BY_ID.saar_infeksjon
    expect(matchesTriggers(def, ctx({ profiles: new Set<ResidentProfileId>(['saar']) }))).toBe(true)
    expect(matchesTriggers(def, ctx({ profiles: new Set<ResidentProfileId>(['kognitiv', 'rehab']) }))).toBe(false)

    const s = quiet()
    s.residents = [resident(1, 'Arne', 1, 'multisyk'), resident(2, 'Gerd', 2, 'ernaering')]
    expect(eligibleDilemmas(s).map((d) => d.id)).not.toContain('saar_infeksjon')
    s.residents.push(resident(3, 'Kåre', 3, 'saar'))
    expect(eligibleDilemmas(s).map((d) => d.id)).toContain('saar_infeksjon')
  })

  it('press-dilemmaer krever høyt stress eller lav trivsel', () => {
    const verneombud = DILEMMA_BY_ID.verneombud_varsel
    const min = verneombud.triggers!.minStress!
    expect(matchesTriggers(verneombud, ctx({ avgStress: min - 1 }))).toBe(false)
    expect(matchesTriggers(verneombud, ctx({ avgStress: min }))).toBe(true)

    const mote = DILEMMA_BY_ID.paaroerende_misnoye
    const max = mote.triggers!.maxTrivsel!
    expect(matchesTriggers(mote, ctx({ trivsel: max + 1 }))).toBe(false)
    expect(matchesTriggers(mote, ctx({ trivsel: max }))).toBe(true)

    const s = quiet()
    for (const id of s.staffOrder) s.staff[id].stress = 10
    s.ward.trivsel = 80
    expect(eligibleDilemmas(s).map((d) => d.id)).not.toContain('verneombud_varsel')
    for (const id of s.staffOrder) s.staff[id].stress = 70
    s.ward.trivsel = 30
    expect(dilemmaContext(s).avgStress).toBe(70)
    const pressed = eligibleDilemmas(s).map((d) => d.id)
    expect(pressed).toContain('verneombud_varsel')
    expect(pressed).toContain('paaroerende_misnoye')
  })

  it('respekterer nivåkrav og slipper aldri fram rene oppfølginger', () => {
    const tiered = RANDOM_DILEMMAS.find((d) => (d.minTier ?? 0) > 0 && !d.triggers)!
    expect(matchesTriggers(tiered, ctx({ tier: 0 }))).toBe(false)
    expect(matchesTriggers(tiered, ctx({ tier: tiered.minTier }))).toBe(true)
    for (const d of DILEMMAS.filter((x) => x.triggers?.isFollowUpOnly)) expect(matchesTriggers(d, ctx()), d.id).toBe(false)
  })

  it('kontekstuelle dilemmaer veier tyngre i trekningen', () => {
    expect(dilemmaWeight(DILEMMA_BY_ID.kaffekasse)).toBe(1)
    expect(dilemmaWeight(DILEMMA_BY_ID.natt_sover)).toBe(BALANCE.dilemmaWeightContext)
    expect(dilemmaWeight(DILEMMA_BY_ID.demens_robotkatt)).toBe(BALANCE.dilemmaWeightWard)
    expect(BALANCE.dilemmaWeightWard).toBeGreaterThan(BALANCE.dilemmaWeightContext)
  })

  it('gjentar ikke de 30 siste, og tar det eldste når alt er brukt', () => {
    expect(BALANCE.dilemmaRecent).toBe(30)
    const s = quiet()
    const eligible = eligibleDilemmas(s).map((d) => d.id)
    expect(eligible.length).toBeGreaterThan(BALANCE.dilemmaRecent)

    // Alt unntatt ett er brukt nylig: da må det ene komme.
    const [only, ...rest] = eligible
    s.dilemmas.recent = rest
    spawnDilemma(s)
    expect(s.dilemmas.active.map((a) => a.defId)).toEqual([only])
    expect(s.dilemmas.recent.at(-1)).toBe(only)
    expect(s.dilemmas.recent.length).toBeLessThanOrEqual(BALANCE.dilemmaRecent)

    // Alt er brukt nylig: da tas det som er lengst siden sist.
    const t = quiet()
    const all = eligibleDilemmas(t).map((d) => d.id)
    t.dilemmas.recent = [...all].reverse()
    spawnDilemma(t)
    expect(t.dilemmas.active[0].defId).toBe(all.at(-1))
    expect(t.dilemmas.recent.filter((id) => id === all.at(-1))).toHaveLength(1)
  })

  it('en lang økt på hver avdelingstype gir variert og riktig innhold', () => {
    for (const ward of Object.keys(WARD_TYPES) as WardTypeId[]) {
      let s = onWard(ward, 77)
      s.dilemmas.nextAt = 0
      const order: string[] = []
      for (let day = 0; day < 120; day++) {
        s = simulate(s, DAY).state
        for (const a of s.dilemmas.active) {
          const def = DILEMMA_BY_ID[a.defId]
          order.push(def.id)
          expect(def.triggers?.isFollowUpOnly ?? false, `${ward}: ${def.id}`).toBe(false)
          if (def.triggers?.wardTypes) expect(def.triggers.wardTypes, `${ward}: ${def.id}`).toContain(ward)
          // Lapper om en beboer har alltid en konkret beboer.
          if (usesResident(def)) expect(a.subject, def.id).toBeDefined()
          if (def.triggers?.residentProfile) expect(a.subject!.profile, def.id).toBe(def.triggers.residentProfile)
        }
        s.dilemmas.active = []
      }
      expect(new Set(order).size, ward).toBeGreaterThan(30)
      // Ingen gjentakelse blant de siste femten.
      for (let i = 0; i < order.length; i++) expect(order.slice(Math.max(0, i - 15), i), `${ward} #${i}`).not.toContain(order[i])
      if (ward !== 'sykehjem') {
        const own = new Set(order.filter((id) => DILEMMA_BY_ID[id].triggers?.wardTypes))
        expect(own.size, ward).toBeGreaterThanOrEqual(5)
      }
    }
  })
})

describe('beboeren i teksten', () => {
  const astrid: DilemmaSubject = { residentId: 7, name: 'Astrid', room: 4, profile: 'kognitiv' }
  const rolf: DilemmaSubject = { residentId: 8, name: 'Rolf', room: 11, profile: 'kognitiv' }

  it('setter inn navn, rom og pronomen etter kjønn', () => {
    const text = '{beboer} (rom {rom}): {Han} vil hjem. Datteren henter {ham}. Det er {hans} valg, sier {forelder}. Nå sover {han}.'
    expect(fillText(text, astrid)).toBe('Astrid (rom 4): Hun vil hjem. Datteren henter henne. Det er hennes valg, sier mor. Nå sover hun.')
    expect(fillText(text, rolf)).toBe('Rolf (rom 11): Han vil hjem. Datteren henter ham. Det er hans valg, sier far. Nå sover han.')
    expect(fillText('{beboer}s datter', rolf)).toBe('Rolfs datter')
    expect(fillText('Ingen plassholdere her.', astrid)).toBe('Ingen plassholdere her.')
    expect(fillText('{ukjent} står urørt', astrid)).toBe('{ukjent} står urørt')
  })

  it('velger en beboer med riktig profil når lappen henges opp', () => {
    const s = quiet()
    s.residents = [
      resident(1, 'Arne', 1, 'multisyk'),
      resident(2, 'Gerd', 2, 'ernaering'),
      resident(3, 'Ingeborg', 3, 'saar'),
      resident(4, 'Odd', 4, 'kognitiv'),
    ]
    postDilemma(s, 'saar_infeksjon')
    const note = s.dilemmas.active[0]
    expect(note.subject).toEqual({ residentId: 3, name: 'Ingeborg', room: 3, profile: 'saar' })

    const shown = renderDilemma(DILEMMA_BY_ID.saar_infeksjon, note.subject)
    expect(shown.body).toContain('Leggsåret til Ingeborg (rom 3)')
    expect(shown.options.find((o) => o.id === 'vent_saarsykepleier')!.outcome).toContain('hadde Ingeborg frostanfall')
    // Kildedataene er urørt.
    expect(DILEMMA_BY_ID.saar_infeksjon.body).toContain('{beboer}')
  })

  it('dilemmaer uten profilkrav kan handle om hvem som helst – og helst ikke samme beboer to ganger', () => {
    const s = quiet()
    s.residents = [resident(1, 'Arne', 1, 'multisyk'), resident(2, 'Gerd', 2, 'ernaering')]
    postDilemma(s, 'hjerneslag_fast')
    postDilemma(s, 'fall_blodfortynnende')
    const [a, b] = s.dilemmas.active.map((n) => n.subject!)
    expect(new Set([a.residentId, b.residentId])).toEqual(new Set([1, 2]))
    // Lapper som ikke handler om en beboer, får ingen.
    postDilemma(s, 'kaffekasse')
    expect(s.dilemmas.active[2].subject).toBeUndefined()
  })

  it('utfallet nevner beboeren, også etter at hun er skrevet ut', () => {
    const s = quiet()
    s.residents = [resident(3, 'Ingeborg', 3, 'saar')]
    postDilemma(s, 'saar_infeksjon')
    s.residents = [] // utskrevet før lederen rakk å lese lappen
    const r = choose(s, 'saar_infeksjon', 'vent_saarsykepleier')
    expect(r.resolution.outcome).toContain('Ingeborg')
    expect(r.resolution.outcome).not.toMatch(/[{}]/)
    expect(r.resolution.subject?.name).toBe('Ingeborg')
  })

  it('eldre lagringer får en beboer på lapper som trenger det', () => {
    const old = createInitialState(T0, 5)
    old.version = 4
    old.dilemmas.active = [
      { uid: 9, defId: 'paaroerende_klage', postedAt: 0, tilt: 1 },
      { uid: 10, defId: 'kaffekasse', postedAt: 0, tilt: 1 },
    ]
    old.dilemmas.recent = Array.from({ length: 50 }, (_, i) => `gammel_${i}`)
    const m = migrateGameState(JSON.parse(JSON.stringify(old)), T0)
    expect(m.version).toBe(STATE_VERSION)
    const [klage, kaffe] = m.dilemmas.active
    expect(m.residents.map((r) => r.id)).toContain(klage.subject!.residentId)
    expect(renderDilemma(DILEMMA_BY_ID.paaroerende_klage, klage.subject).body).toContain(`Datteren til ${klage.subject!.name}`)
    expect(kaffe.subject).toBeUndefined()
    expect(m.dilemmas.recent.length).toBeLessThanOrEqual(BALANCE.dilemmaRecent)
    // Migreringen er idempotent: beboeren byttes ikke ut neste gang.
    expect(migrateGameState(JSON.parse(JSON.stringify(m)), T0).dilemmas.active).toEqual(m.dilemmas.active)
  })
})

describe('historiekjeder', () => {
  it('tre steg: valget på steg 1 planlegger steg 2, og steg 2 planlegger steg 3', () => {
    let s = quiet()
    postDilemma(s, 'utbrudd_start')

    // Steg 1 → 2
    const first = choose(s, 'utbrudd_start', 'haandsprit')
    expect(first.resolution).toMatchObject({ followUpScheduled: true, followUpKind: 'kjede' })
    expect(first.state.dilemmas.followUps).toMatchObject([{ defId: 'utbrudd_sprer', sourceId: 'utbrudd_start' }])
    expect(first.state.dilemmas.active).toHaveLength(0)

    // Ikke før tiden.
    const due = first.state.dilemmas.followUps[0].dueAt
    expect(simulate(first.state, due - first.state.minute - HOUR).state.dilemmas.active).toHaveLength(0)
    s = untilFollowUp(first.state)
    expect(s.dilemmas.active).toMatchObject([{ defId: 'utbrudd_sprer', followUpOf: 'utbrudd_start' }])
    expect(s.dilemmas.followUps).toHaveLength(0)

    // Steg 2 → 3
    const second = choose(s, 'utbrudd_sprer', 'alle_paa_rommet')
    expect(second.resolution.followUpKind).toBe('kjede')
    s = untilFollowUp(second.state)
    expect(s.dilemmas.active).toMatchObject([{ defId: 'utbrudd_evaluering', followUpOf: 'utbrudd_sprer' }])
    expect(DILEMMA_BY_ID.utbrudd_evaluering.chain).toEqual({ id: 'utbrudd', step: 3 })

    // Steg 3 avslutter historien.
    const third = choose(s, 'utbrudd_evaluering', 'ferdig')
    expect(third.resolution.followUpScheduled).toBe(false)
    expect(third.resolution.followUpKind).toBeUndefined()
    expect(third.state.dilemmas.followUps).toHaveLength(0)
    expect(third.state.dilemmas.active).toHaveLength(0)
  })

  it('valget på steg 1 avgjør hvilken variant av steg 2 som kommer', () => {
    const s = quiet()
    postDilemma(s, 'utbrudd_start')
    const contained = DILEMMA_BY_ID.utbrudd_start.options.find((o) => o.id === 'isoler_test')!
    const spread = DILEMMA_BY_ID.utbrudd_start.options.find((o) => o.id === 'vent_prove')!
    expect(contained.followUp!.id).toBe('utbrudd_besok')
    expect(spread.followUp!.id).toBe('utbrudd_sprer')
    expect(choose(s, 'utbrudd_start', 'vent_prove').state.dilemmas.followUps[0].defId).toBe('utbrudd_sprer')
  })

  it('samme beboer følger saken gjennom alle tre steg', () => {
    let s = quiet()
    s.residents = [resident(1, 'Arne', 1, 'multisyk'), resident(2, 'Gerd', 2, 'kognitiv'), resident(3, 'Odd', 3, 'kognitiv')]
    postDilemma(s, 'smerte_start')
    const subject = s.dilemmas.active[0].subject!
    expect(subject.profile).toBe('kognitiv')

    const first = choose(s, 'smerte_start', 'uro')
    expect(first.state.dilemmas.followUps[0].subject).toEqual(subject)
    s = untilFollowUp(first.state)
    expect(s.dilemmas.active[0]).toMatchObject({ defId: 'smerte_ingen_effekt', subject })
    expect(renderDilemma(DILEMMA_BY_ID.smerte_ingen_effekt, s.dilemmas.active[0].subject).body).toContain(subject.name)

    s = untilFollowUp(choose(s, 'smerte_ingen_effekt', 'vent_torsdag').state)
    expect(s.dilemmas.active[0]).toMatchObject({ defId: 'smerte_funn', subject })
    expect(renderDilemma(DILEMMA_BY_ID.smerte_funn, subject).body).toContain(`Datteren til ${subject.name}`)
  })

  it('et godt valg på steg 2 kan avslutte historien før steg 3', () => {
    const s = quiet()
    for (const id of s.staffOrder) s.staff[id].skills.deeskalering = 3
    postDilemma(s, 'soesken_filmer')
    const good = choose(s, 'soesken_filmer', 'grense_og_mote')
    expect(good.resolution.followUpScheduled).toBe(false)
    expect(good.state.dilemmas.followUps).toHaveLength(0)

    const bad = choose(s, 'soesken_filmer', 'la_filme')
    expect(bad.state.dilemmas.followUps).toMatchObject([{ defId: 'soesken_avis' }])
  })

  it('en kjede starter ikke på nytt mens den pågår', () => {
    const s = quiet()
    expect(eligibleDilemmas(s).map((d) => d.id)).toContain('utbrudd_start')
    postDilemma(s, 'utbrudd_start')
    const first = choose(s, 'utbrudd_start', 'haandsprit').state
    // Steg 2 er planlagt: første steg kan ikke trekkes på nytt.
    expect(eligibleDilemmas(first).map((d) => d.id)).not.toContain('utbrudd_start')
    const second = untilFollowUp(first)
    expect(eligibleDilemmas(second).map((d) => d.id)).not.toContain('utbrudd_start')
    // Når historien er avsluttet, er den ledig igjen.
    const done = untilFollowUp(choose(second, 'utbrudd_sprer', 'syke_paa_jobb').state)
    const closed = choose(done, 'utbrudd_evaluering', 'ferdig').state
    expect(eligibleDilemmas(closed).map((d) => d.id)).toContain('utbrudd_start')
  })

  it('en utsatt sak regnes som utsatt, ikke som kjede, og kan ikke trekkes mens den venter', () => {
    const s = quiet()
    postDilemma(s, 'paaroerende_klage')
    const subject = s.dilemmas.active[0].subject!
    const r = choose(s, 'paaroerende_klage', 'skriftlig')
    expect(r.resolution.followUpKind).toBe('utsatt')
    expect(r.state.dilemmas.followUps[0].subject).toEqual(subject)
    expect(eligibleDilemmas(r.state).map((d) => d.id)).not.toContain('paaroerende_klage')
    const back = untilFollowUp(r.state)
    expect(back.dilemmas.active[0]).toMatchObject({ defId: 'klage_statsforvalter', subject })
  })
})
