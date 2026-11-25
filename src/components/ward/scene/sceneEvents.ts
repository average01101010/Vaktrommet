import type { ShiftId, WardTypeId } from '@/types'
import type { Agent, BubbleIcon, CarryItem, Crew, ResidentAgent, Residents, Walker } from './agents'
import type { DoorSlot } from './layout'

/**
 * Mikro-hendelser i avdelingsvisningen: små scener som passer avdelingstypen,
 * vakta, dekningen og trivselen. En hendelse er en liste med steg som låner
 * beboere og pleiere, setter ut rekvisitter og gir alt tilbake når den er over.
 *
 * Alt her er pynt: ingenting leser eller endrer spilltilstanden.
 */

/** Det hendelsene får vite om situasjonen. */
export interface EventContext {
  ward: WardTypeId
  shift: ShiftId
  /** Dekning 0–1 på vakta som går. */
  coverage: number
  trivsel: number
  /** 0–1: hvor presset avdelingen er. Styrer hvor ofte noe skjer. */
  urgency: number
  /** Vaktskifte: pleierne står ved rapportbordet og kan ikke tilkalles. */
  rapport: boolean
  /** Medisintralla er kjøpt og står i gangen. */
  tralle: boolean
}

export interface Stage {
  crew: Crew
  residents: Residents
  doors: DoorSlot[]
  ctx: EventContext
  /** Animasjonstid i sekunder. */
  time: number
}

export type PropKind =
  | 'dam' | 'botte' | 'stol' | 'bag' | 'pose' | 'samling' | 'vafler' | 'bukett'
  | 'soel' | 'gryte' | 'varer' | 'tallerkener' | 'kopp'

/** En rekvisitt en hendelse har satt ut i rommet. Tegnes og dybdesorteres i draw.ts. */
export interface SceneProp {
  kind: PropKind
  x: number
  y: number
  z: number
  alpha: number
  /** Størrelse eller antall, avhengig av typen (dam: 0–1, tallerkener: antall). */
  n: number
  color: string
  /** Sekunder rekvisitten blir stående etter at hendelsen er over. */
  linger: number
  /** Tones ut. */
  leaving: boolean
}

/** Det tegnelaget trenger fra hendelsene akkurat nå. */
export interface EventView {
  props: SceneProp[]
  /** Pinnestolen på demensavdelingen er flyttet ut i gangen. */
  chairAway: boolean
  /** TV-en i bofellesskapet: 1 = vanlig bilde, 2 = noen zapper. */
  tv: number
  /** 0–1: ekstra varmt lys rundt sittegruppa (kveldsro). */
  kveldsro: number
  /** Navn på hendelsene som pågår – for feilsøking. */
  active: string[]
}

interface Step {
  enter?(r: Run): void
  tick?(r: Run, dt: number): void
  done?(r: Run): boolean
  /** Sekunder før steget gis opp. */
  max?: number
  /** Gis steget opp, avbrytes hele hendelsen (pleieren kom aldri). */
  fail?: boolean
}

export interface SceneEventDef {
  id: string
  ward: WardTypeId
  name: string
  shifts?: ShiftId[]
  when?(c: EventContext): boolean
  /** Antall ledige beboere hendelsen trenger, og hvor mange flere den gjerne tar med. */
  residents?: number
  extra?: number
  pick?(r: ResidentAgent): boolean
  /** Tilkaller en pleier. Starter ikke under vaktskiftet. */
  nurse?: boolean
  /** Bare lys og stemning: låner ingen og kan gå samtidig med andre hendelser. */
  ambient?: boolean
  /** Stedet hendelsen bruker. To hendelser på samme sted går ikke samtidig. */
  zone: string
  steps: Step[]
}

const isResident = (w: Walker): w is ResidentAgent => 'persona' in w

class Run {
  step = 0
  /** Sekunder i steget som pågår. */
  t = 0
  entered = false
  failed = false
  R: ResidentAgent[] = []
  N: Agent[] = []
  G: ResidentAgent[] = []
  flags: Record<string, number> = {}
  /** Tall hendelsen har trukket (f.eks. hvilken dør). */
  memo: Record<string, number> = {}
  props = new Map<string, SceneProp>()
  /** Figurer som er gitt tilbake før hendelsen er slutt. */
  private released = new Set<Walker>()

  constructor(
    readonly def: SceneEventDef,
    readonly engine: SceneEvents,
  ) {}

  get stage(): Stage {
    return this.engine.stage
  }
  get ctx(): EventContext {
    return this.engine.stage.ctx
  }
  get doors(): number {
    return this.engine.stage.doors.length
  }

  put(key: string, kind: PropKind, x: number, y: number, z = 0, extra: Partial<SceneProp> = {}): SceneProp {
    const prop: SceneProp = { kind, x, y, z, alpha: 0, n: 1, color: '', linger: 0, leaving: false, ...extra }
    this.props.set(key, prop)
    this.engine.props.push(prop)
    return prop
  }

  drop(key: string): void {
    const prop = this.props.get(key)
    if (prop) prop.leaving = true
    this.props.delete(key)
  }

