import type { WardTypeId } from '@/types'
import type { PlanRoom } from './floorPlan'
import {
  armchair, bed, binders, blend, box, C, cabinet, chair, checker, counter, darken, doorFronts, drawerFronts, drawPicture, drawWindow,
  faces, floorLamp, fruitBowl, lighten, monitor, mug, officeChair, onPlaneX, onPlaneY, papers, planks, plant, poly, quad, roundRect, rug,
  sofa, steam, table, tableLamp, tiles, WALL_H, type Ctx, type Deco, type Scene,
} from './planKit'

/**
 * Innredningen av hvert rom på avdelingskartet. Hvert rom tegner gulvet sitt
 * med en gang, legger veggdekor i kø til bakveggene er reist, og setter
 * møblene inn i scenen så de sorteres sammen med figurene.
 *
 * Mål er romlokale: a langs korridoren (øst), b fra nordveggen og sørover.
 */
export interface RoomContext {
  ward: WardTypeId
  minuteOfDay: number
  /** Lapper på korktavla i vaktrommet. */
  notes: number
}

/** z → avstand ned fra veggtoppen, i hundredeler (veggflatenes y-akse). */
const zc = (z: number) => (WALL_H - z) * 100

const FABRIC: Record<WardTypeId, string> = {
  sykehjem: '#7FA08C',
  demens: '#C98B6B',
  korttid: '#6F97B0',
  bofellesskap: '#D9A441',
  lindrende: '#9A86A8',
}

const DUVETS = ['#8FB3A2', '#C9A0A8', '#9DB4CF', '#D8B878', '#B3A2C9', '#A9C29B', '#D49B7E']
const RUGS: [string, string][] = [
  ['#C8DAD9', 'rgba(43,91,108,0.35)'],
  ['#E6CFC0', 'rgba(150,70,50,0.35)'],
  ['#D9D3E6', 'rgba(110,90,130,0.35)'],
  ['#E9DDB4', 'rgba(150,110,30,0.35)'],
  ['#CFE0C8', 'rgba(60,110,70,0.35)'],
]

function fillFloor(sc: Scene, r: PlanRoom, base: string, pattern: Deco): void {
  poly(sc.ctx, quad(sc.v, r.x, r.y, r.w, r.h), base)
  sc.floor(r.x, r.y, r.w, r.h, pattern)
}

/** Vindu i nordveggen (planet y = 0). */
function northWindow(sc: Scene, x0: number, w: number, curtain?: string): void {
  sc.wallDecor.push(() => onPlaneY(sc.ctx, sc.v, 0, WALL_H, () => drawWindow(sc.ctx, sc.L, sc.time, x0 * 100, zc(1.95), w * 100, 100, curtain)))
  sc.box(x0 - 0.1, 0, 0.9, w + 0.2, 0.12, 0.05, C.white, { whole: true, bias: -1 })
}

function northPicture(sc: Scene, x: number, z: number, w: number, h: number, motif: number): void {
  sc.wallDecor.push(() => onPlaneY(sc.ctx, sc.v, 0, WALL_H, () => drawPicture(sc.ctx, x * 100, zc(z + h), w * 100, h * 100, motif)))
}

/** Veggklokke som viser spilltiden. */
function drawClock(ctx: Ctx, cx: number, cy: number, r: number, minuteOfDay: number): void {
  ctx.fillStyle = C.blekk
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = C.papir
  ctx.beginPath()
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = C.blekk
  ctx.lineCap = 'round'
  const hand = (turn: number, len: number, lw: number) => {
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.sin(turn * Math.PI * 2) * len, cy - Math.cos(turn * Math.PI * 2) * len)
    ctx.stroke()
  }
  hand((minuteOfDay % 720) / 720, r * 0.5, 3)
  hand((minuteOfDay % 60) / 60, r * 0.75, 2)
}

// ---------------------------------------------------------------------------
// Beboerrom
// ---------------------------------------------------------------------------

