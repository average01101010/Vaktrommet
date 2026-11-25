import type { Profession, WardTypeId } from '@/types'
import type { DoorAlarm, DoorSlot } from './layout'

/**
 * Figurene i avdelingsvisningen: pleierne (`Crew`) og beboerne (`Residents`).
 * Alle følger faste stier i et lite veinett – ingen fysikk, bare lineær gange.
 *
 * Pleierne speiler spillet: på natt patruljerer de rolig mellom dørene, ved
 * vaktskifte samles de rundt rapportbordet, og når avdelingen er presset går
 * de fortere og rykker ut til varsellamper over pasientdørene. Beboerne har
 * egne faste plasser og rusleturer. Hendelsene i sceneEvents.ts låner begge
 * grupper for en stund og gir dem tilbake etterpå.
 */
export type BubbleIcon =
  | 'kaffe' | 'rapport' | 'journal' | 'medisin' | 'hjerte' | 'stress' | 'zzz' | 'hake' | 'snakk'
  | 'buss' | 'svimmel' | 'utrop' | 'prove'

/** Ting en figur bærer eller skyver. */
export type CarryItem =
  | 'mopp' | 'stol' | 'veske' | 'perm' | 'kanne' | 'lykt' | 'papir' | 'bag' | 'brett' | 'teppe'
  | 'bukett' | 'koffert' | 'klut' | 'pose' | 'tallerken' | 'nettbrett' | 'kurv' | 'avis' | 'kopp'

export type Anim = 'svimmel' | 'sprett' | 'vask' | 'barre' | 'uro'
export type Aid = 'rullator' | 'prekestol' | 'rullestol'
export type Garment = 'cardigan' | 'jakke' | 'kaape' | 'hettegenser'

type Node = [number, number]

const STATIC_NODES: Record<string, Node> = {
  hub: [3.0, 4.6],
  west: [1.2, 4.45],
  wm: [1.15, 2.8],
  kaffe: [1.0, 1.75],
  med: [1.02, 0.98],
  bord1: [1.62, 2.95],
  bord2: [2.8, 3.95],
  bord3: [2.87, 2.08],
  rs1: [3.9, 3.0],
  rs2: [2.05, 4.02],
  rs3: [3.5, 4.02],
  rs4: [1.5, 2.3],
  rs5: [2.15, 2.02],
  east: [4.05, 4.3],
  em: [4.05, 1.5],
  pc: [3.62, 1.02],
  door: [4.75, 4.5],
  c0: [5.55, 3.3],
  tralle: [5.62, 1.9],
  stol: [8.2, 4.15],
  exit: [10.4, 3.1],
  // ---- Fellesarealet i korridoren ----
  ende: [9.82, 3.0],
  stolinn: [9.8, 4.8],
  sete: [9.02, 4.82],
  gv: [5.5, 4.62],
  g1: [6.3, 4.64],
  g2: [6.75, 4.64],
  g3: [7.25, 4.64],
  gh: [8.05, 4.62],
  kjokken: [5.32, 1.0],
  plante: [5.46, 4.98],
  stolhjem: [5.32, 3.62],
}

const STATIC_EDGES: [string, string][] = [
  ['hub', 'west'], ['west', 'wm'], ['wm', 'kaffe'], ['kaffe', 'med'], ['wm', 'bord1'], ['wm', 'rs4'],
  ['hub', 'bord2'], ['hub', 'rs2'], ['hub', 'rs3'], ['hub', 'east'], ['east', 'em'], ['east', 'rs1'],
  ['em', 'pc'], ['em', 'bord3'], ['bord3', 'rs5'],
  ['hub', 'door'], ['door', 'c0'], ['c0', 'tralle'],
  ['ende', 'stolinn'], ['stolinn', 'sete'], ['ende', 'exit'],
  ['door', 'gv'], ['c0', 'gv'], ['gv', 'g1'], ['g1', 'g2'], ['g2', 'g3'], ['g3', 'gh'], ['gh', 'stol'],
  ['tralle', 'kjokken'], ['gv', 'plante'], ['c0', 'stolhjem'],
]

/** Et sete: den som kommer fram hit, setter seg. */
export interface Seat {
  /** Setehøyde over gulvet. */
  lift: number
  flip: 1 | -1
  /** Dybde i tegnerekkefølgen, så figuren havner foran ryggen og bak armlenet. */
  depth: number
}

/** Seter som følger avdelingstypens møbler (se interiøret i draw.ts). */
const WARD_SEATS: Record<WardTypeId, Record<string, { at: Node; from: string; seat: Seat }>> = {
  sykehjem: {},
  demens: { sc: { at: [7.175, 4.2], from: 'g3', seat: { lift: 0.34, flip: 1, depth: 11.43 } } },
  korttid: { ball: { at: [5.75, 5.04], from: 'gv', seat: { lift: 0.5, flip: 1, depth: 11.05 } } },
  lindrende: {
    sa: { at: [6.325, 4.22], from: 'g1', seat: { lift: 0.34, flip: 1, depth: 10.6 } },
    sc: { at: [7.275, 4.22], from: 'g3', seat: { lift: 0.34, flip: -1, depth: 11.55 } },
  },
  bofellesskap: {
    sa: { at: [6.3, 4.22], from: 'g1', seat: { lift: 0.34, flip: 1, depth: 11.0 } },
    sb: { at: [6.75, 4.22], from: 'g2', seat: { lift: 0.34, flip: 1, depth: 11.02 } },
    sc: { at: [7.2, 4.22], from: 'g3', seat: { lift: 0.34, flip: -1, depth: 11.04 } },
  },
}

/**
 * Veinettet for én avdeling: faste punkter i vaktrommet og fellesarealet, og
 * punkter som følger dørene (c = i gangen, p = ved døra, h = ved håndlista).
 */
export class Graph {
  readonly key: string
  readonly nodes: Record<string, Node>
  readonly seats: Record<string, Seat>
  readonly doorCount: number
  /** Seter og plasser som er holdt av til noen som er på vei dit. */
  readonly reserved = new Map<string, string>()
  private adj = new Map<string, string[]>()