  /** Sender en figur til et veipunkt. Er det et sete, flytter andre seg. */
  send(w: Walker | undefined, node: string, opts: MoveOpts = {}): void {
    if (!w) return
    const { crew, residents } = this.stage
    if (crew.graph.seats[node]) {
      residents.evict(node, w)
      crew.graph.reserved.set(node, w.id)
    }
    const pace = typeof opts.pace === 'function' ? opts.pace(this) : undefined
    w.speed = opts.speed ?? (pace && isResident(pace) ? residents.speedOf(pace) : null)
    w.hold = opts.hold ?? 0
    w.ox = opts.ox ?? 0
    w.oy = opts.oy ?? 0
    if (isResident(w)) residents.send(w, node)
    else crew.send(w as Agent, node)
  }

  claimNurse(node: string, opts: NurseOpts): Agent | null {
    const a = this.stage.crew.claim(this.def.id, node)
    if (!a) return null
    a.carry = opts.carry ?? null
    a.rush = opts.rush ?? 0
    a.ox = opts.ox ?? 0
    a.oy = opts.oy ?? 0
    this.N.push(a)
    return a
  }

  guest(kind: 'paaroerende' | 'nattvandrer', node: string, door = 0): ResidentAgent {
    const g = this.stage.residents.guest(this.def.id, kind, node, door)
    this.G.push(g)
    return g
  }

  /** Gir en figur tilbake før hendelsen er slutt. `stay`: en beboer blir sittende. */
  free(w: Walker | undefined, stay = false): void {
    if (!w || this.released.has(w)) return
    this.released.add(w)
    if (isResident(w)) this.stage.residents.release(w, stay)
    else this.stage.crew.release(w as Agent)
  }

  /** Beboeren forlater scenen (utskrevet) uten å bytte klær på veien ut. */
  discharge(w: ResidentAgent | undefined, via: string): void {
    if (!w || this.released.has(w)) return
    this.released.add(w)
    this.stage.residents.dismiss(w, via, true)
  }

  finish(): void {
    for (const w of [...this.R, ...this.G, ...this.N]) this.free(w)
    // Kom det aldri noen, blir rotet stående en liten stund før det forsvinner.
    for (const prop of this.props.values()) prop.linger = this.failed ? 3 : Math.max(prop.linger, 0.001)
  }
}

// ---------------------------------------------------------------------------
// Byggeklosser for steg
// ---------------------------------------------------------------------------

type Who = (r: Run) => Walker | undefined
type Where = string | ((r: Run) => string)
interface MoveOpts {
  /** Fast fart, eller samme fart som en annen figur (følge). */
  speed?: number
  pace?: Who
  hold?: number
  ox?: number
  oy?: number
}
interface NurseOpts {
  carry?: CarryItem
  rush?: number
  ox?: number
  oy?: number
}

const R = (i: number): Who => (r) => r.R[i]
const N0: Who = (r) => r.N[0]
const G0: Who = (r) => r.G[0]
const node = (w: Where, r: Run): string => (typeof w === 'string' ? w : w(r))

/** Framme: står stille ved målet (eller er ute av scenen). */
const arrived = (w: Walker | undefined): boolean => !w || w.gone || (w.mode === 'act' && w.path.length === 0)

const wait = (seconds: number): Step => ({ done: (r) => r.t >= seconds })
const act = (fn: (r: Run) => void): Step => ({ enter: fn })
const during = (seconds: number, tick: (r: Run, dt: number) => void): Step => ({ tick, done: (r) => r.t >= seconds })
const go = (who: Who, where: Where, opts: MoveOpts = {}): Step => ({
  enter: (r) => r.send(who(r), node(where, r), opts),
  done: (r) => arrived(who(r)),
  max: 40,
})
/** Tilkaller nærmeste ledige pleier. Kommer ingen innen rimelig tid, gis hendelsen opp. */
const nurse = (where: Where, opts: NurseOpts = {}, tick?: (r: Run, dt: number) => void): Step => {
  let mine: Agent | null = null
  return {
    enter: (r) => void (mine = r.claimNurse(node(where, r), opts)),
    tick: (r, dt) => {
      if (!mine || !r.N.includes(mine)) mine = r.claimNurse(node(where, r), opts)
      tick?.(r, dt)
    },
    done: () => Boolean(mine) && arrived(mine!),
    max: 16,
    fail: true,
  }
}
const all = (...steps: Step[]): Step => ({
  enter: (r) => steps.forEach((s) => s.enter?.(r)),
  tick: (r, dt) => steps.forEach((s) => s.tick?.(r, dt)),
  done: (r) => steps.every((s) => !s.done || s.done(r)),
  max: Math.max(...steps.map((s) => s.max ?? 30)),
  fail: steps.some((s) => s.fail),
})
/** Stegene kjøres bare om avdelingen har minst `n` dører. */
const ifDoor = (n: number, ...steps: Step[]): Step[] =>
  steps.map((s) => ({
    enter: (r) => void (r.doors >= n && s.enter?.(r)),
    tick: (r, dt) => void (r.doors >= n && s.tick?.(r, dt)),
    done: (r) => r.doors < n || !s.done || s.done(r),
    max: s.max,
    fail: s.fail,
  }))