function residentRoom(sc: Scene, r: PlanRoom, ctx: RoomContext): void {
  const X = r.x
  const Y = r.y
  const bedNo = r.bed ?? 1
  const north = r.side === 'nord'
  const fabric = FABRIC[ctx.ward]
  const duvet = DUVETS[bedNo % DUVETS.length]
  const [rugFill, rugBorder] = RUGS[bedNo % RUGS.length]
  fillFloor(sc, r, '#D9B98C', planks())

  // Badet i hjørnet: fliser, toalett og vask bak en halvvegg
  const by = north ? 0 : 2.9
  poly(sc.ctx, quad(sc.v, X + 1.72, Y + by, 1.08, 1.3, 0.002), '#D3E3E8')
  sc.floor(X + 1.72, Y + by, 1.08, 1.3, tiles(36, 'rgba(43,91,108,0.16)'))
  sc.box(X + 1.72, Y + (north ? 0 : 2.9), 0, 0.07, north ? 1.3 : 0.75, 1.0, C.wallSide, { whole: true })
  if (north) {
    // Vask med speil på nordveggen, toalett ved siden av
    sc.box(X + 1.9, Y + 0.02, 0.62, 0.4, 0.3, 0.14, '#FFFFFF', { whole: true })
    sc.wallDecor.push(() =>
      onPlaneY(sc.ctx, sc.v, 0, WALL_H, () => {
        const c = sc.ctx
        c.fillStyle = '#F4EEE2'
        roundRect(c, (X + 1.92) * 100, zc(1.75), 36, 62, 5)
        c.fill()
        c.fillStyle = '#BFDDE6'
        roundRect(c, (X + 1.92) * 100 + 4, zc(1.75) + 4, 28, 54, 3)
        c.fill()
        c.fillStyle = 'rgba(255,255,255,0.6)'
        c.fillRect((X + 1.92) * 100 + 8, zc(1.75) + 8, 5, 30)
        // Håndkle på knagg
        c.fillStyle = duvet
        roundRect(c, (X + 2.45) * 100, zc(1.5), 20, 52, 4)
        c.fill()
      }),
    )
    sc.box(X + 2.38, Y + 0.08, 0, 0.32, 0.18, 0.72, '#FBFBF7', { whole: true })
    sc.box(X + 2.36, Y + 0.26, 0, 0.36, 0.42, 0.38, '#FFFFFF', { whole: true })
  } else {
    sc.box(X + 2.4, Y + 3.3, 0, 0.32, 0.18, 0.72, '#FBFBF7', { whole: true })
    sc.box(X + 2.38, Y + 3.48, 0, 0.36, 0.42, 0.38, '#FFFFFF', { whole: true })
    sc.box(X + 1.86, Y + 3.0, 0.62, 0.4, 0.3, 0.14, '#FFFFFF', { whole: true })
    sc.box(X + 2.0, Y + 3.05, 0, 0.12, 0.12, 0.62, '#E3E7E8', { whole: true })
  }

  // Seng med hodegavlen mot nord, nattbord med lampe og et bilde av familien
  const bedY = Y + (north ? 0.35 : 0.8)
  bed(sc, X + 0.2, bedY, duvet)
  sc.box(X + 1.25, bedY - 0.02, 0, 0.4, 0.4, 0.5, C.oak, { whole: true, front: drawerFronts(2) })
  tableLamp(sc, X + 1.38, bedY + 0.12, 0.5)
  mug(sc, X + 1.5, bedY + 0.22, 0.5, bedNo % 2 ? '#C2566A' : '#2B5B6C', 0.08)

  // Teppe midt på gulvet
  sc.floor(X, Y, r.w, r.h, (c) => rug(c, 118, north ? 250 : 190, 140, 100, rugFill, rugBorder))

  // Lenestol med en bok eller kaffekopp ved siden av
  const [sx, sy] = r.spots.stol
  armchair(sc, sx, sy, 's', fabric, bedNo % 2 ? '#E9C46A' : '#F1E3C4')
  sc.box(sx - 0.72, sy - 0.12, 0, 0.3, 0.3, 0.44, C.oakDark, { whole: true })
  mug(sc, sx - 0.64, sy - 0.02, 0.44, '#F7F5F0', 0.09)

  if (north) {
    northWindow(sc, X + 0.38, 1.05, bedNo % 3 === 0 ? '#D9C9E0' : bedNo % 3 === 1 ? '#E7C9AE' : '#C9DCCF')
    // Kommode ved veggen mot korridoren, med bilder og en plante
    sc.box(X + 0.15, Y + 3.1, 0, 0.42, 0.8, 0.7, C.oak, { whole: true, side: drawerFronts(3) })
    plant(sc, X + 0.36, Y + 3.3, 0.7, 0.7, bedNo % 2 ? '#E9897A' : null)
    sc.box(X + 0.3, Y + 3.62, 0.7, 0.05, 0.2, 0.22, '#9A7650', { whole: true })
    northPicture(sc, X + 1.5, 1.3, 0.2, 0.26, bedNo)
  } else {
    // Kommode langs veggen mot naboen
    sc.box(X + 0.1, Y + 3.0, 0, 0.42, 0.9, 0.7, C.oak, { whole: true, side: drawerFronts(3) })
    plant(sc, X + 0.3, Y + 3.2, 0.7, 0.7, bedNo % 2 ? '#E9C46A' : null)
    sc.box(X + 0.26, Y + 3.56, 0.7, 0.05, 0.22, 0.24, '#9A7650', { whole: true })
    // Garderobeknagger og en rullator-plass ved døra
    sc.box(X + 2.3, Y + 0.1, 0, 0.42, 0.34, 0.86, C.oakDark, { whole: true, front: doorFronts(1, 'rgba(60,40,20,0.4)') })
  }
  sc.pendants.push({ x: X + 1.35, y: Y + 2.1, on: 1 })
}

// ---------------------------------------------------------------------------
// Fellesrom i nord
// ---------------------------------------------------------------------------

