import type { Profession } from '@/types'

/**
 * Pleierne i avdelingsvisningen. De følger faste stier (en liten graf av
 * veipunkter) mellom arbeidsstasjoner – ingen fysikk, bare lineær gange.
 */
export type BubbleIcon = 'kaffe' | 'rapport' | 'journal' | 'medisin' | 'hjerte' | 'stress' | 'zzz' | 'hake'

type NodeId =
  | 'hub' | 'west' | 'wm' | 'kaffe' | 'med' | 'bord1' | 'bord2' | 'east' | 'em' | 'pc'
  | 'door' | 'c0' | 'c1' | 'p1' | 'c2' | 'p2' | 'tralle' | 'c3' | 'p3' | 'stol' | 'exit'

const NODES: Record<NodeId, [number, number]> = {
  hub: [3.0, 4.6],
  west: [1.2, 4.45],
  wm: [1.15, 2.8],
  kaffe: [1.0, 1.75],
  med: [1.02, 0.98],
  bord1: [1.62, 2.95],
  bord2: [2.8, 3.95],
  east: [4.05, 4.3],
  em: [4.05, 1.5],
  pc: [3.65, 1.05],
  door: [4.75, 4.5],
  c0: [5.55, 3.3],
  c1: [5.55, 2.0],
  p1: [5.55, 0.85],
  c2: [7.35, 2.7],
  p2: [7.35, 0.85],
  tralle: [6.48, 1.15],
  c3: [9.15, 2.7],
  p3: [9.15, 0.85],
  stol: [8.2, 4.1],
  exit: [10.4, 3.1],
}

const EDGES: [NodeId, NodeId][] = [
  ['hub', 'west'], ['west', 'wm'], ['wm', 'kaffe'], ['kaffe', 'med'], ['wm', 'bord1'],
  ['hub', 'bord2'], ['hub', 'east'], ['east', 'em'], ['em', 'pc'],
  ['hub', 'door'], ['door', 'c0'], ['c0', 'c1'], ['c1', 'p1'],
  ['c0', 'c2'], ['c1', 'c2'], ['c2', 'p2'], ['c2', 'tralle'], ['c2', 'c3'], ['c3', 'p3'],
  ['c2', 'stol'], ['c3', 'stol'], ['c3', 'exit'],
]

const ADJ = new Map<NodeId, NodeId[]>()
for (const [a, b] of EDGES) {
  ADJ.set(a, [...(ADJ.get(a) ?? []), b])
  ADJ.set(b, [...(ADJ.get(b) ?? []), a])
}

function route(from: NodeId, to: NodeId): NodeId[] {
  if (from === to) return []
  const prev = new Map<NodeId, NodeId>()
  const queue: NodeId[] = [from]
  const seen = new Set<NodeId>([from])
  while (queue.length) {
    const cur = queue.shift()!
    if (cur === to) break
    for (const n of ADJ.get(cur) ?? []) {
      if (seen.has(n)) continue
      seen.add(n)
      prev.set(n, cur)
      queue.push(n)
    }
  }
  const path: NodeId[] = []
  let cur: NodeId | undefined = to
  while (cur && cur !== from) {
    path.unshift(cur)
    cur = prev.get(cur)
  }
  return path
}

interface Station {
  node: NodeId
  icon: BubbleIcon
  weight: number
  /** Sekunder aktiviteten varer. */
  time: [number, number]
  /** Ser bort fra kamera (inn mot veggen). */
  away: boolean
  flip: 1 | -1
  sitting?: boolean
  requires?: 'tralle' | 'door3'
}