  constructor(doors: DoorSlot[], readonly ward: WardTypeId) {
    this.key = `${doors.length}|${ward}`
    this.doorCount = doors.length
    const nodes: Record<string, Node> = { ...STATIC_NODES }
    const edges: [string, string][] = [...STATIC_EDGES]
    const seats: Record<string, Seat> = { sete: { lift: 0.34, flip: 1, depth: 13.35 } }
    doors.forEach((d, i) => {
      nodes[`c${i + 1}`] = [d.cx, 2.6]
      nodes[`p${i + 1}`] = [d.cx, 0.85]
      edges.push([`c${i + 1}`, `p${i + 1}`], [i === 0 ? 'c0' : `c${i}`, `c${i + 1}`])
      if (i > 0) {
        // Ved håndlista mellom to dører
        const prev = doors[i - 1]
        nodes[`h${i}`] = [(prev.x + prev.w + d.x) / 2, 1.05]
        edges.push([`h${i}`, `c${i}`], [`h${i}`, `c${i + 1}`])
      }
    })
    edges.push([`c${doors.length}`, 'exit'], [`c${doors.length}`, 'ende'])
    // Lenestolen nås fra de to gangpunktene som ligger nærmest.
    const byDistance = doors.map((d, i) => ({ id: `c${i + 1}`, dist: Math.abs(d.cx - STATIC_NODES.stol[0]) })).sort((a, b) => a.dist - b.dist)
    for (const c of byDistance.slice(0, 2)) edges.push([c.id, 'stol'])
    for (const [id, def] of Object.entries(WARD_SEATS[ward])) {
      nodes[id] = def.at
      seats[id] = def.seat
      edges.push([def.from, id])
    }
    this.nodes = nodes
    this.seats = seats
    for (const [a, b] of edges) {
      this.adj.set(a, [...(this.adj.get(a) ?? []), b])
      this.adj.set(b, [...(this.adj.get(b) ?? []), a])
    }
  }

  has(id: string): boolean {
    return id in this.nodes
  }

  pos(id: string): Node {
    return this.nodes[id] ?? this.nodes.hub
  }

  route(from: string, to: string): string[] {
    if (from === to) return []
    const prev = new Map<string, string>()
    const queue: string[] = [from]
    const seen = new Set<string>([from])
    while (queue.length) {
      const cur = queue.shift()!
      if (cur === to) break
      for (const n of this.adj.get(cur) ?? []) {
        if (seen.has(n)) continue
        seen.add(n)
        prev.set(n, cur)
        queue.push(n)
      }
    }
    const path: string[] = []
    let cur: string | undefined = to
    while (cur && cur !== from) {
      path.unshift(cur)
      cur = prev.get(cur)
    }
    return path
  }
}

/** Det pleiere og beboere har felles: en posisjon i veinettet og en positur. */
export interface Walker {
  id: string
  x: number
  y: number
  node: string
  path: string[]
  mode: 'walk' | 'act' | 'leave'
  /** Sekunder igjen av aktiviteten. */
  timer: number
  /** Gangsyklus (radianer). */
  phase: number
  flip: 1 | -1
  away: boolean
  sitting: boolean
  /** Setehøyde mens figuren sitter. */
  lift: number
  alpha: number
  /** Inne på et rom: tones ut uten å forlate scenen. */
  hidden: boolean
  bubble: BubbleIcon | null
  bubbleAlpha: number
  /** Dempet boble (stille samtale). */
  whisper: boolean
  /** 0 = rolig, 1 = løper. Styrer fart og holdning. */
  hurry: number
  gone: boolean
  /** Hendelsen som har lånt figuren, ellers null. */
  busy: string | null
  carry: CarryItem | null
  anim: Anim | null
  /** Fast gangfart satt av en hendelse (verdensenheter per sekund). */
  speed: number | null
  /** Sekunder figuren venter før hen går – slik havner en følgesvenn like bak. */
  hold: number
  /** Forskyvning fra veipunktet, så to kan stå ved siden av hverandre. */
  ox: number
  oy: number
  rx: number
  ry: number
}

const blankWalker = (id: string, node: string, at: Node, phase: number): Walker => ({
  id,
  x: at[0],
  y: at[1],
  node,
  path: [],
  mode: 'walk',
  timer: 0,
  phase,
  flip: -1,
  away: true,
  sitting: false,
  lift: 0,
  alpha: 0,
  hidden: false,
  bubble: null,
  bubbleAlpha: 0,
  whisper: false,
  hurry: 0,
  gone: false,
  busy: null,
  carry: null,
  anim: null,
  speed: null,
  hold: 0,
  ox: 0,
  oy: 0,
  rx: 0,
  ry: 0,
})

/**
 * Sender en figur mot et nytt mål. Er hen midt mellom to veipunkter, fullføres
 * det påbegynte strekket først – så ingen snarveier går gjennom møbler.
 */
export function sendWalker(g: Graph, w: Walker, target: string): void {
  const next = w.mode !== 'act' ? w.path[0] : undefined
  w.path = next ? (next === target ? [next] : [next, ...g.route(next, target)]) : g.route(w.node, target)
  w.sitting = false
  w.lift = 0
  if (w.mode === 'act') w.mode = 'walk'
}

/** Flytter figuren ett steg langs stien. Gir `true` mens hen fortsatt er underveis. */
function stepWalker(g: Graph, w: Walker, speed: number, cadence: number, dt: number): boolean {
  if (w.hold > 0) {
    w.hold -= dt
    return true
  }
  const next = w.path[0]
  if (!next) return false
  const [tx, ty] = g.pos(next)
  const dx = tx - w.x
  const dy = ty - w.y
  const dist = Math.hypot(dx, dy)
  const stepLen = speed * dt
  if (dist <= stepLen) {
    w.x = tx
    w.y = ty
    w.node = next
    w.path.shift()
  } else {
    w.x += (dx / dist) * stepLen
    w.y += (dy / dist) * stepLen
    w.phase += dt * cadence
    const screenDx = dx - dy
    if (Math.abs(screenDx) > 0.05) w.flip = screenDx > 0 ? 1 : -1
    w.away = dx + dy < 0
  }
  return true
}

