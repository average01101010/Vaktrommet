import type { WardTypeId } from '@/types'
import { drawFigure } from '../scene/character'
import { keyframe, mix, roundRect, type View } from '../scene/iso'
import { WARD_LOOKS } from '../scene/layout'
import { DOOR_W, type FloorPlan, type PlanRoom, type Pt } from './floorPlan'
import type { LampState, PlanFigure } from './planAgents'

/** Kameraet: verdenspunktet midt i bildet og piksler per enhet. */
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

const WALL = '#5E5850'
const WALL_FACE = '#EFE7D8'
const WOOD = '#C9A26B'
const WOOD_DARK = '#A9824F'
const WALL_H = 0.5

const FLOORS: Record<string, string> = {
  beboer: '#EBDDC4',
  vaktrom: '#DDE6E0',
  medisinrom: '#E3EAEE',
  kontor: '#E6DCC8',
  moterom: '#E2DDD0',
  kjokken: '#E4E6E3',
  spisestue: '#EADFC9',
  stue: '#E8DCC6',
}

export const toScreen = (cam: Camera, w: number, h: number, x: number, y: number): Pt => [(x - cam.x) * cam.u + w / 2, (y - cam.y) * cam.u + h / 2]
export const toWorld = (cam: Camera, w: number, h: number, sx: number, sy: number): Pt => [(sx - w / 2) / cam.u + cam.x, (sy - h / 2) / cam.u + cam.y]

type Ctx = CanvasRenderingContext2D

/** Tegnehjelper i verdenskoordinater. */
class Pen {
  constructor(
    readonly ctx: Ctx,
    readonly cam: Camera,
    readonly w: number,
    readonly h: number,
  ) {}
  p(x: number, y: number): Pt {
    return toScreen(this.cam, this.w, this.h, x, y)
  }
  rect(x: number, y: number, w: number, h: number, fill: string, r = 0, stroke?: string): void {
    const [sx, sy] = this.p(x, y)
    const u = this.cam.u
    roundRect(this.ctx, sx, sy, w * u, h * u, r * u)
    this.ctx.fillStyle = fill
    this.ctx.fill()
    if (stroke) {
      this.ctx.strokeStyle = stroke
      this.ctx.lineWidth = Math.max(0.6, u * 0.03)
      this.ctx.stroke()
    }
  }
  circle(x: number, y: number, r: number, fill: string): void {
    const [sx, sy] = this.p(x, y)
    this.ctx.beginPath()
    this.ctx.arc(sx, sy, r * this.cam.u, 0, Math.PI * 2)
    this.ctx.fillStyle = fill
    this.ctx.fill()
  }
  /** Møbel med en myk skygge under. */
  piece(x: number, y: number, w: number, h: number, fill: string, r = 0.08): void {
    this.rect(x + 0.05, y + 0.08, w, h, 'rgba(60,50,40,0.16)', r)
    this.rect(x, y, w, h, fill, r, 'rgba(60,50,40,0.28)')
  }
  text(x: number, y: number, text: string, size: number, color: string, weight = 700, align: CanvasTextAlign = 'center'): void {
    const [sx, sy] = this.p(x, y)
    this.ctx.font = `${weight} ${Math.round(size * this.cam.u * 10) / 10}px Inter, system-ui, sans-serif`
    this.ctx.textAlign = align
    this.ctx.textBaseline = 'middle'
    this.ctx.fillStyle = color
    this.ctx.fillText(text, sx, sy)
  }
}

/** Speiler romlokale mål for rom sør for korridoren, der døra er øverst. */
function local(room: PlanRoom) {
  const north = room.side === 'nord'
  // v: avstand fra døra og innover; d: tykkelse innover.
  return (u: number, v: number, w: number, d: number): [number, number, number, number] => [
    room.x + u,
    north ? room.y + room.h - v - d : room.y + v,
    w,
    d,
  ]
}

function chair(pen: Pen, x: number, y: number, color: string): void {
  pen.piece(x - 0.24, y - 0.24, 0.48, 0.48, color, 0.14)
}