function kitchen(sc: Scene, r: PlanRoom): void {
  const X = r.x
  const Y = r.y
  fillFloor(sc, r, '#E9EBE6', checker(60, 'rgba(120,140,135,0.28)'))
  // Kjøleskap i hjørnet
  sc.box(X + 0.1, Y + 0.06, 0, 0.62, 0.6, 1.85, '#E3E7E8', {
    whole: true,
    front: (c, w, h) => {
      c.strokeStyle = 'rgba(28,37,38,0.25)'
      c.lineWidth = 2.5
      c.strokeRect(4, 4, w - 8, h * 0.36)
      c.strokeRect(4, h * 0.36 + 8, w - 8, h * 0.64 - 12)
      c.fillStyle = '#8F999C'
      c.fillRect(w - 14, h * 0.2, 5, 22)
      c.fillRect(w - 14, h * 0.44, 5, 34)
      c.fillStyle = '#FBE38A'
      c.fillRect(12, h * 0.46, 14, 14)
      c.fillStyle = '#F9BFCC'
      c.fillRect(30, h * 0.5, 12, 12)
    },
  })
  // Benk langs nordveggen: vask, komfyr med kjeler og overskap
  counter(sc, X + 0.74, Y + 0.06, 2.54, 0.58, 's', C.teal, C.birch, (c, w, h) => {
    c.fillStyle = '#C5CCCF'
    roundRect(c, 26, 12, 62, h - 24, 6)
    c.fill()
    c.fillStyle = '#9FA9AE'
    roundRect(c, 32, 17, 50, h - 34, 4)
    c.fill()
    c.fillStyle = '#2A2D2E'
    roundRect(c, w - 96, 9, 84, h - 18, 5)
    c.fill()
    c.strokeStyle = '#7C8589'
    c.lineWidth = 2.5
    for (const [px, py] of [[w - 74, h * 0.34], [w - 34, h * 0.34], [w - 74, h * 0.7], [w - 34, h * 0.7]]) {
      c.beginPath()
      c.arc(px, py, 9, 0, Math.PI * 2)
      c.stroke()
    }
  })
  sc.box(X + 2.5, Y + 0.14, 0.89, 0.26, 0.26, 0.16, '#C65B52', { whole: true, bias: 0.05 })
  sc.box(X + 2.9, Y + 0.3, 0.89, 0.22, 0.22, 0.1, '#55595A', { whole: true, bias: 0.05 })
  steam(sc, X + 2.63, Y + 0.27, 1.1, 0.9)
  sc.box(X + 1.08, Y + 0.1, 0.89, 0.04, 0.04, 0.22, '#8F999C', { whole: true, bias: 0.05 })
  // Overskap og avtrekkshette
  sc.box(X + 0.74, Y + 0.02, 1.4, 1.5, 0.34, 0.6, C.birch, { front: doorFronts(3, 'rgba(120,80,40,0.35)', '#8A6A45'), bias: 0.3 })
  sc.box(X + 2.42, Y + 0.02, 1.5, 0.82, 0.46, 0.22, '#C5CCCF', { whole: true, bias: 0.3 })
  // Vindu i gavlveggen, hylle med kopper og en benk med kaffe og frukt
  sc.wallDecor.push(() => onPlaneX(sc.ctx, sc.v, 0, WALL_H, () => drawWindow(sc.ctx, sc.L, sc.time, (Y + 2.2) * 100, zc(1.95), 110, 100, '#E9D9A8')))
  sc.box(X, Y + 0.9, 1.52, 0.2, 1.1, 0.045, C.oak, { whole: true, bias: -0.5 })
  for (let i = 0; i < 4; i++) mug(sc, X + 0.04, Y + 0.98 + i * 0.26, 1.565, ['#D97736', '#2B5B6C', '#F7F5F0', '#E9C46A'][i], 0.11)
  counter(sc, X + 0.02, Y + 0.95, 0.56, 2.5, 'e')
  // Kaffetrakter og fruktfat
  sc.box(X + 0.14, Y + 1.3, 0.89, 0.3, 0.34, 0.1, '#55595A', { whole: true, bias: 0.06 })
  sc.box(X + 0.14, Y + 1.3, 0.99, 0.12, 0.34, 0.3, '#484C4D', { whole: true, bias: 0.07 })
  sc.box(X + 0.26, Y + 1.36, 0.99, 0.17, 0.22, 0.17, '#6B4526', { whole: true, bias: 0.08 })
  sc.box(X + 0.14, Y + 1.3, 1.29, 0.3, 0.34, 0.06, '#66696A', { whole: true, bias: 0.09 })
  steam(sc, X + 0.34, Y + 1.47, 1.2, 0.6)
  fruitBowl(sc, X + 0.3, Y + 2.9, 0.89)
  // Brødfjøl
  sc.box(X + 0.12, Y + 2.2, 0.89, 0.34, 0.22, 0.03, '#C9A26B', { whole: true, bias: 0.06 })
  sc.box(X + 0.18, Y + 2.24, 0.92, 0.2, 0.12, 0.1, '#B98450', { whole: true, bias: 0.07 })

  // Serveringstralle med mugger og tallerkener
  const [tx, ty] = r.spots.tralle
  const { ctx, v } = sc
  sc.add(tx + ty + 0.05, () => {
    if (!sc.near(tx, ty)) return
    const steelC = { top: '#D5DADB', left: '#B9C1C4', right: '#A7B0B3' }
    for (const [lx, ly] of [[tx - 0.32, ty - 0.22], [tx + 0.27, ty - 0.22], [tx - 0.32, ty + 0.17], [tx + 0.27, ty + 0.17]]) box(ctx, v, lx, ly, 0, 0.05, 0.05, 0.78, steelC)
    box(ctx, v, tx - 0.33, ty - 0.23, 0.26, 0.66, 0.46, 0.04, steelC)
    box(ctx, v, tx - 0.33, ty - 0.23, 0.74, 0.66, 0.46, 0.04, steelC)
    box(ctx, v, tx - 0.22, ty - 0.12, 0.78, 0.16, 0.16, 0.2, faces('#D9A441'))
    for (let i = 0; i < 3; i++) box(ctx, v, tx + 0.02 + i * 0.09, ty - 0.02, 0.78, 0.07, 0.07, 0.08, faces('#F7F5F0'))
    box(ctx, v, tx - 0.2, ty + 0.02, 0.3, 0.4, 0.16, 0.08, faces('#F4EEE2'))
  })
  plant(sc, X + 3.1, Y + 3.7, 0.9)
  sc.pendants.push({ x: X + 1.9, y: Y + 2.0, on: 1 })
}