/** Framme: den som kommer til et sete, setter seg. */
function settle(g: Graph, w: Walker): void {
  w.mode = 'act'
  const seat = g.seats[w.node]
  if (seat) {
    w.sitting = true
    w.lift = seat.lift
    w.flip = seat.flip
    w.away = false
  }
}

/** Inn- og uttoning, bobler og myk forskyvning – likt for alle figurer. */
function animateWalker(w: Walker, fadeOut: boolean, dt: number): void {
  const targetAlpha = fadeOut || w.hidden ? 0 : 1
  w.alpha += Math.sign(targetAlpha - w.alpha) * Math.min(Math.abs(targetAlpha - w.alpha), dt * 2.2)
  const bubbleTarget = w.mode === 'act' && w.bubble ? 1 : 0
  w.bubbleAlpha += Math.sign(bubbleTarget - w.bubbleAlpha) * Math.min(Math.abs(bubbleTarget - w.bubbleAlpha), dt * 4)
  const k = Math.min(1, dt * 5)
  w.rx += (w.ox - w.rx) * k
  w.ry += (w.oy - w.ry) * k
}

/** Der figuren tegnes, og hvor langt fram i rekkefølgen. */
export const walkerPoint = (w: Walker): [number, number] => [w.x + w.rx, w.y + w.ry]
export const walkerDepth = (g: Graph | null, w: Walker): number =>
  (w.sitting && g?.seats[w.node]?.depth) || w.x + w.rx + w.y + w.ry + 0.05

interface Station {
  node: string
  icon: BubbleIcon
  /** Hvor ofte stasjonen velges på dag/aften og på natt. */
  weight: number
  nightWeight: number
  /** Sekunder aktiviteten varer. */
  time: [number, number]
  /** Ser bort fra kamera (inn mot veggen). */
  away: boolean
  flip: 1 | -1
  sitting?: boolean
  requires?: 'tralle' | 'beboer'
  /** Pasientdør (indeks) – brukes også av varsellampene. */
  door?: number
}

const BASE_STATIONS: Station[] = [
  { node: 'kaffe', icon: 'kaffe', weight: 2, nightWeight: 0.7, time: [3, 5], away: true, flip: -1 },
  { node: 'med', icon: 'medisin', weight: 2, nightWeight: 0.8, time: [3, 5], away: true, flip: 1 },
  // Dokumentasjonsplassen: én om gangen, og nattevaktas faste holdepunkt.
  { node: 'pc', icon: 'journal', weight: 2.5, nightWeight: 3.6, time: [4, 7], away: true, flip: 1, sitting: true },
  { node: 'bord1', icon: 'rapport', weight: 1.8, nightWeight: 0, time: [4, 7], away: false, flip: 1, sitting: true },
  { node: 'bord2', icon: 'rapport', weight: 1.8, nightWeight: 0, time: [4, 7], away: true, flip: 1, sitting: true },
  { node: 'tralle', icon: 'medisin', weight: 2.5, nightWeight: 1.2, time: [3, 5], away: true, flip: -1, requires: 'tralle' },
  { node: 'stol', icon: 'hake', weight: 1.6, nightWeight: 0, time: [2.5, 4], away: false, flip: 1, requires: 'beboer' },
]

/** Plassene rundt rapportbordet ved vaktskifte. */
const RAPPORT_SPOTS: { node: string; sitting: boolean; away: boolean; flip: 1 | -1 }[] = [
  { node: 'bord1', sitting: true, away: false, flip: 1 },
  { node: 'bord2', sitting: true, away: true, flip: 1 },
  { node: 'bord3', sitting: true, away: false, flip: -1 },
  { node: 'rs1', sitting: false, away: true, flip: -1 },
  { node: 'rs3', sitting: false, away: true, flip: 1 },
  { node: 'rs4', sitting: false, away: false, flip: 1 },
  { node: 'rs2', sitting: false, away: true, flip: 1 },
  { node: 'rs5', sitting: false, away: false, flip: -1 },
  // Blir det flere (begge vaktlag til stede), står resten rett bak.
  { node: 'hub', sitting: false, away: true, flip: 1 },
  { node: 'east', sitting: false, away: true, flip: -1 },
  { node: 'west', sitting: false, away: true, flip: 1 },
]

export interface AgentLook {
  profession: Profession
  skin: number
  hair: number
  hairStyle: number
  accessory: number
}

export interface AgentInput extends AgentLook {
  id: string
  stress: number
  energy: number
}

export interface Agent extends Walker {
  look: AgentLook
  station: Station | null
  /** Plass ved rapportbordet under vaktskiftet. */
  spot: string | null
  /** Hører til vaktlaget som går av, men blir til rapporten er ferdig. */
  pendingLeave: boolean
  /** Døra pleieren rykker ut til (varsellampe). */
  alarmDoor: number | null
  stress: number
  energy: number
  /** Hastverk pålagt av en hendelse (0–1). */
  rush: number
}

/** Det scenen vet om situasjonen akkurat nå. */
export interface CrewContext {
  /** Vaktskifte: laget samles ved rapportbordet. */
  rapport: boolean
  night: boolean
  /** 0–1: hvor presset avdelingen er (underdekning og stress). */
  urgency: number
  /** Stille rapport er innført – nettbrett i stedet for prat. */
  stille: boolean
  /** En beboer sitter i lenestolen. */
  residentInChair: boolean
}

interface Alarm {
  door: number
  assigned: string | null
  state: 'blink' | 'handling' | 'ok'
  /** Animasjonstid da lampa slukker etter «ok». */
  until: number
}