function plant(pen: Pen, x: number, y: number): void {
  pen.circle(x + 0.03, y + 0.05, 0.24, 'rgba(60,50,40,0.16)')
  pen.circle(x, y, 0.2, '#B7714D')
  pen.circle(x, y, 0.16, '#4F8A62')
  pen.circle(x - 0.06, y - 0.05, 0.08, '#6FAE7E')
}

function furnish(pen: Pen, room: PlanRoom, ward: WardTypeId, st: PlanDrawState): void {
  const L = local(room)
  const { w, h } = room
  const fabric = ward === 'demens' ? '#C98B6B' : ward === 'lindrende' ? '#9A86A8' : '#7FA08C'
  switch (room.kind) {
    case 'beboer': {
      // Bad i hjørnet innerst
      pen.rect(...L(w - 1.05, h - 1.15, 0.95, 1.05), '#D9E6EA', 0.05, 'rgba(60,50,40,0.25)')
      pen.piece(...L(w - 0.5, h - 0.55, 0.3, 0.36), '#FFFFFF', 0.1)
      pen.piece(...L(w - 0.95, h - 0.45, 0.32, 0.26), '#FFFFFF', 0.08)
      // Seng: hodeenden mot veggen innerst
      const [bx, by, bw, bh] = L(0.28, h - 2.15, 0.95, 1.95)
      pen.piece(bx, by, bw, bh, '#F6F1E7', 0.1)
      const north = room.side === 'nord'
      pen.rect(bx + 0.06, north ? by + 0.65 : by + 0.06, bw - 0.12, bh - 0.71, mix(fabric, '#FFFFFF', 0.35), 0.08)
      pen.rect(bx + 0.16, north ? by + 0.12 : by + bh - 0.52, bw - 0.32, 0.4, '#FFFFFF', 0.1, 'rgba(60,50,40,0.18)')
      // Nattbord og lenestol
      pen.piece(...L(1.32, h - 0.62, 0.42, 0.42), WOOD, 0.05)
      const [cx, cy] = room.spots.stol
      chair(pen, cx, cy, fabric)
      // Noe personlig: en plante eller et bilde på veggen
      if ((room.bed ?? 0) % 3 !== 0) plant(pen, room.x + w - 0.35, north ? room.y + h - 0.4 : room.y + 0.4)
      break
    }
    case 'vaktrom': {
      pen.piece(...L(1.0, 2.15, 1.4, 0.95), WOOD, 0.12)
      for (const s of ['s1', 's2', 's3', 's4', 's5', 's6']) chair(pen, room.spots[s][0], room.spots[s][1], '#5E7F8F')
      pen.piece(...L(1.0, 2.15, 1.4, 0.95), WOOD, 0.12)
      // Korktavla ved døra – med lappene som henger der nå
      pen.piece(...L(w * 0.5 - 0.7, 0.12, 1.4, 0.2), '#B98A5A', 0.03)
      // PC-pult og kaffe
      pen.piece(...L(w - 1.45, h - 0.6, 1.25, 0.48), '#D8D2C6', 0.05)
      pen.rect(...L(w - 1.1, h - 0.55, 0.5, 0.14), '#2F3B44', 0.02)
      pen.piece(...L(0.25, h - 0.55, 1.0, 0.42), '#CFC8BA', 0.05)
      pen.circle(...(L(0.55, h - 0.36, 0, 0).slice(0, 2) as Pt), 0.1, '#3A2F28')
      break
    }
    case 'medisinrom': {
      pen.piece(...L(0.2, h - 0.6, w - 0.4, 0.45), '#F4F6F7', 0.04)
      for (let i = 0; i < 3; i++) pen.rect(...L(0.3 + i * ((w - 0.6) / 3), h - 0.55, (w - 0.75) / 3, 0.35), i === 1 ? '#C7DCE6' : '#E3EDF1', 0.03, 'rgba(60,50,40,0.2)')
      pen.piece(...L(0.2, 1.5, 0.5, 1.2), '#DCE3E6', 0.05)
      // Rødt kors
      const [kx, ky] = L(w * 0.5, h - 0.38, 0, 0)
      pen.rect(kx - 0.04, ky - 0.11, 0.08, 0.22, '#C65B52')
      pen.rect(kx - 0.11, ky - 0.04, 0.22, 0.08, '#C65B52')
      break
    }
    case 'kontor': {
      pen.piece(...L(w * 0.5 - 0.8, h - 1.05, 1.6, 0.6), WOOD, 0.06)
      pen.rect(...L(w * 0.5 - 0.25, h - 0.95, 0.5, 0.12), '#2F3B44', 0.02)
      chair(pen, room.spots.pult[0], room.spots.pult[1], '#4F6D5E')
      chair(pen, room.spots.gjest[0], room.spots.gjest[1], fabric)
      pen.piece(...L(0.15, h - 0.5, 0.7, 0.36), WOOD_DARK, 0.03)
      plant(pen, ...(L(w - 0.4, h - 0.45, 0, 0).slice(0, 2) as Pt))
      break
    }
    case 'moterom': {
      for (const s of ['s1', 's2', 's3', 's4']) chair(pen, room.spots[s][0], room.spots[s][1], '#6E7F96')
      pen.piece(...L(w * 0.5 - 0.5, 1.5, 1.0, 1.65), WOOD, 0.14)
      pen.piece(...L(w * 0.5 - 0.6, h - 0.3, 1.2, 0.16), '#FFFFFF', 0.02)
      break
    }
    case 'kjokken': {
      pen.piece(...L(0.15, h - 0.65, w - 0.3, 0.5), '#C9CED0', 0.04)
      pen.rect(...L(0.35, h - 0.58, 0.6, 0.36), '#3B4247', 0.04)
      for (const [a, b] of [[0.5, 0.5], [0.8, 0.5], [0.5, 0.28], [0.8, 0.28]]) pen.circle(...(L(a - 0.03, h - b - 0.02, 0, 0).slice(0, 2) as Pt), 0.07, '#6B747A')
      pen.rect(...L(1.3, h - 0.58, 0.7, 0.36), '#AEB7BC', 0.08, 'rgba(60,50,40,0.3)')
      pen.piece(...L(w - 0.8, h - 1.5, 0.62, 0.8), '#E8EBEC', 0.05)
      // Serveringstralle
      const [tx, ty] = room.spots.tralle
      pen.piece(tx - 0.3, ty - 0.22, 0.6, 0.44, '#B9C2C7', 0.05)
      pen.circle(tx - 0.12, ty, 0.08, '#F3EFE6')
      pen.circle(tx + 0.12, ty, 0.08, '#F3EFE6')
      break
    }
    case 'spisestue': {
      const seats = Object.entries(room.spots).filter(([k]) => k.startsWith('sete'))
      for (const [, [sx, sy]] of seats) chair(pen, sx, sy, fabric)
      const meal = st.minuteOfDay
      pen.piece(...L(0.55, 2.02, w - 1.1, 0.96), WOOD, 0.12)
      pen.rect(...L(w * 0.5 - 0.9, 2.36, 1.8, 0.28), '#E9E2CF', 0.05)
      // Dekket på til måltidene
      const dining = (meal >= 505 && meal < 575) || (meal >= 775 && meal < 845) || (meal >= 1105 && meal < 1160)
      if (dining) for (const [, [sx, sy]] of seats) pen.circle(sx, sy + (sy < room.y + room.h / 2 ? 0.42 : -0.42) * (room.side === 'nord' ? -1 : 1), 0.11, '#FFFFFF')
      plant(pen, room.x + w - 0.4, room.y + 0.4)
      break
    }
    case 'stue': {
      // Teppe, sofaer og TV innerst
      pen.rect(...L(0.6, 0.85, w - 1.2, 2.3), mix(fabric, '#F4EDE0', 0.72), 0.12)
      for (let row = 0; row < 2; row++) pen.piece(...L(0.55, 1.05 + row * 1.05, w - 1.1, 0.62), fabric, 0.16)
      pen.piece(...L(w * 0.5 - 0.75, h - 0.36, 1.5, 0.22), '#3A3F45', 0.03)
      const flicker = 0.6 + 0.4 * Math.sin(st.time * 2.3)
      pen.rect(...L(w * 0.5 - 0.62, h - 0.32, 1.24, 0.1), `rgba(140,190,230,${0.5 + 0.3 * flicker})`, 0.02)
      pen.piece(...L(0.2, h - 0.6, 0.45, 0.45), WOOD, 0.2)
      plant(pen, ...(L(w - 0.4, h - 0.4, 0, 0).slice(0, 2) as Pt))
      break
    }
    case 'tomt':
      break
  }
}

