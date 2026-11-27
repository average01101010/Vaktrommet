import type { WardTypeId } from '@/types'
import { drawFigure } from '../scene/character'
import { box, hexToRgb, keyframe, P, poly, roundRect, type BoxColors, type Pt as ScreenPt, type View } from '../scene/iso'
import { WARD_LOOKS } from '../scene/layout'
import { DOOR_W, type FloorPlan, type PlanRoom, type Pt } from './floorPlan'
import type { LampState, PlanFigure } from './planAgents'

/**
 * Avdelingskartet i 2.5D: samme isometriske vinkel som vaktrommet, med
 * ytterveggene bak i full høyde og veggene foran skåret ned, så man ser inn i
 * alle rom. Plan-x går ned mot høyre på skjermen, plan-y ned mot venstre.
 */

/** Kameraet: verdenspunktet midt i bildet og flisbredden i piksler. */
export interface Camera {
  x: number
  y: number
  u: number
}

export interface PlanDrawState {
  plan: FloorPlan
  figures: PlanFigure[]
  lamps: Map<string, LampState>
  minuteOfDay: number
  time: number
  /** Navn på beboeren i hvert rom (rom-id → fornavn). */
  names: Record<string, string>
  /** Rom med en sak på korktavla. */
  flagged: ReadonlySet<string>
  selected: string | null
  followed: string | null
}

/** Høyden på ytterveggene bak, og på de nedskårne veggene ellers. */
export const WALL_H = 2.1
const LOW = 0.5
const THICK = 0.12

export function viewFor(cam: Camera, width: number, height: number): View {
  const tw = cam.u
  const th = tw / 2
  return {
    tw,
    th,
    zh: tw * 0.56,
    s: tw / 50,
    ox: width / 2 - ((cam.x - cam.y) * tw) / 2,
    oy: height / 2 - ((cam.x + cam.y) * th) / 2,
    width,
    height,
  }
}

/** Skjermpunkt → punkt på gulvet. */
export function toWorld(cam: Camera, w: number, h: number, sx: number, sy: number): Pt {
  const v = viewFor(cam, w, h)
  const a = (sx - v.ox) / (v.tw / 2)
  const b = (sy - v.oy) / (v.th / 2)
  return [(a + b) / 2, (b - a) / 2]
}

/** Flytter kameraet så bildet følger fingeren (dx, dy i piksler). */
export function panBy(cam: Camera, dx: number, dy: number): void {
  const a = dx / (cam.u / 2)
  const b = dy / (cam.u / 4)
  cam.x -= (a + b) / 2
  cam.y -= (b - a) / 2
}

/** Zoom og utsnitt som viser `shownW` enheter av fløyen, med luft til merkelappene oppå kartet. */
export function fitCamera(plan: FloorPlan, shownW: number, w: number, h: number, top: number, bottom: number): Camera {
  const span = shownW + plan.h
  const u = Math.min((w - 10) / (span / 2 + 0.3), (h - top - bottom - 6) / (span / 4 + WALL_H * 0.56 + 0.2))
  const cam: Camera = { x: shownW / 2, y: plan.h / 2, u }
  // Bygget står midt i det ledige feltet: ned for merkelappene og for vegghøyden.
  panBy(cam, 0, (top - bottom) / 2 + (WALL_H * 0.56 * u) / 2)
  return cam
}

// ---------- Farger ----------