function diningRoom(sc: Scene, r: PlanRoom, ctx: RoomContext): void {
  const X = r.x
  const Y = r.y
  const fabric = FABRIC[ctx.ward]
  fillFloor(sc, r, '#DDBE90', planks())
  sc.floor(X, Y, r.w, r.h, (c) => rug(c, 30, 130, 420, 230, '#E4D7BC', 'rgba(150,110,60,0.28)'))
  northWindow(sc, X + 0.45, 1.2, '#E7C9AE')
  northWindow(sc, X + 3.15, 1.2, '#E7C9AE')
  northPicture(sc, X + 2.05, 1.25, 0.7, 0.5, 0)
  // Skjenk med mugge, glass og blomster
  cabinet(sc, X + 1.85, Y + 0.06, 1.1, 0.42, 0.78, C.oak, 's', doorFronts(2, 'rgba(90,60,30,0.3)', '#7A5A38'))
  sc.box(X + 2.0, Y + 0.16, 0.78, 0.14, 0.14, 0.24, '#BFDDE6', { whole: true, bias: 0.1 })
  for (let i = 0; i < 3; i++) mug(sc, X + 2.25 + i * 0.12, Y + 0.2, 0.78, '#E8F1F3', 0.07)
  plant(sc, X + 2.75, Y + 0.26, 0.6, 0.78, '#E9897A')

  // Langbordet: sju stoler på hver side
  const seats = Object.entries(r.spots).filter(([k]) => k.startsWith('sete'))
  for (const [, [sx, sy]] of seats) chair(sc, sx, sy, sy < Y + 2.4 ? 'n' : 's', fabric, '#7A5A38')
  const m = ctx.minuteOfDay
  const dining = (m >= 505 && m < 575) || (m >= 775 && m < 845) || (m >= 1105 && m < 1160)
  table(sc, X + 0.55, Y + 1.95, 3.7, 0.92, '#C99D6B', '#8A6A45', (c, w, h) => {
    // Løper midt på bordet
    c.fillStyle = '#E9E2CF'
    c.fillRect(20, h / 2 - 13, w - 40, 26)
    c.fillStyle = 'rgba(150,110,60,0.25)'
    c.fillRect(20, h / 2 - 13, w - 40, 3)
    c.fillRect(20, h / 2 + 10, w - 40, 3)
    if (dining) {
      // Dekket på: tallerken og glass til hver plass
      for (let i = 0; i < 7; i++) {
        const px = 30 + i * 52
        for (const py of [17, h - 17]) {
          c.fillStyle = '#FFFFFF'
          c.beginPath()
          c.arc(px, py, 11, 0, Math.PI * 2)
          c.fill()
          c.fillStyle = i % 2 ? '#E0B36A' : '#C98B5B'
          c.beginPath()
          c.arc(px, py, 6, 0, Math.PI * 2)
          c.fill()
          c.fillStyle = '#BFDDE6'
          c.beginPath()
          c.arc(px + 16, py, 4, 0, Math.PI * 2)
          c.fill()
        }
      }
    }
  })
  plant(sc, X + 2.4, Y + 2.4, 0.5, 0.77, '#D9534F')
  if (dining) {
    sc.box(X + 1.2, Y + 2.32, 0.77, 0.18, 0.18, 0.16, '#D9A441', { whole: true, bias: 0.1 })
    sc.box(X + 3.4, Y + 2.32, 0.77, 0.2, 0.2, 0.1, '#F4EEE2', { whole: true, bias: 0.1 })
    steam(sc, X + 3.5, Y + 2.42, 0.95, 0.7)
  }
  plant(sc, X + 4.45, Y + 0.4, 1.1)
  floorLamp(sc, X + 0.3, Y + 0.4)
  sc.pendants.push({ x: X + 1.5, y: Y + 2.4, on: 1 }, { x: X + 3.3, y: Y + 2.4, on: 1 })
}

