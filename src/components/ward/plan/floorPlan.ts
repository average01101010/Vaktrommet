import type { WardTypeId } from '@/types'

/**
 * Planløsningen for én etasje: en korridor med fellesrom i vest og ett rom per
 * beboer i øst. Planen er en ren funksjon av avdelingstype og sengetall, så
 * samme kode kan tegne både avdelingen du leder nå og etasjer du har
 * overlevert. Rom som ikke er bygd ennå står som tomter i enden av fløyen.
 *
 * Koordinater er i meter-aktige enheter: x mot øst, y mot sør.
 */
export type RoomKind =
  | 'beboer'
  | 'tomt'
  | 'vaktrom'
  | 'medisinrom'
  | 'kontor'
  | 'moterom'
  | 'kjokken'
  | 'spisestue'
  | 'stue'

export type CommonRoomKind = Exclude<RoomKind, 'beboer' | 'tomt'>

export type Pt = [number, number]

export interface PlanRoom {
  id: string
  kind: RoomKind
  label: string
  x: number
  y: number
  w: number
  h: number
  /** Nord for korridoren (døra i sørveggen) eller sør (døra i nordveggen). */
  side: 'nord' | 'sor'
  /** Midten av døråpningen, på veggen mot korridoren. */
  door: Pt
  /** Romnummer for beboerrom og tomter. */
  bed?: number
  /** Navngitte plasser i rommet: seng, stol, seter rundt bordet osv. */
  spots: Record<string, Pt>
}

export interface FloorPlan {
  wardType: WardTypeId
  beds: number
  w: number
  h: number
  corridor: { x: number; y: number; w: number; h: number }
  /** Hovedinngangen i vestenden av korridoren. */
  entrance: Pt
  rooms: PlanRoom[]
  byId: Record<string, PlanRoom>
  /** Østkanten av det som er bygd – kameraet rammer inn hit. */
  builtW: number
}

/** Så mange beboerrom er det plass til i en fløy. */
export const MAX_BEDS = 14

export const ROOM_DEPTH = 4.2
export const CORRIDOR_H = 2.3
export const BED_ROOM_W = 2.8
export const DOOR_W = 0.95

const COMMON_NORTH: { kind: CommonRoomKind; label: string; w: number }[] = [
  { kind: 'kjokken', label: 'Kjøkken', w: 3.4 },
  { kind: 'spisestue', label: 'Spisestue', w: 4.8 },
  { kind: 'stue', label: 'Stue', w: 4.4 },
]

const COMMON_SOUTH: { kind: CommonRoomKind; label: string; w: number }[] = [
  { kind: 'vaktrom', label: 'Vaktrom', w: 4.4 },
  { kind: 'medisinrom', label: 'Medisinrom', w: 2.4 },
  { kind: 'kontor', label: 'Kontor', w: 2.9 },
  { kind: 'moterom', label: 'Møterom', w: 2.9 },
]

export const COMMON_W = COMMON_NORTH.reduce((n, r) => n + r.w, 0)

/** Antall seter rundt spisebordet og i stua. */
export const DINING_SEATS = MAX_BEDS
export const LOUNGE_SEATS = 6

/** Plasser i et rom, gitt i romlokale koordinater der «inn» er bort fra døra. */
function spotsFor(kind: RoomKind, w: number, h: number): Record<string, Pt> {
  // u: langs veggen (0–w), v: fra døra og innover (0–h)
  switch (kind) {
    case 'beboer':
      return { seng: [w * 0.32, h - 1.25], stol: [w - 0.75, 1.5], besok: [w - 0.8, h - 1.5], inne: [w * 0.5, 1.9] }
    case 'tomt':
      return {}
    case 'vaktrom':
      return {
        s1: [1.25, 2.0], s2: [2.15, 2.0], s3: [1.25, 3.25], s4: [2.15, 3.25], s5: [0.75, 2.6], s6: [2.65, 2.6],
        pc: [w - 0.85, h - 1.05], tavle: [w * 0.5, 1.0], kaffe: [0.75, h - 0.95],
      }
    case 'medisinrom':
      return { skap: [w * 0.5, h - 1.15], benk: [w * 0.5, 2.0] }
    case 'kontor':
      return { pult: [w * 0.5, h - 1.35], gjest: [w * 0.5, 1.7] }
    case 'moterom':
      return { s1: [0.85, 1.75], s2: [w - 0.85, 1.75], s3: [0.85, 2.9], s4: [w - 0.85, 2.9] }
    case 'kjokken':
      return { benk: [w * 0.45, h - 1.2], tralle: [w - 0.8, 1.5] }
    case 'spisestue': {
      const spots: Record<string, Pt> = { server: [0.6, 1.3] }
      const perRow = DINING_SEATS / 2
      for (let i = 0; i < DINING_SEATS; i++) {
        const col = Math.floor(i / 2)
        const u = 0.75 + (col * (w - 1.5)) / (perRow - 1)
        spots[`sete${i + 1}`] = [u, i % 2 === 0 ? 1.75 : 3.25]
      }
      return spots
    }
    case 'stue': {
      const spots: Record<string, Pt> = { tv: [w * 0.5, h - 0.5] }
      for (let i = 0; i < LOUNGE_SEATS; i++) {
        const row = Math.floor(i / 3)
        spots[`sete${i + 1}`] = [0.95 + (i % 3) * ((w - 1.9) / 2), 1.35 + row * 1.05]
      }
      return spots
    }
  }
}

