import type { Light } from '../scene/draw'
import { box, hexToRgb, onFloor, onPlaneX, onPlaneY, P, poly, roundRect, type BoxColors, type Pt as ScreenPt, type View } from '../scene/iso'

/**
 * Byggesettet til avdelingskartet: en dybdesortert scene og møblene som står
 * i den. Alt er satt sammen av de samme isometriske boksene og flatene som
 * vaktrommet bruker, så de to visningene ser ut som samme verden.
 *
 * Verdenskoordinater: x ned mot høyre, y ned mot venstre, z opp. Av en boks
 * ser vi toppen, flaten mot +y («front») og flaten mot +x («side»).
 */
export type Ctx = CanvasRenderingContext2D

/** Tegner på en flate. Mål i hundredeler av en enhet; origo øverst til venstre på flaten. */
export type Deco = (ctx: Ctx, w: number, h: number) => void

export interface BoxOpts {
  /** Forskyver dybden – negativt tegnes tidligere (bak), positivt senere (foran). */
  bias?: number
  /** Dekor på flaten mot +y. */
  front?: Deco
  /** Dekor på flaten mot +x. */
  side?: Deco
  top?: Deco
  colors?: BoxColors
  /** Hold boksen i ett stykke (små ting, eller ting ingen går bak). */
  whole?: boolean
}

// ---------- Farger ----------