const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('')}`

/** Blander to hex-farger og gir hex tilbake, så resultatet kan blandes videre. */
function blend(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}
const lighten = (c: string, t: number) => blend(c, '#ffffff', t)
const darken = (c: string, t: number) => blend(c, '#1c1a17', t)

const tone = (c: string): BoxColors => ({ top: c, left: darken(c, 0.14), right: darken(c, 0.27), stroke: 'rgba(40,34,28,0.22)' })

const WOOD = '#C9A26B'
const WOOD_DARK = '#A9824F'
const STEEL = '#C5CCCF'
const WHITE = '#F6F3EC'

const FLOORS: Record<string, string> = {
  beboer: '#E9DAC0',
  vaktrom: '#D9E3DC',
  medisinrom: '#DFE7EC',
  kontor: '#E4D9C4',
  moterom: '#DFD9CB',
  kjokken: '#DEE2DF',
  spisestue: '#E8DCC5',
  stue: '#E6D9C2',
}

type Ctx = CanvasRenderingContext2D

/** En ting som skal tegnes i dybderekkefølge. */
interface Item {
  depth: number
  draw: () => void
}

/** Speiler romlokale mål for rom sør for korridoren, der døra er øverst. */
function local(room: PlanRoom) {
  const north = room.side === 'nord'
  // u: langs veggen, v: avstand fra døra og innover, w: bredde, d: dybde innover.
  return (u: number, v: number, w: number, d: number): [number, number, number, number] => [room.x + u, north ? room.y + room.h - v - d : room.y + v, w, d]
}

class Scene {
  readonly items: Item[] = []
  constructor(
    readonly ctx: Ctx,
    readonly v: View,
  ) {}

  /** En boks på gulvet (eller løftet til z). */
  box(x: number, y: number, w: number, d: number, hgt: number, color: string, z = 0, bias = 0, outline = true): void {
    const { ctx, v } = this
    const c = outline ? tone(color) : { ...tone(color), stroke: undefined }
    this.items.push({ depth: x + w / 2 + y + d / 2 + bias, draw: () => box(ctx, v, x, y, z, w, d, hgt, c) })
  }

  /** Flatt felt på gulvet, tegnet med en gang (tepper, matter). */
  flat(x: number, y: number, w: number, d: number, color: string, z = 0.005): void {
    const { v } = this
    poly(this.ctx, [P(v, x, y, z), P(v, x + w, y, z), P(v, x + w, y + d, z), P(v, x, y + d, z)], color)
  }

  /** En lav vegg, delt i korte biter så figurer kan stå både foran og bak den. */
  wall(x0: number, y0: number, x1: number, y1: number, color: string, hgt = LOW): void {
    const alongX = Math.abs(x1 - x0) >= Math.abs(y1 - y0)
    const len = alongX ? x1 - x0 : y1 - y0
    if (len <= 0.001) return
    const parts = Math.max(1, Math.ceil(len / 0.9))
    for (let i = 0; i < parts; i++) {
      const a = (len * i) / parts
      const b = len / parts
      if (alongX) this.box(x0 + a, y0 - THICK / 2, b, THICK, hgt, color, 0, -0.02, false)
      else this.box(x0 - THICK / 2, y0 + a, THICK, b, hgt, color, 0, -0.02, false)
    }
  }

  chair(x: number, y: number, color: string, back: 'n' | 's' | 'w' | 'e' | null = null): void {
    this.box(x - 0.22, y - 0.22, 0.44, 0.44, 0.3, color)
    if (back === 'n') this.box(x - 0.22, y - 0.25, 0.44, 0.08, 0.62, darken(color, 0.08), 0, -0.2)
    if (back === 'w') this.box(x - 0.25, y - 0.22, 0.08, 0.44, 0.62, darken(color, 0.08), 0, -0.2)
  }

  plant(x: number, y: number): void {
    const { ctx, v } = this
    this.box(x - 0.14, y - 0.14, 0.28, 0.28, 0.26, '#B7714D')
    this.items.push({
      depth: x + y + 0.05,
      draw: () => {
        const [sx, sy] = P(v, x, y, 0.5)
        for (const [dx, dy, r, c] of [[0, 0, 0.26, '#4F8A62'], [-0.1, -0.1, 0.17, '#6FAE7E'], [0.1, -0.06, 0.15, '#5E9C70']] as const) {
          ctx.beginPath()
          ctx.arc(sx + dx * v.tw, sy + dy * v.tw, r * v.tw * 0.62, 0, Math.PI * 2)
          ctx.fillStyle = c
          ctx.fill()
        }
      },
    })
  }

  flush(): void {
    this.items.sort((a, b) => a.depth - b.depth)
    for (const item of this.items) item.draw()
    this.items.length = 0
  }
}

function furnish(sc: Scene, room: PlanRoom, ward: WardTypeId, st: PlanDrawState): void {
  const L = local(room)
  const { w, h } = room
  const north = room.side === 'nord'
  // Høye ting står bare mot veggen bak; mot veggen foran ville de skjult rommet.
  const tall = (hgt: number) => (north ? hgt : Math.min(hgt, 0.85))
  const fabric = ward === 'demens' ? '#C98B6B' : ward === 'lindrende' ? '#9A86A8' : '#7FA08C'
  switch (room.kind) {
    case 'beboer': {
      // Bad innerst: fliser, toalett og vask bak en lav skillevegg
      const [bx, by, bw, bd] = L(w - 1.05, h - 1.15, 1.05, 1.15)
      sc.flat(bx, by, bw, bd, '#CFE0E6')
      sc.box(...L(w - 0.5, h - 0.5, 0.32, 0.4), 0.38, WHITE)
      sc.box(...L(w - 0.98, h - 0.38, 0.34, 0.26), tall(0.8), WHITE)
      sc.wall(bx, north ? by + bd : by, bx + 0.55, north ? by + bd : by, '#DAD2C2', 0.42)
      // Seng med dyne og pute, hodeenden innerst
      const [sx, sy, sw, sd] = L(0.26, h - 2.15, 0.98, 1.98)
      sc.box(sx, sy, sw, sd, 0.36, WHITE)
      sc.box(sx + 0.04, north ? sy + 0.62 : sy + 0.04, sw - 0.08, sd - 0.66, 0.08, lighten(fabric, 0.35), 0.36, 0.01)
      sc.box(sx + 0.16, north ? sy + 0.12 : sy + sd - 0.5, sw - 0.32, 0.38, 0.09, '#FFFFFF', 0.36, 0.01)
      sc.box(sx, north ? sy - 0.02 : sy + sd - 0.06, sw, 0.08, north ? 0.78 : 0.5, WOOD_DARK, 0, north ? -0.3 : 0.3)
      // Nattbord og lenestol
      sc.box(...L(1.34, h - 0.6, 0.4, 0.4), 0.5, WOOD)
      const [cx, cy] = room.spots.stol
      sc.chair(cx, cy, fabric, 'w')
      // Noe personlig
      if ((room.bed ?? 0) % 3 !== 0) sc.plant(room.x + w - 0.36, north ? room.y + h - 0.42 : room.y + 0.42)
      break
    }
    case 'vaktrom': {
      for (const s of ['s1', 's2', 's3', 's4', 's5', 's6']) sc.chair(room.spots[s][0], room.spots[s][1], '#5E7F8F')
      sc.box(...L(1.0, 2.15, 1.4, 0.95), 0.66, WOOD)
      // PC-pult innerst og kaffehjørne
      sc.box(...L(w - 1.5, h - 0.62, 1.3, 0.5), 0.7, '#D8D2C6')
      sc.box(...L(w - 1.1, h - 0.5, 0.5, 0.08), 0.34, '#2F3B44', 0.7, 0.02)
      sc.box(...L(0.22, h - 0.56, 1.0, 0.44), 0.8, '#CFC8BA')
      sc.box(...L(0.42, h - 0.46, 0.2, 0.2), 0.26, '#3A2F28', 0.8, 0.02)
      break
    }
    case 'medisinrom': {
      const n = 3
      for (let i = 0; i < n; i++) sc.box(...L(0.18 + (i * (w - 0.36)) / n, h - 0.55, (w - 0.36) / n - 0.04, 0.45), tall(1.7), i === 1 ? '#C7DCE6' : '#EEF2F3')
      sc.box(...L(0.18, 1.4, 0.5, 1.2), 0.85, '#DCE3E6')
      break
    }
    case 'kontor': {
      sc.box(...L(w * 0.5 - 0.8, h - 1.1, 1.6, 0.62), 0.7, WOOD)
      sc.box(...L(w * 0.5 - 0.26, h - 0.92, 0.52, 0.08), 0.32, '#2F3B44', 0.7, 0.02)
      sc.chair(room.spots.pult[0], room.spots.pult[1], '#4F6D5E')
      sc.chair(room.spots.gjest[0], room.spots.gjest[1], fabric)
      sc.box(...L(0.16, h - 0.5, 0.72, 0.36), tall(1.5), WOOD_DARK)
      sc.plant(...(L(w - 0.42, h - 0.45, 0, 0).slice(0, 2) as Pt))
      break
    }
    case 'moterom': {
      for (const s of ['s1', 's2', 's3', 's4']) sc.chair(room.spots[s][0], room.spots[s][1], '#6E7F96')
      sc.box(...L(w * 0.5 - 0.5, 1.5, 1.0, 1.65), 0.68, WOOD)
      sc.box(...L(w * 0.5 - 0.6, h - 0.22, 1.2, 0.08), tall(1.5), WHITE)
      break
    }
    case 'kjokken': {
      sc.box(...L(0.14, h - 0.66, w - 0.9, 0.52), 0.86, STEEL)
      sc.box(...L(0.36, h - 0.58, 0.6, 0.36), 0.03, '#3B4247', 0.86, 0.02)
      sc.box(...L(1.3, h - 0.56, 0.62, 0.32), 0.03, '#9FA9AE', 0.86, 0.02)
      sc.box(...L(w - 0.74, h - 0.7, 0.6, 0.58), tall(1.75), '#E8EBEC')
      sc.box(...L(0.14, 1.3, 0.5, 1.4), 0.86, STEEL)
      // Serveringstralle
      const [tx, ty] = room.spots.tralle
      sc.box(tx - 0.3, ty - 0.22, 0.6, 0.44, 0.06, '#AEB8BD', 0.62)
      sc.box(tx - 0.3, ty - 0.22, 0.6, 0.44, 0.06, '#AEB8BD', 0.2, -0.01)
      sc.box(tx - 0.2, ty - 0.1, 0.16, 0.16, 0.14, WHITE, 0.68, 0.02)
      sc.box(tx + 0.04, ty - 0.1, 0.16, 0.16, 0.2, '#D9A441', 0.68, 0.02)
      break
    }
    case 'spisestue': {
      const seats = Object.entries(room.spots).filter(([k]) => k.startsWith('sete'))
      for (const [, [sx, sy]] of seats) sc.chair(sx, sy, fabric)
      const [tx, ty, tw, td] = L(0.5, 2.05, w - 1.0, 0.9)
      sc.box(tx, ty, tw, td, 0.68, WOOD)
      const m = st.minuteOfDay
      const dining = (m >= 505 && m < 575) || (m >= 775 && m < 845) || (m >= 1105 && m < 1160)
      // Dekket på til måltidene, ellers en løper og en blomst
      if (dining) for (const [, [sx, sy]] of seats) sc.box(sx - 0.11, (sy < ty ? ty + 0.08 : ty + td - 0.3), 0.22, 0.22, 0.03, '#FFFFFF', 0.68, 0.03)
      else sc.box(tx + tw / 2 - 0.8, ty + td / 2 - 0.13, 1.6, 0.26, 0.015, '#E9E2CF', 0.68, 0.03)
      sc.box(...L(w - 1.3, h - 0.5, 1.1, 0.38), 0.8, WOOD_DARK)
      sc.plant(...(L(0.4, h - 0.45, 0, 0).slice(0, 2) as Pt))
      break
    }
    case 'stue': {
      const [rx, ry, rw, rd] = L(0.5, 0.8, w - 1.0, 2.5)
      sc.flat(rx, ry, rw, rd, lighten(fabric, 0.66))
      for (let row = 0; row < 2; row++) {
        const [sx, sy, sw, sd] = L(0.55, 1.05 + row * 1.05, w - 1.1, 0.6)
        sc.box(sx, sy, sw, sd, 0.3, fabric)
        // Ryggen står mot døra, så de som sitter ser mot TV-en
        sc.box(sx, north ? sy + sd - 0.1 : sy, sw, 0.1, 0.56, darken(fabric, 0.1), 0, north ? 0.25 : -0.25)
      }
      sc.box(...L(w * 0.5 - 0.8, h - 0.42, 1.6, 0.3), 0.42, WOOD_DARK)
      const flicker = 0.6 + 0.4 * Math.sin(st.time * 2.3)
      sc.box(...L(w * 0.5 - 0.62, h - 0.3, 1.24, 0.06), 0.62, blend('#1E2A33', '#7FB4DC', 0.35 + 0.3 * flicker), 0.42, 0.02)
      sc.box(...L(0.2, h - 0.62, 0.44, 0.44), 0.5, WOOD)
      sc.plant(...(L(w - 0.42, h - 0.42, 0, 0).slice(0, 2) as Pt))
      break
    }
    case 'tomt':
      break
  }
}

const quad = (v: View, x: number, y: number, w: number, d: number, z = 0): ScreenPt[] => [P(v, x, y, z), P(v, x + w, y, z), P(v, x + w, y + d, z), P(v, x, y + d, z)]

function drawFloors(ctx: Ctx, v: View, st: PlanDrawState, look: (typeof WARD_LOOKS)[WardTypeId]): void {
  const { plan } = st
  const c = plan.corridor
  // Grunnmur
  poly(ctx, [P(v, 0, plan.h, 0), P(v, plan.builtW, plan.h, 0), P(v, plan.builtW, plan.h, -0.25), P(v, 0, plan.h, -0.25)], '#8F8676')
  poly(ctx, [P(v, plan.builtW, 0, 0), P(v, plan.builtW, plan.h, 0), P(v, plan.builtW, plan.h, -0.25), P(v, plan.builtW, 0, -0.25)], '#7C7466')
  poly(ctx, quad(v, 0, 0, plan.builtW, plan.h), '#CFC6B4')
  // Korridoren med ledelinje
  poly(ctx, quad(v, c.x, c.y, plan.builtW, c.h), look.lino)
  poly(ctx, quad(v, c.x, c.y + c.h / 2 - 0.04, plan.builtW, 0.08), look.linoEdge)
  poly(ctx, quad(v, 0.2, c.y + c.h / 2 - 0.5, 0.9, 1.0), '#8E7B63')
  for (const r of plan.rooms) {
    if (r.kind === 'tomt') {
      ctx.save()
      ctx.setLineDash([v.tw * 0.2, v.tw * 0.14])
      poly(ctx, quad(v, r.x + 0.15, r.y + 0.15, r.w - 0.3, r.h - 0.3), 'rgba(160,130,90,0.2)', 'rgba(110,90,60,0.6)', Math.max(1, v.tw * 0.04))
      ctx.restore()
      continue
    }
    poly(ctx, quad(v, r.x, r.y, r.w, r.h), FLOORS[r.kind] ?? '#E8DDC8')
  }
}

/** Ytterveggene bak: nordveggen med vinduer og vestgavlen med inngangen. */
function drawBackWalls(ctx: Ctx, v: View, st: PlanDrawState, look: (typeof WARD_LOOKS)[WardTypeId], dark: number): void {
  const { plan } = st
  const wallN = blend('#F1EADC', look.dado, 0.3)
  const wallW = darken(wallN, 0.09)
  const glass = blend('#BFDDEA', '#F6D58A', dark * 0.75)
  // Nordveggen (planet y = 0), ett felt per rom
  for (const r of plan.rooms) {
    if (r.side !== 'nord' || r.kind === 'tomt') continue
    poly(ctx, [P(v, r.x, 0, 0), P(v, r.x + r.w, 0, 0), P(v, r.x + r.w, 0, WALL_H), P(v, r.x, 0, WALL_H)], wallN, 'rgba(40,34,28,0.25)', 0.6)
    poly(ctx, [P(v, r.x, 0, 0), P(v, r.x + r.w, 0, 0), P(v, r.x + r.w, 0, 0.85), P(v, r.x, 0, 0.85)], blend(wallN, look.dado, 0.55))
    const wx = r.x + r.w / 2 - 0.55
    poly(ctx, [P(v, wx, 0, 0.95), P(v, wx + 1.1, 0, 0.95), P(v, wx + 1.1, 0, 1.8), P(v, wx, 0, 1.8)], glass, '#FFFFFF', Math.max(1, v.tw * 0.035))
    const [mx1, my1] = P(v, wx + 0.55, 0, 0.95)
    const [mx2, my2] = P(v, wx + 0.55, 0, 1.8)
    ctx.beginPath()
    ctx.moveTo(mx1, my1)
    ctx.lineTo(mx2, my2)
    ctx.stroke()
  }
  // Vestgavlen (planet x = 0), med åpning for inngangen
  const c = plan.corridor
  const seg = (y0: number, y1: number, z0 = 0) =>
    poly(ctx, [P(v, 0, y0, z0), P(v, 0, y1, z0), P(v, 0, y1, WALL_H), P(v, 0, y0, WALL_H)], wallW, 'rgba(40,34,28,0.25)', 0.6)
  seg(0, c.y + 0.3)
  seg(c.y + c.h - 0.3, plan.h)
  seg(c.y + 0.3, c.y + c.h - 0.3, 1.75)
  // Skilleveggene mellom nordrommene går fullt opp bakerst og skrår ned mot korridoren
  for (const r of plan.rooms) {
    if (r.side !== 'nord' || r.kind === 'tomt' || r.x <= 0) continue
    poly(ctx, [P(v, r.x, 0, 0), P(v, r.x, 1.1, 0), P(v, r.x, 1.1, LOW), P(v, r.x, 0, WALL_H)], darken(wallN, 0.16), 'rgba(40,34,28,0.25)', 0.6)
  }
}

function addWalls(sc: Scene, plan: FloorPlan, look: (typeof WARD_LOOKS)[WardTypeId]): void {
  const color = blend('#EFE7D8', look.dado, 0.35)
  const c = plan.corridor
  for (const r of plan.rooms) {
    if (r.kind === 'tomt') continue
    // Veggen mot korridoren, med åpning for døra
    const dy = r.door[1]
    sc.wall(r.x, dy, r.door[0] - DOOR_W / 2, dy, color)
    sc.wall(r.door[0] + DOOR_W / 2, dy, r.x + r.w, dy, color)
    // Skillevegg mot rommet i vest
    if (r.x > 0) sc.wall(r.x, r.side === 'nord' ? r.y + 1.1 : r.y, r.x, r.y + r.h, color)
    // Ytterveggen foran er skåret ned
    if (r.side === 'sor') sc.wall(r.x, r.y + r.h, r.x + r.w, r.y + r.h, color, 0.34)
  }
  // Østgavlen
  sc.wall(plan.builtW, 0, plan.builtW, c.y + 0.5, color)
  sc.wall(plan.builtW, c.y + c.h - 0.5, plan.builtW, plan.h, color)
}

function addDoors(sc: Scene, st: PlanDrawState, doorColors: string[] | null): void {
  for (const r of st.plan.rooms) {
    if (r.kind === 'tomt') continue
    const leaf = r.kind === 'beboer' && doorColors ? doorColors[((r.bed ?? 1) - 1) % doorColors.length] : '#C4A377'
    const [dx, dy] = r.door
    // Dørbladet står åpent inn i rommet
    if (r.side === 'nord') sc.box(dx - DOOR_W / 2 - 0.03, dy - 0.8, 0.06, 0.8, 1.05, leaf, 0, -0.1)
    else sc.box(dx - DOOR_W / 2 - 0.03, dy, 0.06, 0.8, 1.05, leaf, 0, -0.1)
  }
}

function addFigures(sc: Scene, st: PlanDrawState): void {
  const { ctx, v } = sc
  for (const f of st.figures) {
    const [fx, fy] = P(v, f.x, f.y, 0)
    if (fx < -80 || fy < -80 || fx > v.width + 80 || fy > v.height + 140) continue
    if (f.pose === 'ligger') {
      // Under dyna: bare hodet på puta.
      const up = st.plan.byId[f.room ?? '']?.side === 'sor' ? 1 : -1
      sc.items.push({
        depth: f.x + f.y + 0.4,
        draw: () => {
          const [hx, hy] = P(v, f.x, f.y + up * 0.62, 0.5)
          ctx.beginPath()
          ctx.arc(hx, hy - v.tw * 0.03, v.tw * 0.13, 0, Math.PI * 2)
          ctx.fillStyle = f.style.hair
          ctx.fill()
          ctx.beginPath()
          ctx.arc(hx, hy + v.tw * 0.02, v.tw * 0.11, 0, Math.PI * 2)
          ctx.fillStyle = f.style.skin
          ctx.fill()
        },
      })
      continue
    }
    const sitting = f.pose === 'sitter'
    sc.items.push({
      depth: f.x + f.y + (sitting ? 0.12 : 0.02),
      draw: () => {
        const [sx, sy] = P(v, f.x, f.y, sitting ? 0.3 : 0)
        if (!sitting) {
          ctx.beginPath()
          ctx.ellipse(fx, fy, v.tw * 0.2, v.tw * 0.09, 0, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(40,34,28,0.2)'
          ctx.fill()
        }
        drawFigure(ctx, v, f.style, {
          sx,
          sy,
          flip: f.flip,
          away: false,
          sitting,
          walking: f.walking,
          phase: f.phase,
          time: st.time,
          alpha: 1,
          tired: f.kind === 'ansatt' && f.stress > 70,
          hurry: 0,
          carry: null,
          aid: f.aid,
          anim: null,
        })
      },
    })
  }
}

function pill(ctx: Ctx, v: View, at: ScreenPt, text: string, size: number, bg: string, fg: string, weight = 800): void {
  const px = size * v.tw
  ctx.font = `${weight} ${Math.round(px * 10) / 10}px Inter, system-ui, sans-serif`
  const tw = ctx.measureText(text).width + px * 0.9
  roundRect(ctx, at[0] - tw / 2, at[1] - px * 0.78, tw, px * 1.56, px * 0.5)
  ctx.fillStyle = bg
  ctx.fill()
  ctx.strokeStyle = 'rgba(40,34,28,0.22)'
  ctx.lineWidth = 0.8
  ctx.stroke()
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, at[0], at[1] + px * 0.04)
}

/** Skilt, lamper og lapper som alltid skal kunne leses – tegnet oppå alt annet. */
function drawSigns(ctx: Ctx, v: View, st: PlanDrawState): void {
  const u = v.tw
  for (const r of st.plan.rooms) {
    if (r.kind === 'tomt') {
      if (u > 16) pill(ctx, v, P(v, r.x + r.w / 2, r.y + r.h / 2, 0), `Rom ${r.bed} · tomt`, 0.26, 'rgba(255,253,247,0.75)', '#6E5A3C', 700)
      continue
    }
    const [dx, dy] = r.door
    if (r.kind !== 'beboer') {
      pill(ctx, v, r.side === 'nord' ? P(v, r.x + r.w / 2, 0, WALL_H + 0.22) : P(v, r.x + r.w / 2, r.y + r.h + 0.3, -0.1), r.label, Math.max(0.3, 9.5 / u), 'rgba(255,253,247,0.94)', '#2B3A36')
      continue
    }
    const name = st.names[r.id]
    const at = P(v, dx, dy, 1.2)
    if (u > 26) pill(ctx, v, at, name ? `${r.bed} ${name}` : `${r.bed} Ledig`, 0.25, name ? '#FFFDF7' : '#EDE7DA', name ? '#2B3A36' : '#8A8275', 700)
    else pill(ctx, v, at, String(r.bed), Math.max(0.3, 8 / u), '#FFFDF7', '#2B3A36')
    // Ringesnor: lampa over døra
    const lamp = st.lamps.get(r.id)
    if (lamp) {
      const [lx, ly] = P(v, dx, dy, 1.85)
      const blink = lamp === 'ringer' ? 0.55 + 0.45 * Math.sin(st.time * 7) : 1
      const rr = Math.max(4, u * 0.16)
      ctx.beginPath()
      ctx.arc(lx, ly, rr * 2.4 * blink, 0, Math.PI * 2)
      ctx.fillStyle = lamp === 'hos' ? 'rgba(79,174,123,0.3)' : 'rgba(226,87,76,0.32)'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(lx, ly, rr, 0, Math.PI * 2)
      ctx.fillStyle = lamp === 'hos' ? '#4FAE7B' : '#E2574C'
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 1.2
      ctx.stroke()
    }
    // En sak på korktavla gjelder beboeren her
    if (st.flagged.has(r.id)) {
      const [px, py] = P(v, r.x + r.w / 2, r.y + r.h / 2, 1.5 + Math.sin(st.time * 2.4) * 0.06)
      const s = Math.max(13, u * 0.55)
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(-0.08)
      ctx.fillStyle = 'rgba(40,34,28,0.2)'
      ctx.fillRect(-s / 2 + 1.5, -s / 2 + 2.5, s, s)
      ctx.fillStyle = '#FBE38A'
      ctx.fillRect(-s / 2, -s / 2, s, s)
      ctx.fillStyle = '#7A5A12'
      ctx.font = `900 ${s * 0.72}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('!', 0, s * 0.04)
      ctx.restore()
    }
  }
}