function lounge(sc: Scene, r: PlanRoom, ctx: RoomContext): void {
  const X = r.x
  const Y = r.y
  const fabric = FABRIC[ctx.ward]
  fillFloor(sc, r, '#D9B98C', planks())
  sc.floor(X, Y, r.w, r.h, (c) => rug(c, 110, 120, 290, 220, lighten(fabric, 0.55), 'rgba(40,70,60,0.3)'))
  // Bokhylle, vindu og TV-benk langs nordveggen
  cabinet(sc, X + 0.12, Y + 0.06, 0.9, 0.36, 1.75, C.oak, 's', (c, w, h) => {
    c.fillStyle = 'rgba(60,40,20,0.35)'
    for (let i = 1; i < 4; i++) c.fillRect(6, (h * i) / 4 - 3, w - 12, 5)
    const cols = ['#2B5B6C', '#D97736', '#1E4D40', '#E9C46A', '#B4432F', '#7A6A8C', '#F7F5F0']
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 9; i++) {
        if ((row * 3 + i) % 5 === 4) continue
        c.fillStyle = cols[(row * 2 + i) % cols.length]
        const bh = 26 + ((i * 7 + row * 3) % 10)
        c.fillRect(9 + i * 8.6, (h * (row + 1)) / 4 - 3 - bh, 7, bh)
      }
  })
  northWindow(sc, X + 1.35, 1.3, lighten(fabric, 0.4))
  cabinet(sc, X + 3.0, Y + 0.08, 1.25, 0.42, 0.44, C.oakDark, 's', drawerFronts(1, 2))
  const flicker = 0.6 + 0.4 * Math.sin(sc.time * 2.3) * Math.sin(sc.time * 0.7)
  sc.box(X + 3.12, Y + 0.22, 0.44, 1.0, 0.07, 0.6, '#23292A', {
    whole: true,
    bias: 0.1,
    front: (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, blend('#6FA7D0', '#E9C46A', 0.2 + 0.3 * flicker))
      g.addColorStop(1, blend('#2B5B6C', '#6FA287', flicker))
      c.fillStyle = g
      c.fillRect(4, 4, w - 8, h - 8)
      c.fillStyle = 'rgba(255,255,255,0.35)'
      c.beginPath()
      c.arc(w * 0.32, h * 0.42, 9, 0, Math.PI * 2)
      c.fill()
      c.fillRect(w * 0.5, h * 0.7, w * 0.36, 4)
    },
  })
  sc.lamps.push({ x: X + 3.6, y: Y + 0.9, z: 0.7, r: 1.4, power: 0.5 * (0.7 + 0.3 * flicker), warm: false })
  // Sofa langs veggen mot spisestua, lenestoler under vinduet og en puff
  sofa(sc, X + 0.15, Y + 1.4, 1.8, 'e', fabric)
  armchair(sc, r.spots.sete4[0], r.spots.sete4[1], 's', darken(fabric, 0.12), '#E9C46A')
  armchair(sc, r.spots.sete5[0], r.spots.sete5[1], 's', darken(fabric, 0.12), '#F1E3C4')
  sc.box(r.spots.sete6[0] - 0.26, r.spots.sete6[1] - 0.26, 0, 0.52, 0.52, 0.4, lighten(fabric, 0.1), { whole: true, bias: -0.05 })
  // Sofabord med aviser, kaffekopper og kortstokk
  table(sc, X + 1.55, Y + 1.85, 1.1, 0.7, C.oak, '#8A6A45', papers(1), 0.42)
  mug(sc, X + 1.72, Y + 1.98, 0.49, '#D97736', 0.09)
  mug(sc, X + 2.36, Y + 2.3, 0.49, '#2B5B6C', 0.09)
  floorLamp(sc, X + 0.42, Y + 3.65)
  plant(sc, X + 4.05, Y + 3.6, 1.2)
  // Strikkekurv
  sc.box(X + 1.15, Y + 3.3, 0, 0.34, 0.34, 0.22, '#C9A26B', { whole: true })
  sc.box(X + 1.2, Y + 3.35, 0.22, 0.14, 0.14, 0.12, '#C2566A', { whole: true, bias: 0.1 })
  sc.box(X + 1.32, Y + 3.44, 0.22, 0.13, 0.13, 0.1, '#6FA7D0', { whole: true, bias: 0.11 })
  sc.pendants.push({ x: X + 2.2, y: Y + 2.3, on: 1 })
}

// ---------------------------------------------------------------------------
// Fellesrom i sør
// ---------------------------------------------------------------------------

function dutyRoom(sc: Scene, r: PlanRoom, ctx: RoomContext): void {
  const X = r.x
  const Y = r.y
  fillFloor(sc, r, '#D9B98C', planks())
  sc.floor(X, Y, r.w, r.h, (c) => rug(c, 105, 125, 250, 190, '#C8DAD9', 'rgba(43,91,108,0.35)'))
  // Gavlveggen: korktavle med dagens lapper, vaktliste og klokke
  sc.wallDecor.push(() =>
    onPlaneX(sc.ctx, sc.v, 0, WALL_H, () => {
      const c = sc.ctx
      const x0 = (Y + 0.45) * 100
      const top = zc(1.95)
      c.fillStyle = '#9A7650'
      roundRect(c, x0 - 6, top - 6, 152, 102, 5)
      c.fill()
      c.fillStyle = '#C99D6B'
      c.fillRect(x0, top, 140, 90)
      const cols = ['#FBE38A', '#F9BFCC', '#C3E6CB', '#BFE0EE', '#FBE38A', '#F9BFCC']
      const n = Math.min(6, Math.max(1, ctx.notes))
      for (let i = 0; i < n; i++) {
        const nx = x0 + 10 + (i % 3) * 44
        const ny = top + 8 + Math.floor(i / 3) * 42
        c.save()
        c.translate(nx + 15, ny + 15)
        c.rotate(((i * 37) % 9) * 0.02 - 0.08)
        c.fillStyle = cols[i]
        c.fillRect(-15, -15, 30, 30)
        c.fillStyle = 'rgba(28,37,38,0.3)'
        for (let l = 0; l < 3; l++) c.fillRect(-10, -7 + l * 7, 20 - l * 4, 2.5)
        c.fillStyle = '#C2453B'
        c.beginPath()
        c.arc(0, -11, 3, 0, Math.PI * 2)
        c.fill()
        c.restore()
      }
      // Vaktliste
      const vx = (Y + 2.3) * 100
      c.fillStyle = '#FBF8F1'
      roundRect(c, vx, top - 4, 120, 96, 4)
      c.fill()
      c.fillStyle = C.skog
      c.fillRect(vx, top - 4, 120, 16)
      for (let col = 0; col < 3; col++)
        for (let row = 0; row < 5; row++) {
          c.fillStyle = ['#D97736', '#B4612A', '#2B5B6C'][col]
          c.beginPath()
          c.arc(vx + 14 + col * 38, top + 24 + row * 13, 3.5, 0, Math.PI * 2)
          c.fill()
          c.fillStyle = 'rgba(28,37,38,0.25)'
          c.fillRect(vx + 21 + col * 38, top + 22.5 + row * 13, 20, 3)
        }
      drawClock(c, (Y + 3.85) * 100, zc(1.85), 17, ctx.minuteOfDay)
    }),
  )
  // Skjenk med permer og radio under korktavla
  cabinet(sc, X + 0.04, Y + 0.45, 0.44, 1.5, 0.68, C.oak, 'e', doorFronts(2, 'rgba(90,60,30,0.3)', '#7A5A38'))
  binders(sc, X + 0.08, Y + 0.55, 0.68, 6, 'y')
  sc.box(X + 0.12, Y + 1.4, 0.68, 0.18, 0.34, 0.18, '#E8D2AC', { whole: true, bias: 0.1 })
  plant(sc, X + 0.26, Y + 1.82, 0.6, 0.68)
  // PC-plassen
  sc.box(X + 0.04, Y + 2.5, 0, 0.6, 1.4, 0.72, C.birch, { side: drawerFronts(1, 2, 'rgba(120,90,50,0.28)') })
  monitor(sc, X + 0.22, Y + 3.15, 0.72, 'e')
  sc.box(X + 0.4, Y + 2.95, 0.72, 0.15, 0.5, 0.02, '#EDEBE5', { whole: true, bias: 0.1 })
  mug(sc, X + 0.36, Y + 2.62, 0.72, '#2B5B6C')
  officeChair(sc, r.spots.pc[0], r.spots.pc[1], 'e')
  // Rapportbordet
  for (const [s, back] of [['s1', 'n'], ['s2', 'n'], ['s3', 's'], ['s4', 's'], ['s5', 'w'], ['s6', 'e']] as const) chair(sc, r.spots[s][0], r.spots[s][1], back)
  table(sc, X + 1.5, Y + 1.72, 1.6, 1.0, '#B98B5E', '#8A6A45', papers())
  sc.box(X + 2.5, Y + 1.9, 0.77, 0.3, 0.22, 0.05, '#3F6F8F', { whole: true, bias: 0.12 })
  mug(sc, X + 1.72, Y + 1.86, 0.77, '#F7F5F0', 0.09)
  mug(sc, X + 2.2, Y + 2.42, 0.77, '#D97736', 0.09)
  // Kaffekroken ved veggen mot korridoren
  counter(sc, X + 2.95, Y + 0.08, 1.3, 0.52, 's')
  sc.box(X + 3.1, Y + 0.16, 0.89, 0.36, 0.36, 0.38, C.steel, { whole: true, bias: 0.08 })
  sc.box(X + 3.1, Y + 0.16, 1.27, 0.36, 0.36, 0.05, C.rav, { whole: true, bias: 0.09 })
  steam(sc, X + 3.3, Y + 0.5, 1.05)
  for (let i = 0; i < 3; i++) mug(sc, X + 3.62 + i * 0.16, Y + 0.24, 0.89, ['#F7F5F0', '#2B5B6C', '#E9C46A'][i], 0.1)
  fruitBowl(sc, X + 3.95, Y + 0.46, 0.89)
  plant(sc, X + 4.05, Y + 3.75, 1.1)
  sc.pendants.push({ x: X + 2.3, y: Y + 2.2, on: 1 })
}

