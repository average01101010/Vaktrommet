import { RESIDENT_FEMALE_NAMES } from '@/data/residents'
import type { Profession, ResidentProfileId, WardTypeId } from '@/types'
import type { AgentInput, Aid } from '../scene/agents'
import { styleFor, type FigureStyle } from '../scene/character'
import { HAIR_COLORS, SKIN_TONES } from '../scene/palette'
import { bedRoomId, DINING_SEATS, LOUNGE_SEATS, routeBetween, type FloorPlan, type Pt } from './floorPlan'

/**
 * Figurene på avdelingskartet. Beboerne følger en døgnrytme (seng, måltider,
 * stue, rusletur), og pleierne går mellom rommene og rykker ut når en
 * ringesnor lyser. Alt er pynt oppå spilltilstanden – ingenting her endrer den.
 */
export interface PlanFigure {
  key: string
  kind: 'beboer' | 'ansatt'
  name: string
  x: number
  y: number
  path: Pt[]
  /** Rommet figuren står i nå, eller `null` i korridoren. */
  room: string | null
  /** Hvor figuren er på vei eller har slått seg ned. */
  goal: string
  /** Rommet målet ligger i. */
  goalRoom: string | null
  speed: number
  baseSpeed: number
  /** Sitter (stol, sofa, spisebord) eller ligger i senga. */
  pose: 'staar' | 'sitter' | 'ligger'
  restPose: 'staar' | 'sitter' | 'ligger'
  flip: 1 | -1
  phase: number
  walking: boolean
  style: FigureStyle
  aid: Aid | null
  lane: number
  /** Sekunder til pleieren finner på noe nytt. */
  wait: number
  /** Rommet pleieren svarer ringesnora i. */
  answering: string | null
  stress: number
}

export interface PlanResidentInput {
  id: number
  name: string
  room: number
  profile: ResidentProfileId
}

export interface PlanContext {
  /** Minutt på døgnet (0–1439). */
  minuteOfDay: number
  day: number
  night: boolean
  rapport: boolean
  /** 0–1: hvor presset vakta er. */
  urgency: number
}

/** Måltidene på avdelingen (minutt på døgnet). */
export const MEALS: { name: string; from: number; to: number }[] = [
  { name: 'Frokost', from: 8 * 60 + 30, to: 9 * 60 + 30 },
  { name: 'Middag', from: 13 * 60, to: 14 * 60 },
  { name: 'Kvelds', from: 18 * 60 + 30, to: 19 * 60 + 15 },
]

export const mealAt = (minuteOfDay: number) => MEALS.find((m) => minuteOfDay >= m.from && minuteOfDay < m.to) ?? null

export function nextMeal(minuteOfDay: number): { name: string; inMinutes: number } {
  const upcoming = MEALS.find((m) => m.from > minuteOfDay) ?? MEALS[0]
  return { name: upcoming.name, inMinutes: (upcoming.from - minuteOfDay + 1440) % 1440 }
}

const BEDTIME = 21 * 60 + 30
const WAKE = 7 * 60 + 30