const SPEED = 1.25
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export class Crew {
  agents: Agent[] = []
  graph: Graph = new Graph([], 'sykehjem')
  private stations: Station[] = []
  private doors: DoorSlot[] = []
  private alarms: Alarm[] = []
  private alarmCooldown = 5
  private tralle = false
  private layoutKey = ''
  private ctx: CrewContext = { rapport: false, night: false, urgency: 0, stille: false, residentInChair: true }
  private seed = 1

  private rnd(): number {
    // Liten LCG – visuell variasjon trenger ikke spillmotorens RNG.
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0
    return this.seed / 4294967296
  }

  // -------------------------------------------------------------------------
  // Stier
  // -------------------------------------------------------------------------

  /** Bygger veinettet på nytt når dørene, avdelingstypen eller medisintralla endrer seg. */
  setLayout(doors: DoorSlot[], tralle: boolean, ward: WardTypeId): void {
    const key = `${doors.length}|${tralle}|${ward}`
    if (key === this.layoutKey) return
    this.layoutKey = key
    this.doors = doors
    this.tralle = tralle
    this.graph = new Graph(doors, ward)

    this.stations = [
      ...BASE_STATIONS,
      ...doors.map<Station>((_, i) => ({
        node: `p${i + 1}`,
        icon: 'hjerte',
        weight: 3.5,
        nightWeight: 4.6,
        time: [3.5, 6],
        away: true,
        flip: 1,
        door: i,
      })),
    ]
    this.alarms = this.alarms.filter((a) => a.door < doors.length)

    // Stasjonene er nye objekter: la alle finne seg noe nytt å gjøre.
    for (const a of this.agents) {
      if (!this.graph.has(a.node)) a.node = 'c0'
      a.station = null
      a.alarmDoor = null
      a.busy = null
      a.carry = null
      a.anim = null
      a.hidden = false
      if (a.mode !== 'leave') {
        a.path = []
        a.mode = 'walk'
      } else {
        a.path = this.graph.route(a.node, 'exit')
      }
    }
  }

  private goTo(a: Agent, target: string): void {
    sendWalker(this.graph, a, target)
  }

  // -------------------------------------------------------------------------
  // Hvem er på jobb
  // -------------------------------------------------------------------------

  /** Synker hvem som er på vakt. Nye kommer inn fra korridoren, gamle går ut. */
  sync(inputs: AgentInput[], ctx: CrewContext, instant = false): void {
    this.ctx = ctx
    const wanted = new Map(inputs.map((i) => [i.id, i]))
    for (const a of this.agents) {
      const input = wanted.get(a.id)
      if (input) {
        a.stress = input.stress
        a.energy = input.energy
        a.look = input
        a.pendingLeave = false
        if (a.mode === 'leave') {
          a.mode = 'walk'
          this.pickStation(a)
        }
        wanted.delete(a.id)
      } else if (a.mode !== 'leave' && !a.pendingLeave) {
        // Under rapporten, eller midt i en hendelse, blir den som går av, til hen er ferdig.
        if (ctx.rapport || a.busy) a.pendingLeave = true
        else this.startLeaving(a)
      }
    }
    for (const input of wanted.values()) {
      const a: Agent = {
        ...blankWalker(input.id, 'exit', this.graph.pos('exit'), this.rnd() * 6),
        look: input,
        station: null,
        spot: null,
        pendingLeave: false,
        alarmDoor: null,
        stress: input.stress,
        energy: input.energy,
        rush: 0,
      }
      this.agents.push(a)
      if (ctx.rapport && !instant) continue // update() gir en plass ved bordet
      this.pickStation(a)
      if (instant && a.station) {
        // Første visning: plasser folk rett på en stasjon i stedet for at alle kommer inn samtidig.
        const [x, y] = this.graph.pos(a.station.node)
        a.x = x
        a.y = y
        a.node = a.station.node
        a.path = []
        a.alpha = 1
        this.arrive(a)
        a.timer *= this.rnd()
      }
    }
  }

  private startLeaving(a: Agent): void {
    a.pendingLeave = false
    a.spot = null
    a.station = null
    a.bubble = null
    this.releaseAlarm(a)
    this.goTo(a, 'exit')
    a.mode = 'leave'
  }

  // -------------------------------------------------------------------------
  // Stasjoner
  // -------------------------------------------------------------------------

  private available(st: Station): boolean {
    if (st.requires === 'tralle' && !this.tralle) return false
    if (st.requires === 'beboer' && !this.ctx.residentInChair) return false
    // Dører med aktiv varsellampe er reservert for den som rykker ut.
    if (st.door !== undefined && this.alarms.some((al) => al.door === st.door && al.state !== 'ok')) return false
    return !this.agents.some((o) => o.station === st && o.mode !== 'leave')
  }

  private pickStation(a: Agent): void {
    const night = this.ctx.night
    const options = this.stations.filter((st) => st !== a.station && (night ? st.nightWeight : st.weight) > 0 && this.available(st))
    a.sitting = false
    a.bubble = null
    if (options.length === 0) {
      a.station = null
      this.goTo(a, 'hub')
      return
    }
    let total = 0
    const weights = options.map((st) => {
      let w = night ? st.nightWeight : st.weight
      if (st.node === 'kaffe' && (a.stress > 55 || a.energy < 30)) w *= 3
      total += w
      return w
    })
    let roll = this.rnd() * total
    let chosen = options[0]
    for (let i = 0; i < options.length; i++) {
      roll -= weights[i]
      if (roll < 0) {
        chosen = options[i]
        break
      }
    }
    a.station = chosen
    this.goTo(a, chosen.node)
    a.mode = 'walk'
  }

  private arrive(a: Agent): void {
    a.mode = 'act'

    // Ved rapportbordet: bli stående/sittende til rapporten er over.
    const spot = a.spot ? RAPPORT_SPOTS.find((s) => s.node === a.spot) : null
    if (spot) {
      a.timer = Infinity
      a.sitting = spot.sitting
      a.away = spot.away
      a.flip = spot.flip
      a.bubble = null
      return
    }

    // Framme ved en dør med varsellampe: «håndter» den.
    if (a.alarmDoor !== null) {
      const alarm = this.alarms.find((al) => al.door === a.alarmDoor && al.assigned === a.id)
      if (alarm) alarm.state = 'handling'
      a.timer = 2.4 + this.rnd() * 1.2
      a.away = true
      a.flip = 1
      a.bubble = 'hjerte'
      return
    }

    const st = a.station
    if (!st) {
      a.timer = 1 + this.rnd() * 1.5
      return
    }
    const rush = 1 - 0.45 * a.hurry
    const night = this.ctx.night
    // Natt: korte tilsyn ved dørene i stedet for stell.
    const [min, max] = night && st.door !== undefined ? [2.2, 3.8] : st.time
    a.timer = (min + this.rnd() * (max - min)) * rush
    a.away = st.away
    a.flip = st.flip
    a.sitting = Boolean(st.sitting)
    const icon = night && st.door !== undefined ? 'hake' : st.icon
    a.bubble = a.stress > 70 && this.rnd() < 0.6 ? 'stress' : a.energy < 18 && this.rnd() < 0.6 ? 'zzz' : icon
  }

  // -------------------------------------------------------------------------
  // Varsellamper
  // -------------------------------------------------------------------------

  alarmState(door: number): DoorAlarm {
    return this.alarms.find((a) => a.door === door)?.state ?? 'none'
  }

  /** Flere ringer på samtidig (ringesnor-rush). Gir antall lamper som ble tent. */
  ring(count: number): number {
    const free = this.doors.filter((d) => !this.alarms.some((al) => al.door === d.index))
    const lit = free.sort(() => this.rnd() - 0.5).slice(0, count)
    for (const d of lit) this.alarms.push({ door: d.index, assigned: null, state: 'blink', until: 0 })
    return lit.length
  }

  /** Antall lamper som blinker eller blir håndtert akkurat nå. */
  ringing(): number {
    return this.alarms.filter((al) => al.state !== 'ok').length
  }

  // -------------------------------------------------------------------------
  // Hendelser: låne og gi tilbake en pleier
  // -------------------------------------------------------------------------

  /** Pleiere som kan tilkalles: på jobb, ikke i rapport, ikke på vei til en varsellampe. */
  private idle(a: Agent): boolean {
    return a.mode !== 'leave' && !a.pendingLeave && !a.spot && a.alarmDoor === null && !a.busy && a.alpha > 0.5
  }

  /** Nærmeste ledige pleier lånes av en hendelse og sendes til `node`. */
  claim(eventId: string, node: string): Agent | null {
    const [tx, ty] = this.graph.pos(node)
    let best: Agent | null = null
    let bestDist = Infinity
    for (const a of this.agents) {
      if (!this.idle(a)) continue
      const dist = Math.hypot(a.x - tx, a.y - ty)
      if (dist < bestDist) {
        best = a
        bestDist = dist
      }
    }
    if (!best) return null
    best.busy = eventId
    best.station = null
    best.bubble = null
    this.goTo(best, node)
    best.mode = 'walk'
    return best
  }

  send(a: Agent, node: string): void {
    this.goTo(a, node)
    if (a.mode !== 'leave') a.mode = 'walk'
  }

  /** Hendelsen er ferdig: pleieren går tilbake til vanlig arbeid. */
  release(a: Agent): void {
    if (!a.busy) return
    for (const [node, id] of this.graph.reserved) if (id === a.id) this.graph.reserved.delete(node)
    Object.assign(a, { busy: null, carry: null, anim: null, speed: null, hold: 0, ox: 0, oy: 0, hidden: false, whisper: false, rush: 0 })
    if (a.mode !== 'leave' && this.agents.includes(a)) this.pickStation(a)
  }

  private releaseAlarm(a: Agent): void {
    if (a.alarmDoor === null) return
    const alarm = this.alarms.find((al) => al.door === a.alarmDoor && al.assigned === a.id)
    if (alarm && alarm.state !== 'ok') {
      alarm.assigned = null
      alarm.state = 'blink'
    }
    a.alarmDoor = null
  }

  private updateAlarms(dt: number, time: number): void {
    const u = this.ctx.urgency
    this.alarms = this.alarms.filter((al) => al.state !== 'ok' || time < al.until)

    // Nye varsler kommer bare når avdelingen er presset – og oftere jo verre det står til.
    this.alarmCooldown -= dt
    const ringing = this.alarms.filter((al) => al.state !== 'ok').length
    if (this.alarmCooldown <= 0) {
      if (u > 0.2 && !this.ctx.rapport && ringing < (u > 0.7 ? 2 : 1) && this.doors.length > 0) {
        const free = this.doors.filter((d) => !this.alarms.some((al) => al.door === d.index))
        if (free.length > 0) {
          const door = free[Math.floor(this.rnd() * free.length)].index
          this.alarms.push({ door, assigned: null, state: 'blink', until: 0 })
          // Den som eventuelt står der fra før, gjør seg ferdig; døra er nå reservert.
        }
        this.alarmCooldown = 13 - 8.5 * u + this.rnd() * 3
      } else {
        this.alarmCooldown = 2 + this.rnd() * 3
      }
    }

    // Send nærmeste ledige pleier til hver lampe som blinker.
    for (const alarm of this.alarms) {
      if (alarm.state !== 'blink') continue
      if (alarm.assigned && this.agents.some((a) => a.id === alarm.assigned && a.alarmDoor === alarm.door)) continue
      const door = this.doors[alarm.door]
      let best: Agent | null = null
      let bestDist = Infinity
      for (const a of this.agents) {
        if (a.mode === 'leave' || a.pendingLeave || a.spot || a.alarmDoor !== null || a.busy) continue
        const dist = Math.hypot(a.x - door.cx, a.y - 0.85)
        if (dist < bestDist) {
          best = a
          bestDist = dist
        }
      }
      if (!best) continue
      alarm.assigned = best.id
      best.alarmDoor = alarm.door
      best.station = null
      best.bubble = null
      this.goTo(best, `p${alarm.door + 1}`)
      best.mode = 'walk'
    }
  }

  // -------------------------------------------------------------------------
  // Hver ramme
  // -------------------------------------------------------------------------

  update(dt: number, ctx: CrewContext, time: number): void {
    this.ctx = ctx

    // ---- Vaktskifte: samling ved rapportbordet ----
    if (ctx.rapport) {
      const taken = new Set(this.agents.map((a) => a.spot).filter(Boolean))
      for (const a of this.agents) {
        if (a.mode === 'leave' || a.spot || a.alarmDoor !== null || a.busy) continue
        const spot = RAPPORT_SPOTS.find((s) => !taken.has(s.node))
        if (!spot) break
        taken.add(spot.node)
        a.spot = spot.node
        a.station = null
        a.bubble = null
        this.goTo(a, spot.node)
        if (a.path.length === 0) this.arrive(a)
      }
    } else {
      for (const a of this.agents) {
        if (a.mode === 'leave' || a.busy) continue
        if (a.pendingLeave) this.startLeaving(a)
        else if (a.spot) {
          a.spot = null
          this.pickStation(a)
        }
      }
    }

    this.updateAlarms(dt, time)

    // ---- Rapport: én har ordet om gangen (eller alle leser stille på nettbrett) ----
    const seated = this.agents.filter((a) => a.spot && a.mode === 'act')
    if (seated.length > 0) {
      const speaker = Math.floor(time / 2.4) % seated.length
      seated.forEach((a, i) => {
        a.bubble = ctx.stille ? (i % 3 === speaker % 3 ? 'journal' : null) : i === speaker ? 'snakk' : null
      })
    }

    for (const a of this.agents) {
      // Hvor travelt har hen det? Avdelingens press, eget stressnivå og hendelsen hen er i.
      const target = clamp01(Math.max(ctx.urgency, (a.stress - 35) / 40, a.rush))
      a.hurry += (target - a.hurry) * Math.min(1, dt * 2)
      animateWalker(a, a.mode === 'leave' && a.path.length <= 1, dt)

      if (a.mode === 'act') {
        // Lånt av en hendelse: den bestemmer når pleieren er ferdig.
        if (a.busy) continue
        a.timer -= dt
        if (a.timer <= 0) {
          if (a.alarmDoor !== null) {
            const alarm = this.alarms.find((al) => al.door === a.alarmDoor && al.assigned === a.id)
            if (alarm) {
              alarm.state = 'ok'
              alarm.until = time + 1.6
            }
            a.alarmDoor = null
          }
          this.pickStation(a)
        }
        continue
      }

      // Rolig ved god dekning, raskt ved underdekning og stress; ekstra fart mot en varsellampe.
      const pace =
        (0.8 + 0.85 * a.hurry) *
        (a.energy < 20 ? 0.8 : 1) *
        (ctx.night && a.hurry < 0.3 ? 0.82 : 1) *
        (a.alarmDoor !== null ? 1.3 : 1) *
        (a.spot ? 1.2 : 1)
      const speed = a.speed ?? SPEED * pace
      if (stepWalker(this.graph, a, speed, 9.5 * (a.speed ? Math.max(0.6, a.speed / SPEED) : pace), dt)) continue

      // Framme
      if (a.mode === 'leave') {
        if (a.alpha <= 0.01) a.gone = true
      } else if (a.busy) {
        settle(this.graph, a)
        a.timer = Infinity
      } else {
        this.arrive(a)
      }
    }
    if (this.agents.some((a) => a.gone)) {
      for (const a of this.agents) if (a.gone) this.releaseAlarm(a)
      this.agents = this.agents.filter((a) => !a.gone)
    }
  }
}