function medicineRoom(sc: Scene, r: PlanRoom): void {
  const X = r.x
  const Y = r.y
  fillFloor(sc, r, '#DCE7EC', tiles(60, 'rgba(43,91,108,0.12)'))
  // Medisinskap med glassdører og grønt kors
  sc.box(X + 1.72, Y + 0.08, 0, 0.6, 0.4, 1.6, C.white, {
    whole: true,
    front: (c, w, h) => {
      c.strokeStyle = 'rgba(28,37,38,0.18)'
      c.lineWidth = 2.5
      c.strokeRect(5, 6, w / 2 - 7, h * 0.56)
      c.strokeRect(w / 2 + 2, 6, w / 2 - 7, h * 0.56)
      c.strokeRect(5, h * 0.6, w - 10, h * 0.36)
      c.fillStyle = 'rgba(160,205,215,0.55)'
      c.fillRect(8, 9, w / 2 - 13, h * 0.56 - 6)
      c.fillRect(w / 2 + 5, 9, w / 2 - 13, h * 0.56 - 6)
      const cols = ['#D97736', '#2B5B6C', '#F7F5F0', '#B4432F', '#1E4D40']
      for (let i = 0; i < 8; i++) {
        c.fillStyle = cols[i % 5]
        c.fillRect(10 + (i % 4) * 12 + (i % 4 > 1 ? 6 : 0), 22 + Math.floor(i / 4) * 30, 7, 12)
      }
      c.fillStyle = '#2E8B62'
      c.fillRect(w / 2 - 5, h * 0.68, 10, 30)
      c.fillRect(w / 2 - 15, h * 0.68 + 10, 30, 10)
    },
  })
  // Arbeidsbenk med dosetter, vekt og vask
  sc.box(X + 0.06, Y + 0.85, 0, 0.56, 2.2, 0.86, '#EEF2F3', { side: drawerFronts(2, 4, 'rgba(43,91,108,0.25)', 'rgba(43,91,108,0.5)') })
  sc.box(X + 0.04, Y + 0.83, 0.86, 0.6, 2.24, 0.04, '#C5CCCF', { bias: 0.01 })
  const dos = ['#E9C46A', '#6FA7D0', '#C2566A', '#6FA287']
  for (let i = 0; i < 4; i++) sc.box(X + 0.14, Y + 1.0 + i * 0.2, 0.9, 0.34, 0.14, 0.05, dos[i], { whole: true, bias: 0.08 })
  sc.box(X + 0.16, Y + 2.0, 0.9, 0.3, 0.3, 0.05, '#55595A', { whole: true, bias: 0.08 })
  sc.box(X + 0.14, Y + 2.5, 0.9, 0.36, 0.4, 0.02, '#9FA9AE', { whole: true, bias: 0.08 })
  // Kjøleskap for kjølevarer
  sc.box(X + 0.06, Y + 3.2, 0, 0.56, 0.6, 0.86, '#FBFBF7', {
    whole: true,
    side: (c, w, h) => {
      c.strokeStyle = 'rgba(28,37,38,0.2)'
      c.lineWidth = 2.5
      c.strokeRect(5, 5, w - 10, h - 10)
      c.fillStyle = '#4A90C2'
      c.fillRect(w / 2 - 4, 18, 8, 24)
      c.fillRect(w / 2 - 12, 26, 24, 8)
    },
  })
  // Medisintralle
  const { ctx, v } = sc
  const tx = X + 1.55
  const ty = Y + 2.7
  sc.add(tx + ty + 0.3, () => {
    if (!sc.near(tx, ty)) return
    box(ctx, v, tx - 0.28, ty - 0.2, 0.08, 0.56, 0.4, 0.78, faces('#EEF2F3'))
    onPlaneY(ctx, v, ty + 0.2, 0.86, () => {
      ctx.translate((tx - 0.28) * 100, 0)
      drawerFronts(4, 1, 'rgba(43,91,108,0.3)', 'rgba(217,119,54,0.9)')(ctx, 56, 78)
    })
    box(ctx, v, tx - 0.3, ty - 0.22, 0.86, 0.6, 0.44, 0.03, faces('#C5CCCF'))
    box(ctx, v, tx - 0.18, ty - 0.1, 0.89, 0.14, 0.2, 0.09, faces('#F7F5F0'))
    box(ctx, v, tx + 0.04, ty - 0.08, 0.89, 0.12, 0.12, 0.12, faces('#D97736'))
  })
  // Avfallsboks for brukte sprøyter
  sc.box(X + 2.0, Y + 3.5, 0, 0.26, 0.26, 0.36, '#E9C46A', { whole: true })
  sc.pendants.push({ x: X + 1.2, y: Y + 2.1, on: 1 })
}