/** Liten, stabil hash – samme beboer gjør det samme til samme tid, uansett når du ser etter. */
function hash(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const CARDIGANS = ['#8E6F8B', '#5F7F6E', '#A9685A', '#4F6F8F', '#B08A4A', '#7A6A8C', '#8A4F5C', '#56796F']
const BLOUSES = ['#F1E9DA', '#E6EEF2', '#F3E3E0', '#E9F0E2']
const HOODIES = ['#6C8FB5', '#C97B5A', '#6FA287', '#8B7BB8']
const GREY_HAIR = ['#D9D6D0', '#B9B5AE', '#EDEAE4', '#9C968C']

function residentStyleFor(r: PlanResidentInput, ward: WardTypeId): FigureStyle {
  const female = RESIDENT_FEMALE_NAMES.has(r.name)
  const pick = <T,>(list: T[], salt: number): T => list[Math.floor(hash(r.id, salt) * list.length)]
  if (ward === 'bofellesskap') {
    return {
      top: pick(HOODIES, 1), trousers: '#3F4E63', skin: pick(SKIN_TONES, 2), hair: pick(HAIR_COLORS, 3),
      hairStyle: female ? 2 : 0, accessory: 0, staff: false, garment: 'hettegenser', inner: '#F4F1EA', shoes: '#F4F1EA', elderly: false,
    }
  }
  return {
    top: pick(CARDIGANS, 1), trousers: female ? '#6B6470' : '#5A5F66', skin: pick(SKIN_TONES.slice(0, 4), 2), hair: pick(GREY_HAIR, 3),
    hairStyle: female ? (hash(r.id, 4) < 0.5 ? 3 : 4) : hash(r.id, 4) < 0.5 ? 6 : 0,
    accessory: hash(r.id, 5) < 0.4 ? 1 : 0, staff: false, garment: 'cardigan', inner: pick(BLOUSES, 6), shoes: '#7A6652', elderly: true,
  }
}

function aidFor(r: PlanResidentInput, ward: WardTypeId): Aid | null {
  if (ward === 'bofellesskap') return null
  const roll = hash(r.id, 9)
  if (r.profile === 'rehab') return roll < 0.7 ? 'rullator' : 'prekestol'
  if (r.profile === 'multisyk') return roll < 0.5 ? 'rullestol' : 'rullator'
  if (r.profile === 'kognitiv' || r.profile === 'mestring') return null
  return roll < 0.35 ? 'rullator' : null
}

interface Goal {
  id: string
  room: string | null
  at: Pt
  pose: PlanFigure['pose']
}

/** Hvor beboeren hører hjemme akkurat nå. Ren funksjon av klokka. */
function residentGoal(plan: FloorPlan, r: PlanResidentInput, index: number, ctx: PlanContext): Goal {
  const home = plan.byId[bedRoomId(r.room)]
  const inBed: Goal = { id: 'seng', room: home.id, at: home.spots.seng, pose: 'ligger' }
  const inChair: Goal = { id: 'stol', room: home.id, at: home.spots.stol, pose: 'sitter' }
  const m = ctx.minuteOfDay
  // Litt forskjellig leggetid og morgen, så ikke alle dører går på likt.
  const offset = Math.round((hash(r.id, 11) - 0.5) * 50)
  if (m >= BEDTIME + offset || m < WAKE + offset) return inBed
  const frail = r.profile === 'palliasjon'
  if (mealAt(m)) {
    // De skrøpeligste får maten på rommet.
    if (frail) return inChair
    const seat = `sete${(index % DINING_SEATS) + 1}`
    return { id: `spis-${seat}`, room: 'spisestue', at: plan.byId.spisestue.spots[seat], pose: 'sitter' }
  }
  const block = Math.floor(m / 45)
  const roll = hash(r.id, ctx.day * 97 + block)
  if (frail) return roll < 0.75 ? inBed : inChair
  if (roll < 0.34) return inChair
  if (roll < 0.7) {
    const seat = `sete${Math.floor(hash(r.id, block + 3) * LOUNGE_SEATS) + 1}`
    return { id: `stue-${seat}`, room: 'stue', at: plan.byId.stue.spots[seat], pose: 'sitter' }
  }
  if (roll < 0.88) {
    // Rusletur: et stykke bortover korridoren.
    const x = plan.corridor.x + 1 + hash(r.id, block + 7) * (plan.builtW - 2)
    return { id: `tur-${block}`, room: null, at: [x, plan.corridor.y + plan.corridor.h / 2 + (hash(r.id, 13) - 0.5) * 0.9], pose: 'staar' }
  }
  return inBed
}

const SEAT_CAPACITY = 1

function sendTo(plan: FloorPlan, f: PlanFigure, goal: Goal): void {
  f.goal = goal.id
  f.goalRoom = goal.room
  f.restPose = goal.pose
  f.path = routeBetween(plan, [f.x, f.y], f.room, goal.at, goal.room, f.lane)
  if (f.path.length > 0) f.pose = 'staar'
}

function step(plan: FloorPlan, f: PlanFigure, dt: number): void {
  f.walking = false
  let budget = f.speed * dt
  while (budget > 0 && f.path.length > 0) {
    const [tx, ty] = f.path[0]
    const dx = tx - f.x
    const dy = ty - f.y
    const dist = Math.hypot(dx, dy)
    if (dist <= budget) {
      f.x = tx
      f.y = ty
      budget -= dist
      f.path.shift()
    } else {
      f.x += (dx / dist) * budget
      f.y += (dy / dist) * budget
      budget = 0
    }
    if (Math.abs(dx) > 0.02) f.flip = dx > 0 ? 1 : -1
    f.walking = true
  }
  if (f.walking) f.phase += dt * (5 + f.speed * 2.2)
  const inCorridor = f.y > plan.corridor.y && f.y < plan.corridor.y + plan.corridor.h
  f.room = inCorridor ? null : (plan.rooms.find((r) => f.x >= r.x && f.x <= r.x + r.w && f.y >= r.y && f.y <= r.y + r.h)?.id ?? null)
  if (f.path.length === 0) f.pose = f.restPose
}

const STAFF_SPEED: Record<Profession, number> = { sykepleier: 1.5, helsefagarbeider: 1.45, assistent: 1.4, vernepleier: 1.45 }

export type LampState = 'ringer' | 'paa-vei' | 'hos'

export class PlanCrowd {
  figures: PlanFigure[] = []
  /** Ringesnorer som lyser: rom-id → tilstand. */
  lamps = new Map<string, LampState>()
  /** Antall ringesnorer som er tent siden start – brukes til lydsignalet. */
  rings = 0
  private planKey = ''
  private lampTimer = 4

  private make(key: string, kind: PlanFigure['kind'], name: string, at: Pt, room: string | null, style: FigureStyle, speed: number, aid: Aid | null): PlanFigure {
    return {
      key, kind, name, x: at[0], y: at[1], path: [], room, goal: '', goalRoom: room, speed, baseSpeed: speed, pose: 'staar', restPose: 'staar',
      flip: 1, phase: Math.random() * 6, walking: false, style, aid, lane: (Math.random() - 0.5) * 1.1, wait: Math.random() * 3,
      answering: null, stress: 0,
    }
  }

  find(key: string): PlanFigure | undefined {
    return this.figures.find((f) => f.key === key)
  }

  update(dt: number, plan: FloorPlan, residents: PlanResidentInput[], crew: AgentInput[], staffNames: Record<string, string>, ctx: PlanContext): void {
    const key = `${plan.wardType}|${plan.beds}`
    if (key !== this.planKey) {
      this.planKey = key
      this.figures = []
      this.lamps.clear()
    }
    this.syncResidents(plan, residents, ctx)
    this.syncCrew(plan, crew, staffNames)
    this.updateLamps(dt, ctx)
    for (const f of this.figures) {
      if (f.kind === 'ansatt') this.thinkStaff(dt, plan, f, residents, ctx)
      step(plan, f, dt)
    }
  }

  private syncResidents(plan: FloorPlan, residents: PlanResidentInput[], ctx: PlanContext): void {
    const wanted = new Set(residents.map((r) => `b${r.id}`))
    this.figures = this.figures.filter((f) => f.kind !== 'beboer' || wanted.has(f.key))
    const taken = new Map<string, number>()
    residents.forEach((r, index) => {
      if (!plan.byId[bedRoomId(r.room)] || plan.byId[bedRoomId(r.room)].kind !== 'beboer') return
      let goal = residentGoal(plan, r, index, ctx)
      // Er plassen i stua opptatt, blir beboeren på rommet i stedet.
      if (goal.id.startsWith('stue-')) {
        const n = taken.get(goal.id) ?? 0
        taken.set(goal.id, n + 1)
        if (n >= SEAT_CAPACITY) {
          const home = plan.byId[bedRoomId(r.room)]
          goal = { id: 'stol', room: home.id, at: home.spots.stol, pose: 'sitter' }
        }
      }
      let f = this.find(`b${r.id}`)
      if (!f) {
        // Nye figurer starter der de hører hjemme, så kartet er riktig fra første bilde.
        const aid = aidFor(r, plan.wardType)
        f = this.make(`b${r.id}`, 'beboer', r.name, goal.at, goal.room, residentStyleFor(r, plan.wardType), aid === 'rullestol' ? 0.55 : aid ? 0.42 : plan.wardType === 'bofellesskap' ? 0.95 : 0.6, aid)
        f.goal = goal.id
        f.goalRoom = goal.room
        f.pose = f.restPose = goal.pose
        this.figures.push(f)
      } else if (f.goal !== goal.id) {
        sendTo(plan, f, goal)
      }
    })
  }

  private syncCrew(plan: FloorPlan, crew: AgentInput[], staffNames: Record<string, string>): void {
    const wanted = new Set(crew.map((c) => `a${c.id}`))
    for (const f of this.figures) {
      if (f.kind === 'ansatt' && !wanted.has(f.key) && f.answering) this.lamps.set(f.answering, 'ringer')
    }
    this.figures = this.figures.filter((f) => f.kind !== 'ansatt' || wanted.has(f.key))
    crew.forEach((c, i) => {
      let f = this.find(`a${c.id}`)
      if (!f) {
        const seat = plan.byId.vaktrom.spots[`s${(i % 6) + 1}`]
        f = this.make(`a${c.id}`, 'ansatt', staffNames[c.id] ?? 'Pleier', seat, 'vaktrom', styleFor(c), STAFF_SPEED[c.profession], null)
        this.figures.push(f)
      }
      f.stress = c.stress
    })
  }

  private updateLamps(dt: number, ctx: PlanContext): void {
    this.lampTimer -= dt
    if (this.lampTimer > 0) return
    // Jo mer presset vakta er, desto oftere ringer det – og desto flere lamper lyser samtidig.
    this.lampTimer = 22 - 16 * ctx.urgency + Math.random() * 8
    const max = 1 + Math.round(3 * ctx.urgency)
    if (this.lamps.size >= max) return
    const candidates = this.figures.filter((f) => f.kind === 'beboer' && f.path.length === 0 && f.room?.startsWith('rom') && !this.lamps.has(f.room))
    if (candidates.length === 0) return
    const who = candidates[Math.floor(Math.random() * candidates.length)]
    if (ctx.night && Math.random() < 0.5) return
    this.lamps.set(who.room!, 'ringer')
    this.rings++
  }

  private thinkStaff(dt: number, plan: FloorPlan, f: PlanFigure, residents: PlanResidentInput[], ctx: PlanContext): void {
    f.speed = f.baseSpeed * (ctx.night ? 0.8 : 1) * (1 + 0.55 * ctx.urgency)
    if (f.path.length > 0) return
    // Framme hos den som ringte: bli litt, så slukkes lampa.
    if (f.answering) {
      if (this.lamps.get(f.answering) === 'paa-vei') {
        this.lamps.set(f.answering, 'hos')
        f.wait = 4 + Math.random() * 4
      }
      f.wait -= dt
      if (f.wait > 0) return
      this.lamps.delete(f.answering)
      f.answering = null
    }
    const staff = this.figures.filter((x) => x.kind === 'ansatt')
    const index = staff.indexOf(f)
    const vaktrom = plan.byId.vaktrom
    if (ctx.rapport) {
      const seat = `s${(index % 6) + 1}`
      if (f.goal !== `rapport-${seat}`) sendTo(plan, f, { id: `rapport-${seat}`, room: 'vaktrom', at: vaktrom.spots[seat], pose: 'sitter' })
      return
    }
    // Ringesnor går foran alt annet.
    const ringing = [...this.lamps.entries()].find(([, state]) => state === 'ringer')
    if (ringing) {
      const room = plan.byId[ringing[0]]
      if (room) {
        this.lamps.set(room.id, 'paa-vei')
        f.answering = room.id
        sendTo(plan, f, { id: `ring-${room.id}`, room: room.id, at: room.spots.inne, pose: 'staar' })
        return
      }
    }
    f.wait -= dt
    if (f.wait > 0) return
    const calm = 1 - ctx.urgency
    f.wait = 3 + Math.random() * (4 + 6 * calm)
    const roll = Math.random()
    const occupied = residents.filter((r) => plan.byId[bedRoomId(r.room)]?.kind === 'beboer')
    const meal = mealAt(ctx.minuteOfDay)
    if (ctx.night) {
      // Natt: én blir ved PC-en, resten går stille runder.
      if (index === 0 || roll < 0.45 || occupied.length === 0) {
        sendTo(plan, f, index === 0 ? { id: 'pc', room: 'vaktrom', at: vaktrom.spots.pc, pose: 'sitter' } : { id: 'natt-sete', room: 'vaktrom', at: vaktrom.spots[`s${(index % 6) + 1}`], pose: 'sitter' })
        f.wait += 10
      } else {
        const r = occupied[Math.floor(Math.random() * occupied.length)]
        const room = plan.byId[bedRoomId(r.room)]
        sendTo(plan, f, { id: `tilsyn-${room.id}`, room: room.id, at: room.spots.inne, pose: 'staar' })
      }
      return
    }
    if (meal && roll < 0.5) {
      const at: Pt = [plan.byId.spisestue.spots.server[0] + Math.random() * 3.4, plan.byId.spisestue.spots.server[1] + (Math.random() < 0.5 ? 0 : 1.2)]
      sendTo(plan, f, { id: `server-${Math.random()}`, room: 'spisestue', at, pose: 'staar' })
    } else if (meal && roll < 0.65) {
      sendTo(plan, f, { id: 'kjokken', room: 'kjokken', at: plan.byId.kjokken.spots.benk, pose: 'staar' })
    } else if (roll < 0.55 && occupied.length > 0) {
      const r = occupied[Math.floor(Math.random() * occupied.length)]
      const room = plan.byId[bedRoomId(r.room)]
      sendTo(plan, f, { id: `stell-${room.id}-${Math.random()}`, room: room.id, at: room.spots.inne, pose: 'staar' })
    } else if (roll < 0.7) {
      sendTo(plan, f, { id: 'medisin', room: 'medisinrom', at: plan.byId.medisinrom.spots[Math.random() < 0.5 ? 'skap' : 'benk'], pose: 'staar' })
    } else if (roll < 0.8) {
      sendTo(plan, f, { id: 'stue', room: 'stue', at: [plan.byId.stue.x + 1 + Math.random() * 2.4, plan.byId.stue.y + 3.2], pose: 'staar' })
    } else if (roll < 0.9) {
      sendTo(plan, f, { id: 'pc', room: 'vaktrom', at: vaktrom.spots.pc, pose: 'sitter' })
      f.wait += 4 * calm
    } else {
      sendTo(plan, f, { id: 'kaffe', room: 'vaktrom', at: vaktrom.spots.kaffe, pose: 'staar' })
      f.wait += 3 * calm
    }
  }
}