// ---------------------------------------------------------------------------
// Beboerne
// ---------------------------------------------------------------------------

/** Utseendet til en beboer eller pårørende. Hår: 0 kort, 1 sideskill, 2 langt, 3 knute, 4 krøllet, 6 tynt. */
export interface Persona {
  top: string
  /** Skjorta eller blusen under cardiganen. */
  inner: string
  trousers: string
  skin: string
  hair: string
  hairStyle: number
  accessory: number
  garment: Garment
  shoes: string
  elderly: boolean
}

const elder = (top: string, inner: string, trousers: string, skin: string, hair: string, hairStyle: number, accessory: number, shoes: string): Persona => ({
  top, inner, trousers, skin, hair, hairStyle, accessory, shoes, garment: 'cardigan', elderly: true,
})
const young = (top: string, skin: string, hair: string, hairStyle: number, accessory = 0): Persona => ({
  top, inner: '#F4F1EA', trousers: '#3F4E63', skin, hair, hairStyle, accessory, shoes: '#F4F1EA', garment: 'hettegenser', elderly: false,
})

/** Eldre beboere: cardigan og tøfler. */
const ELDERLY: Persona[] = [
  elder('#7B6A8E', '#EDE6F2', '#5A5148', '#F0CDB5', '#E3E0DA', 3, 1, '#A9584B'),
  elder('#5F7F6A', '#F1EBDD', '#6B6257', '#EDC3A2', '#C9C5BE', 6, 0, '#6B5B4B'),
  elder('#C7705E', '#FBF3E8', '#4F5A63', '#F6D9C6', '#F1EFEA', 4, 0, '#8E6FA0'),
  elder('#4E6E8E', '#E8EEF2', '#5A5148', '#D9A47F', '#B9B5AE', 0, 1, '#3F5E73'),
]
/** Bofellesskapet: voksne i alle aldre, i hverdagsklær. */
const YOUNG: Persona[] = [
  young('#D97736', '#F6D9C6', '#5B3B24', 0),
  young('#3F8A63', '#EDC3A2', '#D1A45F', 2),
  young('#7B4B5E', '#A8744F', '#2A211C', 1, 1),
  young('#2B5B6C', '#F6D9C6', '#A44A2C', 4),
]
/** Pårørende på besøk: ytterjakke og vanlige sko. */
const VISITORS: Persona[] = [
  { top: '#3F5E73', inner: '#E8EEF2', trousers: '#2A2D2E', skin: '#EDC3A2', hair: '#5B3B24', hairStyle: 2, accessory: 0, garment: 'jakke', shoes: '#3B3F40', elderly: false },
  { top: '#8C7A5B', inner: '#F1EBDD', trousers: '#3F4E63', skin: '#F6D9C6', hair: '#2A211C', hairStyle: 0, accessory: 1, garment: 'jakke', shoes: '#5A3A22', elderly: false },
]