const pose = (w: Walker | undefined, p: Partial<Walker>): void => void (w && Object.assign(w, p))
const bubble = (icon: BubbleIcon | null, ...ws: (Walker | undefined)[]): void => ws.forEach((w) => pose(w, { bubble: icon, whisper: false }))
/** Én om gangen har ordet. */
const takeTurns = (icon: BubbleIcon, every: number, whisper: boolean) => (r: Run): void => {
  const people = [...r.R, ...r.G, ...r.N].filter((w) => w.mode === 'act')
  const speaker = Math.floor(r.t / every) % Math.max(1, people.length)
  people.forEach((w, i) => pose(w, { bubble: i === speaker ? icon : null, whisper }))
}

const mobile = (r: ResidentAgent): boolean => r.aid !== 'rullestol'
const unaided = (r: ResidentAgent): boolean => r.aid === null
const lowCoverage = (c: EventContext): boolean => c.coverage < 0.75
const DAYTIME: ShiftId[] = ['dag', 'aften']

const midLane: Where = (r) => `c${Math.ceil(r.doors / 2)}`
const lastLane: Where = (r) => `c${r.doors}`
const supply: Where = (r) => (r.ctx.tralle ? 'tralle' : 'med')
const pickDoor = (r: Run): number => (r.memo.door ??= 1 + Math.floor(r.engine.rnd() * r.doors))
const doorOf: Where = (r) => `p${pickDoor(r)}`
const laneOf: Where = (r) => `c${pickDoor(r)}`
const nextLane: Where = (r) => `c${pickDoor(r) < r.doors ? pickDoor(r) + 1 : pickDoor(r) - 1}`
/** Tilbake til forsyningene mellom hver dør – eller rett til neste dør når tralla mangler. */
const supplyOr = (door: number): Where => (r) => (r.ctx.tralle ? 'tralle' : `p${Math.min(door, r.doors)}`)

// ---------------------------------------------------------------------------
// Hendelsene
// ---------------------------------------------------------------------------