function office(sc: Scene, r: PlanRoom, ctx: RoomContext): void {
  const X = r.x
  const Y = r.y
  fillFloor(sc, r, '#D9B98C', planks())
  sc.floor(X, Y, r.w, r.h, (c) => rug(c, 70, 140, 200, 215, '#D9D3E6', 'rgba(110,90,130,0.32)'))
  // Arkivskap ved korridorveggen og reol med permer
  cabinet(sc, X + 2.15, Y + 0.08, 0.6, 0.42, 1.15, '#B9C2C7', 's', drawerFronts(3, 1, 'rgba(28,37,38,0.28)', 'rgba(28,37,38,0.6)'))
  plant(sc, X + 2.45, Y + 0.3, 0.6, 1.15)
  cabinet(sc, X + 0.05, Y + 0.9, 0.36, 1.5, 0.95, C.oak, 'e', (c, w, h) => {
    c.fillStyle = 'rgba(60,40,20,0.35)'
    c.fillRect(5, h / 2 - 3, w - 10, 5)
    const cols = ['#2B5B6C', '#D97736', '#1E4D40', '#E9C46A', '#B4432F', '#7A6A8C']
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 12; i++) {
        c.fillStyle = cols[(i + row * 2) % cols.length]
        c.fillRect(8 + i * 11.2, row * (h / 2) + 8, 9.5, h / 2 - 13)
      }
  })
  binders(sc, X + 0.09, Y + 1.0, 0.95, 4, 'y')
  // Skrivebord med skjerm, tastatur, telefon og papirbunker
  table(sc, X + 0.9, Y + 2.25, 1.55, 0.7, C.birch, '#B79A6C', (c, w, h) => {
    c.fillStyle = C.papir
    c.fillRect(12, 16, 30, 40)
    c.fillStyle = 'rgba(28,37,38,0.28)'
    for (let i = 0; i < 4; i++) c.fillRect(16, 22 + i * 8, 22 - (i % 2) * 6, 2.5)
    c.fillStyle = '#FBE38A'
    c.fillRect(w - 30, h - 26, 17, 17)
    c.fillStyle = '#EDEBE5'
    roundRect(c, w / 2 - 26, h - 22, 52, 15, 3)
    c.fill()
  })
  monitor(sc, X + 1.68, Y + 2.42, 0.77, 's')
  mug(sc, X + 2.2, Y + 2.4, 0.77, '#1E4D40')
  sc.box(X + 1.0, Y + 2.3, 0.77, 0.2, 0.26, 0.06, '#3A3E3F', { whole: true, bias: 0.1 })
  officeChair(sc, r.spots.pult[0], r.spots.pult[1], 's')
  chair(sc, r.spots.gjest[0], r.spots.gjest[1], 'n', FABRIC[ctx.ward], '#7A5A38')
  floorLamp(sc, X + 2.55, Y + 3.7)
  // Bag og utesko ved pulten
  sc.box(X + 0.3, Y + 3.5, 0, 0.36, 0.24, 0.3, '#7A5A38', { whole: true })
  sc.pendants.push({ x: X + 1.5, y: Y + 2.0, on: 1 })
}