/** Ganghjelpemidler per plass i beboerlista, for hver avdelingstype. */
const WARD_AIDS: Record<WardTypeId, (Aid | null)[]> = {
  sykehjem: [null, 'rullestol', 'rullator', null],
  demens: [null, null, 'rullator', null],
  korttid: ['prekestol', 'rullator', null, 'rullestol'],
  bofellesskap: [null, null, null, null],
  lindrende: ['rullestol', null, null, null],
}

export interface ResidentAgent extends Walker {
  kind: 'beboer' | 'paaroerende'
  persona: Persona
  /** Plass i beboerlista (bestemmer utseende og hjelpemiddel). */
  slot: number
  aid: Aid | null
  /** Plagg som overstyrer det vanlige (jakke når noen skal ut, morgenkåpe om natta). */
  wear: Garment | null
  /** Rommet beboeren hører til (dørindeks). */
  door: number
  /** Kom med en hendelse og forsvinner med den (pårørende, nattvandrer). */
  guest: boolean
  /** Animasjonstid da beboeren kommer ut av rommet igjen. */
  restUntil: number
  /** Veipunktet hen er på vei til eller holder til ved. */
  goal: string | null
}

export interface ResidentContext {
  /** Hvor mange beboere som skal være oppe akkurat nå. */
  count: number
  /** Boblen en beboer som sitter i ro, viser av og til (følger trivselen). */
  mood: BubbleIcon
}