export const SCENE_EVENTS: SceneEventDef[] = [
  // ======================= Skjermet demensenhet =======================
  {
    id: 'potteplante',
    ward: 'demens',
    name: 'Potteplante-uhell',
    shifts: DAYTIME,
    residents: 1,
    pick: mobile,
    nurse: true,
    zone: 'plante',
    steps: [
      go(R(0), 'plante'),
      act((r) => pose(r.R[0], { flip: -1, away: true })),
      wait(1.6),
      act((r) => r.put('dam', 'dam', 5.3, 5.27, 0, { color: '#E3C94B', n: 0.15, linger: 6 })),
      during(1.4, (r, dt) => void (r.props.get('dam')!.n = Math.min(1, r.props.get('dam')!.n + dt * 0.7))),
      act((r) => r.free(r.R[0])),
      nurse('plante', { carry: 'mopp' }),
      act((r) => {
        pose(r.N[0], { flip: -1, away: false, anim: 'vask' })
        r.put('botte', 'botte', 5.74, 5.2)
      }),
      during(2.8, (r, dt) => void (r.props.get('dam')!.n = Math.max(0.05, r.props.get('dam')!.n - dt * 0.38))),
      act((r) => {
        r.drop('dam')
        r.drop('botte')
        pose(r.N[0], { anim: null, bubble: 'hake' })
      }),
      wait(1.1),
    ],
  },
  {
    id: 'mobelflytting',
    ward: 'demens',
    name: 'Møbelflytting',
    shifts: DAYTIME,
    residents: 1,
    pick: unaided,
    nurse: true,
    zone: 'gang',
    steps: [
      go(R(0), 'stolhjem'),
      act((r) => {
        r.flags.chairAway = 1
        pose(r.R[0], { carry: 'stol' })
      }),
      wait(0.5),
      go(R(0), midLane),
      act((r) => {
        const w = r.R[0]
        pose(w, { carry: null })
        r.put('stol', 'stol', w.x + 0.42, w.y + 0.14)
      }),
      wait(0.8),
      act((r) => r.free(r.R[0])),
      nurse(midLane, { ox: -0.4 }),
      wait(0.5),
      act((r) => {
        r.drop('stol')
        pose(r.N[0], { carry: 'stol' })
      }),
      go(N0, 'stolhjem'),
      act((r) => {
        r.flags.chairAway = 0
        pose(r.N[0], { carry: null, bubble: 'hake' })
      }),
      wait(0.9),
    ],
  },
  {
    id: 'bussen_gaar',
    ward: 'demens',
    name: '«Bussen går nå» ved døra',
    shifts: DAYTIME,
    residents: 1,
    pick: mobile,
    nurse: true,
    zone: 'utgang',
    steps: [
      act((r) => pose(r.R[0], { wear: 'jakke', carry: 'veske' } as Partial<ResidentAgent>)),
      go(R(0), 'ende'),
      act((r) => pose(r.R[0], { flip: 1, away: false, bubble: 'buss' })),
      wait(2.4),
      nurse('ende', { oy: 0.38 }),
      act((r) => pose(r.N[0], { flip: 1, away: false, bubble: 'snakk' })),
      wait(1.8),
      act((r) => bubble(null, r.R[0], r.N[0])),
      // Arm i arm tilbake til sittegruppa
      all(go(R(0), 'stol'), go(N0, 'stol', { pace: R(0), oy: 0.38 })),
      act((r) => {
        pose(r.R[0], { wear: null, carry: null } as Partial<ResidentAgent>)
        bubble('hjerte', r.N[0])
      }),
      wait(1.2),
    ],
  },
  {
    id: 'samlemani',
    ward: 'demens',
    name: 'Samlemani',
    shifts: DAYTIME,
    residents: 1,
    pick: unaided,
    nurse: true,
    zone: 'gruppe',
    steps: [
      go(R(0), 'rs3'),
      act((r) => pose(r.R[0], { flip: -1, away: true })),
      wait(1.1),
      act((r) => pose(r.R[0], { carry: 'perm' })),
      go(R(0), 'sete'),
      act((r) => {
        pose(r.R[0], { carry: null })
        r.put('samling', 'samling', 9.52, 5.1)
      }),
      wait(1.6),
      nurse('stolinn'),
      act((r) => pose(r.N[0], { flip: -1, away: false, bubble: 'snakk' })),
      wait(1.5),
      act((r) => {
        r.drop('samling')
        pose(r.N[0], { carry: 'perm', bubble: null })
        bubble('hjerte', r.R[0])
      }),
      wait(0.8),
      act((r) => r.free(r.R[0], true)),
      go(N0, 'rs3'),
      act((r) => pose(r.N[0], { carry: null, away: true, bubble: 'hake' })),
      wait(0.9),
    ],
  },
  {
    id: 'solnedgangsuro',
    ward: 'demens',
    name: 'Solnedgangsuro',
    shifts: DAYTIME,
    when: (c) => c.shift === 'aften' || lowCoverage(c),
    residents: 2,
    pick: mobile,
    nurse: true,
    zone: 'gang',
    steps: [
      act((r) => r.R.forEach((w) => pose(w, { anim: 'uro' }))),
      all(go(R(0), 'c1', { speed: 1.05 }), go(R(1), lastLane, { speed: 1.05 })),
      act((r) => bubble('stress', ...r.R)),
      wait(0.7),
      all(go(R(0), lastLane, { speed: 1.05 }), go(R(1), 'c1', { speed: 1.05 })),
      nurse(midLane, { rush: 0.6 }),
      act((r) => pose(r.N[0], { away: false, bubble: 'snakk' })),
      all(go(R(0), midLane, { ox: -0.55 }), go(R(1), midLane, { ox: 0.55 })),
      wait(1.6),
      act((r) => {
        r.R.forEach((w) => pose(w, { anim: null, away: false }))
        bubble('hjerte', ...r.R)
        bubble(null, r.N[0])
      }),
      wait(1.6),
    ],
  },
  {
    id: 'vaffelkos',
    ward: 'demens',
    name: 'Vaffel- og kaffekos',
    shifts: DAYTIME,
    when: (c) => c.trivsel >= 60,
    residents: 2,
    pick: mobile,
    nurse: true,
    zone: 'gruppe',
    steps: [
      act((r) => r.put('vafler', 'vafler', 7.42, 4.87, 0.455, { linger: 10 })),
      all(go(R(0), 'sc'), go(R(1), 'sete')),
      nurse('gh', { carry: 'kanne' }),
      act((r) => {
        pose(r.N[0], { flip: -1, away: false })
        bubble('hjerte', ...r.R, r.N[0])
      }),
      wait(4.5),
      act((r) => {
        bubble(null, ...r.R, r.N[0])
        r.R.forEach((w) => r.free(w, true))
      }),
      wait(0.4),
    ],
  },
  {
    id: 'nattvandrer',
    ward: 'demens',
    name: 'Nattvandrer',
    shifts: ['natt'],
    nurse: true,
    zone: 'gang',
    steps: [
      act((r) => r.guest('nattvandrer', node(doorOf, r), pickDoor(r) - 1)),
      go(G0, laneOf),
      go(G0, nextLane),
      wait(0.6),
      nurse(nextLane, { carry: 'lykt', ox: -0.5 }),
      act((r) => pose(r.N[0], { bubble: 'snakk' })),
      wait(1.4),
      act((r) => bubble(null, r.N[0])),
      // Nattevakta følger like bak, med lykta
      all(go(G0, doorOf), go(N0, doorOf, { pace: G0, ox: -0.5, hold: 0.4 })),
      act((r) => {
        pose(r.G[0], { hidden: true })
        pose(r.N[0], { away: true, bubble: 'hake' })
      }),
      wait(1.3),
    ],
  },

  // ======================= Korttid og rehabilitering =======================
  {
    id: 'gangtrening',
    ward: 'korttid',
    name: 'Gangtrening i barren',
    shifts: DAYTIME,
    residents: 1,
    pick: mobile,
    nurse: true,
    zone: 'gruppe',
    steps: [
      go(R(0), 'g3'),
      nurse('g3', { oy: 0.55 }),
      act((r) => pose(r.R[0], { anim: 'barre' })),
      all(go(R(0), 'g1', { speed: 0.4 }), go(N0, 'g1', { speed: 0.4, oy: 0.55 })),
      wait(0.8),
      all(go(R(0), 'g3', { speed: 0.4 }), go(N0, 'g3', { speed: 0.4, oy: 0.55 })),
      act((r) => {
        pose(r.R[0], { anim: null, away: false })
        pose(r.N[0], { away: false })
        bubble('hjerte', r.R[0], r.N[0])
      }),
      wait(1.4),
    ],
  },
  {
    id: 'prekestol_ustoe',
    ward: 'korttid',
    name: 'Prekestol-tur med ustøhet',
    shifts: DAYTIME,
    residents: 1,
    pick: (r) => r.aid === 'prekestol' || r.aid === 'rullator',
    nurse: true,
    zone: 'gang',
    steps: [
      go(R(0), 'c1'),
      go(R(0), midLane),
      act((r) => pose(r.R[0], { anim: 'svimmel', bubble: 'svimmel', away: false })),
      nurse(midLane, { rush: 1, ox: 0.5, oy: 0.12 }),
      act((r) => pose(r.N[0], { flip: -1, away: false, bubble: 'hjerte' })),
      wait(2.4),
      act((r) => {
        pose(r.R[0], { anim: null })
        bubble(null, r.R[0], r.N[0])
      }),
      wait(0.5),
    ],
  },
  {
    id: 'treningsball',
    ward: 'korttid',
    name: 'Øvelse på treningsball',
    shifts: DAYTIME,
    residents: 1,
    pick: unaided,
    zone: 'ball',
    steps: [
      go(R(0), 'ball'),
      act((r) => pose(r.R[0], { anim: 'sprett' })),
      wait(5.5),
      act((r) => bubble('hjerte', r.R[0])),
      wait(1.4),
      act((r) => pose(r.R[0], { anim: null })),
    ],
  },
  {
    id: 'utskrivningsklar',
    ward: 'korttid',
    name: 'Utskrivningsklar med bag',
    shifts: DAYTIME,
    residents: 1,
    pick: mobile,
    nurse: true,
    zone: 'gang',
    steps: [
      act((r) => pose(r.R[0], { wear: 'jakke' } as Partial<ResidentAgent>)),
      go(R(0), 'p1'),
      act((r) => {
        const w = r.R[0]
        pose(w, { away: false, flip: 1 })
        r.put('bag', 'bag', w.x + 0.46, w.y + 0.28)
      }),
      wait(1.4),
      nurse('p1', { carry: 'papir', ox: -0.5, oy: 0.15 }),
      act((r) => pose(r.N[0], { flip: 1, away: false, bubble: 'snakk' })),
      wait(1.5),
      act((r) => {
        pose(r.N[0], { carry: null, bubble: 'hake' })
        pose(r.R[0], { carry: 'papir' })
      }),
      wait(1.2),
      act((r) => {
        r.drop('bag')
        pose(r.R[0], { carry: 'bag' })
        r.discharge(r.R[0], 'exit')
      }),
      wait(0.6),
    ],
  },
  {
    id: 'medisinrunde',
    ward: 'korttid',
    name: 'Medisinrunde under press',
    when: lowCoverage,
    nurse: true,
    zone: 'medisin',
    steps: [
      nurse(supply, { rush: 1 }),
      act((r) => pose(r.N[0], { carry: 'brett' })),
      ...[1, 2, 3].flatMap((door) =>
        ifDoor(
          door,
          go(N0, `p${door}`),
          act((r) => pose(r.N[0], { away: true, bubble: 'medisin' })),
          wait(0.9),
          act((r) => bubble(null, r.N[0])),
          go(N0, supplyOr(door + 1)),
        ),
      ),
      act((r) => pose(r.N[0], { carry: null, bubble: 'hake' })),
      wait(0.8),
    ],
  },

  // ======================= Lindrende enhet =======================
  {
    id: 'paaroerendevaak',
    ward: 'lindrende',
    name: 'Pårørendevåk',
    nurse: true,
    zone: 'gruppe',
    steps: [
      act((r) => r.guest('paaroerende', 'exit')),
      go(G0, 'sa'),
      act((r) => pose(r.G[0], { carry: 'kopp' })),
      wait(2.8),
      nurse('g1', { carry: 'teppe' }),
      act((r) => pose(r.N[0], { away: true })),
      wait(0.9),
      act((r) => {
        pose(r.N[0], { carry: null, bubble: 'hjerte' })
        pose(r.G[0], { carry: 'teppe' })
      }),
      wait(1.4),
      act((r) => r.free(r.N[0])),
      wait(5.5),
    ],
  },
  {
    id: 'blomsterlevering',
    ward: 'lindrende',
    name: 'Blomsterlevering',
    shifts: DAYTIME,
    nurse: true,
    zone: 'bord',
    steps: [
      nurse('ende'),
      act((r) => pose(r.N[0], { carry: 'bukett' })),
      wait(0.5),
      go(N0, 'g2'),
      act((r) => {
        pose(r.N[0], { carry: null, away: false, bubble: 'hjerte' })
        r.put('bukett', 'bukett', 6.63, 5.05, 0.45, { linger: 40 })
      }),
      wait(1.3),
    ],
  },
  {
    id: 'smertepumpe',
    ward: 'lindrende',
    name: 'Smertepumpe-sjekk',
    nurse: true,
    zone: 'medisin',
    steps: [
      nurse(supply),
      act((r) => pose(r.N[0], { carry: 'koffert' })),
      wait(0.8),
      go(N0, doorOf),
      // Inn på rommet …
      act((r) => pose(r.N[0], { hidden: true })),
      wait(3),
      // … og ut igjen
      act((r) => pose(r.N[0], { hidden: false, carry: null, away: false, bubble: 'hake' })),
      wait(1.6),
    ],
  },
  {
    id: 'stille_samtale',
    ward: 'lindrende',
    name: 'Stille samtale',
    nurse: true,
    zone: 'gruppe',
    steps: [
      act((r) => r.guest('paaroerende', 'exit')),
      all(go(G0, 'sa'), nurse('sc')),
      during(7, takeTurns('snakk', 1.8, true)),
      act((r) => {
        bubble(null, r.G[0])
        bubble('hjerte', r.N[0])
      }),
      wait(1.2),
    ],
  },
  {
    id: 'kveldsro',
    ward: 'lindrende',
    name: 'Kveldsro',
    shifts: ['aften'],
    ambient: true,
    zone: 'lys',
    steps: [
      // Lyset rundt sittegruppa glir sakte opp, holder seg og dempes igjen
      during(26, (r) => void (r.flags.kveldsro = Math.min(1, r.t / 3, (26 - r.t) / 3))),
    ],
  },

  // ======================= Bofellesskap =======================
  {
    id: 'kaffesol',
    ward: 'bofellesskap',
    name: 'Kaffekoking med søl',
    shifts: DAYTIME,
    residents: 1,
    nurse: true,
    zone: 'kjokken',
    steps: [
      go(R(0), 'kjokken'),
      act((r) => pose(r.R[0], { flip: -1, away: true, bubble: 'kaffe' })),
      wait(2.2),
      act((r) => {
        r.put('soel', 'soel', 4.9, 0.94, 0.91)
        r.put('dam', 'dam', 5.14, 1.34, 0, { color: '#8A5A32', n: 0.55 })
        bubble('utrop', r.R[0])
      }),
      wait(1.3),
      nurse('kjokken', { carry: 'klut', ox: 0.12, oy: 0.52 }),
      act((r) => pose(r.N[0], { flip: -1, away: true, anim: 'vask' })),
      during(2.4, (r, dt) => void (r.props.get('dam')!.n = Math.max(0.05, r.props.get('dam')!.n - dt * 0.24))),
      act((r) => {
        r.drop('dam')
        r.drop('soel')
        pose(r.N[0], { anim: null, carry: null, bubble: 'hake' })
        bubble('hjerte', r.R[0])
      }),
      wait(1.2),
    ],
  },
  {
    id: 'sofaprat',
    ward: 'bofellesskap',
    name: 'Sosialt i den gule sofaen',
    shifts: DAYTIME,
    residents: 2,
    extra: 1,
    zone: 'gruppe',
    steps: [all(go(R(0), 'sa'), go(R(1), 'sc'), go(R(2), 'sb')), during(8, takeTurns('snakk', 1.6, false)), act((r) => r.R.forEach((w) => r.free(w, true)))],
  },
  {
    id: 'handlepose',
    ward: 'bofellesskap',
    name: 'Handlepose ved kjøkkenet',
    shifts: DAYTIME,
    residents: 1,
    nurse: true,
    zone: 'kjokken',
    steps: [
      act((r) => pose(r.R[0], { wear: 'jakke', carry: 'pose' } as Partial<ResidentAgent>)),
      go(R(0), 'kjokken'),
      act((r) => {
        pose(r.R[0], { carry: null, away: true, flip: -1 })
        r.put('pose', 'pose', 5.52, 1.44)
      }),
      wait(0.9),
      nurse('kjokken', { ox: 0.12, oy: 0.52 }),
      act((r) => pose(r.N[0], { flip: -1, away: true })),
      wait(1.1),
      act((r) => {
        r.put('varer', 'varer', 4.9, 0.72, 0.91, { linger: 18 })
        r.drop('pose')
      }),
      wait(1.1),
      act((r) => {
        pose(r.R[0], { wear: null } as Partial<ResidentAgent>)
        bubble('hjerte', r.N[0], r.R[0])
      }),
      wait(1.1),
    ],
  },
  {
    id: 'tv_kanal',
    ward: 'bofellesskap',
    name: 'Uenighet om TV-kanalen',
    shifts: DAYTIME,
    residents: 2,
    nurse: true,
    zone: 'gruppe',
    steps: [
      all(go(R(0), 'sa'), go(R(1), 'sc')),
      act((r) => void (r.flags.tv = 2)),
      during(2.6, takeTurns('utrop', 0.7, false)),
      nurse('g1', {}, (r) => {
        const speaker = Math.floor(r.t / 0.7) % 2
        r.R.forEach((w, i) => pose(w, { bubble: i === speaker ? 'utrop' : null }))
      }),
      act((r) => {
        bubble(null, ...r.R)
        pose(r.N[0], { away: true, bubble: 'snakk' })
      }),
      wait(1.8),
      act((r) => {
        r.flags.tv = 1
        bubble('hjerte', ...r.R)
        bubble(null, r.N[0])
      }),
      wait(1.6),
      act((r) => r.R.forEach((w) => r.free(w, true))),
    ],
  },
  {
    id: 'fellesmiddag',
    ward: 'bofellesskap',
    name: 'Fellesmiddag',
    shifts: ['aften'],
    residents: 1,
    zone: 'kjokken',
    steps: [
      act((r) => r.put('gryte', 'gryte', 4.9, 1.2, 0.91, { linger: 16 })),
      go(R(0), 'kjokken'),
      act((r) => pose(r.R[0], { away: true, flip: -1 })),
      wait(0.8),
      act((r) => pose(r.R[0], { carry: 'tallerken' })),
      go(R(0), 'g2'),
      act((r) => {
        pose(r.R[0], { carry: null, away: false })
        r.put('tallerkener', 'tallerkener', 6.9, 5.12, 0.455, { n: 2, linger: 16 })
      }),
      wait(0.5),
      go(R(0), 'kjokken'),
      wait(0.6),
      act((r) => pose(r.R[0], { carry: 'tallerken' })),
      go(R(0), 'g2'),
      act((r) => {
        pose(r.R[0], { carry: null, away: false })
        r.props.get('tallerkener')!.n = 4
      }),
      wait(1),
    ],
  },

  // ======================= Somatisk sykehjemsavdeling =======================
  {
    id: 'legevisitt',
    ward: 'sykehjem',
    name: 'Legevisitt-runde',
    shifts: ['dag'],
    nurse: true,
    zone: 'gang',
    steps: [
      nurse('p1', { carry: 'nettbrett' }),
      ...[1, 2, 3, 4, 5].flatMap((door) =>
        ifDoor(
          door,
          go(N0, `p${door}`),
          act((r) => pose(r.N[0], { away: true, bubble: 'journal' })),
          wait(1.4),
          act((r) => bubble(null, r.N[0])),
        ),
      ),
      act((r) => pose(r.N[0], { carry: null, away: false, bubble: 'hake' })),
      wait(0.9),
    ],
  },
  {
    id: 'ringesnor_rush',
    ward: 'sykehjem',
    name: 'Ringesnor-rush',
    when: lowCoverage,
    zone: 'gang',
    steps: [
      act((r) => r.stage.crew.ring(2 + (r.engine.rnd() < 0.5 ? 1 : 0))),
      // Varer til pleierne har vært innom alle rommene som ringte
      { done: (r) => r.t > 1.5 && r.stage.crew.ringing() === 0, max: 18 },
    ],
  },
  {
    id: 'rullestol_trilling',
    ward: 'sykehjem',
    name: 'Rullestol-trilling',
    shifts: ['aften'],
    residents: 1,
    pick: (r) => r.aid === 'rullestol',
    nurse: true,
    zone: 'gang',
    steps: [
      // Beboeren triller ut i gangen og venter der
      go(R(0), midLane),
      act((r) => pose(r.R[0], { away: false })),
      nurse(midLane),
      wait(0.4),
      // Pleieren går like bak og triller stolen bort til rommet
      all(go(R(0), (r) => `p${(r.R[0]?.door ?? 0) + 1}`, { speed: 0.8 }), go(N0, (r) => `p${(r.R[0]?.door ?? 0) + 1}`, { speed: 0.8, hold: 0.75 })),
      act((r) => {
        if (r.R[0]) r.stage.residents.rest(r.R[0], r.stage.time + 9)
        pose(r.N[0], { away: true, bubble: 'hake' })
      }),
      wait(1.4),
    ],
  },
  {
    id: 'avis_og_kaffe',
    ward: 'sykehjem',
    name: 'Avis og kaffe',
    shifts: DAYTIME,
    residents: 1,
    pick: mobile,
    zone: 'sete',
    steps: [
      go(R(0), 'sete'),
      act((r) => {
        pose(r.R[0], { carry: 'avis' })
        r.put('kopp', 'kopp', 9.57, 5.23, 0.47, { linger: 5 })
      }),
      wait(9),
      act((r) => {
        pose(r.R[0], { carry: null })
        r.free(r.R[0], true)
      }),
    ],
  },
  {
    id: 'morgenprover',
    ward: 'sykehjem',
    name: 'Morgenprøver',
    shifts: ['dag'],
    nurse: true,
    zone: 'medisin',
    steps: [
      nurse('med'),
      act((r) => pose(r.N[0], { carry: 'kurv' })),
      wait(0.6),
      ...[1, 2].flatMap((door) => [
        go(N0, `p${door}`),
        act((r) => pose(r.N[0], { away: true, bubble: 'prove' })),
        wait(1.3),
        act((r) => bubble(null, r.N[0])),
      ]),
      go(N0, 'tralle'),
      act((r) => pose(r.N[0], { carry: null, away: true, bubble: 'hake' })),
      wait(0.9),
    ],
  },
]

