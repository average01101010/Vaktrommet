import type { UpgradeLevels } from '@/types'
import type { Crew } from './agents'
import { agentPose, drawBubble, drawFigure, styleFor, type FigureStyle } from './character'
import { box, keyframe, mix, onFloor, onPlaneX, onPlaneY, P, poly, roundRect, shade, WORLD, type View } from './iso'

const { W, D, H, SPLIT } = WORLD

export interface SceneInput {
  /** Kontinuerlig minutt på døgnet (0–1440). */
  minuteOfDay: number
  /** Animasjonstid i sekunder. */
  time: number
  upgrades: UpgradeLevels
  /** Antall aktive Post-it-lapper – vises på korktavla. */
  postIts: number
  trivsel: number
  crew: Crew
}

const C = {
  wood: '#DDBC92',
  woodSideL: '#B99A72',
  woodSideR: '#A68962',
  lino: '#D6DFD5',
  linoEdge: '#BCCBBE',
  wallL: '#EDE4D3',
  wallR: '#F7F0E3',
  wallTop: '#DDD2BE',
  wallEnd: '#D2C6B0',
  dado: '#BCD0C4',
  base: '#C6B79C',
  oak: '#C99D6B',
  oakDark: '#A97F52',
  birch: '#E8D2AC',
  skog: '#1E4D40',
  petrol: '#2B5B6C',
  rav: '#D97736',
  blekk: '#1C2526',
  krem: '#F7F5F0',
  papir: '#FFFDF8',
}

const zc = (z: number, top = H) => (top - z) * 100

// ---------------------------------------------------------------------------
// Lys gjennom døgnet
// ---------------------------------------------------------------------------

export interface Light {
  dark: number
  warm: number
  lamp: number
  skyTop: string
  skyBottom: string
  night: number
}

export function lighting(minuteOfDay: number): Light {
  const dark = keyframe(minuteOfDay, [[0, 0.56], [330, 0.56], [420, 0.2], [510, 0], [990, 0], [1140, 0.14], [1290, 0.38], [1380, 0.54]])
  const warm = keyframe(minuteOfDay, [[0, 0], [350, 0], [420, 0.55], [510, 0], [990, 0], [1140, 0.7], [1260, 0.5], [1380, 0]])
  const night = Math.pow(Math.min(1, dark / 0.56), 1.3)
  return {
    dark,
    warm,
    night,
    lamp: Math.max(0, Math.min(1, (dark - 0.06) / 0.14)),
    skyTop: mixRgb(mixHex('#9FCDE6', '#6475AE', warm), '#0E1836', night),
    skyBottom: mixRgb(mixHex('#E2F1F4', '#F5A76B', warm), '#22325C', night),
  }
}

const mixHex = (a: string, b: string, t: number) => mix(a, b, t)
function mixRgb(rgb: string, hex: string, t: number): string {
  const m = rgb.match(/\d+/g)!.map(Number)
  const n = parseInt(hex.slice(1), 16)
  const k = Math.max(0, Math.min(1, t))
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return `rgb(${m.map((v, i) => Math.round(v + (c[i] - v) * k)).join(',')})`
}

// ---------------------------------------------------------------------------
// Gulv og vegger
// ---------------------------------------------------------------------------

function drawShell(ctx: CanvasRenderingContext2D, v: View): void {
  // Myk skygge under dioramaet
  const [cx, cy] = P(v, W / 2, D / 2, -0.3)
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, v.tw * 4.4)
  g.addColorStop(0, 'rgba(28,37,38,0.16)')
  g.addColorStop(1, 'rgba(28,37,38,0)')
  ctx.save()
  ctx.translate(cx, cy + v.tw * 0.5)
  ctx.scale(1, 0.5)
  ctx.translate(-cx, -cy)
  ctx.fillStyle = g
  ctx.fillRect(cx - v.tw * 5, cy - v.tw * 5, v.tw * 10, v.tw * 10)
  ctx.restore()

  // Gulvplate
  box(ctx, v, 0, 0, -0.2, W, D, 0.2, { top: C.wood, left: C.woodSideL, right: C.woodSideR })
  poly(ctx, [P(v, SPLIT, 0), P(v, W, 0), P(v, W, D), P(v, SPLIT, D)], C.lino)
  poly(ctx, [P(v, SPLIT, D, 0), P(v, W, D, 0), P(v, W, D, -0.2), P(v, SPLIT, D, -0.2)], '#AEBBAF')
  poly(ctx, [P(v, W, 0, 0), P(v, W, D, 0), P(v, W, D, -0.2), P(v, W, 0, -0.2)], '#9FAEA2')

  onFloor(ctx, v, 0, () => {
    // Parkett i vaktrommet
    ctx.strokeStyle = 'rgba(120,78,36,0.2)'
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let y = 55; y < D * 100; y += 55) {
      ctx.moveTo(0, y)
      ctx.lineTo(SPLIT * 100, y)
    }
    let row = 0
    for (let y = 0; y < D * 100; y += 55, row++) {
      for (let x = (row % 3) * 60 + 50; x < SPLIT * 100; x += 170) {
        ctx.moveTo(x, y)
        ctx.lineTo(x, Math.min(D * 100, y + 55))
      }
    }
    ctx.stroke()

    // Teppe under rapportbordet
    ctx.fillStyle = '#C8DAD9'
    roundRect(ctx, 150, 205, 250, 185, 26)
    ctx.fill()
    ctx.strokeStyle = 'rgba(43,91,108,0.35)'
    ctx.lineWidth = 5
    roundRect(ctx, 164, 219, 222, 157, 18)
    ctx.stroke()

    // Linoleum i korridoren: kantstripe og fliser
    ctx.fillStyle = C.linoEdge
    ctx.fillRect(SPLIT * 100, 0, (W - SPLIT) * 100, 26)
    ctx.fillRect(SPLIT * 100, D * 100 - 26, (W - SPLIT) * 100, 26)
    ctx.strokeStyle = 'rgba(30,77,64,0.07)'
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let x = SPLIT * 100 + 90; x < W * 100; x += 90) {
      ctx.moveTo(x, 26)
      ctx.lineTo(x, D * 100 - 26)
    }
    for (let y = 116; y < D * 100 - 26; y += 90) {
      ctx.moveTo(SPLIT * 100, y)
      ctx.lineTo(W * 100, y)
    }
    ctx.stroke()
    // Terskel mellom rommene
    ctx.fillStyle = '#B8A07C'
    ctx.fillRect(SPLIT * 100 - 5, 340, 12, D * 100 - 340)
  })

  // Vegger (med tykkelse)
  const t = 0.16
  box(ctx, v, -t, -t, 0, t, D + t, H, { top: C.wallTop, left: C.wallEnd, right: C.wallL })
  box(ctx, v, 0, -t, 0, W, t, H, { top: C.wallTop, left: C.wallR, right: C.wallEnd })

  // Myk gradient + fotlist
  onPlaneY(ctx, v, 0, H, () => {
    const gr = ctx.createLinearGradient(0, 0, 0, H * 100)
    gr.addColorStop(0, 'rgba(120,96,60,0.10)')
    gr.addColorStop(0.5, 'rgba(120,96,60,0)')
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, W * 100, H * 100)
    // Brystpanel i korridoren
    ctx.fillStyle = C.dado
    ctx.fillRect(SPLIT * 100, zc(1.05), (W - SPLIT) * 100, 105)
    ctx.fillStyle = 'rgba(30,77,64,0.25)'
    ctx.fillRect(SPLIT * 100, zc(1.05), (W - SPLIT) * 100, 4)
    ctx.fillStyle = C.base
    ctx.fillRect(0, zc(0.11), W * 100, 11)
  })
  onPlaneX(ctx, v, 0, H, () => {
    const gr = ctx.createLinearGradient(0, 0, 0, H * 100)
    gr.addColorStop(0, 'rgba(100,80,50,0.12)')
    gr.addColorStop(0.6, 'rgba(100,80,50,0.02)')
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, D * 100, H * 100)
    ctx.fillStyle = shade(C.base, -0.06)
    ctx.fillRect(0, zc(0.11), D * 100, 11)
  })
}