function meetingRoom(sc: Scene, r: PlanRoom, ctx: RoomContext): void {
  const X = r.x
  const Y = r.y
  fillFloor(sc, r, '#CBD3D6', tiles(45, 'rgba(43,91,108,0.07)'))
  sc.floor(X, Y, r.w, r.h, (c) => rug(c, 40, 120, 210, 230, '#B9CCD6', 'rgba(43,91,108,0.3)'))
  // Skjenk med termos, kopper og kjeks
  cabinet(sc, X + 0.05, Y + 0.35, 0.42, 1.0, 0.72, C.oak, 'e', doorFronts(2, 'rgba(90,60,30,0.3)', '#7A5A38'))
  sc.box(X + 0.14, Y + 0.48, 0.72, 0.16, 0.16, 0.28, '#B4432F', { whole: true, bias: 0.1 })
  for (let i = 0; i < 3; i++) mug(sc, X + 0.16, Y + 0.76 + i * 0.14, 0.72, '#F7F5F0', 0.08)
  // Møtebord med vannkaraffel, lommetørklær og notatblokker
  for (const [s, back] of [['s1', 'w'], ['s2', 'e'], ['s3', 'w'], ['s4', 'e']] as const) chair(sc, r.spots[s][0], r.spots[s][1], back, FABRIC[ctx.ward], '#55595A')
  table(sc, X + 0.95, Y + 1.5, 1.0, 1.65, C.birch, '#B79A6C', (c, w, h) => {
    for (const [px, py] of [[16, 26], [w - 46, 40], [16, h - 62], [w - 46, h - 52]]) {
      c.fillStyle = C.papir
      c.fillRect(px, py, 30, 38)
      c.fillStyle = 'rgba(43,91,108,0.35)'
      for (let i = 0; i < 3; i++) c.fillRect(px + 4, py + 7 + i * 8, 20, 2.5)
    }
  })
  sc.box(X + 1.36, Y + 2.1, 0.77, 0.14, 0.14, 0.26, '#BFDDE6', { whole: true, bias: 0.3 })
  sc.box(X + 1.3, Y + 2.5, 0.77, 0.22, 0.14, 0.1, '#F4EEE2', { whole: true, bias: 0.3 })
  // Flippover
  const { ctx: c2, v } = sc
  const fx = X + 2.35
  const fy = Y + 3.55
  sc.add(fx + fy + 0.3, () => {
    if (!sc.near(fx, fy, 1)) return
    box(c2, v, fx - 0.3, fy, 0, 0.04, 0.04, 1.5, faces('#8A7A63'))
    box(c2, v, fx + 0.26, fy, 0, 0.04, 0.04, 1.5, faces('#8A7A63'))
    box(c2, v, fx - 0.32, fy + 0.03, 0.7, 0.64, 0.04, 0.85, faces('#FBF8F1'))
    onPlaneY(c2, v, fy + 0.07, 1.55, () => {
      c2.translate((fx - 0.32) * 100, 0)
      c2.strokeStyle = C.petrol
      c2.lineWidth = 3
      c2.beginPath()
      c2.moveTo(10, 20)
      c2.lineTo(50, 20)
      c2.moveTo(10, 36)
      c2.lineTo(42, 36)
      c2.stroke()
      c2.strokeStyle = C.rav
      c2.beginPath()
      c2.arc(34, 60, 12, 0, Math.PI * 2)
      c2.stroke()
    })
  })
  plant(sc, X + 2.55, Y + 0.5, 1.1)
  sc.pendants.push({ x: X + 1.45, y: Y + 2.3, on: 1 })
}

export function furnishRoom(sc: Scene, r: PlanRoom, ctx: RoomContext): void {
  switch (r.kind) {
    case 'beboer':
      return residentRoom(sc, r, ctx)
    case 'kjokken':
      return kitchen(sc, r)
    case 'spisestue':
      return diningRoom(sc, r, ctx)
    case 'stue':
      return lounge(sc, r, ctx)
    case 'vaktrom':
      return dutyRoom(sc, r, ctx)
    case 'medisinrom':
      return medicineRoom(sc, r)
    case 'kontor':
      return office(sc, r, ctx)
    case 'moterom':
      return meetingRoom(sc, r, ctx)
    case 'tomt':
      return
  }
}

/** Det som står i korridoren: benk, planter, en tralle og lampene i taket. */
export function furnishCorridor(sc: Scene, builtW: number, y: number, h: number, ward: WardTypeId, doors: number[]): void {
  const free = (x: number) => doors.every((d) => Math.abs(d - x) > 0.95)
  // Planter og en benk langs nordveggen, der det ikke er dører
  let placed = 0
  for (let x = 1.4; x < builtW - 0.8; x += 1.75) {
    if (!free(x)) continue
    if (placed % 3 === 0) plant(sc, x, y + 0.34, 1.0, 0, placed % 2 ? '#E9897A' : null)
    else if (placed % 3 === 1) {
      sc.box(x - 0.45, y + 0.14, 0.34, 0.9, 0.36, 0.07, C.oak, { whole: true })
      sc.box(x - 0.4, y + 0.2, 0, 0.07, 0.24, 0.34, C.oakDark, { whole: true, bias: -0.05 })
      sc.box(x + 0.33, y + 0.2, 0, 0.07, 0.24, 0.34, C.oakDark, { whole: true, bias: -0.05 })
    }
    placed++
  }
  // Tøytralle i østenden
  const tx = builtW - 1.0
  const ty = y + h - 0.5
  if (free(tx)) {
    sc.box(tx - 0.3, ty - 0.2, 0.1, 0.6, 0.4, 0.62, FABRIC[ward], { whole: true })
    sc.box(tx - 0.26, ty - 0.16, 0.72, 0.52, 0.32, 0.08, '#F7F5F0', { whole: true, bias: 0.05 })
  }
  for (let x = 2.2; x < builtW; x += 4.4) sc.pendants.push({ x, y: y + h / 2, on: 1 })
}
