import { drawFigure } from '../scene/character'
import { lighting } from '../scene/draw'
import type { View } from '../scene/iso'
import { WARD_LOOKS, type WardLook } from '../scene/layout'
import { DOOR_W, type FloorPlan, type PlanRoom, type Pt } from './floorPlan'
import type { LampState, PlanFigure } from './planAgents'
import { blend, box, C, darken, faces, LOW, MID, onFloor, onPlaneX, onPlaneY, P, poly, quad, roundRect, Scene, T, tiles, WALL_H, type Ctx } from './planKit'
import { furnishCorridor, furnishRoom } from './planRooms'

/**
 * Avdelingskartet i 2.5D: et diorama i samme stil som vaktrommet. Bakveggene
 * (nord og vest) står i full høyde med vinduer og veggpynt; veggene foran er
 * skåret ned, så man ser inn i alle rom. Plan-x går ned mot høyre på skjermen,
 * plan-y ned mot venstre.
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
  /** Rom med en sak på korktavla. */
  flagged: ReadonlySet<string>
  /** Antall lapper på korktavla. */
  notes: number
  selected: string | null
  followed: string | null
}

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
  const wallPx = (WALL_H + 0.5) * 0.56
  const u = Math.min((w - 10) / (span / 2 + 0.3), (h - top - bottom - 6) / (span / 4 + wallPx + 0.25))
  const cam: Camera = { x: shownW / 2, y: plan.h / 2, u }
  // Bygget står midt i det ledige feltet: ned for merkelappene og for vegghøyden.
  panBy(cam, 0, (top - bottom) / 2 + (wallPx * u) / 2)
  return cam
}

/** z → avstand ned fra veggtoppen, i hundredeler (veggflatenes y-akse). */
const zc = (z: number) => (WALL_H - z) * 100

const GLASS_ROOMS = new Set(['vaktrom', 'kontor', 'moterom'])

// ---------------------------------------------------------------------------
// Skallet: plate, korridor og bakvegger
// ---------------------------------------------------------------------------

function drawSlab(ctx: Ctx, v: View, plan: FloorPlan, look: WardLook): void {
  // Myk skygge under dioramaet
  const [cx, cy] = P(v, plan.builtW / 2, plan.h / 2, -0.3)
  const r = v.tw * (plan.builtW + plan.h) * 0.3
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, 'rgba(28,37,38,0.2)')
  g.addColorStop(0.6, 'rgba(28,37,38,0.1)')
  g.addColorStop(1, 'rgba(28,37,38,0)')
  ctx.save()
  ctx.translate(cx, cy + v.tw * 0.5)
  ctx.scale(1, 0.5)
  ctx.translate(-cx, -cy)
  ctx.fillStyle = g
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.restore()

  // Byggetomter: stiplet omriss og stikker der neste rom kan komme
  for (const room of plan.rooms) {
    if (room.kind !== 'tomt') continue
    ctx.save()
    ctx.setLineDash([v.tw * 0.2, v.tw * 0.14])
    poly(ctx, quad(v, room.x + 0.14, room.y + 0.14, room.w - 0.28, room.h - 0.28, -0.2), 'rgba(201,157,107,0.16)', 'rgba(140,105,60,0.55)', Math.max(1, v.tw * 0.035))
    ctx.restore()
    for (const [px, py] of [[room.x + 0.14, room.y + 0.14], [room.x + room.w - 0.14, room.y + 0.14], [room.x + 0.14, room.y + room.h - 0.14], [room.x + room.w - 0.14, room.y + room.h - 0.14]]) {
      box(ctx, v, px - 0.03, py - 0.03, -0.2, 0.06, 0.06, 0.3, faces('#C99D6B'))
      box(ctx, v, px - 0.03, py - 0.03, 0.1, 0.06, 0.06, 0.06, faces('#D97736'))
    }
  }

  box(ctx, v, 0, 0, -0.22, plan.builtW, plan.h, 0.22, { top: '#C9A77C', left: '#9A7A52', right: '#86683F' })
  // Korridoren: linoleum med kantstriper og fliser
  const c = plan.corridor
  poly(ctx, quad(v, 0, c.y, plan.builtW, c.h), look.lino)
  onFloor(ctx, v, 0.002, () => {
    ctx.translate(0, c.y * 100)
    ctx.fillStyle = look.linoEdge
    ctx.fillRect(0, 0, plan.builtW * 100, 22)
    ctx.fillRect(0, c.h * 100 - 22, plan.builtW * 100, 22)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 22, plan.builtW * 100, c.h * 100 - 44)
    ctx.clip()
    tiles(93, 'rgba(30,77,64,0.08)')(ctx, plan.builtW * 100, c.h * 100)
    ctx.restore()
    // Dørmatte ved inngangen
    ctx.fillStyle = '#8E7B63'
    roundRect(ctx, 22, c.h * 50 - 55, 95, 110, 8)
    ctx.fill()
    ctx.strokeStyle = 'rgba(40,30,20,0.3)'
    ctx.lineWidth = 3
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(34 + i * 18, c.h * 50 - 44)
      ctx.lineTo(34 + i * 18, c.h * 50 + 44)
      ctx.stroke()
    }
  })
}