// ---------------------------------------------------------------------------
// Motoren
// ---------------------------------------------------------------------------

/** Sekunder mellom hendelsene: sjeldnere når det er rolig, oftere når avdelingen er presset. */
const PAUSE_CALM = 10.5
const PAUSE_PRESSED = 6
/** Så mange hendelser med folk i kan gå samtidig. */
const MAX_BUSY_EVENTS = 2

export class SceneEvents {
  stage!: Stage
  /** Alle rekvisitter som står framme, også de som blir igjen etter en hendelse. */
  props: SceneProp[] = []
  private runs: Run[] = []
  private cooldown = 2.5
  private lastId: string | null = null
  private lastRun = new Map<string, number>()
  private seed = 4242
  /** De siste hendelsene som startet, nyeste sist – til feilsøking. */
  history: { id: string; at: number }[] = []

  rnd(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0
    return this.seed / 4294967296
  }

  /** Avbryter alt som pågår (veinettet er bygget på nytt). */
  reset(): void {
    for (const run of this.runs) {
      run.failed = true
      run.finish()
    }
    this.runs = []
    this.props = []
  }

  /** Hendelsene som passer avdelingen, vakta og situasjonen akkurat nå. */
  private eligible(): SceneEventDef[] {
    const { ctx, residents } = this.stage
    const busyRuns = this.runs.filter((r) => !r.def.ambient).length
    const free = residents.free()
    return SCENE_EVENTS.filter(
      (e) =>
        e.ward === ctx.ward &&
        (!e.shifts || e.shifts.includes(ctx.shift)) &&
        (!e.when || e.when(ctx)) &&
        e.id !== this.lastId &&
        !this.runs.some((r) => r.def === e || r.def.zone === e.zone) &&
        !(e.nurse && ctx.rapport) &&
        (e.ambient || busyRuns < MAX_BUSY_EVENTS) &&
        free.filter((r) => !e.pick || e.pick(r)).length >= (e.residents ?? 0),
    )
  }