/** Antall beboere som er oppe: følger sengetallet på dag og aften, og nesten ingen om natta. */
export function residentCountFor(beds: number, ward: WardTypeId, night: boolean, day: number): number {
  if (night) return ward !== 'demens' && day % 3 === 1 ? 1 : 0 // demensavdelingen har egen nattvandrer-hendelse
  const byBeds = beds >= 14 ? 4 : beds >= 11 ? 3 : 2
  return ward === 'lindrende' ? Math.min(2, byBeds) : byBeds
}

export class Residents {
  agents: ResidentAgent[] = []
  private graph: Graph = new Graph([], 'sykehjem')
  private seed = 77
  private spawnIn = 0
  private guests = 0

  private rnd(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0
    return this.seed / 4294967296
  }

  /** Nytt veinett. Ny avdelingstype betyr nye beboere; ellers finner de seg bare til rette på nytt. */
  setGraph(graph: Graph): void {
    if (graph === this.graph) return
    const newWard = graph.ward !== this.graph.ward
    this.graph = graph
    if (newWard) {
      this.agents = []
      return
    }
    this.agents = this.agents.filter((r) => !r.guest)
    for (const r of this.agents) {
      if (!graph.has(r.node)) r.node = 'c1'
      r.door = Math.min(r.door, Math.max(0, graph.doorCount - 1))
      this.reset(r)
      r.path = []
      r.goal = null
      if (r.mode !== 'leave') r.mode = 'walk'
    }
  }

  private reset(r: ResidentAgent): void {
    for (const [node, id] of this.graph.reserved) if (id === r.id) this.graph.reserved.delete(node)
    Object.assign(r, { busy: null, carry: null, anim: null, speed: null, hold: 0, ox: 0, oy: 0, whisper: false, wear: null, bubble: null })
  }

  /** Gangfart: eldre går sakte, og saktere med hjelpemiddel. */
  speedOf(r: ResidentAgent): number {
    if (!r.persona.elderly) return r.kind === 'paaroerende' ? 0.95 : 0.9
    return r.aid === 'rullestol' ? 0.45 : r.aid === 'prekestol' ? 0.42 : r.aid === 'rullator' ? 0.48 : 0.64
  }

  private create(persona: Persona, slot: number, node: string, guest: boolean): ResidentAgent {
    const r: ResidentAgent = {
      ...blankWalker(guest ? `gjest${++this.guests}` : `beboer${slot}`, node, this.graph.pos(node), this.rnd() * 6),
      kind: 'beboer',
      persona,
      slot,
      aid: null,
      wear: null,
      door: 0,
      guest,
      restUntil: 0,
      goal: null,
    }
    r.away = false
    this.agents.push(r)
    return r
  }

  /** En ny beboer kommer ut fra rommet sitt – eller inn fra gangen på korttidsavdelingen. */
  private admit(instant: boolean): void {
    const used = new Set(this.agents.filter((r) => !r.guest).map((r) => r.slot))
    let slot = 0
    while (used.has(slot)) slot++
    const ward = this.graph.ward
    const door = slot % Math.max(1, this.graph.doorCount)
    const start = !instant && ward === 'korttid' ? 'exit' : `p${door + 1}`
    const persona = (ward === 'bofellesskap' ? YOUNG : ELDERLY)[slot % 4]
    const r = this.create(persona, slot, this.graph.has(start) ? start : 'c0', false)
    r.aid = WARD_AIDS[ward][slot % 4]
    r.door = door
    this.pickSpot(r)
    if (instant && r.goal) {
      // Første visning: plasser folk der de holder til, i stedet for at alle kommer ut samtidig.
      const [x, y] = this.graph.pos(r.goal)
      Object.assign(r, { x, y, node: r.goal, path: [], alpha: 1 })
      settle(this.graph, r)
      this.dwell(r, null)
      r.timer *= this.rnd()
    }
  }

  // -------------------------------------------------------------------------
  // Hverdagen: sitte, stå ved håndlista, rusle en tur
  // -------------------------------------------------------------------------

  private taken(node: string, r: ResidentAgent): boolean {
    const holder = this.graph.reserved.get(node)
    return (holder !== undefined && holder !== r.id) || this.agents.some((o) => o !== r && o.goal === node && o.mode !== 'leave')
  }

  private pickSpot(r: ResidentAgent): void {
    r.bubble = null
    const options: [string, number][] = []
    if (r.aid !== 'rullestol') {
      for (const id of Object.keys(this.graph.seats)) {
        if (id === 'ball' || id === r.node || this.taken(id, r)) continue
        options.push([id, id === 'sete' ? 3.5 : 3])
      }
    }
    const stands: [string, number][] = [['ende', 0.6], ['gh', 0.7]]
    for (let i = 1; i < this.graph.doorCount; i++) stands.push([`h${i}`, 1])
    for (const [id, w] of stands) if (id !== r.node && !this.taken(id, r)) options.push([id, w])
    // En liten tur i gangen
    for (let i = 1; i <= this.graph.doorCount; i++) if (`c${i}` !== r.node) options.push([`c${i}`, 0.45])
    if (options.length === 0) {
      r.timer = 3
      return
    }
    let roll = this.rnd() * options.reduce((sum, [, w]) => sum + w, 0)
    let chosen = options[0][0]
    for (const [id, w] of options) {
      roll -= w
      if (roll < 0) {
        chosen = id
        break
      }
    }
    r.goal = chosen
    sendWalker(this.graph, r, chosen)
  }