function drawBackWalls(sc: Scene, plan: FloorPlan, look: WardLook): void {
  const { ctx, v } = sc
  const c = plan.corridor
  // Nordveggen og vestgavlen, med tykkelse
  box(ctx, v, -T, -T, 0, plan.builtW + T, T, WALL_H, { top: C.wallTop, left: C.wall, right: '#D2C6B0' })
  box(ctx, v, -T, -T, 0, T, c.y + 0.3 + T, WALL_H, { top: C.wallTop, left: '#D2C6B0', right: C.wallSide })
  box(ctx, v, -T, c.y + c.h - 0.3, 0, T, plan.h - (c.y + c.h - 0.3), WALL_H, { top: C.wallTop, left: '#D2C6B0', right: C.wallSide })
  box(ctx, v, -T, c.y + 0.3, 1.95, T, c.h - 0.6, WALL_H - 1.95, { top: C.wallTop, left: '#D2C6B0', right: C.wallSide })

  onPlaneY(ctx, v, 0, WALL_H, () => {
    // Hvert rom har sin egen veggfarge over en felles fotlist
    for (const r of plan.rooms) {
      if (r.side !== 'nord' || r.kind === 'tomt') continue
      const tint = r.kind === 'kjokken' ? '#EEF1EC' : r.kind === 'beboer' ? ['#F7F0E3', '#F4EDE6', '#F1EEE2', '#F6ECDD'][(r.bed ?? 0) % 4] : blend('#F7F0E3', look.dado, 0.16)
      ctx.fillStyle = tint
      ctx.fillRect(r.x * 100, 0, r.w * 100, WALL_H * 100)
      if (r.kind === 'kjokken') {
        // Fliser over kjøkkenbenken
        ctx.fillStyle = '#DCE7E6'
        ctx.fillRect(r.x * 100 + 70, zc(1.4), r.w * 100 - 70, 52)
        ctx.strokeStyle = 'rgba(43,91,108,0.14)'
        ctx.lineWidth = 2
        for (let x = r.x * 100 + 70; x < (r.x + r.w) * 100; x += 26) ctx.strokeRect(x, zc(1.4), 26, 26)
      } else if (r.kind !== 'beboer') {
        ctx.fillStyle = look.dado
        ctx.fillRect(r.x * 100, zc(1.05), r.w * 100, 105)
        ctx.fillStyle = 'rgba(30,77,64,0.25)'
        ctx.fillRect(r.x * 100, zc(1.05), r.w * 100, 4)
      }
    }
    const gr = ctx.createLinearGradient(0, 0, 0, WALL_H * 100)
    gr.addColorStop(0, 'rgba(120,96,60,0.12)')
    gr.addColorStop(0.5, 'rgba(120,96,60,0)')
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, plan.builtW * 100, WALL_H * 100)
    ctx.fillStyle = '#C6B79C'
    ctx.fillRect(0, zc(0.11), plan.builtW * 100, 11)
  })
  onPlaneX(ctx, v, 0, WALL_H, () => {
    const gr = ctx.createLinearGradient(0, 0, 0, WALL_H * 100)
    gr.addColorStop(0, 'rgba(100,80,50,0.14)')
    gr.addColorStop(0.6, 'rgba(100,80,50,0.02)')
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, (c.y + 0.3) * 100, WALL_H * 100)
    ctx.fillRect((c.y + c.h - 0.3) * 100, 0, (plan.h - c.y - c.h + 0.3) * 100, WALL_H * 100)
    ctx.fillStyle = '#B9AA8E'
    ctx.fillRect(0, zc(0.11), (c.y + 0.3) * 100, 11)
    ctx.fillRect((c.y + c.h - 0.3) * 100, zc(0.11), (plan.h - c.y - c.h + 0.3) * 100, 11)
    // Karmen rundt inngangen
    ctx.strokeStyle = C.white
    ctx.lineWidth = 9
    ctx.strokeRect((c.y + 0.3) * 100, zc(1.95), (c.h - 0.6) * 100, 195)
  })
  for (const deco of sc.wallDecor) deco()
  sc.wallDecor.length = 0
}