  private start(def: SceneEventDef): void {
    const run = new Run(def, this)
    const pool = this.stage.residents.free().filter((r) => !def.pick || def.pick(r))
    // Tilfeldig rekkefølge – men den som allerede sitter der hendelsen skal foregå, får være med først.
    const order = pool.map((r) => ({ r, key: (r.goal === def.zone ? -1 : 0) + this.rnd() })).sort((a, b) => a.key - b.key)
    for (const { r } of order.slice(0, (def.residents ?? 0) + (def.extra ?? 0))) {
      this.stage.residents.claim(r, def.id)
      run.R.push(r)
    }
    this.runs.push(run)
    this.lastId = def.id
    this.lastRun.set(def.id, this.stage.time)
    this.history = [...this.history.slice(-29), { id: def.id, at: this.stage.time }]
  }

  /** Starter en bestemt hendelse med en gang – til utprøving. */
  force(id: string): boolean {
    const def = SCENE_EVENTS.find((e) => e.id === id)
    if (!def || !this.stage || this.runs.some((r) => r.def === def)) return false
    const free = this.stage.residents.free().filter((r) => !def.pick || def.pick(r))
    if (free.length < (def.residents ?? 0)) return false
    this.start(def)
    return true
  }

  update(dt: number, stage: Stage): void {
    this.stage = stage

    // ---- Ny hendelse? Aldri den samme to ganger på rad, og helst en det er lenge siden sist. ----
    this.cooldown -= dt
    if (this.cooldown <= 0) {
      const options = this.eligible()
      if (options.length > 0) {
        const weights = options.map((e) => 1 + Math.min(5, (stage.time - (this.lastRun.get(e.id) ?? -90)) / 15))
        let roll = this.rnd() * weights.reduce((a, b) => a + b, 0)
        let chosen = options[0]
        for (let i = 0; i < options.length; i++) {
          roll -= weights[i]
          if (roll < 0) {
            chosen = options[i]
            break
          }
        }
        this.start(chosen)
        const pause = PAUSE_CALM - (PAUSE_CALM - PAUSE_PRESSED) * Math.max(0, Math.min(1, stage.ctx.urgency))
        this.cooldown = pause * (0.85 + this.rnd() * 0.3)
      } else {
        this.cooldown = 1.5
      }
    }

    // ---- Kjør stegene ----
    for (const run of this.runs) {
      // Flere steg kan gå unna i samme ramme (rene handlinger tar ingen tid).
      for (let guard = 0; guard < 12 && run.step < run.def.steps.length && !run.failed; guard++) {
        const step = run.def.steps[run.step]
        if (!run.entered) {
          run.entered = true
          run.t = 0
          step.enter?.(run)
        } else {
          run.t += dt
        }
        step.tick?.(run, dt)
        const timedOut = run.t >= (step.max ?? 30)
        if (timedOut && step.fail) {
          run.failed = true
          break
        }
        if (step.done && !step.done(run) && !timedOut) break
        run.step++
        run.entered = false
      }
      if (run.failed || run.step >= run.def.steps.length) run.finish()
    }
    this.runs = this.runs.filter((r) => !r.failed && r.step < r.def.steps.length)

    // ---- Rekvisitter: tones inn, blir stående en stund, tones ut ----
    const owned = new Set(this.runs.flatMap((r) => [...r.props.values()]))
    for (const prop of this.props) {
      if (!prop.leaving && !owned.has(prop)) {
        prop.linger -= dt
        if (prop.linger <= 0) prop.leaving = true
      }
      const target = prop.leaving ? 0 : 1
      prop.alpha += Math.sign(target - prop.alpha) * Math.min(Math.abs(target - prop.alpha), dt * 2.4)
    }
    this.props = this.props.filter((p) => !(p.leaving && p.alpha <= 0.01))
  }

  view(): EventView {
    const flag = (key: string) => Math.max(0, ...this.runs.map((r) => r.flags[key] ?? 0))
    return {
      props: this.props,
      chairAway: flag('chairAway') > 0 || this.props.some((p) => p.kind === 'stol'),
      tv: flag('tv'),
      kveldsro: flag('kveldsro'),
      active: this.runs.map((r) => r.def.name),
    }
  }
}
