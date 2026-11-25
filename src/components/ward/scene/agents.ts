import type { Profession } from '@/types'
import type { DoorAlarm, DoorSlot } from './layout'

/**
 * Pleierne i avdelingsvisningen. De følger faste stier (en liten graf av
 * veipunkter) mellom arbeidsstasjoner – ingen fysikk, bare lineær gange.
 *
 * Oppførselen speiler spillet: på natt patruljerer de rolig mellom dørene,
 * ved vaktskifte samles de rundt rapportbordet, og når avdelingen er presset
 * går de fortere og rykker ut til varsellamper over pasientdørene.
 */
export type BubbleIcon = 'kaffe' | 'rapport' | 'journal' | 'medisin' | 'hjerte' | 'stress' | 'zzz' | 'hake' | 'snakk'

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
}

const STATIC_EDGES: [string, string][] = [
  ['hub', 'west'], ['west', 'wm'], ['wm', 'kaffe'], ['kaffe', 'med'], ['wm', 'bord1'], ['wm', 'rs4'],
  ['hub', 'bord2'], ['hub', 'rs2'], ['hub', 'rs3'], ['hub', 'east'], ['east', 'em'], ['east', 'rs1'],
  ['em', 'pc'], ['em', 'bord3'], ['bord3', 'rs5'],
  ['hub', 'door'], ['door', 'c0'], ['c0', 'tralle'],
]

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

export interface Agent {
  id: string
  look: AgentLook
  x: number
  y: number
  node: string
  path: string[]
  mode: 'walk' | 'act' | 'leave'
  station: Station | null
  /** Plass ved rapportbordet under vaktskiftet. */
  spot: string | null
  /** Hører til vaktlaget som går av, men blir til rapporten er ferdig. */
  pendingLeave: boolean
  /** Døra pleieren rykker ut til (varsellampe). */
  alarmDoor: number | null
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
  /** 0 = rolig, 1 = løper. Styrer fart og holdning. */
  hurry: number
  gone: boolean
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
  /** Beboeren sitter i lenestolen (ikke om natta). */
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
  private nodes: Record<string, Node> = { ...STATIC_NODES }
  private adj = new Map<string, string[]>()
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