// ---------------------------------------------------------------------------
// Vegger foran, dører og glass
// ---------------------------------------------------------------------------

/** En vegg med topplist, delt opp så figurer kan stå på begge sider. */
function wall(sc: Scene, x0: number, y0: number, x1: number, y1: number, h: number, color: string, cap: string | null): void {
  const alongX = Math.abs(x1 - x0) >= Math.abs(y1 - y0)
  if ((alongX ? x1 - x0 : y1 - y0) <= 0.01) return
  const c = { top: C.wallTop, left: color, right: darken(color, 0.1) }
  if (alongX) {
    sc.box(x0, y0 - T / 2, 0, x1 - x0, T, h, color, { colors: c, bias: -0.03 })
    if (cap) sc.box(x0, y0 - T / 2 - 0.02, h, x1 - x0, T + 0.04, 0.04, cap, { bias: -0.02 })
  } else {
    sc.box(x0 - T / 2, y0, 0, T, y1 - y0, h, color, { colors: c, bias: -0.03 })
    if (cap) sc.box(x0 - T / 2 - 0.02, y0, h, T + 0.04, y1 - y0, 0.04, cap, { bias: -0.02 })
  }
}

/** Skilleveggen mellom to nordrom: full høyde innerst, og skrår ned mot korridoren. */
function slopedPartition(sc: Scene, x: number, y0: number, y1: number, color: string): void {
  const { ctx, v } = sc
  const top = (y: number) => (y < y0 + 0.9 ? WALL_H : y < y0 + 2.5 ? WALL_H + ((LOW - WALL_H) * (y - y0 - 0.9)) / 1.6 : LOW)
  const n = 8
  for (let i = 0; i < n; i++) {
    const a = y0 + ((y1 - y0) * i) / n
    const b = y0 + ((y1 - y0) * (i + 1)) / n + 0.01
    sc.add(x + (a + b) / 2 - 0.03, () => {
      if (!sc.near(x, a, 1)) return
      poly(ctx, [P(v, x + T / 2, a, 0), P(v, x + T / 2, b, 0), P(v, x + T / 2, b, top(b)), P(v, x + T / 2, a, top(a))], darken(color, 0.1))
      poly(ctx, [P(v, x - T / 2, a, top(a)), P(v, x + T / 2, a, top(a)), P(v, x + T / 2, b, top(b)), P(v, x - T / 2, b, top(b))], C.wallTop)
    })
  }
}

/** Glass over brystningen, som mellom vaktrommet og korridoren. */
function glass(sc: Scene, x0: number, x1: number, y: number): void {
  if (x1 - x0 < 0.3) return
  const { ctx, v } = sc
  const top = 1.7
  const n = Math.max(1, Math.round((x1 - x0) / 0.85))
  for (let i = 0; i <= n; i++) {
    const px = x0 + ((x1 - x0) * i) / n
    sc.add(px + y - 0.01, () => sc.near(px, y, 1.4) && box(ctx, v, px - 0.025, y - 0.03, MID, 0.05, 0.06, top - MID, faces('#F7F5F0')))
    if (i === n) break
    const pw = (x1 - x0) / n
    sc.add(px + pw / 2 + y, () => {
      if (!sc.near(px, y, 1.4)) return
      const pts = [P(v, px, y, MID), P(v, px + pw, y, MID), P(v, px + pw, y, top), P(v, px, y, top)]
      poly(ctx, pts, 'rgba(210,232,240,0.24)')
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1])
      ctx.clip()
      onPlaneY(ctx, v, y, top, () => {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 5
        ctx.beginPath()
        for (const o of [18, 34]) {
          ctx.moveTo(px * 100 + o + 26, 6)
          ctx.lineTo(px * 100 + o, (top - MID) * 100 - 6)
        }
        ctx.stroke()
      })
      ctx.restore()
      box(ctx, v, px, y - 0.03, top, pw, 0.06, 0.05, faces('#F7F5F0'))
    })
  }
}