function drawRoomShell(pen: Pen, room: PlanRoom, look: (typeof WARD_LOOKS)[WardTypeId], st: PlanDrawState): void {
  const { ctx } = pen
  const u = pen.cam.u
  if (room.kind === 'tomt') {
    const [sx, sy] = pen.p(room.x + 0.12, room.y + 0.12)
    ctx.save()
    ctx.setLineDash([u * 0.22, u * 0.16])
    roundRect(ctx, sx, sy, (room.w - 0.24) * u, (room.h - 0.24) * u, u * 0.1)
    ctx.fillStyle = 'rgba(160,130,90,0.18)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(110,90,60,0.55)'
    ctx.lineWidth = Math.max(1, u * 0.05)
    ctx.stroke()
    ctx.restore()
    if (u > 13) {
      pen.text(room.x + room.w / 2, room.y + room.h / 2 - 0.25, `Rom ${room.bed}`, 0.34, 'rgba(90,72,48,0.8)')
      pen.text(room.x + room.w / 2, room.y + room.h / 2 + 0.25, 'Byggetomt', 0.26, 'rgba(90,72,48,0.65)', 600)
    }
    return
  }
  pen.rect(room.x, room.y, room.w, room.h, FLOORS[room.kind] ?? '#E8DDC8')
  // Veggen innerst sees litt ovenfra, som en lys stripe.
  const face = room.side === 'nord' ? mix(WALL_FACE, look.dado, 0.25) : mix(WALL_FACE, look.dado, 0.45)
  pen.rect(room.x, room.y, room.w, WALL_H, face)
  if (room.side === 'nord') {
    // Vindu i ytterveggen
    pen.rect(room.x + room.w * 0.5 - 0.5, room.y + 0.1, 1.0, 0.26, '#BFDDEA', 0.03, 'rgba(60,50,40,0.3)')
  } else {
    // Døråpningen i veggen mot korridoren
    pen.rect(room.door[0] - DOOR_W / 2, room.y, DOOR_W, WALL_H, mix(FLOORS[room.kind] ?? '#E8DDC8', '#000000', 0.22))
  }
  furnish(pen, room, st.plan.wardType, st)
}