  /** Framme ved en plass: hvor lenge blir hen, og hvordan står hen? */
  private dwell(r: ResidentAgent, ctx: ResidentContext | null): void {
    if (this.graph.seats[r.node]) {
      r.timer = 9 + this.rnd() * 9
      r.bubble = ctx && this.rnd() < 0.45 ? ctx.mood : null
    } else if (r.node.startsWith('h')) {
      // Støtter seg til håndlista og ser utover gangen
      r.timer = 4 + this.rnd() * 4
      r.away = false
      r.flip = this.rnd() < 0.5 ? 1 : -1
    } else if (r.node.startsWith('c')) {
      r.timer = 0.4 + this.rnd() * 0.8
    } else {
      r.timer = 4 + this.rnd() * 4
      r.away = false
    }
  }

  // -------------------------------------------------------------------------
  // Hendelser: låne og gi tilbake beboere
  // -------------------------------------------------------------------------

  /** Beboere som er oppe og ikke opptatt med noe. */
  free(): ResidentAgent[] {
    return this.agents.filter((r) => !r.guest && !r.busy && r.mode !== 'leave' && !r.hidden && r.alpha > 0.6)
  }

  claim(r: ResidentAgent, eventId: string): void {
    r.busy = eventId
    r.bubble = null
    r.timer = Infinity
  }

  send(r: ResidentAgent, node: string): void {
    r.goal = node
    sendWalker(this.graph, r, node)
    if (r.mode !== 'leave') r.mode = 'walk'
  }

  /** Den som sitter på (eller er på vei til) en plass en hendelse trenger, finner seg en annen. */
  evict(node: string, except: Walker): void {
    for (const r of this.agents) {
      if (r === except || r.busy || r.guest || r.mode === 'leave' || r.goal !== node) continue
      this.pickSpot(r)
    }
  }

  /**
   * Hendelsen er ferdig: beboeren går tilbake til hverdagen (gjester går hjem).
   * Med `stay` blir hen sittende der hen er en stund til.
   */
  release(r: ResidentAgent, stay = false): void {
    if (!this.agents.includes(r)) return
    if (r.guest) {
      this.dismiss(r, r.kind === 'paaroerende' ? 'exit' : `p${r.door + 1}`)
      return
    }
    const wasBusy = Boolean(r.busy)
    this.reset(r)
    if (!wasBusy || r.mode === 'leave' || r.hidden) return
    if (stay && r.mode === 'act') r.timer = 6 + this.rnd() * 6
    else this.pickSpot(r)
  }

  /** En gjest i scenen: pårørende inn fra gangen, eller en nattvandrer ut fra rommet sitt. */
  guest(eventId: string, kind: 'paaroerende' | 'nattvandrer', node: string, door = 0): ResidentAgent {
    const persona = kind === 'paaroerende' ? VISITORS[this.guests % VISITORS.length] : ELDERLY[(this.guests + 1) % ELDERLY.length]
    const r = this.create(persona, 0, this.graph.has(node) ? node : 'exit', true)
    r.kind = kind === 'paaroerende' ? 'paaroerende' : 'beboer'
    r.wear = kind === 'nattvandrer' ? 'kaape' : null
    r.door = door
    r.busy = eventId
    r.mode = 'act'
    r.timer = Infinity
    return r
  }

  /** Går ut av scenen via `via` (gangen eller eget rom) og tones bort. `keep`: behold jakke og bagasje. */
  dismiss(r: ResidentAgent, via: string, keep = false): void {
    const look = { wear: r.wear, carry: r.carry }
    this.reset(r)
    if (keep) Object.assign(r, look)
    r.goal = null
    r.hidden = false
    sendWalker(this.graph, r, this.graph.has(via) ? via : 'exit')
    r.mode = 'leave'
  }

  /** Beboeren er inne på rommet sitt en stund og kommer ut igjen av seg selv. */
  rest(r: ResidentAgent, until: number): void {
    r.hidden = true
    r.restUntil = until
    r.goal = null
  }

  /** Sitter det noen på denne plassen akkurat nå? */
  seated(node: string): boolean {
    return this.agents.some((r) => r.sitting && r.node === node && r.alpha > 0.5)
  }

  // -------------------------------------------------------------------------
  // Hver ramme
  // -------------------------------------------------------------------------

  update(dt: number, ctx: ResidentContext, time: number, instant = false): void {
    const mine = this.agents.filter((r) => !r.guest && r.mode !== 'leave')
    this.spawnIn -= dt
    if (mine.length < ctx.count) {
      if (instant) for (let i = mine.length; i < ctx.count; i++) this.admit(true)
      else if (this.spawnIn <= 0) {
        this.admit(false)
        this.spawnIn = 1.8 + this.rnd() * 2.2
      }
    } else if (mine.length > ctx.count) {
      // Leggetid (eller færre senger): én om gangen går til rommet sitt.
      const r = mine.filter((o) => !o.busy).at(-1)
      if (r && this.spawnIn <= 0) {
        if (r.hidden) r.gone = true
        else this.dismiss(r, `p${r.door + 1}`)
        this.spawnIn = 0.9 + this.rnd() * 1.4
      }
    }

    for (const r of this.agents) {
      animateWalker(r, r.mode === 'leave' && r.path.length <= 1, dt)
      const restless = r.anim === 'uro' ? 0.6 : 0
      r.hurry += (restless - r.hurry) * Math.min(1, dt * 2)

      if (r.hidden && !r.busy && r.mode !== 'leave' && time >= r.restUntil) {
        r.hidden = false
        this.pickSpot(r)
      }
      if (r.mode === 'act') {
        if (r.busy || r.hidden) continue
        r.timer -= dt
        if (r.timer <= 0) this.pickSpot(r)
        continue
      }
      const speed = r.speed ?? this.speedOf(r)
      if (stepWalker(this.graph, r, speed, 5 + speed * 5.5, dt)) continue
      if (r.mode === 'leave') {
        if (r.alpha <= 0.01) r.gone = true
        continue
      }
      settle(this.graph, r)
      if (r.busy) r.timer = Infinity
      else this.dwell(r, ctx)
    }
    if (this.agents.some((r) => r.gone)) this.agents = this.agents.filter((r) => !r.gone)
  }
}