function addWalls(sc: Scene, plan: FloorPlan, look: WardLook): void {
  const cream = '#F1E9DA'
  const dado = blend(look.dado, '#F1E9DA', 0.15)
  const c = plan.corridor
  for (const r of plan.rooms) {
    if (r.kind === 'tomt') continue
    const [dx, dy] = r.door
    const a = dx - DOOR_W / 2 - 0.05
    const b = dx + DOOR_W / 2 + 0.05
    if (r.side === 'nord') {
      // Lav vegg mot korridoren, med håndlist
      wall(sc, r.x, dy, a, dy, LOW, dado, C.oak)
      wall(sc, b, dy, r.x + r.w, dy, LOW, dado, C.oak)
      if (r.x > 0) slopedPartition(sc, r.x, r.y, r.y + r.h, cream)
    } else {
      const common = r.kind !== 'beboer'
      const color = common ? C.tealDark : cream
      wall(sc, r.x, dy, a, dy, MID, color, common ? '#F7F5F0' : C.oak)
      wall(sc, b, dy, r.x + r.w, dy, MID, color, common ? '#F7F5F0' : C.oak)
      if (GLASS_ROOMS.has(r.kind)) {
        glass(sc, r.x + 0.06, a, dy)
        glass(sc, b, r.x + r.w - 0.06, dy)
      }
      if (r.x > 0) wall(sc, r.x, r.y, r.x, r.y + r.h, MID, cream, null)
      // Ytterveggen foran er skåret helt ned
      wall(sc, r.x, r.y + r.h - T / 2, r.x + r.w, r.y + r.h - T / 2, 0.2, cream, null)
    }
  }
  // Østgavlen
  wall(sc, plan.builtW - T / 2, 0, plan.builtW - T / 2, c.y + 0.35, LOW, cream, null)
  wall(sc, plan.builtW - T / 2, c.y + c.h - 0.35, plan.builtW - T / 2, plan.h, LOW, cream, null)
}

/** Høyden på veggen mot korridoren, og punktet der ringesnorlampa sitter ved siden av døra. */
const corridorWallH = (r: PlanRoom): number => (r.side === 'nord' ? LOW : MID)
const lampAt = (r: PlanRoom): [number, number, number] => [r.door[0] + DOOR_W / 2 + 0.2, r.door[1], corridorWallH(r) + 0.1]