function drawWalls(pen: Pen, plan: FloorPlan): void {
  const { ctx } = pen
  const u = pen.cam.u
  ctx.strokeStyle = WALL
  ctx.lineCap = 'square'
  ctx.lineWidth = Math.max(1.5, u * 0.13)
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const [a, b] = pen.p(x1, y1)
    const [c, d] = pen.p(x2, y2)
    ctx.beginPath()
    ctx.moveTo(a, b)
    ctx.lineTo(c, d)
    ctx.stroke()
  }
  for (const r of plan.rooms) {
    if (r.kind === 'tomt') continue
    const outer = r.side === 'nord' ? r.y : r.y + r.h
    line(r.x, outer, r.x + r.w, outer)
    line(r.x, r.y, r.x, r.y + r.h)
    line(r.x + r.w, r.y, r.x + r.w, r.y + r.h)
    // Veggen mot korridoren, med åpning for døra
    const dy = r.door[1]
    line(r.x, dy, r.door[0] - DOOR_W / 2, dy)
    line(r.door[0] + DOOR_W / 2, dy, r.x + r.w, dy)
  }
  // Østgavlen på korridoren og inngangspartiet i vest
  const c = plan.corridor
  line(plan.builtW, c.y, plan.builtW, c.y + c.h * 0.28)
  line(plan.builtW, c.y + c.h * 0.72, plan.builtW, c.y + c.h)
  line(0, c.y, 0, c.y + c.h * 0.22)
  line(0, c.y + c.h * 0.78, 0, c.y + c.h)
}