const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('')}`

/** Blander to hex-farger og gir hex tilbake, så resultatet kan blandes videre. */
export function blend(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}
export const lighten = (c: string, t: number) => blend(c, '#ffffff', t)
export const darken = (c: string, t: number) => blend(c, '#1c2526', t)

/** Tre flater fra én farge: lys topp, og litt mørkere mot høyre. */
export const faces = (c: string): BoxColors => ({ top: lighten(c, 0.14), left: c, right: darken(c, 0.15) })

/** Høyden på bakveggene, på de nedskårne veggene foran, og på brystningen mot korridoren. */
export const WALL_H = 2.3
export const LOW = 0.5
export const MID = 0.9
/** Veggtykkelse. */
export const T = 0.12

export const C = {
  oak: '#C99D6B',
  oakDark: '#A97F52',
  birch: '#E8D2AC',
  teal: '#6F9684',
  tealDark: '#3F7A6A',
  skog: '#1E4D40',
  petrol: '#2B5B6C',
  rav: '#D97736',
  blekk: '#1C2526',
  krem: '#F7F5F0',
  papir: '#FFFDF8',
  steel: '#D5DADB',
  white: '#FBF8F1',
  wall: '#F7F0E3',
  wallSide: '#EFE6D6',
  wallTop: '#DDD2BE',
}

interface Item {
  depth: number
  draw: () => void
  /** Midtpunktet på gulvet, når det er kjent – brukes til å hoppe over ting langt unna. */
  cx?: number
  cy?: number
}

export interface LampSpot {
  x: number
  y: number
  z: number
  /** Radius i flisbredder og styrke 0–1. */
  r: number
  power: number
  warm: boolean
}

export class Scene {
  readonly items: Item[] = []
  /** Veggdekor som tegnes rett på bakveggene, før møblene. */
  readonly wallDecor: (() => void)[] = []
  /** Taklamper: tegnes øverst og lyser opp rommet om kvelden. */
  readonly pendants: { x: number; y: number; on: number; room?: string }[] = []
  /** Det som beveger seg (damp): tegnes hvert bilde, oppå det mellomlagrede. */
  readonly live: (() => void)[] = []
  /** Hvor langt utenfor bildet (i flisbredder) ting fortsatt tegnes. */
  margin = 2.2
  /** Når satt: bare ting nær dette utsnittet tegnes (maskering rundt en figur). */
  mask: { x: number; y: number; w: number; h: number } | null = null
  /** Andre lyskilder: gulvlamper, skjermer, nattlys. */
  readonly lamps: LampSpot[] = []

  constructor(
    readonly ctx: Ctx,
    readonly v: View,
    public time: number,
    public L: Light,
  ) {}

  add(depth: number, draw: () => void): void {
    this.items.push({ depth, draw })
  }

  /** Er punktet i nærheten av bildet? Sparer tegning når man har zoomet inn. */
  near(x: number, y: number, z = 0): boolean {
    const [sx, sy] = P(this.v, x, y, z)
    const m = this.v.tw * this.margin
    const r = this.mask
    if (r) return sx > r.x - m && sx < r.x + r.w + m && sy > r.y - m && sy < r.y + r.h + m
    return sx > -m && sx < this.v.width + m && sy > -m && sy < this.v.height + m
  }

  /**
   * En boks. Lange bokser deles i korte biter langs lengderetningen, så
   * figurer kan stå både foran og bak dem uten at rekkefølgen blir feil.
   */
  box(x: number, y: number, z: number, w: number, d: number, h: number, color: string, o: BoxOpts = {}): void {
    const { ctx, v } = this
    const c = o.colors ?? faces(color)
    const alongX = w >= d
    const len = alongX ? w : d
    const n = !o.whole && len > 1.0 ? Math.ceil(len / 0.6) : 1
    for (let i = 0; i < n; i++) {
      const px = alongX ? x + (w * i) / n : x
      const py = alongX ? y : y + (d * i) / n
      // Bitene overlapper en anelse, så det ikke blir sprekker i skjøtene.
      const pw = alongX ? w / n + (i < n - 1 ? 0.012 : 0) : w
      const pd = alongX ? d : d / n + (i < n - 1 ? 0.012 : 0)
      this.items.push({
        depth: px + (alongX ? w / n : w) / 2 + py + (alongX ? d : d / n) / 2 + (o.bias ?? 0),
        cx: px + pw / 2,
        cy: py + pd / 2,
        draw: () => {
          if (!this.near(px + pw / 2, py + pd / 2, z + h / 2)) return
          box(ctx, v, px, py, z, pw, pd, h, c)
          if (o.front) {
            this.clipped(n > 1, [P(v, px, y + d, z), P(v, px + pw, y + d, z), P(v, px + pw, y + d, z + h), P(v, px, y + d, z + h)], () =>
              onPlaneY(ctx, v, y + d, z + h, () => {
                ctx.translate(x * 100, 0)
                o.front!(ctx, w * 100, h * 100)
              }),
            )
          }
          if (o.side) {
            this.clipped(n > 1, [P(v, x + w, py, z), P(v, x + w, py + pd, z), P(v, x + w, py + pd, z + h), P(v, x + w, py, z + h)], () =>
              onPlaneX(ctx, v, x + w, z + h, () => {
                ctx.translate(y * 100, 0)
                o.side!(ctx, d * 100, h * 100)
              }),
            )
          }
          if (o.top) {
            this.clipped(n > 1, [P(v, px, py, z + h), P(v, px + pw, py, z + h), P(v, px + pw, py + pd, z + h), P(v, px, py + pd, z + h)], () =>
              onFloor(ctx, v, z + h, () => {
                ctx.translate(x * 100, y * 100)
                o.top!(ctx, w * 100, d * 100)
              }),
            )
          }
        },
      })
    }
  }

  private clipped(clip: boolean, quad: ScreenPt[], fn: () => void): void {
    const { ctx } = this
    ctx.save()
    if (clip) {
      ctx.beginPath()
      ctx.moveTo(quad[0][0], quad[0][1])
      for (let i = 1; i < quad.length; i++) ctx.lineTo(quad[i][0], quad[i][1])
      ctx.closePath()
      ctx.clip()
    }
    fn()
    ctx.restore()
  }

  /** Tegner rett på gulvet nå (mønster, tepper). Mål i hundredeler, origo i (x, y). */
  floor(x: number, y: number, w: number, d: number, fn: Deco, z = 0.003): void {
    const { ctx, v } = this
    onFloor(ctx, v, z, () => {
      ctx.translate(x * 100, y * 100)
      ctx.beginPath()
      ctx.rect(0, 0, w * 100, d * 100)
      ctx.clip()
      fn(ctx, w * 100, d * 100)
    })
  }

  /** Tegner alt bakfra og fram. Lista beholdes, sortert, til maskering rundt figurene. */
  flush(): void {
    this.items.sort((a, b) => a.depth - b.depth)
    for (const item of this.items) item.draw()
  }

  /** Tegner om igjen det som står foran en gitt dybde. */
  drawInFront(depth: number, x: number, y: number): void {
    const items = this.items
    let lo = 0
    let hi = items.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (items[mid].depth <= depth) lo = mid + 1
      else hi = mid
    }
    for (let i = lo; i < items.length; i++) {
      const it = items[i]
      // Det som står mer enn et par meter unna kan ikke dekke figuren.
      if (it.cx !== undefined && Math.abs(it.cx - x) + Math.abs(it.cy! - y) > 4.6) continue
      it.draw()
    }
  }
}

// ---------- Mønstre og flatedekor ----------

/** Parkett: bord på langs med forskjøvne skjøter. */
export const planks = (line = 'rgba(120,78,36,0.2)'): Deco => (ctx, w, h) => {
  ctx.strokeStyle = line
  ctx.lineWidth = 3
  ctx.beginPath()
  let row = 0
  for (let y = 0; y < h; y += 55, row++) {
    if (y > 0) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    for (let x = (row % 3) * 60 + 50; x < w; x += 170) {
      ctx.moveTo(x, y)
      ctx.lineTo(x, Math.min(h, y + 55))
    }
  }
  ctx.stroke()
}

export const tiles = (size = 90, line = 'rgba(30,77,64,0.08)'): Deco => (ctx, w, h) => {
  ctx.strokeStyle = line
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let x = size; x < w; x += size) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
  }
  for (let y = size; y < h; y += size) {
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
  }
  ctx.stroke()
}

export const checker = (size: number, dark: string): Deco => (ctx, w, h) => {
  ctx.fillStyle = dark
  for (let y = 0, r = 0; y < h; y += size, r++) for (let x = (r % 2) * size; x < w; x += size * 2) ctx.fillRect(x, y, size, size)
}

/** Teppe med bord – som under rapportbordet. */
export function rug(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, border: string): void {
  ctx.fillStyle = fill
  roundRect(ctx, x, y, w, h, 26)
  ctx.fill()
  ctx.strokeStyle = border
  ctx.lineWidth = 5
  roundRect(ctx, x + 14, y + 14, w - 28, h - 28, 18)
  ctx.stroke()
}

/** Skapdører med håndtak. */
export const doorFronts = (n: number, line = 'rgba(30,60,50,0.35)', knob = '#F4EEE2'): Deco => (ctx, w, h) => {
  const pw = (w - 8) / n
  ctx.strokeStyle = line
  ctx.lineWidth = 2.5
  for (let i = 0; i < n; i++) {
    ctx.strokeRect(6 + i * pw, 8, pw - 4, h - 16)
    ctx.fillStyle = knob
    ctx.fillRect(i % 2 === 0 ? 6 + i * pw + pw - 13 : 6 + i * pw + 5, h * 0.42, 4, 12)
  }
}

export const drawerFronts = (rows: number, cols = 1, line = 'rgba(90,60,30,0.32)', knob = 'rgba(60,40,20,0.55)'): Deco => (ctx, w, h) => {
  const pw = (w - 8) / cols
  const ph = (h - 8) / rows
  ctx.strokeStyle = line
  ctx.lineWidth = 2.5
  ctx.fillStyle = knob
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      ctx.strokeRect(6 + c * pw, 6 + r * ph, pw - 4, ph - 4)
      ctx.fillRect(4 + c * pw + pw / 2 - 7, 4 + r * ph + ph / 2 - 2, 14, 4)
    }
}

/** En skjerm med et journalbilde. */
export const screenFace: Deco = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#DDF0F5')
  g.addColorStop(1, '#B9DCE6')
  ctx.fillStyle = g
  ctx.fillRect(3, 3, w - 6, h - 6)
  ctx.fillStyle = C.skog
  ctx.fillRect(3, 3, w - 6, 6)
  ctx.fillStyle = 'rgba(43,91,108,0.55)'
  for (let i = 0; i < 4; i++) ctx.fillRect(7, 13 + i * 5.5, (w - 20) * (0.5 + ((i * 7) % 5) / 10), 2.5)
  ctx.fillStyle = C.rav
  ctx.fillRect(w - 16, h - 12, 9, 6)
}

/** Ark og gule lapper strødd på en bordplate. */
export const papers = (seed = 0): Deco => (ctx, w, h) => {
  const sheet = (x: number, y: number, rot: number, tint: string) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.fillStyle = C.papir
    ctx.fillRect(-16, -22, 32, 44)
    ctx.fillStyle = tint
    for (let i = 0; i < 4; i++) ctx.fillRect(-11, -15 + i * 8, 22 - (i % 2) * 7, 2.5)
    ctx.restore()
  }
  sheet(w * 0.28, h * 0.42, 0.12 + seed * 0.1, 'rgba(28,37,38,0.3)')
  sheet(w * 0.68, h * 0.6, -0.2, 'rgba(43,91,108,0.4)')
  ctx.fillStyle = '#FBE38A'
  ctx.fillRect(w * 0.47, h * 0.3, 17, 17)
  ctx.fillStyle = '#F9BFCC'
  ctx.fillRect(w * 0.5, h * 0.66, 14, 14)
}

// ---------- Vinduer og bilder (på en veggflate) ----------

/**
 * Vindu med himmel, sprosser og gardiner, tegnet i veggflatens koordinater.
 * Himmelen følger døgnet: skyer og åser om dagen, måne og stjerner om natta.
 */
export function drawWindow(ctx: Ctx, L: Light, time: number, x0: number, top: number, w: number, h: number, curtain = '#E7C9AE'): void {
  ctx.fillStyle = C.white
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
    const a = (L.night - 0.35) / 0.65
    ctx.globalAlpha = a
    ctx.fillStyle = '#FBF3D5'
    ctx.beginPath()
    ctx.arc(x0 + w * 0.28, top + h * 0.32, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = L.skyTop
    ctx.beginPath()
    ctx.arc(x0 + w * 0.28 + 8, top + h * 0.32 - 5, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    for (const [fx, fy, r] of [[0.68, 0.2, 2.6], [0.85, 0.5, 2], [0.55, 0.58, 1.8], [0.18, 0.7, 2], [0.78, 0.82, 1.6]] as const) {
      ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(time * 1.3 + fx * 40 + x0))
      ctx.beginPath()
      ctx.arc(x0 + w * fx, top + h * fy, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  } else {
    if (L.warm > 0.05) {
      ctx.globalAlpha = Math.min(1, L.warm * 1.6)
      ctx.fillStyle = '#FFE2A8'
      ctx.beginPath()
      ctx.arc(x0 + w * 0.66, top + h - 22, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - L.night)})`
    const drift = (time * 3 + x0) % (w + 90)
    for (const cx of [drift - 60, drift + w * 0.5 - 60]) {
      ctx.beginPath()
      ctx.ellipse(x0 + cx, top + h * 0.28, 28, 8, 0, 0, Math.PI * 2)
      ctx.ellipse(x0 + cx + 17, top + h * 0.22, 19, 8, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = blend(blend('#8FB39A', '#5E6F8F', L.warm), '#1A2848', L.night)
    ctx.beginPath()
    ctx.moveTo(x0, top + h)
    ctx.quadraticCurveTo(x0 + w * 0.28, top + h - 44, x0 + w * 0.55, top + h - 16)
    ctx.quadraticCurveTo(x0 + w * 0.78, top + h - 38, x0 + w, top + h - 20)
    ctx.lineTo(x0 + w, top + h)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  ctx.fillStyle = C.white
  ctx.fillRect(x0 + w / 2 - 3.5, top, 7, h)
  ctx.fillRect(x0, top + h * 0.36, w, 6)
  for (const gx of [x0 - 22, x0 + w - 6]) {
    ctx.fillStyle = curtain
    roundRect(ctx, gx, top - 16, 28, h + 40, 5)
    ctx.fill()
    ctx.fillStyle = 'rgba(120,80,50,0.2)'
    ctx.fillRect(gx + 8, top - 14, 3, h + 36)
    ctx.fillRect(gx + 18, top - 14, 3, h + 36)
  }
  ctx.fillStyle = '#9A7650'
  roundRect(ctx, x0 - 34, top - 24, w + 68, 7, 3)
  ctx.fill()
}

/** Innrammet bilde: fjord, soloppgang eller blomster. */
export function drawPicture(ctx: Ctx, x: number, y: number, w: number, h: number, motif: number): void {
  ctx.fillStyle = 'rgba(28,37,38,0.12)'
  ctx.fillRect(x + 3, y + 4, w, h)
  ctx.fillStyle = motif % 2 ? '#9A7650' : '#F4EEE2'
  ctx.fillRect(x, y, w, h)
  const ix = x + 5
  const iy = y + 5
  const iw = w - 10
  const ih = h - 10
  ctx.save()
  ctx.beginPath()
  ctx.rect(ix, iy, iw, ih)
  ctx.clip()
  const kind = motif % 3
  if (kind === 0) {
    ctx.fillStyle = '#CFE6EE'
    ctx.fillRect(ix, iy, iw, ih)
    ctx.fillStyle = '#7FA79B'
    ctx.beginPath()
    ctx.moveTo(ix, iy + ih * 0.7)
    ctx.lineTo(ix + iw * 0.35, iy + ih * 0.25)
    ctx.lineTo(ix + iw * 0.6, iy + ih * 0.7)
    ctx.fill()
    ctx.fillStyle = '#5E8F86'
    ctx.beginPath()
    ctx.moveTo(ix + iw * 0.4, iy + ih * 0.7)
    ctx.lineTo(ix + iw * 0.75, iy + ih * 0.35)
    ctx.lineTo(ix + iw, iy + ih * 0.7)
    ctx.fill()
    ctx.fillStyle = '#3E7C93'
    ctx.fillRect(ix, iy + ih * 0.7, iw, ih * 0.3)
  } else if (kind === 1) {
    ctx.fillStyle = '#F6DDB4'
    ctx.fillRect(ix, iy, iw, ih)
    ctx.fillStyle = '#E9925A'
    ctx.beginPath()
    ctx.arc(ix + iw / 2, iy + ih * 0.72, ih * 0.34, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#8C6A7A'
    ctx.fillRect(ix, iy + ih * 0.72, iw, ih * 0.3)
  } else {
    ctx.fillStyle = '#EEF0E4'
    ctx.fillRect(ix, iy, iw, ih)
    for (const [fx, fy, col] of [[0.3, 0.45, '#D9534F'], [0.55, 0.35, '#E9C46A'], [0.7, 0.55, '#C2566A'], [0.45, 0.62, '#E08A3C']] as const) {
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(ix + iw * fx, iy + ih * fy, Math.min(iw, ih) * 0.13, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#3F8A63'
    ctx.fillRect(ix + iw * 0.47, iy + ih * 0.62, 3, ih * 0.38)
  }
  ctx.restore()
}

// ---------- Møbler ----------

type Dir = 'n' | 's' | 'w' | 'e'

/** Pinnestol. `back` er siden ryggen står på. */
export function chair(sc: Scene, cx: number, cy: number, back: Dir, seat = '#A97F52', frame = '#7A5A38'): void {
  const { ctx, v } = sc
  const x = cx - 0.175
  const y = cy - 0.175
  const s = faces(seat)
  sc.add(cx + cy - 0.02, () => {
    if (!sc.near(cx, cy)) return
    box(ctx, v, x + 0.14, y + 0.14, 0, 0.07, 0.07, 0.4, faces(frame))
    box(ctx, v, x, y, 0.4, 0.35, 0.35, 0.07, s)
  })
  const b = (bx: number, by: number, bw: number, bd: number, bias: number) => sc.add(cx + cy + bias, () => sc.near(cx, cy) && box(ctx, v, bx, by, 0.47, bw, bd, 0.36, s))
  if (back === 'n') b(x, y, 0.35, 0.05, -0.25)
  if (back === 's') b(x, y + 0.3, 0.35, 0.05, 0.36)
  if (back === 'w') b(x, y, 0.05, 0.35, -0.25)
  if (back === 'e') b(x + 0.3, y, 0.05, 0.35, 0.36)
}

/** Kontorstol på hjul. */
export function officeChair(sc: Scene, cx: number, cy: number, back: Dir, color = '#3D7868'): void {
  const { ctx, v } = sc
  sc.add(cx + cy - 0.03, () => {
    if (!sc.near(cx, cy)) return
    const [sx, sy] = P(v, cx, cy, 0.02)
    ctx.fillStyle = '#3A3E3F'
    ctx.beginPath()
    ctx.ellipse(sx, sy, v.tw * 0.2, v.tw * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()
    box(ctx, v, cx - 0.03, cy - 0.03, 0.03, 0.06, 0.06, 0.37, faces('#55595A'))
  })
  chair(sc, cx, cy, back, color, '#2B5B4D')
}

/** Bord med fire bein. */
export function table(sc: Scene, x: number, y: number, w: number, d: number, top = C.oak, leg = '#8A6A45', deco?: Deco, h = 0.7): void {
  const { ctx, v } = sc
  for (const [lx, ly] of [[x + 0.06, y + 0.06], [x + w - 0.14, y + 0.06], [x + 0.06, y + d - 0.14], [x + w - 0.14, y + d - 0.14]]) {
    sc.add(lx + ly + 0.04, () => sc.near(lx, ly) && box(ctx, v, lx, ly, 0, 0.08, 0.08, h, faces(leg)))
  }
  sc.box(x, y, h, w, d, 0.07, top, { top: deco, colors: { top, left: darken(top, 0.14), right: darken(top, 0.24) } })
}

/** Benkeskap med plate, som kjøkkenbenken i vaktrommet. `facing` er siden frontene vender. */
export function counter(sc: Scene, x: number, y: number, w: number, d: number, facing: 's' | 'e', color = C.teal, topColor = C.birch, topDeco?: Deco): void {
  const n = Math.max(1, Math.round((facing === 's' ? w : d) / 0.55))
  sc.box(x, y, 0, w, d, 0.84, color, { [facing === 's' ? 'front' : 'side']: doorFronts(n) })
  sc.box(x - 0.02, y - 0.02, 0.84, w + 0.05, d + 0.05, 0.05, topColor, { top: topDeco, bias: 0.01, colors: { top: topColor, left: darken(topColor, 0.18), right: darken(topColor, 0.1) } })
}

/** Skap eller hylle med dekor på fronten. */
export function cabinet(sc: Scene, x: number, y: number, w: number, d: number, h: number, color: string, facing: 's' | 'e', deco: Deco): void {
  sc.box(x, y, 0, w, d, h, color, { [facing === 's' ? 'front' : 'side']: deco })
}

/** Permer eller bøker på rekke oppå noe. */
export function binders(sc: Scene, x: number, y: number, z: number, n: number, along: 'x' | 'y' = 'x'): void {
  const { ctx, v } = sc
  const cols = ['#2B5B6C', '#D97736', '#1E4D40', '#E9C46A', '#B4432F', '#2B5B6C', '#7A6A8C']
  sc.add(x + y + (along === 'x' ? n * 0.05 : 0.13) + (along === 'y' ? n * 0.05 : 0.13) + 0.05, () => {
    if (!sc.near(x, y, z)) return
    for (let i = 0; i < n; i++) {
      const c = cols[i % cols.length]
      if (along === 'x') box(ctx, v, x + i * 0.105, y, z, 0.095, 0.26, 0.3, faces(c))
      else box(ctx, v, x, y + i * 0.105, z, 0.26, 0.095, 0.3, faces(c))
    }
  })
}

/** Sykehusseng med hodegavl mot nord, dyne og pute. Opptar 0,95 × 2,0. */
export function bed(sc: Scene, x: number, y: number, duvet: string): void {
  const { ctx, v } = sc
  // Hodegavl og fotgavl i tre
  sc.add(x + 0.47 + y - 0.1, () => sc.near(x, y) && box(ctx, v, x, y - 0.05, 0, 0.95, 0.07, 0.92, faces(C.oak)))
  sc.box(x + 0.05, y + 0.05, 0.1, 0.85, 1.9, 0.14, '#B9B2A4')
  sc.box(x + 0.03, y, 0.24, 0.89, 2.0, 0.2, '#F6F3EC', { bias: 0.005 })
  sc.box(x + 0.01, y + 0.62, 0.44, 0.93, 1.36, 0.09, duvet, {
    bias: 0.01,
    top: (c, w, h) => {
      c.fillStyle = lighten(duvet, 0.45)
      c.fillRect(0, 0, w, 22)
      c.strokeStyle = 'rgba(40,34,28,0.1)'
      c.lineWidth = 2.5
      c.beginPath()
      c.moveTo(w * 0.5, 30)
      c.lineTo(w * 0.5, h)
      c.stroke()
    },
  })
  sc.add(x + 0.47 + y + 0.31 + 0.02, () => sc.near(x, y) && box(ctx, v, x + 0.17, y + 0.12, 0.44, 0.6, 0.38, 0.1, { top: '#FFFFFF', left: '#ECE8DF', right: '#DDD8CC' }))
  sc.add(x + 0.47 + y + 2.02, () => sc.near(x, y + 2) && box(ctx, v, x, y + 1.98, 0, 0.95, 0.06, 0.56, faces(C.oak)))
}

/** Lenestol med pute, 0,7 × 0,7. `facing` er retningen den som sitter ser. */
export function armchair(sc: Scene, cx: number, cy: number, facing: Dir, color = '#D98B5A', cushion: string | null = '#E9C46A'): void {
  const { ctx, v } = sc
  const x = cx - 0.35
  const y = cy - 0.35
  const f = faces(color)
  const part = (px: number, py: number, pz: number, pw: number, pd: number, ph: number, bias: number, col = f) =>
    sc.add(cx + cy + bias, () => sc.near(cx, cy) && box(ctx, v, px, py, pz, pw, pd, ph, col))
  part(x, y, 0, 0.7, 0.7, 0.3, -0.04)
  part(x + 0.1, y + 0.1, 0.3, 0.5, 0.5, 0.08, -0.02, faces(lighten(color, 0.14)))
  const back: Dir = facing === 's' ? 'n' : facing === 'n' ? 's' : facing === 'e' ? 'w' : 'e'
  if (back === 'n') part(x, y, 0.3, 0.7, 0.14, 0.5, -0.3)
  if (back === 's') part(x, y + 0.56, 0.3, 0.7, 0.14, 0.5, 0.4)
  if (back === 'w') part(x, y, 0.3, 0.14, 0.7, 0.5, -0.3)
  if (back === 'e') part(x + 0.56, y, 0.3, 0.14, 0.7, 0.5, 0.4)
  // Armlener på de to sidene ved siden av ryggen
  if (back === 'n' || back === 's') {
    part(x, y, 0.3, 0.12, 0.7, 0.2, -0.28)
    part(x + 0.58, y, 0.3, 0.12, 0.7, 0.2, 0.34)
  } else {
    part(x, y, 0.3, 0.7, 0.12, 0.2, -0.28)
    part(x, y + 0.58, 0.3, 0.7, 0.12, 0.2, 0.34)
  }
  if (cushion) {
    const cz = faces(cushion)
    if (back === 'n') part(x + 0.2, y + 0.14, 0.38, 0.3, 0.1, 0.24, -0.1, cz)
    if (back === 'w') part(x + 0.14, y + 0.2, 0.38, 0.1, 0.3, 0.24, -0.1, cz)
  }
}

/** Sofa. `facing` 'e': langs y med ryggen mot vest; 's': langs x med ryggen mot nord. */
export function sofa(sc: Scene, x: number, y: number, len: number, facing: 'e' | 's', color: string): void {
  const seams: Deco = (c, w, h) => {
    c.strokeStyle = 'rgba(28,37,38,0.16)'
    c.lineWidth = 3
    c.beginPath()
    const n = 3
    for (let i = 1; i < n; i++) {
      if (facing === 'e') {
        c.moveTo(16, (h * i) / n)
        c.lineTo(w, (h * i) / n)
      } else {
        c.moveTo((w * i) / n, 16)
        c.lineTo((w * i) / n, h)
      }
    }
    c.stroke()
  }
  if (facing === 'e') {
    sc.box(x, y, 0, 0.8, len, 0.3, color)
    sc.box(x + 0.16, y + 0.14, 0.3, 0.64, len - 0.28, 0.09, lighten(color, 0.12), { top: seams, bias: 0.01 })
    sc.box(x, y, 0.3, 0.16, len, 0.5, darken(color, 0.06), { bias: -0.3 })
    sc.box(x, y, 0.3, 0.8, 0.14, 0.22, color, { bias: -0.2, whole: true })
    sc.box(x, y + len - 0.14, 0.3, 0.8, 0.14, 0.22, color, { bias: 0.3, whole: true })
  } else {
    sc.box(x, y, 0, len, 0.8, 0.3, color)
    sc.box(x + 0.14, y + 0.16, 0.3, len - 0.28, 0.64, 0.09, lighten(color, 0.12), { top: seams, bias: 0.01 })
    sc.box(x, y, 0.3, len, 0.16, 0.5, darken(color, 0.06), { bias: -0.3 })
    sc.box(x, y, 0.3, 0.14, 0.8, 0.22, color, { bias: -0.2, whole: true })
    sc.box(x + len - 0.14, y, 0.3, 0.14, 0.8, 0.22, color, { bias: 0.3, whole: true })
  }
}

function leafBlob(ctx: Ctx, x: number, y: number, r: number, color: string, time: number, sway = 1): void {
  const s = Math.sin(time * 1.1 + x * 0.05) * r * 0.06 * sway
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x + s, y, r, 0, Math.PI * 2)
  ctx.arc(x - r * 0.7 + s * 0.6, y + r * 0.5, r * 0.72, 0, Math.PI * 2)
  ctx.arc(x + r * 0.75 + s * 0.6, y + r * 0.45, r * 0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.beginPath()
  ctx.arc(x - r * 0.25 + s, y - r * 0.25, r * 0.45, 0, Math.PI * 2)
  ctx.fill()
}

/** Potteplante. `z` løfter den opp på et møbel. */
export function plant(sc: Scene, cx: number, cy: number, size = 1, z = 0, flower: string | null = null): void {
  const { ctx, v } = sc
  sc.add(cx + cy + 0.06, () => {
    if (!sc.near(cx, cy, z)) return
    const p = 0.14 * size
    box(ctx, v, cx - p, cy - p, z, p * 2, p * 2, 0.24 * size, { top: '#8C4E2A', left: '#B5653A', right: '#A2572F' })
    const [px, py] = P(v, cx, cy, z + 0.5 * size)
    leafBlob(ctx, px, py, 11 * v.s * size, '#3F8A63', sc.time)
    leafBlob(ctx, px - 3 * v.s * size, py - 9 * v.s * size, 8 * v.s * size, '#56A078', sc.time, 1.6)
    if (flower) {
      ctx.fillStyle = flower
      for (const [dx, dy] of [[-5, -10], [4, -6], [0, -15]]) {
        ctx.beginPath()
        ctx.arc(px + dx * v.s * size, py + dy * v.s * size, 2.6 * v.s * size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
}

/** Gulvlampe med skjerm – lyser varmt om kvelden. */
export function floorLamp(sc: Scene, cx: number, cy: number): void {
  const { ctx, v } = sc
  sc.lamps.push({ x: cx, y: cy, z: 0.9, r: 1.5, power: 0.8, warm: true })
  sc.add(cx + cy + 0.05, () => {
    if (!sc.near(cx, cy, 1)) return
    box(ctx, v, cx - 0.1, cy - 0.1, 0, 0.2, 0.2, 0.03, faces('#8A7A63'))
    const [bx, by] = P(v, cx, cy, 0.03)
    const [tx, ty] = P(v, cx, cy, 1.3)
    ctx.strokeStyle = '#B79A6C'
    ctx.lineWidth = 2 * v.s
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(tx, ty)
    ctx.stroke()
    const s = v.s
    ctx.fillStyle = sc.L.lamp > 0.05 ? blend('#F4E3B8', '#FFE7A8', sc.L.lamp) : '#F1E2BC'
    ctx.beginPath()
    ctx.moveTo(tx - 6 * s, ty - 15 * s)
    ctx.lineTo(tx + 6 * s, ty - 15 * s)
    ctx.lineTo(tx + 11 * s, ty + 2 * s)
    ctx.lineTo(tx - 11 * s, ty + 2 * s)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(150,110,50,0.18)'
    ctx.fillRect(tx - 11 * s, ty - 0.5 * s, 22 * s, 2.5 * s)
  })
}

/** Liten bordlampe oppå noe. */
export function tableLamp(sc: Scene, cx: number, cy: number, z: number): void {
  const { ctx, v } = sc
  sc.lamps.push({ x: cx, y: cy, z: z + 0.2, r: 0.85, power: 0.34, warm: true })
  sc.add(cx + cy + 0.2, () => {
    if (!sc.near(cx, cy, z)) return
    const [bx, by] = P(v, cx, cy, z)
    const s = v.s
    ctx.fillStyle = '#B5653A'
    ctx.fillRect(bx - 1.5 * s, by - 9 * s, 3 * s, 9 * s)
    ctx.fillStyle = sc.L.lamp > 0.05 ? '#FFE7A8' : '#F1E2BC'
    ctx.beginPath()
    ctx.moveTo(bx - 3.5 * s, by - 17 * s)
    ctx.lineTo(bx + 3.5 * s, by - 17 * s)
    ctx.lineTo(bx + 6.5 * s, by - 8 * s)
    ctx.lineTo(bx - 6.5 * s, by - 8 * s)
    ctx.closePath()
    ctx.fill()
  })
}

/** Skjerm på fot. `facing` er siden bildet vender. */
export function monitor(sc: Scene, cx: number, cy: number, z: number, facing: 's' | 'e'): void {
  const { ctx, v } = sc
  sc.lamps.push({ x: cx, y: cy, z: z + 0.3, r: 0.8, power: 0.5, warm: false })
  sc.add(cx + cy + 0.1, () => {
    if (!sc.near(cx, cy, z)) return
    const dark = { top: '#3A3E3F', left: '#232728', right: '#1C2526' }
    box(ctx, v, cx - 0.04, cy - 0.04, z, 0.08, 0.08, 0.14, dark)
    if (facing === 's') {
      box(ctx, v, cx - 0.32, cy - 0.025, z + 0.14, 0.64, 0.05, 0.4, dark)
      onPlaneY(ctx, v, cy + 0.025, z + 0.54, () => {
        ctx.translate((cx - 0.32) * 100, 0)
        screenFace(ctx, 64, 40)
      })
    } else {
      box(ctx, v, cx - 0.025, cy - 0.32, z + 0.14, 0.05, 0.64, 0.4, dark)
      onPlaneX(ctx, v, cx + 0.025, z + 0.54, () => {
        ctx.translate((cy - 0.32) * 100, 0)
        screenFace(ctx, 64, 40)
      })
    }
  })
}

/** Damp som stiger fra kaffe og kjeler. */
export function steam(sc: Scene, x: number, y: number, z: number, strength = 1): void {
  const { ctx, v } = sc
  sc.live.push(() => {
    if (!sc.near(x, y, z)) return
    const [sx, sy] = P(v, x, y, z)
    for (let i = 0; i < 3; i++) {
      const t = (sc.time * 0.5 + i / 3) % 1
      ctx.fillStyle = `rgba(255,255,255,${0.42 * (1 - t) * strength})`
      ctx.beginPath()
      ctx.arc(sx + Math.sin(t * 5 + i * 2) * 3 * v.s, sy - t * 20 * v.s, (2.2 + t * 3.5) * v.s, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

/** Kopp, krus eller liten boks oppå noe. */
export function mug(sc: Scene, x: number, y: number, z: number, color: string, size = 0.1): void {
  const { ctx, v } = sc
  sc.add(x + y + size + 0.12, () => sc.near(x, y, z) && box(ctx, v, x, y, z, size, size, size, { top: lighten(color, 0.3), left: color, right: darken(color, 0.15) }))
}

/** Fruktfat. */
export function fruitBowl(sc: Scene, cx: number, cy: number, z: number): void {
  const { ctx, v } = sc
  sc.add(cx + cy + 0.2, () => {
    if (!sc.near(cx, cy, z)) return
    const [fx, fy] = P(v, cx, cy, z + 0.03)
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
}

/** Firkant på gulvet i verdenskoordinater. */
export const quad = (v: View, x: number, y: number, w: number, d: number, z = 0): ScreenPt[] => [P(v, x, y, z), P(v, x + w, y, z), P(v, x + w, y + d, z), P(v, x, y + d, z)]

export { box, onFloor, onPlaneX, onPlaneY, P, poly, roundRect }