  /** Bygger veinettet på nytt når antall dører (eller medisintralla) endrer seg. */
  setLayout(doors: DoorSlot[], tralle: boolean): void {
    const key = `${doors.length}|${tralle}`
    if (key === this.layoutKey) return
    this.layoutKey = key
    this.doors = doors
    this.tralle = tralle

    const nodes: Record<string, Node> = { ...STATIC_NODES }
    const edges: [string, string][] = [...STATIC_EDGES]
    doors.forEach((d, i) => {
      nodes[`c${i + 1}`] = [d.cx, 2.6]
      nodes[`p${i + 1}`] = [d.cx, 0.85]
      edges.push([`c${i + 1}`, `p${i + 1}`], [i === 0 ? 'c0' : `c${i}`, `c${i + 1}`])
    })
    edges.push([`c${doors.length}`, 'exit'])
    // Lenestolen nås fra de to gangpunktene som ligger nærmest.
    const byDistance = doors.map((d, i) => ({ id: `c${i + 1}`, dist: Math.abs(d.cx - STATIC_NODES.stol[0]) })).sort((a, b) => a.dist - b.dist)
    for (const c of byDistance.slice(0, 2)) edges.push([c.id, 'stol'])

    this.nodes = nodes
    this.adj = new Map()
    for (const [a, b] of edges) {
      this.adj.set(a, [...(this.adj.get(a) ?? []), b])
      this.adj.set(b, [...(this.adj.get(b) ?? []), a])
    }
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
      if (!(a.node in nodes)) a.node = 'c0'
      a.station = null
      a.alarmDoor = null
      if (a.mode !== 'leave') {
        a.path = []
        a.mode = 'walk'
      } else {
        a.path = this.route(a.node, 'exit')
      }
    }
  }

  private route(from: string, to: string): string[] {
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

  /**
   * Sender agenten mot et nytt mål. Er hen midt mellom to veipunkter, fullføres
   * det påbegynte strekket først – så ingen snarveier går gjennom møbler.
   */
  private goTo(a: Agent, target: string): void {
    const next = a.mode !== 'act' ? a.path[0] : undefined
    a.path = next ? (next === target ? [next] : [next, ...this.route(next, target)]) : this.route(a.node, target)
    a.sitting = false
    if (a.mode === 'act') a.mode = 'walk'
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
        // Under rapporten blir vaktlaget som går av, stående til den er ferdig.
        if (ctx.rapport) a.pendingLeave = true
        else this.startLeaving(a)
      }
    }
    for (const input of wanted.values()) {
      const [ex, ey] = this.nodes.exit
      const a: Agent = {
        id: input.id,
        look: input,
        x: ex,
        y: ey,
        node: 'exit',
        path: [],
        mode: 'walk',
        station: null,
        spot: null,
        pendingLeave: false,
        alarmDoor: null,
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
        hurry: 0,
        gone: false,
      }
      this.agents.push(a)
      if (ctx.rapport && !instant) continue // update() gir en plass ved bordet
      this.pickStation(a)
      if (instant && a.station) {
        // Første visning: plasser folk rett på en stasjon i stedet for at alle kommer inn samtidig.
        const [x, y] = this.nodes[a.station.node]
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
        if (a.mode === 'leave' || a.pendingLeave || a.spot || a.alarmDoor !== null) continue
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
        if (a.mode === 'leave' || a.spot || a.alarmDoor !== null) continue
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
        if (a.mode === 'leave') continue
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
      // Hvor travelt har hen det? Avdelingens press og eget stressnivå.
      const target = clamp01(Math.max(ctx.urgency, (a.stress - 35) / 40))
      a.hurry += (target - a.hurry) * Math.min(1, dt * 2)

      // Inn-/uttoning
      const fadeOut = a.mode === 'leave' && a.path.length <= 1
      const targetAlpha = fadeOut ? 0 : 1
      a.alpha += Math.sign(targetAlpha - a.alpha) * Math.min(Math.abs(targetAlpha - a.alpha), dt * 2.2)
      const bubbleTarget = a.mode === 'act' && a.bubble ? 1 : 0
      a.bubbleAlpha += Math.sign(bubbleTarget - a.bubbleAlpha) * Math.min(Math.abs(bubbleTarget - a.bubbleAlpha), dt * 4)

      if (a.mode === 'act') {
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
      const [tx, ty] = this.nodes[next] ?? this.nodes.hub
      const dx = tx - a.x
      const dy = ty - a.y
      const dist = Math.hypot(dx, dy)
      // Rolig ved god dekning, raskt ved underdekning og stress; ekstra fart mot en varsellampe.
      const pace =
        (0.8 + 0.85 * a.hurry) *
        (a.energy < 20 ? 0.8 : 1) *
        (ctx.night && a.hurry < 0.3 ? 0.82 : 1) *
        (a.alarmDoor !== null ? 1.3 : 1) *
        (a.spot ? 1.2 : 1)
      const stepLen = SPEED * pace * dt
      if (dist <= stepLen) {
        a.x = tx
        a.y = ty
        a.node = next
        a.path.shift()
      } else {
        a.x += (dx / dist) * stepLen
        a.y += (dy / dist) * stepLen
        a.phase += dt * 9.5 * pace
        const screenDx = dx - dy
        if (Math.abs(screenDx) > 0.05) a.flip = screenDx > 0 ? 1 : -1
        a.away = dx + dy < 0
      }
    }
    if (this.agents.some((a) => a.gone)) {
      for (const a of this.agents) if (a.gone) this.releaseAlarm(a)
      this.agents = this.agents.filter((a) => !a.gone)
    }
  }
}