function drawDoorPlates(pen: Pen, st: PlanDrawState, lookDoors: string[] | null): void {
  const u = pen.cam.u
  for (const r of st.plan.rooms) {
    if (r.kind === 'tomt') continue
    const [dx, dy] = r.door
    const out = r.side === 'nord' ? 1 : -1
    // Dørblad som står åpent inn mot rommet
    const leaf = r.kind === 'beboer' && lookDoors ? lookDoors[((r.bed ?? 1) - 1) % lookDoors.length] : WOOD_DARK
    pen.rect(dx - DOOR_W / 2 - 0.05, r.side === 'nord' ? dy - 0.62 : dy + 0.04, 0.1, 0.58, leaf, 0.02)
    if (r.kind === 'beboer') {
      const lamp = st.lamps.get(r.id)
      const name = st.names[r.id]
      // Navneskilt på korridorsiden
      if (u > 15) {
        const label = name ? `${r.bed} ${name}` : `${r.bed} Ledig`
        pen.ctx.font = `700 ${0.27 * u}px Inter, system-ui, sans-serif`
        const tw = pen.ctx.measureText(label).width / u + 0.24
        pen.rect(dx - tw / 2, dy + out * 0.42 - 0.2, tw, 0.4, name ? '#FFFDF7' : '#EDE7DA', 0.1, 'rgba(60,50,40,0.3)')
        pen.text(dx, dy + out * 0.42 + 0.01, label, 0.27, name ? '#2B3A36' : '#8A8275')
      } else {
        pen.text(dx, dy + out * 0.36, String(r.bed), 0.36, '#4A443C', 800)
      }
      // Ringesnor: lampa over døra
      if (lamp) {
        const blink = lamp === 'ringer' ? 0.55 + 0.45 * Math.sin(st.time * 7) : 1
        const color = lamp === 'hos' ? '#4FAE7B' : '#E2574C'
        pen.circle(dx + DOOR_W / 2 + 0.22, dy - out * 0.02, 0.3 * blink, lamp === 'hos' ? 'rgba(79,174,123,0.28)' : 'rgba(226,87,76,0.3)')
        pen.circle(dx + DOOR_W / 2 + 0.22, dy - out * 0.02, 0.13, color)
      }
      // En sak på korktavla gjelder beboeren her
      if (st.flagged.has(r.id)) {
        const px = dx - DOOR_W / 2 - 0.42
        const py = dy - out * 0.34
        const bob = Math.sin(st.time * 2.4) * 0.04
        pen.rect(px - 0.2, py - 0.2 + bob, 0.4, 0.4, '#FBE38A', 0.04, 'rgba(120,90,20,0.5)')
        pen.text(px, py + 0.02 + bob, '!', 0.3, '#7A5A12', 900)
      }
    }
  }
}

const COMMON_ICON_COLOR = 'rgba(43,58,54,0.78)'