// ---------------------------------------------------------------------------
// Veggdekor
// ---------------------------------------------------------------------------

function drawLeftWall(ctx: CanvasRenderingContext2D, v: View, L: Light, up: UpgradeLevels, time: number): void {
  onPlaneX(ctx, v, 0, H, () => {
    // Vindu
    const x0 = 305
    const w = 180
    const top = zc(2.18)
    const h = 123
    ctx.fillStyle = '#FBF8F1'
    roundRect(ctx, x0 - 9, top - 9, w + 18, h + 18, 6)
    ctx.fill()
    const sky = ctx.createLinearGradient(0, top, 0, top + h)
    sky.addColorStop(0, L.skyTop)
    sky.addColorStop(1, L.skyBottom)
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0, top, w, h)
    ctx.clip()
    ctx.fillStyle = sky
    ctx.fillRect(x0, top, w, h)
    if (L.night > 0.35) {
      // Måne og stjerner
      ctx.globalAlpha = (L.night - 0.35) / 0.65
      ctx.fillStyle = '#FBF3D5'
      ctx.beginPath()
      ctx.arc(x0 + 46, top + 38, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = L.skyTop
      ctx.beginPath()
      ctx.arc(x0 + 54, top + 33, 13, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      for (const [sx, sy, r] of [[120, 24, 2.6], [150, 60, 2], [95, 70, 1.8], [30, 84, 2], [140, 100, 1.6]] as const) {
        ctx.globalAlpha = ((L.night - 0.35) / 0.65) * (0.6 + 0.4 * Math.sin(time * 1.3 + sx))
        ctx.beginPath()
        ctx.arc(x0 + sx, top + sy, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    } else {
      // Sol lavt på kveld/morgen, skyer på dagen
      if (L.warm > 0.05) {
        ctx.globalAlpha = Math.min(1, L.warm * 1.6)
        ctx.fillStyle = '#FFE2A8'
        ctx.beginPath()
        ctx.arc(x0 + 118, top + h - 22, 22, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
      ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - L.night)})`
      const drift = (time * 3) % 260
      for (const cxo of [drift - 60, drift + 70]) {
        ctx.beginPath()
        ctx.ellipse(x0 + cxo, top + 34, 30, 9, 0, 0, Math.PI * 2)
        ctx.ellipse(x0 + cxo + 18, top + 27, 20, 9, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      // Åser
      ctx.fillStyle = mixRgb(mix('#8FB39A', '#5E6F8F', L.warm), '#1A2848', L.night)
      ctx.beginPath()
      ctx.moveTo(x0, top + h)
      ctx.quadraticCurveTo(x0 + 50, top + h - 46, x0 + 100, top + h - 16)
      ctx.quadraticCurveTo(x0 + 140, top + h - 40, x0 + w, top + h - 22)
      ctx.lineTo(x0 + w, top + h)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
    // Sprosser
    ctx.fillStyle = '#FBF8F1'
    ctx.fillRect(x0 + w / 2 - 3.5, top, 7, h)
    ctx.fillRect(x0, top + h * 0.36, w, 6)
    // Gardiner
    for (const gx of [x0 - 22, x0 + w - 6]) {
      ctx.fillStyle = '#E7C9AE'
      roundRect(ctx, gx, top - 16, 28, h + 40, 5)
      ctx.fill()
      ctx.fillStyle = 'rgba(160,100,60,0.2)'
      ctx.fillRect(gx + 8, top - 14, 3, h + 36)
      ctx.fillRect(gx + 18, top - 14, 3, h + 36)
    }
    ctx.fillStyle = '#9A7650'
    roundRect(ctx, x0 - 34, top - 24, w + 68, 7, 3)
    ctx.fill()

    // Kjøkkenhylle over benken
    ctx.fillStyle = 'rgba(28,37,38,0.08)'
    ctx.fillRect(108, zc(1.52), 150, 8)
  })
  // Vinduskarm og hylle som små bokser
  box(ctx, v, 0, 2.98, 0.9, 0.13, 1.94, 0.05, { top: '#FBF8F1', left: '#E6DFD0', right: '#EFE8DA' })
  box(ctx, v, 0, 1.08, 1.56, 0.2, 1.5, 0.045, { top: C.oak, left: C.oakDark, right: shade(C.oak, -0.1) })
  const cups = ['#D97736', '#2B5B6C', '#F7F5F0', '#1E4D40', '#E9C46A']
  cups.forEach((col, i) => {
    box(ctx, v, 0.04, 1.2 + i * 0.26, 1.605, 0.11, 0.12, 0.12, { top: shade(col, 0.25), left: shade(col, -0.12), right: col })
  })
  if ((up.sansehage ?? 0) >= 3) {
    // Blomster i vinduskarmen
    for (const yy of [3.25, 4.45]) {
      box(ctx, v, 0.02, yy, 0.95, 0.1, 0.16, 0.1, { top: '#B5653A', left: '#9A5530', right: '#A85D34' })
      const [px, py] = P(v, 0.07, yy + 0.08, 1.12)
      leafBlob(ctx, px, py, 7 * v.s, '#3F8A63', time, 0.4)
      ctx.fillStyle = '#E9897A'
      ctx.beginPath()
      ctx.arc(px - 2 * v.s, py - 4 * v.s, 2.2 * v.s, 0, Math.PI * 2)
      ctx.arc(px + 3 * v.s, py - 2 * v.s, 2 * v.s, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawRightWall(
  ctx: CanvasRenderingContext2D,
  v: View,
  L: Light,
  up: UpgradeLevels,
  input: SceneInput,
): void {
  onPlaneY(ctx, v, 0, H, () => {
    // ---- Korktavle med Post-it ----
    const kx = 138
    const kw = 136
    const ktop = zc(1.98)
    const kh = 88
    ctx.fillStyle = '#8A6238'
    roundRect(ctx, kx - 5, ktop - 5, kw + 10, kh + 10, 4)
    ctx.fill()
    ctx.fillStyle = '#C79A68'
    ctx.fillRect(kx, ktop, kw, kh)
    ctx.fillStyle = 'rgba(92,58,26,0.25)'
    for (let i = 0; i < 26; i++) ctx.fillRect(kx + ((i * 37) % kw), ktop + ((i * 53) % kh), 3, 2)
    // Faste lapper
    ctx.fillStyle = '#FFFDF8'
    ctx.fillRect(kx + 8, ktop + 8, 26, 34)
    ctx.fillRect(kx + 100, ktop + 50, 28, 30)
    ctx.fillStyle = 'rgba(28,37,38,0.25)'
    for (let i = 0; i < 4; i++) ctx.fillRect(kx + 12, ktop + 14 + i * 6, 18, 2)
    // Aktive dilemmaer
    const notes = ['#FBE38A', '#F9BFCC', '#C3E6CB']
    const spots: [number, number, number][] = [[44, 10, -0.08], [76, 26, 0.06], [42, 50, 0.1]]
    for (let i = 0; i < Math.min(3, input.postIts); i++) {
      const [nx, ny, rot] = spots[i]
      ctx.save()
      ctx.translate(kx + nx + 13, ktop + ny + 13)
      ctx.rotate(rot + Math.sin(input.time * 2 + i) * 0.015)
      ctx.fillStyle = 'rgba(28,37,38,0.2)'
      ctx.fillRect(-12, -11, 27, 27)
      ctx.fillStyle = notes[i]
      ctx.fillRect(-13.5, -13.5, 27, 27)
      ctx.fillStyle = '#C0392B'
      ctx.beginPath()
      ctx.arc(0, -9, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(28,37,38,0.35)'
      ctx.fillRect(-8, -2, 16, 2)
      ctx.fillRect(-8, 3, 12, 2)
      ctx.restore()
    }

    // ---- Veggklokke ----
    const cxk = 206
    const cyk = zc(2.32)
    ctx.fillStyle = C.skog
    ctx.beginPath()
    ctx.arc(cxk, cyk, 19, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = C.papir
    ctx.beginPath()
    ctx.arc(cxk, cyk, 15.5, 0, Math.PI * 2)
    ctx.fill()
    const hourA = ((input.minuteOfDay / 60) % 12) * (Math.PI / 6) - Math.PI / 2
    const minA = (input.minuteOfDay % 60) * (Math.PI / 30) - Math.PI / 2
    ctx.strokeStyle = C.blekk
    ctx.lineCap = 'round'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cxk, cyk)
    ctx.lineTo(cxk + Math.cos(hourA) * 8, cyk + Math.sin(hourA) * 8)
    ctx.stroke()
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cxk, cyk)
    ctx.lineTo(cxk + Math.cos(minA) * 12, cyk + Math.sin(minA) * 12)
    ctx.stroke()

    // ---- Vaktliste (whiteboard) ----
    const wx = 306
    const ww = 132
    const wtop = zc(2.02)
    const wh = 84
    ctx.fillStyle = '#B9C2C4'
    roundRect(ctx, wx - 4, wtop - 4, ww + 8, wh + 8, 4)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(wx, wtop, ww, wh)
    ctx.fillStyle = C.skog
    ctx.fillRect(wx, wtop, ww, 16)
    ctx.fillStyle = C.krem
    ctx.font = '800 11px "Plus Jakarta Sans Variable", sans-serif'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText('VAKTLISTE', wx + 6, wtop + 8.5)
    const shiftIdx = Math.floor((((input.minuteOfDay - 420 + 1440) % 1440) / 480))
    for (let col = 0; col < 3; col++) {
      const cx0 = wx + 8 + col * 41
      if (col === shiftIdx) {
        ctx.fillStyle = 'rgba(217,119,54,0.18)'
        ctx.fillRect(cx0 - 4, wtop + 20, 39, wh - 24)
      }
      ctx.fillStyle = col === shiftIdx ? C.rav : '#7D8788'
      ctx.font = '800 10px "JetBrains Mono Variable", monospace'
      ctx.fillText(['D', 'A', 'N'][col], cx0, wtop + 28)
      const mags = ['#2B5B6C', '#1E4D40', '#CF7C40', '#8C7A5B']
      for (let r = 0; r < 4; r++) {
        ctx.fillStyle = 'rgba(28,37,38,0.16)'
        ctx.fillRect(cx0 + 10, wtop + 38 + r * 11, 20, 3)
        ctx.fillStyle = mags[(r + col) % 4]
        ctx.beginPath()
        ctx.arc(cx0 + 3, wtop + 39.5 + r * 11, 3.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // ---- Pasientdører ----
    const takheis = up.takheis ?? 0
    const door3Open = (up.nyfloy ?? 0) >= 1
    drawDoor(ctx, 510, '1', 'open', L, takheis, input.time)
    drawDoor(ctx, 690, '2', 'closed', L, 0, input.time)
    drawDoor(ctx, 870, '3', door3Open ? 'ajar' : 'construction', L, 0, input.time)

    // Håndlist
    const rail = zc(0.93)
    for (const [a, b] of [[468, 500], [612, 680], [792, 860], [972, 994]] as const) {
      ctx.fillStyle = 'rgba(28,37,38,0.14)'
      ctx.fillRect(a, rail + 6, b - a, 3)
      ctx.fillStyle = C.oak
      roundRect(ctx, a, rail, b - a, 6, 3)
      ctx.fill()
    }

    // Bilder mellom dørene
    drawFrame(ctx, 622, zc(1.92), 50, 40, 'fjord')
    drawFrame(ctx, 800, zc(1.92), 50, 40, 'sol')
  })
}

function drawDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  label: string,
  state: 'open' | 'closed' | 'ajar' | 'construction',
  L: Light,
  takheis: number,
  time: number,
): void {
  const w = 90
  const top = zc(2.06)
  const h = 206
  // Karm
  ctx.fillStyle = '#FBF8F1'
  ctx.fillRect(x - 7, top - 7, w + 14, h + 7)

  if (state === 'open') {
    // Innsyn i pasientrommet
    const room = ctx.createLinearGradient(0, top, 0, top + h)
    room.addColorStop(0, mixRgb(mix('#E9DCC6', '#E2B98C', L.warm), '#39405A', L.night * 0.8))
    room.addColorStop(1, mixRgb(mix('#CDBD9F', '#C79A6E', L.warm), '#2A3048', L.night * 0.8))
    ctx.fillStyle = room
    ctx.fillRect(x, top, w, h)
    // Vindu innerst
    ctx.fillStyle = L.skyBottom
    ctx.fillRect(x + 50, top + 38, 30, 46)
    ctx.fillStyle = '#FBF8F1'
    ctx.fillRect(x + 64, top + 38, 2.5, 46)
    // Seng
    ctx.fillStyle = '#B58E63'
    ctx.fillRect(x + 8, top + 118, 6, 70)
    ctx.fillStyle = '#F4EEE2'
    roundRect(ctx, x + 12, top + 132, 70, 26, 6)
    ctx.fill()
    ctx.fillStyle = '#D98B5C'
    roundRect(ctx, x + 30, top + 132, 52, 30, 6)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(x + 36, top + 138, 40, 4)
    ctx.fillStyle = '#9A7650'
    ctx.fillRect(x + 12, top + 158, 72, 8)
    ctx.fillRect(x + 14, top + 166, 5, 24)
    ctx.fillRect(x + 76, top + 166, 5, 24)
    if (takheis > 0) {
      // Takheis: skinne, motor og løftebøyle
      ctx.fillStyle = '#D9DEDF'
      ctx.fillRect(x, top + 8, w, 6)
      ctx.fillStyle = C.petrol
      roundRect(ctx, x + 36, top + 12, 26, 14, 4)
      ctx.fill()
      const sway = Math.sin(time * 1.1) * 2
      ctx.strokeStyle = '#6E7B7D'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x + 49, top + 26)
      ctx.lineTo(x + 49 + sway, top + 62)
      ctx.stroke()
      ctx.strokeStyle = C.rav
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(x + 35 + sway, top + 62)
      ctx.lineTo(x + 63 + sway, top + 62)
      ctx.stroke()
    }
    // Åpent dørblad langs veggen
    ctx.fillStyle = '#C9A77C'
    ctx.fillRect(x - 5, top, 9, h)
  } else {
    const wood = state === 'construction' ? '#BFB8AA' : '#CFAC80'
    ctx.fillStyle = wood
    ctx.fillRect(x, top, w, h)
    ctx.fillStyle = 'rgba(90,60,30,0.12)'
    ctx.fillRect(x + 28, top, 2, h)
    ctx.fillRect(x + 60, top, 2, h)
    // Lite vindu og håndtak
    ctx.fillStyle = state === 'construction' ? '#9FA8A8' : mixRgb(mix('#F4E7C4', '#F2C58C', L.warm), '#F1D79A', L.night)
    roundRect(ctx, x + 56, top + 30, 20, 52, 5)
    ctx.fill()
    ctx.fillStyle = '#6E7B7D'
    roundRect(ctx, x + 10, top + 104, 16, 5, 2.5)
    ctx.fill()
    if (state === 'construction') {
      // Sperrebånd
      ctx.save()
      ctx.beginPath()
      ctx.rect(x - 7, top, w + 14, h)
      ctx.clip()
      for (const yy of [top + 70, top + 128]) {
        ctx.save()
        ctx.translate(x + w / 2, yy)
        ctx.rotate(yy === top + 70 ? -0.16 : 0.14)
        for (let i = -8; i < 8; i++) {
          ctx.fillStyle = i % 2 ? '#F7F5F0' : C.rav
          ctx.fillRect(i * 11, -6, 11, 12)
        }
        ctx.restore()
      }
      ctx.restore()
    }
  }

  // Romskilt
  ctx.fillStyle = C.papir
  roundRect(ctx, x + w + 12, top + 62, 20, 22, 3)
  ctx.fill()
  ctx.fillStyle = state === 'construction' ? '#9FA8A8' : C.skog
  ctx.font = '800 14px "JetBrains Mono Variable", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + w + 22, top + 74)

  // Lampett over døra
  ctx.fillStyle = '#F4EEE2'
  ctx.beginPath()
  ctx.arc(x + w / 2, top - 20, 9, Math.PI, 0)
  ctx.fill()
  if (L.lamp > 0) {
    const glow = ctx.createRadialGradient(x + w / 2, top - 18, 0, x + w / 2, top - 18, 44)
    glow.addColorStop(0, `rgba(255,214,150,${0.6 * L.lamp})`)
    glow.addColorStop(1, 'rgba(255,214,150,0)')
    ctx.fillStyle = glow
    ctx.fillRect(x - 10, top - 62, w + 20, 96)
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, motif: 'fjord' | 'sol'): void {
  ctx.fillStyle = C.oakDark
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6)
  ctx.fillStyle = motif === 'fjord' ? '#CFE3EA' : '#F6E3C8'
  ctx.fillRect(x, y, w, h)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  if (motif === 'fjord') {
    ctx.fillStyle = '#2B5B6C'
    ctx.beginPath()
    ctx.moveTo(x, y + h)
    ctx.lineTo(x + 16, y + 12)
    ctx.lineTo(x + 30, y + h)
    ctx.fill()
    ctx.fillStyle = '#1E4D40'
    ctx.beginPath()
    ctx.moveTo(x + 18, y + h)
    ctx.lineTo(x + 38, y + 18)
    ctx.lineTo(x + 56, y + h)
    ctx.fill()
    ctx.fillStyle = '#7FB0C2'
    ctx.fillRect(x, y + h - 9, w, 9)
  } else {
    ctx.fillStyle = C.rav
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h - 6, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1E4D40'
    ctx.fillRect(x, y + h - 8, w, 8)
  }
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Små hjelpere for møbler
// ---------------------------------------------------------------------------

function leafBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, time: number, sway = 1): void {
  const a = Math.sin(time * 0.9 + x * 0.1) * 0.06 * sway
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  for (let i = 0; i < 7; i++) {
    const ang = -Math.PI / 2 + (i - 3) * 0.42
    ctx.fillStyle = i % 2 ? color : shade(color, -0.18)
    ctx.beginPath()
    ctx.ellipse(Math.cos(ang) * r * 0.75, Math.sin(ang) * r * 0.95, r * 0.75, r * 0.3, ang, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function plant(ctx: CanvasRenderingContext2D, v: View, x: number, y: number, size: number, time: number): void {
  box(ctx, v, x - 0.17, y - 0.17, 0, 0.34, 0.34, 0.36, { top: '#8C4E2A', left: '#B5653A', right: '#A2572F' })
  const [px, py] = P(v, x, y, 0.5)
  leafBlob(ctx, px, py, 15 * v.s * size, '#3F8A63', time)
  leafBlob(ctx, px, py - 9 * v.s * size, 11 * v.s * size, '#2E6E55', time + 2)
}

function steam(ctx: CanvasRenderingContext2D, v: View, sx: number, sy: number, time: number, strength = 1): void {
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    const t = (time * 0.45 + i / 3) % 1
    const y = sy - t * 20 * v.s
    const x = sx + Math.sin(t * 6 + i * 2) * 2.6 * v.s + (i - 1) * 2.4 * v.s
    ctx.fillStyle = `rgba(255,255,255,${(1 - t) * 0.6 * strength})`
    ctx.beginPath()
    ctx.arc(x, y, (1.6 + t * 2.6) * v.s, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

interface Drawable {
  depth: number
  draw: () => void
}

// ---------------------------------------------------------------------------
// Møbler og utstyr
// ---------------------------------------------------------------------------

function collectObjects(ctx: CanvasRenderingContext2D, v: View, input: SceneInput, L: Light): Drawable[] {
  const up = input.upgrades
  const t = input.time
  const out: Drawable[] = []
  const add = (depth: number, draw: () => void) => out.push({ depth, draw })
  const ergo = up.ergonomi ?? 0
  const espresso = up.espressomaskin ?? 0
  const green = up.sansehage ?? 0

  // ---- Kjøkkenbenk med kaffe ----
  add(1.9, () => {
    box(ctx, v, 0, 1.0, 0, 0.58, 1.6, 0.84, { top: '#6F9684', left: '#5F8674', right: '#86AB99' })
    onPlaneX(ctx, v, 0.58, 0.84, () => {
      ctx.strokeStyle = 'rgba(30,77,64,0.35)'
      ctx.lineWidth = 2.5
      ctx.strokeRect(106, 8, 46, 68)
      ctx.strokeRect(156, 8, 46, 68)
      ctx.strokeRect(206, 8, 48, 68)
      ctx.fillStyle = '#F4EEE2'
      for (const kx of [146, 162, 212]) ctx.fillRect(kx - 2, 36, 4, 12)
    })
    box(ctx, v, 0, 0.97, 0.84, 0.63, 1.66, 0.05, { top: C.birch, left: shade(C.birch, -0.18), right: shade(C.birch, -0.1) })

    if (espresso === 0) {
      // Kaffetrakter fra 1998
      box(ctx, v, 0.14, 1.36, 0.89, 0.3, 0.34, 0.1, { top: '#55595A', left: '#3B3F40', right: '#484C4D' })
      box(ctx, v, 0.14, 1.36, 0.99, 0.12, 0.34, 0.3, { top: '#55595A', left: '#3B3F40', right: '#484C4D' })
      box(ctx, v, 0.26, 1.42, 0.99, 0.17, 0.22, 0.17, { top: '#6B4526', left: 'rgba(90,55,30,0.85)', right: 'rgba(110,70,40,0.85)' })
      box(ctx, v, 0.14, 1.36, 1.29, 0.3, 0.34, 0.06, { top: '#66696A', left: '#3B3F40', right: '#484C4D' })
      const [sx, sy] = P(v, 0.34, 1.53, 1.2)
      steam(ctx, v, sx, sy, t, 0.6)
    } else {
      // Espressomaskin
      const steel = espresso >= 3 ? '#E3C8A0' : '#D5DADB'
      box(ctx, v, 0.1, 1.28, 0.89, 0.4, 0.5, 0.42, { top: shade(steel, 0.25), left: shade(steel, -0.22), right: steel })
      box(ctx, v, 0.1, 1.28, 1.31, 0.4, 0.5, 0.05, { top: C.rav, left: '#A85A26', right: '#BF6227' })
      box(ctx, v, 0.5, 1.4, 1.05, 0.05, 0.1, 0.07, { top: '#2A2D2E', left: '#1C2526', right: '#2A2D2E' })
      box(ctx, v, 0.5, 1.58, 1.05, 0.05, 0.1, 0.07, { top: '#2A2D2E', left: '#1C2526', right: '#2A2D2E' })
      box(ctx, v, 0.47, 1.4, 0.9, 0.1, 0.1, 0.09, { top: '#FFFFFF', left: '#E3DED3', right: '#F0EBE0' })
      box(ctx, v, 0.47, 1.58, 0.9, 0.1, 0.1, 0.09, { top: '#FFFFFF', left: '#E3DED3', right: '#F0EBE0' })
      const [sx, sy] = P(v, 0.52, 1.5, 1.02)
      steam(ctx, v, sx, sy, t, 1)
      if (espresso >= 2) {
        // Kvern
        box(ctx, v, 0.16, 1.02, 0.89, 0.22, 0.2, 0.26, { top: '#3A3E3F', left: '#232728', right: '#2E3233' })
        box(ctx, v, 0.18, 1.04, 1.15, 0.18, 0.16, 0.2, { top: 'rgba(120,80,40,0.9)', left: 'rgba(90,60,30,0.7)', right: 'rgba(110,72,36,0.7)' })
      }
    }
    // Fruktfat
    const [fx, fy] = P(v, 0.3, 2.25, 0.9)
    ctx.fillStyle = '#F4EEE2'
    ctx.beginPath()
    ctx.ellipse(fx, fy, 9 * v.s, 4.6 * v.s, 0, 0, Math.PI * 2)
    ctx.fill()
    for (const [dx, dy, col] of [[-3, -2.4, '#E08A3C'], [2.4, -2.6, '#D9534F'], [0, -4.6, '#E9C46A']] as const) {
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(fx + dx * v.s, fy + dy * v.s, 3 * v.s, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // ---- Medisinskap ----
  add(0.9, () => {
    box(ctx, v, 0.28, 0, 0, 0.74, 0.42, 1.9, { top: '#FBF8F1', left: '#F4EFE5', right: '#E2DACB' })
    onPlaneY(ctx, v, 0.42, 1.9, () => {
      ctx.strokeStyle = 'rgba(28,37,38,0.18)'
      ctx.lineWidth = 2.5
      ctx.strokeRect(33, 6, 31, 100)
      ctx.strokeRect(66, 6, 31, 100)
      ctx.strokeRect(33, 112, 64, 72)
      ctx.fillStyle = 'rgba(160,205,215,0.55)'
      ctx.fillRect(36, 10, 25, 92)
      ctx.fillRect(69, 10, 25, 92)
      ctx.fillStyle = 'rgba(28,37,38,0.18)'
      for (const sy of [38, 70]) ctx.fillRect(36, sy, 58, 2.5)
      // Esker i skapet
      const cols = ['#D97736', '#2B5B6C', '#F7F5F0', '#B4432F', '#1E4D40']
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = cols[i]
        ctx.fillRect(38 + (i % 3) * 8, 26 + Math.floor(i / 3) * 32, 6, 11)
        ctx.fillStyle = cols[(i + 2) % 5]
        ctx.fillRect(71 + (i % 3) * 8, 58 + Math.floor(i / 3) * 32 - 32, 6, 11)
      }
      // Grønt kors
      ctx.fillStyle = '#2E8B62'
      ctx.fillRect(59, 136, 12, 34)
      ctx.fillRect(48, 147, 34, 12)
    })
  })

  // ---- Skjenk under korktavla ----
  add(2.4, () => {
    box(ctx, v, 1.36, 0, 0, 1.4, 0.44, 0.68, { top: shade(C.oak, 0.12), left: C.oak, right: C.oakDark })
    onPlaneY(ctx, v, 0.44, 0.68, () => {
      ctx.strokeStyle = 'rgba(90,60,30,0.3)'
      ctx.lineWidth = 2.5
      ctx.strokeRect(142, 8, 62, 52)
      ctx.strokeRect(208, 8, 62, 52)
    })
    // Permer
    const binders = ['#2B5B6C', '#D97736', '#1E4D40', '#E9C46A', '#B4432F', '#2B5B6C']
    binders.forEach((col, i) => {
      box(ctx, v, 1.46 + i * 0.105, 0.06, 0.68, 0.095, 0.26, 0.3, { top: shade(col, 0.2), left: col, right: shade(col, -0.18) })
    })
    // Radio
    box(ctx, v, 2.3, 0.1, 0.68, 0.34, 0.16, 0.18, { top: '#E8D2AC', left: '#D9BE93', right: '#C4A77A' })
    if (green >= 2) {
      const [px, py] = P(v, 2.2, 0.26, 0.86)
      box(ctx, v, 2.13, 0.2, 0.68, 0.13, 0.13, 0.12, { top: '#8C4E2A', left: '#B5653A', right: '#A2572F' })
      leafBlob(ctx, px, py, 8 * v.s, '#3F8A63', t)
    }
  })

  // ---- PC-pult ----
  const deskH = ergo >= 1 ? 1.0 : 0.72
  add(4.0, () => {
    const leg = ergo >= 1 ? '#EDEBE5' : '#8C7A5B'
    box(ctx, v, 3.06, 0.08, 0, 0.07, 0.44, deskH, { top: leg, left: shade(leg, -0.1), right: shade(leg, -0.2) })
    box(ctx, v, 4.27, 0.08, 0, 0.07, 0.44, deskH, { top: leg, left: shade(leg, -0.1), right: shade(leg, -0.2) })
    const topCol = ergo >= 1 ? C.birch : '#B98B5E'
    box(ctx, v, 2.98, 0, deskH, 1.44, 0.62, 0.05, { top: topCol, left: shade(topCol, -0.14), right: shade(topCol, -0.24) })
    // Skjerm
    const mz = deskH + 0.05
    box(ctx, v, 3.66, 0.14, mz, 0.08, 0.08, 0.14, { top: '#3A3E3F', left: '#2A2D2E', right: '#232728' })
    box(ctx, v, 3.38, 0.15, mz + 0.14, 0.64, 0.05, 0.4, { top: '#3A3E3F', left: '#232728', right: '#1C2526' })
    onPlaneY(ctx, v, 0.2, mz + 0.54, () => {
      const scr = ctx.createLinearGradient(0, 0, 0, 40)
      scr.addColorStop(0, '#DDF0F5')
      scr.addColorStop(1, '#B9DCE6')
      ctx.fillStyle = scr
      ctx.fillRect(341, 3, 58, 33)
      ctx.fillStyle = C.skog
      ctx.fillRect(341, 3, 58, 6)
      ctx.fillStyle = 'rgba(43,91,108,0.55)'
      for (let i = 0; i < 4; i++) ctx.fillRect(345, 13 + i * 5.5, 30 + ((i * 11) % 18), 2.5)
      ctx.fillStyle = C.rav
      ctx.fillRect(386, 26, 9, 6)
    })
    // Tastatur og kopp
    box(ctx, v, 3.42, 0.34, mz, 0.5, 0.15, 0.02, { top: '#EDEBE5', left: '#CFCBC2', right: '#BDB8AD' })
    box(ctx, v, 4.06, 0.3, mz, 0.1, 0.1, 0.1, { top: '#F7F5F0', left: C.petrol, right: shade(C.petrol, -0.15) })
  })

  // ---- Stol bak rapportbordet ----
  const chair = (x: number, y: number, back: 'x-' | 'y+' | 'y-') => {
    const seat = ergo >= 1 ? '#3D7868' : '#A97F52'
    const frame = ergo >= 1 ? '#2B5B4D' : '#7A5A38'
    add(x + y + 0.17, () => {
      box(ctx, v, x + 0.14, y + 0.14, 0, 0.07, 0.07, 0.4, { top: frame, left: frame, right: shade(frame, -0.2) })
      box(ctx, v, x, y, 0.4, 0.35, 0.35, 0.07, { top: shade(seat, 0.14), left: seat, right: shade(seat, -0.16) })
      if (back === 'x-') box(ctx, v, x, y, 0.47, 0.05, 0.35, 0.36, { top: shade(seat, 0.14), left: seat, right: shade(seat, -0.1) })
      if (back === 'y-') box(ctx, v, x, y, 0.47, 0.35, 0.05, 0.36, { top: shade(seat, 0.14), left: seat, right: shade(seat, -0.16) })
    })
    if (back === 'y+') {
      add(x + y + 0.72, () =>
        box(ctx, v, x, y + 0.3, 0.47, 0.35, 0.05, 0.36, { top: shade(seat, 0.14), left: seat, right: shade(seat, -0.16) }),
      )
    }
  }
  chair(1.45, 2.78, 'x-')
  chair(2.62, 3.78, 'y+')
  chair(2.7, 1.86, 'y-')

  // ---- Rapportbord ----
  add(5.75, () => {
    const topCol = ergo >= 1 ? C.birch : '#B98B5E'
    const leg = ergo >= 1 ? '#F4F1EA' : '#8A6A45'
    for (const [lx, ly] of [[2.06, 2.46], [3.46, 2.46], [2.06, 3.26], [3.46, 3.26]] as const) {
      box(ctx, v, lx, ly, 0, 0.08, 0.08, 0.7, { top: leg, left: shade(leg, -0.1), right: shade(leg, -0.22) })
    }
    box(ctx, v, 2.0, 2.4, 0.7, 1.6, 1.0, 0.07, { top: topCol, left: shade(topCol, -0.14), right: shade(topCol, -0.24) })
    onFloor(ctx, v, 0.77, () => {
      if (ergo === 0) {
        // Kafferinger på det slitte bordet
        ctx.strokeStyle = 'rgba(90,55,30,0.28)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(318, 262, 10, 0, Math.PI * 2)
        ctx.moveTo(250, 318)
        ctx.arc(240, 318, 10, 0, Math.PI * 1.6)
        ctx.stroke()
      }
      // Rapportark
      ctx.fillStyle = C.papir
      ctx.save()
      ctx.translate(232, 272)
      ctx.rotate(0.12)
      ctx.fillRect(-18, -24, 36, 48)
      ctx.fillStyle = 'rgba(28,37,38,0.3)'
      for (let i = 0; i < 5; i++) ctx.fillRect(-13, -18 + i * 8, 26 - (i % 2) * 8, 2.5)
      ctx.restore()
      ctx.fillStyle = '#FBE38A'
      ctx.fillRect(268, 300, 18, 18)
      ctx.fillStyle = C.papir
      ctx.save()
      ctx.translate(318, 304)
      ctx.rotate(-0.2)
      ctx.fillRect(-16, -22, 32, 44)
      ctx.fillStyle = 'rgba(43,91,108,0.4)'
      for (let i = 0; i < 4; i++) ctx.fillRect(-11, -15 + i * 8, 22, 2.5)
      ctx.restore()
    })
    // Kopper med damp
    box(ctx, v, 2.86, 2.62, 0.77, 0.1, 0.1, 0.1, { top: '#5A3A22', left: C.rav, right: shade(C.rav, -0.15) })
    box(ctx, v, 2.24, 3.1, 0.77, 0.1, 0.1, 0.1, { top: '#5A3A22', left: '#F7F5F0', right: '#E2DCCF' })
    const [sx, sy] = P(v, 2.91, 2.67, 0.9)
    steam(ctx, v, sx, sy, t + 0.3, 0.8)
    // Bolleboks
    box(ctx, v, 3.22, 2.52, 0.77, 0.22, 0.16, 0.07, { top: '#E9C46A', left: '#D9B052', right: '#C89D42' })
  })

  // ---- Glassvegg mot korridoren ----
  const seg = 0.85
  for (let i = 0; i < 4; i++) {
    const y0 = i * seg
    add(SPLIT + y0 + seg * 0.62, () => {
      box(ctx, v, SPLIT, y0, 0, 0.07, seg, 0.95, { top: '#4C8776', left: '#2B5B4D', right: '#3D7868' })
      const g = [P(v, SPLIT + 0.07, y0, 0.95), P(v, SPLIT + 0.07, y0 + seg, 0.95), P(v, SPLIT + 0.07, y0 + seg, 2.1), P(v, SPLIT + 0.07, y0, 2.1)]
      poly(ctx, g, 'rgba(190,225,232,0.22)')
      // Refleks
      const a = P(v, SPLIT + 0.07, y0 + 0.2, 2.0)
      const b = P(v, SPLIT + 0.07, y0 + 0.62, 1.1)
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 2.2 * v.s
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.stroke()
      // Stolpe og overligger
      box(ctx, v, SPLIT, y0 + seg - 0.06, 0.95, 0.07, 0.06, 1.2, { top: '#FBF8F1', left: '#E6DFD0', right: '#F4EEE2' })
      box(ctx, v, SPLIT, y0, 2.1, 0.07, seg, 0.07, { top: '#FBF8F1', left: '#E6DFD0', right: '#F4EEE2' })
    })
  }

  // ---- Korridor: medisintralle ----
  if ((up.medisintralle ?? 0) >= 1) {
    add(6.9, () => {
      const [w1x, w1y] = P(v, 6.26, 0.6, 0.06)
      const [w2x, w2y] = P(v, 6.74, 0.6, 0.06)
      ctx.fillStyle = '#2A2D2E'
      ctx.beginPath()
      ctx.arc(w1x, w1y, 3 * v.s, 0, Math.PI * 2)
      ctx.arc(w2x, w2y, 3 * v.s, 0, Math.PI * 2)
      ctx.fill()
      box(ctx, v, 6.2, 0.16, 0.12, 0.6, 0.44, 0.78, { top: '#F4F1EA', left: '#FBF8F1', right: '#DCD6C9' })
      onPlaneY(ctx, v, 0.6, 0.9, () => {
        const cols = ['#B4432F', '#D97736', '#2B5B6C', '#1E4D40']
        for (let r = 0; r < 4; r++) {
          ctx.fillStyle = cols[r]
          roundRect(ctx, 624, 6 + r * 18, 52, 14, 2)
          ctx.fill()
          ctx.fillStyle = 'rgba(255,255,255,0.75)'
          ctx.fillRect(644, 11 + r * 18, 12, 3)
        }
      })
      box(ctx, v, 6.3, 0.24, 0.9, 0.12, 0.12, 0.1, { top: '#FFFFFF', left: '#EDEBE5', right: '#DCD6C9' })
      box(ctx, v, 6.52, 0.24, 0.9, 0.18, 0.22, 0.05, { top: '#BFE3EE', left: '#9CCBDA', right: '#86B9C9' })
    })
  }

  // ---- Korridor: blærescanner ----
  if ((up.blaerescanner ?? 0) >= 1) {
    add(8.75, () => {
      box(ctx, v, 8.12, 0.26, 0, 0.3, 0.3, 0.05, { top: '#6E7B7D', left: '#55595A', right: '#484C4D' })
      box(ctx, v, 8.25, 0.39, 0.05, 0.04, 0.04, 1.0, { top: '#D5DADB', left: '#BFC6C7', right: '#A9B1B2' })
      box(ctx, v, 8.1, 0.36, 1.05, 0.34, 0.1, 0.24, { top: '#FFFFFF', left: '#F4F1EA', right: '#DCD6C9' })
      onPlaneY(ctx, v, 0.46, 1.29, () => {
        ctx.fillStyle = '#123E4C'
        roundRect(ctx, 813, 3, 28, 18, 2)
        ctx.fill()
        ctx.strokeStyle = '#6FE0D0'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(827, 13, 5 + Math.sin(t * 3) * 1.2, 0, Math.PI * 2)
        ctx.stroke()
      })
      // Probe i holder
      box(ctx, v, 8.36, 0.42, 0.78, 0.06, 0.06, 0.2, { top: '#2B5B6C', left: '#2B5B6C', right: '#234E5E' })
    })
  }

  // ---- Korridor: lenestol med beboer, gulvlampe ----
  add(8.3 + 4.85 - 0.6, () => {
    const col = '#C8794A'
    box(ctx, v, 8.6, 4.42, 0, 0.14, 0.78, 0.98, { top: shade(col, 0.16), left: col, right: shade(col, -0.12) })
    box(ctx, v, 8.74, 4.42, 0, 0.62, 0.78, 0.4, { top: shade(col, 0.2), left: col, right: shade(col, -0.18) })
    box(ctx, v, 8.74, 4.42, 0.4, 0.62, 0.1, 0.2, { top: shade(col, 0.16), left: col, right: shade(col, -0.18) })
  })
  add(8.3 + 4.85 + 0.75, () => {
    const col = '#C8794A'
    box(ctx, v, 8.74, 5.1, 0.4, 0.62, 0.1, 0.2, { top: shade(col, 0.16), left: col, right: shade(col, -0.18) })
  })
  add(8.3 + 4.85 + 0.2, () => {
    // Beboer i stolen
    const [sx, sy] = P(v, 9.02, 4.82, 0.34)
    const resident: FigureStyle = {
      top: '#7B6A8E',
      trousers: '#5A5148',
      skin: '#F0CDB5',
      hair: '#E3E0DA',
      hairStyle: 3,
      accessory: 1,
      staff: false,
    }
    drawFigure(ctx, v, resident, {
      sx,
      sy,
      flip: 1,
      away: false,
      sitting: true,
      walking: false,
      phase: 1.3,
      time: t,
      alpha: 1,
      tired: input.trivsel < 30,
    })
    // Pledd over fanget
    const [bx, by] = P(v, 9.12, 4.86, 0.44)
    ctx.fillStyle = '#E9C46A'
    roundRect(ctx, bx - 9 * v.s, by - 3 * v.s, 20 * v.s, 9 * v.s, 3 * v.s)
    ctx.fill()
    ctx.strokeStyle = 'rgba(180,97,42,0.6)'
    ctx.lineWidth = 1.2 * v.s
    ctx.beginPath()
    ctx.moveTo(bx - 6 * v.s, by)
    ctx.lineTo(bx + 8 * v.s, by)
    ctx.moveTo(bx - 6 * v.s, by + 3 * v.s)
    ctx.lineTo(bx + 8 * v.s, by + 3 * v.s)
    ctx.stroke()
  })
  add(9.55 + 4.3, () => {
    // Gulvlampe
    box(ctx, v, 9.47, 4.14, 0, 0.2, 0.2, 0.04, { top: '#6E7B7D', left: '#55595A', right: '#484C4D' })
    box(ctx, v, 9.55, 4.22, 0.04, 0.035, 0.035, 1.35, { top: '#9A7650', left: '#9A7650', right: '#7A5A38' })
    const [lx, ly] = P(v, 9.57, 4.24, 1.4)
    ctx.fillStyle = L.lamp > 0 ? mix('#EFE3CC', '#FFE2AE', L.lamp) : '#EFE3CC'
    ctx.beginPath()
    ctx.moveTo(lx - 6 * v.s, ly - 13 * v.s)
    ctx.lineTo(lx + 6 * v.s, ly - 13 * v.s)
    ctx.lineTo(lx + 10 * v.s, ly + 2 * v.s)
    ctx.lineTo(lx - 10 * v.s, ly + 2 * v.s)
    ctx.closePath()
    ctx.fill()
  })

  // ---- Planter (flere og frodigere for hvert nivå) ----
  const lush = 0.78 + Math.min(4, Math.max(0, green - 1)) * 0.05
  if (green >= 1) add(9.7 + 0.5, () => plant(ctx, v, 9.7, 0.46, lush, t))
  if (green >= 2) add(0.42 + 5.1, () => plant(ctx, v, 0.42, 5.1, lush, t))
  if (green >= 4) add(4.98 + 5.16, () => plant(ctx, v, 4.98, 5.16, lush * 0.82, t))
  if (green >= 5) add(9.62 + 5.2, () => plant(ctx, v, 9.62, 5.2, lush * 0.82, t))

  // ---- Pleierne ----
  for (const a of input.crew.agents) {
    add(a.x + a.y + 0.05, () => {
      const [sx, sy] = P(v, a.x, a.y, 0)
      drawFigure(ctx, v, styleFor(a.look), agentPose(a, sx, sy, t))
    })
  }

  return out
}

// ---------------------------------------------------------------------------
// Taklamper og lyssetting
// ---------------------------------------------------------------------------

const LAMPS: [number, number][] = [
  [2.8, 2.9],
  [6.5, 2.9],
  [8.7, 2.9],
]

function drawLamps(ctx: CanvasRenderingContext2D, v: View, L: Light, up: UpgradeLevels): void {
  const warmLamps = (up.dognrytmelys ?? 0) >= 1
  for (const [x, y] of LAMPS) {
    const [tx, ty] = P(v, x, y, H + 0.34)
    const [lx, ly] = P(v, x, y, 2.38)
    ctx.strokeStyle = 'rgba(28,37,38,0.5)'
    ctx.lineWidth = 1 * v.s
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(lx, ly - 6 * v.s)
    ctx.stroke()
    if (warmLamps) {
      // Flettet pendel med varmt lys
      ctx.fillStyle = '#C99D6B'
      ctx.beginPath()
      ctx.moveTo(lx - 3.5 * v.s, ly - 6 * v.s)
      ctx.quadraticCurveTo(lx - 10 * v.s, ly - 2 * v.s, lx - 9.5 * v.s, ly + 2.5 * v.s)
      ctx.lineTo(lx + 9.5 * v.s, ly + 2.5 * v.s)
      ctx.quadraticCurveTo(lx + 10 * v.s, ly - 2 * v.s, lx + 3.5 * v.s, ly - 6 * v.s)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(120,80,40,0.35)'
      ctx.lineWidth = 0.7 * v.s
      ctx.beginPath()
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(lx + i * 1.6 * v.s, ly - 5.6 * v.s)
        ctx.lineTo(lx + i * 3.8 * v.s, ly + 2.5 * v.s)
      }
      ctx.stroke()
      ctx.fillStyle = L.lamp > 0 ? mix('#F4E7C9', '#FFE1A6', L.lamp) : '#F4E7C9'
      ctx.beginPath()
      ctx.ellipse(lx, ly + 2.5 * v.s, 9.5 * v.s, 2.8 * v.s, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Naken lyspære i ledning – det er tross alt en sliten avdeling
      ctx.fillStyle = '#55595A'
      roundRect(ctx, lx - 2 * v.s, ly - 7 * v.s, 4 * v.s, 4 * v.s, 1 * v.s)
      ctx.fill()
      ctx.fillStyle = L.lamp > 0 ? mix('#F1F1EA', '#F4FBFF', L.lamp) : '#F1F1EA'
      ctx.beginPath()
      ctx.arc(lx, ly, 3.6 * v.s, 0, Math.PI * 2)
      ctx.fill()
    }
    if (L.lamp > 0.05) {
      const col = warmLamps ? '255,214,150' : '232,244,255'
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 16 * v.s)
      g.addColorStop(0, `rgba(${col},${0.55 * L.lamp})`)
      g.addColorStop(1, `rgba(${col},0)`)
      ctx.fillStyle = g
      ctx.fillRect(lx - 16 * v.s, ly - 16 * v.s, 32 * v.s, 32 * v.s)
    }
  }
}

export interface LightLayer {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

function applyLighting(
  ctx: CanvasRenderingContext2D,
  v: View,
  L: Light,
  up: UpgradeLevels,
  layer: LightLayer,
  dpr: number,
): void {
  if (L.dark < 0.01 && L.warm < 0.01) return
  const warmLamps = (up.dognrytmelys ?? 0) >= 1
  const lc = layer.ctx
  lc.setTransform(dpr, 0, 0, dpr, 0, 0)
  lc.globalCompositeOperation = 'source-over'
  lc.clearRect(0, 0, v.width, v.height)
  lc.fillStyle = `rgba(14,22,48,${L.dark * 0.92})`
  lc.fillRect(0, 0, v.width, v.height)

  // Skjær hull i mørket der lampene lyser
  lc.globalCompositeOperation = 'destination-out'
  const hole = (cx: number, cy: number, r: number, squash: number, strength: number) => {
    lc.save()
    lc.translate(cx, cy)
    lc.scale(1, squash)
    const g = lc.createRadialGradient(0, 0, 0, 0, 0, r)
    g.addColorStop(0, `rgba(0,0,0,${strength})`)
    g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.55})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    lc.fillStyle = g
    lc.fillRect(-r, -r, r * 2, r * 2)
    lc.restore()
  }
  const power = L.lamp * (warmLamps ? 0.9 : 0.72)
  for (const [x, y] of LAMPS) {
    const [fx, fy] = P(v, x, y, 0)
    hole(fx, fy, v.tw * 2.5, 0.55, power)
    const [hx, hy] = P(v, x, y, 1.5)
    hole(hx, hy, v.tw * 1.9, 1, power * 0.6)
  }
  // Gulvlampe, PC-skjerm og lampetter
  const [gx, gy] = P(v, 9.3, 4.5, 0.6)
  hole(gx, gy, v.tw * 1.5, 0.8, L.lamp * 0.8)
  const [mx, my] = P(v, 3.7, 0.5, 1.1)
  hole(mx, my, v.tw * 0.9, 1, L.lamp * 0.55)
  for (const dx of [5.55, 7.35, 9.15]) {
    const [sx, sy] = P(v, dx, 0.1, 1.9)
    hole(sx, sy, v.tw * 1.1, 1.2, L.lamp * 0.6)
  }
  const [kx, ky] = P(v, 0.4, 1.6, 1.0)
  hole(kx, ky, v.tw * 0.8, 1, L.lamp * 0.35)
  lc.globalCompositeOperation = 'source-over'

  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.drawImage(layer.canvas, 0, 0, v.width, v.height)
  // Varm kveldstone
  if (L.warm > 0.01) {
    ctx.fillStyle = `rgba(255,150,70,${L.warm * 0.1})`
    ctx.fillRect(0, 0, v.width, v.height)
  }
  // Lysskjær fra lampene
  if (L.lamp > 0.01) {
    for (const [x, y] of LAMPS) {
      const [fx, fy] = P(v, x, y, 0.4)
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, v.tw * 2.2)
      const col = warmLamps ? '255,196,120' : '225,238,255'
      g.addColorStop(0, `rgba(${col},${0.2 * L.lamp})`)
      g.addColorStop(1, `rgba(${col},0)`)
      ctx.fillStyle = g
      ctx.fillRect(fx - v.tw * 2.2, fy - v.tw * 2.2, v.tw * 4.4, v.tw * 4.4)
    }
    const [gx2, gy2] = P(v, 9.4, 4.4, 0.9)
    const g2 = ctx.createRadialGradient(gx2, gy2, 0, gx2, gy2, v.tw * 1.3)
    g2.addColorStop(0, `rgba(255,196,120,${0.3 * L.lamp})`)
    g2.addColorStop(1, 'rgba(255,196,120,0)')
    ctx.fillStyle = g2
    ctx.fillRect(gx2 - v.tw * 1.3, gy2 - v.tw * 1.3, v.tw * 2.6, v.tw * 2.6)
  }
  ctx.restore()
}

/** Dagslys som faller inn gjennom vinduet. */
function drawWindowLight(ctx: CanvasRenderingContext2D, v: View, L: Light): void {
  const strength = (1 - L.night) * (0.2 + L.warm * 0.12)
  if (strength < 0.02) return
  onFloor(ctx, v, 0.005, () => {
    const g = ctx.createLinearGradient(0, 0, 230, 0)
    const col = L.warm > 0.2 ? '255,214,160' : '255,250,225'
    g.addColorStop(0, `rgba(${col},${strength})`)
    g.addColorStop(1, `rgba(${col},0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, 305)
    ctx.lineTo(230, 345)
    ctx.lineTo(230, 525)
    ctx.lineTo(0, 485)
    ctx.closePath()
    ctx.fill()
  })
}

// ---------------------------------------------------------------------------
// Hovedtegning
// ---------------------------------------------------------------------------

export function drawScene(
  ctx: CanvasRenderingContext2D,
  v: View,
  input: SceneInput,
  layer: LightLayer,
  dpr: number,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, v.width, v.height)
  const L = lighting(input.minuteOfDay)

  drawShell(ctx, v)
  drawLeftWall(ctx, v, L, input.upgrades, input.time)
  drawRightWall(ctx, v, L, input.upgrades, input)
  drawWindowLight(ctx, v, L)

  const objects = collectObjects(ctx, v, input, L)
  objects.sort((a, b) => a.depth - b.depth)
  for (const o of objects) o.draw()

  drawLamps(ctx, v, L, input.upgrades)
  applyLighting(ctx, v, L, input.upgrades, layer, dpr)

  // Statusbobler tegnes etter lyssettingen så de alltid er lesbare
  for (const a of input.crew.agents) {
    if (!a.bubble) continue
    const [sx, sy] = P(v, a.x, a.y, 0)
    drawBubble(ctx, v, sx, sy + (a.sitting ? 7 * v.s : 0), a.bubble, a.bubbleAlpha * a.alpha, input.time)
  }
  // Beboerens humør
  const mood = Math.sin(input.time * 0.35)
  if (mood > 0.55) {
    const [rx, ry] = P(v, 9.02, 4.82, 0.34)
    const icon = input.trivsel >= 60 ? 'hjerte' : input.trivsel < 35 ? 'stress' : 'kaffe'
    drawBubble(ctx, v, rx, ry + 7 * v.s, icon, Math.min(1, (mood - 0.55) * 6), input.time)
  }
}