/** Mørket ute og lyset inne gjennom døgnet (0 = dag, 1 = natt). */
const darkness = (minuteOfDay: number): number =>
  keyframe(minuteOfDay, [
    [0, 1],
    [5 * 60, 1],
    [7 * 60 + 30, 0],
    [19 * 60, 0],
    [22 * 60, 1],
  ])

export function drawPlan(ctx: Ctx, cam: Camera, width: number, height: number, dpr: number, st: PlanDrawState): void {
  const { plan } = st
  const look = WARD_LOOKS[plan.wardType]
  const v = viewFor(cam, width, height)
  const dark = darkness(st.minuteOfDay)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.lineJoin = 'round'

  // Tomta rundt, gangstien fram til inngangen og noen busker
  ctx.fillStyle = blend('#B4CC9E', '#33414F', dark * 0.75)
  ctx.fillRect(0, 0, width, height)
  const c = plan.corridor
  poly(ctx, quad(v, -7, c.y + 0.35, 7, c.h - 0.7), blend('#D9D2C3', '#565C66', dark * 0.7))
  for (let i = 0; i < 12; i++) {
    const along = -3 + i * 4.6
    const [bx, by] = i % 2 === 0 ? P(v, along, plan.h + 1.6, 0) : P(v, -1.8, -2 + i * 1.4, 0)
    for (const [dx, dy, r, t] of [[0, 0, 0.5, 0], [-0.16, -0.2, 0.3, 0.14]] as const) {
      ctx.beginPath()
      ctx.arc(bx + dx * v.tw, by + dy * v.tw - v.tw * 0.2, r * v.tw, 0, Math.PI * 2)
      ctx.fillStyle = blend(lighten('#74A873', t), '#2C4742', dark * 0.75)
      ctx.fill()
    }
  }

  drawFloors(ctx, v, st, look)
  drawBackWalls(ctx, v, st, look, dark)

  if (st.selected) {
    const r = plan.byId[st.selected]
    if (r) poly(ctx, quad(v, r.x + 0.06, r.y + 0.06, r.w - 0.12, r.h - 0.12, 0.01), 'rgba(224,166,60,0.2)', '#E0A63C', Math.max(2, v.tw * 0.07))
  }
  const followed = st.followed ? st.figures.find((f) => f.key === st.followed) : null
  if (followed) {
    const [sx, sy] = P(v, followed.x, followed.y, 0)
    ctx.beginPath()
    ctx.ellipse(sx, sy, v.tw * 0.42, v.tw * 0.21, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(224,166,60,0.25)'
    ctx.fill()
    ctx.strokeStyle = '#E0A63C'
    ctx.lineWidth = Math.max(1.5, v.tw * 0.06)
    ctx.stroke()
  }

  const sc = new Scene(ctx, v)
  for (const room of plan.rooms) furnish(sc, room, plan.wardType, st)
  addWalls(sc, plan, look)
  addDoors(sc, st, look.doorColors)
  addFigures(sc, st)
  sc.flush()

  // Kveld og natt: mørkt ute og dempet inne, med varmt lys der noen er våkne.
  if (dark > 0.01) {
    ctx.fillStyle = `rgba(26,34,60,${0.44 * dark})`
    ctx.fillRect(0, 0, width, height)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const glow = (x: number, y: number, r: number, a: number) => {
      const [sx, sy] = P(v, x, y, 0.6)
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * v.tw)
      g.addColorStop(0, `rgba(255,214,150,${a * dark})`)
      g.addColorStop(1, 'rgba(255,214,150,0)')
      ctx.fillStyle = g
      ctx.fillRect(sx - r * v.tw, sy - r * v.tw, r * 2 * v.tw, r * 2 * v.tw)
    }
    glow(plan.byId.vaktrom.x + 2.2, plan.byId.vaktrom.y + 2.2, 2.6, 0.32)
    for (let x = 2; x < plan.builtW; x += 5) glow(x, c.y + c.h / 2, 1.8, 0.14)
    for (const f of st.figures) if (f.kind === 'beboer' && f.pose !== 'ligger' && f.room) glow(f.x, f.y, 1.5, 0.2)
    ctx.restore()
  }

  drawSigns(ctx, v, st)
}