function drawFigures(pen: Pen, st: PlanDrawState): void {
  const { ctx } = pen
  const u = pen.cam.u
  const v = { s: u / 34 } as View
  const sorted = [...st.figures].sort((a, b) => a.y - b.y)
  for (const f of sorted) {
    const [sx, sy] = pen.p(f.x, f.y)
    if (sx < -60 || sy < -60 || sx > pen.w + 60 || sy > pen.h + 90) continue
    if (f.key === st.followed) {
      ctx.beginPath()
      ctx.ellipse(sx, sy, u * 0.5, u * 0.26, 0, 0, Math.PI * 2)
      ctx.strokeStyle = '#E0A63C'
      ctx.lineWidth = Math.max(1.5, u * 0.08)
      ctx.stroke()
    }
    if (f.pose === 'ligger') {
      // Under dyna: bare hodet på puta.
      const room = st.plan.byId[f.room ?? '']
      const up = room?.side === 'sor' ? 1 : -1
      pen.circle(f.x, f.y + up * 0.62, 0.17, f.style.skin)
      pen.circle(f.x, f.y + up * 0.7, 0.15, f.style.hair)
      continue
    }
    ctx.beginPath()
    ctx.ellipse(sx, sy, u * 0.26, u * 0.11, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(40,34,28,0.2)'
    ctx.fill()
    drawFigure(ctx, v, f.style, {
      sx,
      sy,
      flip: f.flip,
      away: false,
      sitting: f.pose === 'sitter',
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
  const pen = new Pen(ctx, cam, width, height)
  const u = cam.u
  const dark = darkness(st.minuteOfDay)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // Tomta rundt
  ctx.fillStyle = mix('#B9CFA3', '#3C4A58', dark * 0.75)
  ctx.fillRect(0, 0, width, height)
  // Gangsti fram til inngangen og bedet langs nordveggen
  pen.rect(-6, plan.corridor.y + 0.35, 6, plan.corridor.h - 0.7, mix('#D9D2C3', '#5A6068', dark * 0.7), 0.1)
  for (let i = 0; i < 9; i++) {
    const x = -4.5 + i * 5.3
    const y = i % 2 === 0 ? -1.5 : plan.h + 1.4
    pen.circle(x, y, 0.75, mix('#7FAE7A', '#2F4A45', dark * 0.75))
    pen.circle(x - 0.2, y - 0.2, 0.42, mix('#9CC592', '#3A5A50', dark * 0.75))
  }

  // Bygningskroppen: det som er bygd, og grunnmuren til det som kan komme
  pen.rect(-0.18, -0.18, plan.builtW + 0.36, plan.h + 0.36, 'rgba(40,34,28,0.28)', 0.08)
  pen.rect(0, 0, plan.builtW, plan.h, '#CFC6B4')
  // Korridoren med ledelinje
  const c = plan.corridor
  pen.rect(c.x, c.y, plan.builtW, c.h, look.lino)
  pen.rect(c.x, c.y + c.h / 2 - 0.03, plan.builtW, 0.06, look.linoEdge)
  pen.rect(c.x, c.y, plan.builtW, 0.34, mix(look.dado, WALL_FACE, 0.35))
  // Inngangsmatte
  pen.rect(0.15, c.y + c.h / 2 - 0.5, 0.9, 1.0, '#8E7B63', 0.06)

  for (const room of plan.rooms) drawRoomShell(pen, room, look, st)
  drawWalls(pen, plan)

  if (st.selected) {
    const r = plan.byId[st.selected]
    if (r) {
      const [sx, sy] = pen.p(r.x, r.y)
      roundRect(ctx, sx, sy, r.w * u, r.h * u, u * 0.06)
      ctx.fillStyle = 'rgba(224,166,60,0.18)'
      ctx.fill()
      ctx.strokeStyle = '#E0A63C'
      ctx.lineWidth = Math.max(2, u * 0.1)
      ctx.stroke()
    }
  }

  drawDoorPlates(pen, st, look.doorColors)

  // Romnavn på fellesrommene
  for (const r of plan.rooms) {
    if (r.kind === 'beboer' || r.kind === 'tomt') continue
    const ly = r.side === 'nord' ? r.y + WALL_H + 0.3 : r.y + r.h - 0.3
    ctx.font = `800 ${0.3 * u}px Inter, system-ui, sans-serif`
    const tw = ctx.measureText(r.label).width / u + 0.3
    pen.rect(r.x + r.w / 2 - tw / 2, ly - 0.23, tw, 0.46, 'rgba(255,253,247,0.86)', 0.12)
    pen.text(r.x + r.w / 2, ly + 0.01, r.label, 0.3, COMMON_ICON_COLOR, 800)
  }

  drawFigures(pen, st)

  // Kveld og natt: det blir mørkt ute og dempet inne, med lys i rommene der noen er våkne.
  if (dark > 0.01) {
    ctx.fillStyle = `rgba(28,36,62,${0.42 * dark})`
    ctx.fillRect(0, 0, width, height)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const glow = (x: number, y: number, r: number, a: number) => {
      const [sx, sy] = pen.p(x, y)
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * u)
      g.addColorStop(0, `rgba(255,214,150,${a * dark})`)
      g.addColorStop(1, 'rgba(255,214,150,0)')
      ctx.fillStyle = g
      ctx.fillRect(sx - r * u, sy - r * u, r * 2 * u, r * 2 * u)
    }
    glow(plan.byId.vaktrom.x + 2.2, plan.byId.vaktrom.y + 2.2, 3.2, 0.3)
    for (let x = 2; x < plan.builtW; x += 5) glow(x, c.y + c.h / 2, 2.2, 0.14)
    for (const f of st.figures) if (f.kind === 'beboer' && f.pose !== 'ligger' && f.room) glow(f.x, f.y, 1.8, 0.2)
    ctx.restore()
  }
}