function addDoors(sc: Scene, plan: FloorPlan, look: WardLook): void {
  const { ctx, v } = sc
  for (const r of plan.rooms) {
    if (r.kind === 'tomt') continue
    const [dx, dy] = r.door
    const h = corridorWallH(r)
    const frame = faces('#F4EEE2')
    // Karm i veggens høyde på hver side av åpningen
    for (const px of [dx - DOOR_W / 2 - 0.07, dx + DOOR_W / 2 + 0.01]) {
      sc.add(px + dy - 0.01, () => sc.near(px, dy, 0.5) && box(ctx, v, px, dy - 0.08, 0, 0.06, 0.16, h + 0.07, frame))
    }
    if (r.kind === 'beboer') {
      // Romnummer på veggen ved døra, og sokkelen til ringesnorlampa oppå veggen
      const px = dx + DOOR_W / 2 + 0.1
      sc.add(px + 0.1 + dy + T / 2 + 0.05, () => {
        if (!sc.near(px, dy, 0.5)) return
        box(ctx, v, px, dy + T / 2, h - 0.36, 0.22, 0.015, 0.24, { top: C.skog, left: C.skog, right: C.skog })
        onPlaneY(ctx, v, dy + T / 2 + 0.016, h - 0.12, () => {
          ctx.fillStyle = '#FFFFFF'
          ctx.font = '800 17px Inter, system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(r.bed), (px + 0.11) * 100, 12.5)
        })
        const [lx, ly] = lampAt(r)
        box(ctx, v, lx - 0.05, ly - 0.05, h + 0.03, 0.1, 0.1, 0.04, faces('#CFC8BA'))
      })
    }
    // Dørbladet står åpent inn i rommet, skåret i samme høyde som veggen
    const leaf = r.kind === 'beboer' && look.doorColors ? look.doorColors[((r.bed ?? 1) - 1) % look.doorColors.length] : '#C99D6B'
    const ly = r.side === 'nord' ? dy - 0.88 : dy + 0.08
    sc.box(dx - DOOR_W / 2 - 0.04, ly, 0, 0.05, 0.8, h, leaf, {
      whole: true,
      bias: -0.1,
      side: (cx, w, hh) => {
        cx.strokeStyle = 'rgba(90,55,25,0.3)'
        cx.lineWidth = 2.5
        cx.strokeRect(8, 8, w - 16, hh - 12)
        cx.fillStyle = '#E9C46A'
        cx.fillRect(r.side === 'nord' ? 10 : w - 18, hh * 0.3, 8, 16)
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Figurer, lamper og lys
// ---------------------------------------------------------------------------

const figureDepth = (f: PlanFigure): number => f.x + f.y + (f.pose === 'ligger' ? 0.45 : f.pose === 'sitter' ? 0.12 : 0.03)

function drawOneFigure(ctx: Ctx, v: View, f: PlanFigure, time: number): void {
  if (f.pose === 'ligger') {
    // Under dyna: en kul i senga og hodet på puta.
    const [hx, hy] = P(v, f.x, f.y - 0.62, 0.6)
    ctx.beginPath()
    ctx.arc(hx, hy - v.tw * 0.035, v.tw * 0.125, 0, Math.PI * 2)
    ctx.fillStyle = f.style.hair
    ctx.fill()
    ctx.beginPath()
    ctx.arc(hx + v.tw * 0.015, hy + v.tw * 0.02, v.tw * 0.105, 0, Math.PI * 2)
    ctx.fillStyle = f.style.skin
    ctx.fill()
    return
  }
  const sitting = f.pose === 'sitter'
  const [sx, sy] = P(v, f.x, f.y, sitting ? 0.42 : 0)
  if (!sitting) {
    const [fx, fy] = P(v, f.x, f.y, 0)
    ctx.beginPath()
    ctx.ellipse(fx, fy, v.tw * 0.2, v.tw * 0.09, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(28,37,38,0.18)'
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
    time,
    alpha: 1,
    tired: f.kind === 'ansatt' && f.stress > 70,
    hurry: 0,
    carry: null,
    aid: f.aid,
    anim: null,
  })
}

function drawPendants(sc: Scene): void {
  const { ctx, v, L } = sc
  for (const p of sc.pendants) {
    if (!sc.near(p.x, p.y, 2)) continue
    const [tx, ty] = P(v, p.x, p.y, WALL_H + 0.35)
    const [lx, ly] = P(v, p.x, p.y, 2.05)
    ctx.strokeStyle = 'rgba(28,37,38,0.45)'
    ctx.lineWidth = 1 * v.s
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(lx, ly - 6 * v.s)
    ctx.stroke()
    ctx.fillStyle = '#55595A'
    roundRect(ctx, lx - 2 * v.s, ly - 7 * v.s, 4 * v.s, 4 * v.s, 1 * v.s)
    ctx.fill()
    const lit = L.lamp * p.on
    ctx.fillStyle = lit > 0.05 ? blend('#F1F1EA', '#FFF6DC', lit) : '#F1F1EA'
    ctx.beginPath()
    ctx.arc(lx, ly, 3.6 * v.s, 0, Math.PI * 2)
    ctx.fill()
    if (lit > 0.05) {
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 16 * v.s)
      g.addColorStop(0, `rgba(255,236,196,${0.55 * lit})`)
      g.addColorStop(1, 'rgba(255,236,196,0)')
      ctx.fillStyle = g
      ctx.fillRect(lx - 16 * v.s, ly - 16 * v.s, 32 * v.s, 32 * v.s)
    }
  }
}

/** Lyslaget tegnes i lav oppløsning – det er bare myke overganger. */
const LIGHT_SCALE = 0.3

/** Mørket om kvelden og natta, med hull og varmt skjær der lampene lyser. */
function applyLighting(sc: Scene, canvas: HTMLCanvasElement, lc: Ctx): void {
  const { ctx, v, L } = sc
  if (L.dark < 0.01 && L.warm < 0.01) return
  const q = LIGHT_SCALE
  const lw = Math.max(1, Math.ceil(v.width * q))
  const lh = Math.max(1, Math.ceil(v.height * q))
  if (canvas.width !== lw || canvas.height !== lh) {
    canvas.width = lw
    canvas.height = lh
  }
  lc.setTransform(q, 0, 0, q, 0, 0)
  lc.globalCompositeOperation = 'source-over'
  lc.clearRect(0, 0, v.width, v.height)
  lc.fillStyle = `rgba(14,22,48,${L.dark * 0.92})`
  lc.fillRect(0, 0, v.width, v.height)
  const spot = (cx: number, cy: number, r: number, squash: number, strength: number, col: string) => {
    if (strength <= 0.01) return
    lc.save()
    lc.translate(cx, cy)
    lc.scale(1, squash)
    const g = lc.createRadialGradient(0, 0, 0, 0, 0, r)
    g.addColorStop(0, `rgba(${col},${strength})`)
    g.addColorStop(0.55, `rgba(${col},${strength * 0.55})`)
    g.addColorStop(1, `rgba(${col},0)`)
    lc.fillStyle = g
    lc.fillRect(-r, -r, r * 2, r * 2)
    lc.restore()
  }
  // Skjær hull i mørket der lampene lyser
  lc.globalCompositeOperation = 'destination-out'
  for (const p of sc.pendants) {
    if (!sc.near(p.x, p.y, 1)) continue
    const power = L.lamp * 0.8 * p.on
    const [fx, fy] = P(v, p.x, p.y, 0)
    spot(fx, fy, v.tw * 2.4, 0.55, power, '0,0,0')
    const [hx, hy] = P(v, p.x, p.y, 1.4)
    spot(hx, hy, v.tw * 1.7, 1, power * 0.6, '0,0,0')
  }
  for (const l of sc.lamps) {
    if (!sc.near(l.x, l.y, l.z)) continue
    const [ex, ey] = P(v, l.x, l.y, l.z)
    spot(ex, ey, v.tw * l.r, 0.8, L.lamp * l.power, '0,0,0')
  }
  // Varm kveldstone og lysskjær fra lampene
  lc.globalCompositeOperation = 'source-over'
  if (L.warm > 0.01) {
    lc.fillStyle = `rgba(255,150,70,${L.warm * 0.1})`
    lc.fillRect(0, 0, v.width, v.height)
  }
  if (L.lamp > 0.01) {
    for (const p of sc.pendants) {
      if (!sc.near(p.x, p.y, 0.4)) continue
      const [gx, gy] = P(v, p.x, p.y, 0.4)
      spot(gx, gy, v.tw * 2.1, 1, 0.16 * L.lamp * p.on, '255,222,170')
    }
    for (const l of sc.lamps) {
      if (!sc.near(l.x, l.y, l.z)) continue
      const [gx, gy] = P(v, l.x, l.y, l.z)
      spot(gx, gy, v.tw * l.r * 0.9, 1, 0.28 * L.lamp * l.power, l.warm ? '255,196,120' : '200,228,255')
    }
  }
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, 0, 0, lw, lh, 0, 0, lw / q, lh / q)
  ctx.restore()
}

/** Ringesnorer og lapper: det spilleren skal legge merke til, tegnet oppå alt annet. */
function drawSignals(sc: Scene, st: PlanDrawState): void {
  const { ctx, v } = sc
  for (const r of st.plan.rooms) {
    if (r.kind !== 'beboer') continue
    const [lx, ly] = P(v, ...lampAt(r))
    const lamp = st.lamps.get(r.id)
    const rr = Math.max(2, v.tw * 0.055)
    ctx.beginPath()
    ctx.arc(lx, ly, rr, 0, Math.PI * 2)
    ctx.fillStyle = lamp ? '#FFFFFF' : '#E9E4D8'
    ctx.fill()
    if (lamp) {
      // Som varsellampa over pasientdørene i vaktrommet: prikk, ring og glød
      const col = lamp === 'hos' ? '79,174,123' : lamp === 'paa-vei' ? '233,170,60' : '226,71,60'
      const pulse = lamp === 'ringer' ? 0.5 + 0.5 * Math.sin(st.time * 6) : 0.6
      const big = Math.max(11, v.tw * 0.42)
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, big * 1.9)
      g.addColorStop(0, `rgba(${col},${0.42 + 0.2 * pulse})`)
      g.addColorStop(1, `rgba(${col},0)`)
      ctx.fillStyle = g
      ctx.fillRect(lx - big * 2, ly - big * 2, big * 4, big * 4)
      ctx.beginPath()
      ctx.arc(lx, ly, big * (0.62 + 0.22 * pulse), 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${col},0.85)`
      ctx.lineWidth = Math.max(1.5, v.tw * 0.045)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(lx, ly, big * 0.26, 0, Math.PI * 2)
      ctx.fillStyle = `rgb(${col})`
      ctx.fill()
    }
    if (st.flagged.has(r.id)) {
      const [px, py] = P(v, r.x + r.w / 2, r.y + r.h / 2, 1.7 + Math.sin(st.time * 2.4) * 0.07)
      const s = Math.max(15, v.tw * 0.6)
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(-0.08)
      ctx.fillStyle = 'rgba(28,37,38,0.22)'
      ctx.fillRect(-s / 2 + 2, -s / 2 + 3, s, s)
      ctx.fillStyle = '#FBE38A'
      ctx.fillRect(-s / 2, -s / 2, s, s)
      ctx.fillStyle = '#C2453B'
      ctx.beginPath()
      ctx.arc(0, -s * 0.36, s * 0.09, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(90,65,10,0.6)'
      for (let i = 0; i < 3; i++) ctx.fillRect(-s * 0.3, -s * 0.12 + i * s * 0.18, s * (0.6 - i * 0.12), s * 0.07)
      ctx.restore()
    }
  }
}

/**
 * En tegneflate som kan byttes ut under møblene. Scenen bygges én gang og
 * tegnes både til mellomlageret og, i utsnitt, til masken rundt hver figur.
 */
function switchable(): { ctx: Ctx; use: (target: Ctx) => void } {
  let target!: Ctx
  const bound = new WeakMap<object, Map<PropertyKey, unknown>>()
  const ctx = new Proxy({} as Ctx, {
    get(_, key) {
      const value = (target as unknown as Record<PropertyKey, unknown>)[key]
      if (typeof value !== 'function') return value
      let fns = bound.get(target)
      if (!fns) bound.set(target, (fns = new Map()))
      let fn = fns.get(key)
      if (!fn) fns.set(key, (fn = (value as (...args: unknown[]) => unknown).bind(target)))
      return fn
    },
    set(_, key, value) {
      ;(target as unknown as Record<PropertyKey, unknown>)[key] = value
      return true
    },
  })
  return { ctx, use: (t) => (target = t) }
}

/** Oppløsningstrinn for mellomlageret (piksler per enhet). */
const CACHE_STEPS = [36, 56, 84, 120, 150]

const mealNow = (m: number): boolean => (m >= 505 && m < 575) || (m >= 775 && m < 845) || (m >= 1105 && m < 1160)

/**
 * Tegner avdelingskartet. Alt som står stille – gulv, vegger, møbler – tegnes
 * til et mellomlager og kopieres derfra hvert bilde. Figurene tegnes oppå, og
 * møblene som står foran dem brukes som maske, så de fortsatt går bak ting.
 */
export class PlanRenderer {
  private readonly cache = document.createElement('canvas')
  private readonly cctx = this.cache.getContext('2d')!
  private readonly scratch = document.createElement('canvas')
  private readonly sctx = this.scratch.getContext('2d')!
  private readonly light = document.createElement('canvas')
  private readonly lctx = this.light.getContext('2d')!
  private readonly pen = switchable()
  private readonly view = {} as View
  private cacheView = {} as View
  private sc: Scene | null = null
  private key = ''
  private step = 0
  private stepAt = 0

  private build(plan: FloorPlan, st: PlanDrawState, uc: number, bucketMinute: number): void {
    const ward = plan.wardType
    const look = WARD_LOOKS[ward]
    const cv: View = {
      tw: uc,
      th: uc / 2,
      zh: uc * 0.56,
      s: uc / 50,
      ox: ((plan.h + 1.2) * uc) / 2,
      oy: (WALL_H + 0.9) * 0.56 * uc,
      width: Math.ceil(((plan.w + plan.h + 2.4) * uc) / 2),
      height: Math.ceil((WALL_H + 0.9) * 0.56 * uc + ((plan.w + plan.h) * uc) / 4 + 0.6 * uc),
    }
    this.cacheView = cv
    this.cache.width = cv.width
    this.cache.height = cv.height
    this.pen.use(this.cctx)
    Object.assign(this.view, cv)
    const ctx = this.pen.ctx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cv.width, cv.height)
    ctx.lineJoin = 'round'
    const sc = new Scene(ctx, this.view, st.time, lighting(bucketMinute, look))
    drawSlab(ctx, this.view, plan, look)
    for (const room of plan.rooms) {
      const before = sc.pendants.length
      furnishRoom(sc, room, { ward, minuteOfDay: bucketMinute, notes: st.notes })
      for (let i = before; i < sc.pendants.length; i++) sc.pendants[i].room = room.id
    }
    const c = plan.corridor
    furnishCorridor(sc, plan.builtW, c.y, c.h, ward, plan.rooms.filter((r) => r.kind !== 'tomt').map((r) => r.door[0]))
    drawBackWalls(sc, plan, look)
    addWalls(sc, plan, look)
    addDoors(sc, plan, look)
    sc.flush()
    this.sc = sc
  }

  draw(ctx: Ctx, cam: Camera, width: number, height: number, dpr: number, st: PlanDrawState): void {
    const { plan } = st
    const look = WARD_LOOKS[plan.wardType]
    const now = performance.now()
    // Oppløsningen følger zoomen, men bygges først om når zoomen har roet seg.
    const wanted = CACHE_STEPS.find((s) => s >= cam.u * dpr * 0.92) ?? CACHE_STEPS[CACHE_STEPS.length - 1]
    if (wanted !== this.step && (this.step === 0 || now - this.stepAt > 260)) this.step = wanted
    if (wanted === this.step) this.stepAt = now
    // Himmelen i vinduene, klokka og dekketøyet følger tida i grove trinn.
    const bucket = Math.floor(st.minuteOfDay / 30)
    const key = `${plan.wardType}|${plan.beds}|${this.step}|${bucket}|${mealNow(st.minuteOfDay)}|${st.notes}`
    if (key !== this.key || !this.sc) {
      this.key = key
      this.build(plan, st, this.step, st.minuteOfDay)
    }
    const sc = this.sc!
    const cv = this.cacheView
    const lv = viewFor(cam, width, height)
    const k = lv.tw / cv.tw

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(this.cache, lv.ox - cv.ox * k, lv.oy - cv.oy * k, cv.width * k, cv.height * k)

    // Resten tegnes direkte, i kameraets utsnitt
    this.pen.use(ctx)
    Object.assign(this.view, lv)
    const v = this.view
    sc.time = st.time
    sc.L = lighting(st.minuteOfDay, look)
    sc.mask = null
    sc.margin = 2.2
    ctx.lineJoin = 'round'

    if (st.selected) {
      const r = plan.byId[st.selected]
      if (r && r.kind !== 'tomt') poly(ctx, quad(v, r.x + 0.08, r.y + 0.08, r.w - 0.16, r.h - 0.16, 0.006), 'rgba(224,166,60,0.16)', '#E0A63C', Math.max(2, v.tw * 0.07))
    }
    const followed = st.followed ? st.figures.find((f) => f.key === st.followed) : null
    if (followed) {
      const [sx, sy] = P(v, followed.x, followed.y, 0.006)
      ctx.beginPath()
      ctx.ellipse(sx, sy, v.tw * 0.42, v.tw * 0.21, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(224,166,60,0.28)'
      ctx.fill()
      ctx.strokeStyle = '#E0A63C'
      ctx.lineWidth = Math.max(1.5, v.tw * 0.06)
      ctx.stroke()
    }

    this.drawFigures(ctx, sc, st, dpr)
    this.pen.use(ctx)
    sc.mask = null
    sc.margin = 2.2
    for (const live of sc.live) live()

    // Hvem er hvor: avgjør hvilke lamper som er tent om kvelden
    const asleep = new Set<string>()
    const occupied = new Set<string>()
    for (const f of st.figures) {
      if (!f.room) continue
      if (f.pose === 'ligger') asleep.add(f.room)
      else occupied.add(f.room)
    }
    for (const p of sc.pendants) {
      const id = p.room
      // Korridoren er dempet om natta, vaktrommet lyser, og det er mørkt der noen sover eller ingen er.
      p.on = id === 'vaktrom' ? 1 : !id ? 1 - 0.4 * sc.L.night : asleep.has(id) && !occupied.has(id) ? 0.08 : sc.L.night > 0.5 && !occupied.has(id) ? 0.2 : 1
    }
    drawPendants(sc)
    applyLighting(sc, this.light, this.lctx)
    drawSignals(sc, st)
  }

  /** Figurene, bakfra og fram. Hver tegnes for seg og får møblene foran seg skåret ut. */
  private drawFigures(ctx: Ctx, sc: Scene, st: PlanDrawState, dpr: number): void {
    const v = this.view
    const bw = Math.ceil(v.tw * 1.7)
    const bh = Math.ceil(v.tw * 2.3)
    const sw = Math.ceil(bw * dpr)
    const sh = Math.ceil(bh * dpr)
    if (this.scratch.width < sw || this.scratch.height < sh) {
      this.scratch.width = sw
      this.scratch.height = sh
    }
    const figures = [...st.figures].sort((a, b) => figureDepth(a) - figureDepth(b))
    sc.margin = 1.1
    for (const f of figures) {
      const [fx, fy] = P(v, f.x, f.y, 0)
      const bx = Math.round(fx - bw / 2)
      const by = Math.round(fy - bh + v.tw * 0.45)
      if (bx > v.width || by > v.height || bx + bw < 0 || by + bh < 0) continue
      const s = this.sctx
      s.setTransform(1, 0, 0, 1, 0, 0)
      s.globalCompositeOperation = 'source-over'
      s.clearRect(0, 0, sw, sh)
      s.setTransform(dpr, 0, 0, dpr, -bx * dpr, -by * dpr)
      this.pen.use(s)
      drawOneFigure(this.pen.ctx, v, f, st.time)
      // Alt som står foran figuren visker den ut der det dekker
      s.globalCompositeOperation = 'destination-out'
      sc.mask = { x: bx, y: by, w: bw, h: bh }
      sc.drawInFront(figureDepth(f), f.x, f.y)
      s.globalCompositeOperation = 'source-over'
      ctx.drawImage(this.scratch, 0, 0, sw, sh, bx, by, bw, bh)
    }
  }
}