function makeRoom(
  id: string,
  kind: RoomKind,
  label: string,
  x: number,
  w: number,
  side: 'nord' | 'sor',
  bed?: number,
): PlanRoom {
  const y = side === 'nord' ? 0 : ROOM_DEPTH + CORRIDOR_H
  const h = ROOM_DEPTH
  const local = spotsFor(kind, w, h)
  const spots: Record<string, Pt> = {}
  // Nordrom har døra nederst, sørrom øverst: «innover» snus deretter.
  for (const [name, [u, v]] of Object.entries(local)) spots[name] = [x + u, side === 'nord' ? y + h - v : y + v]
  const doorX = kind === 'beboer' || kind === 'tomt' ? x + w * 0.5 : x + Math.min(w - 0.9, Math.max(0.9, w * 0.5))
  return {
    id,
    kind,
    label,
    x,
    y,
    w,
    h,
    side,
    door: [doorX, side === 'nord' ? y + h : y],
    spots,
    ...(bed !== undefined ? { bed } : {}),
  }
}

export const bedRoomId = (bed: number): string => `rom${bed}`

export function buildFloorPlan(wardType: WardTypeId, beds: number): FloorPlan {
  const built = Math.max(0, Math.min(MAX_BEDS, Math.round(beds)))
  const rooms: PlanRoom[] = []
  let x = 0
  for (const r of COMMON_NORTH) {
    rooms.push(makeRoom(r.kind, r.kind, r.label, x, r.w, 'nord'))
    x += r.w
  }
  x = 0
  for (const r of COMMON_SOUTH) {
    rooms.push(makeRoom(r.kind, r.kind, r.label, x, r.w, 'sor'))
    x += r.w
  }
  // Oddetall mot nord, partall mot sør, så rom 1 og 2 ligger nærmest fellesrommene.
  for (let bed = 1; bed <= MAX_BEDS; bed++) {
    const col = Math.floor((bed - 1) / 2)
    const side = bed % 2 === 1 ? 'nord' : 'sor'
    const isBuilt = bed <= built
    rooms.push(makeRoom(bedRoomId(bed), isBuilt ? 'beboer' : 'tomt', isBuilt ? `Rom ${bed}` : 'Byggetomt', COMMON_W + col * BED_ROOM_W, BED_ROOM_W, side, bed))
  }
  const w = COMMON_W + (MAX_BEDS / 2) * BED_ROOM_W
  const builtCols = Math.ceil(built / 2)
  return {
    wardType,
    beds: built,
    w,
    h: ROOM_DEPTH * 2 + CORRIDOR_H,
    corridor: { x: 0, y: ROOM_DEPTH, w, h: CORRIDOR_H },
    entrance: [-0.6, ROOM_DEPTH + CORRIDOR_H / 2],
    rooms,
    byId: Object.fromEntries(rooms.map((r) => [r.id, r])),
    builtW: COMMON_W + builtCols * BED_ROOM_W,
  }
}

/** Rommet et punkt ligger i, eller `null` for korridoren og utendørs. */
export function roomAt(plan: FloorPlan, x: number, y: number): PlanRoom | null {
  return plan.rooms.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) ?? null
}

/** Punktet rett innenfor døra og punktet i korridoren utenfor. */
export function doorPoints(plan: FloorPlan, room: PlanRoom, lane = 0): { inside: Pt; outside: Pt } {
  const mid = plan.corridor.y + plan.corridor.h / 2
  const inward = room.side === 'nord' ? -0.55 : 0.55
  return { inside: [room.door[0], room.door[1] + inward], outside: [room.door[0], mid + lane] }
}

/**
 * Gangveien mellom to plasser: ut døra, langs korridoren og inn neste dør.
 * `lane` forskyver figuren litt sidelengs i korridoren, så ikke alle går på én linje.
 */
export function routeBetween(plan: FloorPlan, from: Pt, fromRoom: string | null, to: Pt, toRoom: string | null, lane = 0): Pt[] {
  if (fromRoom === toRoom) return [to]
  const path: Pt[] = []
  const a = fromRoom ? plan.byId[fromRoom] : null
  const b = toRoom ? plan.byId[toRoom] : null
  if (a) {
    const d = doorPoints(plan, a, lane)
    path.push(d.inside, d.outside)
  }
  if (b) {
    const d = doorPoints(plan, b, lane)
    path.push(d.outside, d.inside)
  }
  path.push(to)
  // Punktet vi allerede står på trenger vi ikke gå til.
  return path.filter((p, i) => i > 0 || Math.hypot(p[0] - from[0], p[1] - from[1]) > 0.05)
}

/** Hva hvert fellesrom brukes til – vist når spilleren trykker på rommet. */
export const ROOM_INFO: Record<CommonRoomKind, string> = {
  vaktrom: 'Her går rapporten ved vaktskifte, og her henger korktavla med sakene som venter på deg.',
  medisinrom: 'Legemidler istandgjøres og dobbeltkontrolleres her før de deles ut.',
  kontor: 'Avdelingslederens kontor. Herfra følger du opp avvik og bemanning.',
  moterom: 'Rommet for pårørendesamtaler, kurs og møter med tilsynet.',
  kjokken: 'Postkjøkkenet lager frokost og kvelds, og tar imot middagen.',
  spisestue: 'Beboerne spiser frokost, middag og kvelds sammen her.',
  stue: 'Fellesstua med TV, sofa og plass til en prat. Hit går mange mellom måltidene.',
}