const STATIONS: Station[] = [
  { node: 'kaffe', icon: 'kaffe', weight: 2, time: [3, 5], away: true, flip: -1 },
  { node: 'med', icon: 'medisin', weight: 2, time: [3, 5], away: true, flip: 1 },
  { node: 'pc', icon: 'journal', weight: 2.5, time: [4, 7], away: true, flip: 1 },
  { node: 'bord1', icon: 'rapport', weight: 1.8, time: [4, 7], away: false, flip: 1, sitting: true },
  { node: 'bord2', icon: 'rapport', weight: 1.8, time: [4, 7], away: true, flip: 1, sitting: true },
  { node: 'p1', icon: 'hjerte', weight: 3.5, time: [3.5, 6], away: true, flip: 1 },
  { node: 'p2', icon: 'hjerte', weight: 3.5, time: [3.5, 6], away: true, flip: 1 },
  { node: 'p3', icon: 'hjerte', weight: 3.5, time: [3.5, 6], away: true, flip: 1, requires: 'door3' },
  { node: 'tralle', icon: 'medisin', weight: 2.5, time: [3, 5], away: true, flip: 1, requires: 'tralle' },
  { node: 'stol', icon: 'hake', weight: 1.6, time: [2.5, 4], away: false, flip: 1 },
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

export interface Agent {
  id: string
  look: AgentLook
  x: number
  y: number
  node: NodeId
  path: NodeId[]
  mode: 'walk' | 'act' | 'leave'
  station: Station | null
  /** Sekunder igjen av aktiviteten. */
  timer: number
  /** Gangsyklus (radianer). */
  phase: number
  flip: 1 | -1
  away: boolean
  sitting: boolean
  alpha: number
  bubble: BubbleIcon | null
  bubbleAlpha: number
  stress: number
  energy: number
  gone: boolean
}

export interface CrewOptions {
  tralle: boolean
  door3: boolean
}

const SPEED = 1.25

export class Crew {
  agents: Agent[] = []
  private opts: CrewOptions = { tralle: false, door3: false }
  private seed = 1

  private rnd(): number {
    // Liten LCG – visuell variasjon trenger ikke spillmotorens RNG.
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0
    return this.seed / 4294967296
  }

  /** Synker hvem som er på vakt. Nye kommer inn fra korridoren, gamle går ut. */
  sync(inputs: AgentInput[], opts: CrewOptions, instant = false): void {
    this.opts = opts
    const wanted = new Map(inputs.map((i) => [i.id, i]))
    for (const a of this.agents) {
      const input = wanted.get(a.id)
      if (input) {
        a.stress = input.stress
        a.energy = input.energy
        a.look = input
        if (a.mode === 'leave') {
          a.mode = 'walk'
          this.pickStation(a)
        }
        wanted.delete(a.id)
      } else if (a.mode !== 'leave') {
        a.mode = 'leave'
        a.station = null
        a.sitting = false
        a.bubble = null
        a.path = route(a.node, 'exit')
      }
    }
    for (const input of wanted.values()) {
      const a: Agent = {
        id: input.id,
        look: input,
        x: NODES.exit[0],
        y: NODES.exit[1],
        node: 'exit',
        path: [],
        mode: 'walk',
        station: null,
        timer: 0,
        phase: this.rnd() * 6,
        flip: -1,
        away: true,
        sitting: false,
        alpha: 0,
        bubble: null,
        bubbleAlpha: 0,
        stress: input.stress,
        energy: input.energy,
        gone: false,
      }
      this.pickStation(a)
      if (instant && a.station) {
        // Første visning: plasser folk rett på en stasjon i stedet for at alle kommer inn samtidig.
        const [x, y] = NODES[a.station.node]
        a.x = x
        a.y = y
        a.node = a.station.node
        a.path = []
        a.alpha = 1
        this.arrive(a)
        a.timer *= this.rnd()
      }
      this.agents.push(a)
    }
  }

  private available(st: Station): boolean {
    if (st.requires === 'tralle' && !this.opts.tralle) return false
    if (st.requires === 'door3' && !this.opts.door3) return false
    return !this.agents.some((o) => o.station === st && o.mode !== 'leave')
  }

  private pickStation(a: Agent): void {
    const options = STATIONS.filter((st) => st !== a.station && this.available(st))
    if (options.length === 0) {
      a.station = null
      a.path = route(a.node, 'hub')
      return
    }
    let total = 0
    const weights = options.map((st) => {
      let w = st.weight
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
    a.path = route(a.node, chosen.node)
    a.mode = 'walk'
    a.sitting = false
    a.bubble = null
  }

  private arrive(a: Agent): void {
    const st = a.station
    if (!st) {
      a.mode = 'act'
      a.timer = 1 + this.rnd() * 1.5
      return
    }
    a.mode = 'act'
    a.timer = st.time[0] + this.rnd() * (st.time[1] - st.time[0])
    a.away = st.away
    a.flip = st.flip
    a.sitting = Boolean(st.sitting)
    a.bubble = a.stress > 70 && this.rnd() < 0.6 ? 'stress' : a.energy < 18 && this.rnd() < 0.6 ? 'zzz' : st.icon
  }

  update(dt: number): void {
    for (const a of this.agents) {
      // Inn-/uttoning
      const targetAlpha = a.mode === 'leave' && a.path.length === 0 ? 0 : 1
      a.alpha += Math.sign(targetAlpha - a.alpha) * Math.min(Math.abs(targetAlpha - a.alpha), dt * 2.2)
      const bubbleTarget = a.mode === 'act' && a.bubble ? 1 : 0
      a.bubbleAlpha += Math.sign(bubbleTarget - a.bubbleAlpha) * Math.min(Math.abs(bubbleTarget - a.bubbleAlpha), dt * 4)

      if (a.mode === 'act') {
        a.timer -= dt
        if (a.timer <= 0) this.pickStation(a)
        continue
      }

      // Gå mot neste veipunkt
      const next = a.path[0]
      if (!next) {
        if (a.mode === 'leave') {
          if (a.alpha <= 0.01) a.gone = true
        } else {
          this.arrive(a)
        }
        continue
      }
      const [tx, ty] = NODES[next]
      const dx = tx - a.x
      const dy = ty - a.y
      const dist = Math.hypot(dx, dy)
      const tired = a.energy < 20 ? 0.78 : 1
      const stepLen = SPEED * tired * dt
      if (dist <= stepLen) {
        a.x = tx
        a.y = ty
        a.node = next
        a.path.shift()
      } else {
        a.x += (dx / dist) * stepLen
        a.y += (dy / dist) * stepLen
        a.phase += dt * 9.5 * tired
        const screenDx = dx - dy
        if (Math.abs(screenDx) > 0.05) a.flip = screenDx > 0 ? 1 : -1
        a.away = dx + dy < 0
      }
    }
    if (this.agents.some((a) => a.gone)) this.agents = this.agents.filter((a) => !a.gone)
  }
}
