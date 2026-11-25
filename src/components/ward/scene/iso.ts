/**
 * Isometrisk projeksjon og tegneprimitiver for avdelingsvisningen.
 * Verdenskoordinater: x går ned mot høyre, y ned mot venstre, z rett opp.
 * Bakveggene står i planene x = 0 (venstre) og y = 0 (høyre).
 */
export const WORLD = {
  /** Total bredde langs x (vaktrom + korridor). */
  W: 10,
  /** Dybde langs y. */
  D: 5.5,
  /** Vegghøyde. */
  H: 2.7,
  /** x-koordinat der glassveggen deler vaktrom og korridor. */
  SPLIT: 4.6,
} as const

export interface View {
  ox: number
  oy: number
  /** Skjermbredde for én verdensenhet langs x/y (flisbredde). */
  tw: number
  th: number
  /** Skjermhøyde for én verdensenhet langs z. */
  zh: number
  /** Generell skala for detaljer (1 ved tw = 50). */
  s: number
  width: number
  height: number
}

export function makeView(width: number, height: number): View {
  const pad = 10
  const unitsW = (WORLD.W + WORLD.D) / 2
  const unitsH = (WORLD.W + WORLD.D) / 4 + (WORLD.H + 0.35) * 0.56 + 0.2
  const tw = Math.min((width - pad * 2) / unitsW, (height - pad * 2) / unitsH)
  const usedW = unitsW * tw
  const usedH = unitsH * tw
  return {
    tw,
    th: tw / 2,
    zh: tw * 0.56,
    s: tw / 50,
    ox: (width - usedW) / 2 + (WORLD.D * tw) / 2,
    oy: (height - usedH) / 2 + (WORLD.H + 0.35) * 0.56 * tw,
    width,
    height,
  }
}

export type Pt = [number, number]

export const P = (v: View, x: number, y: number, z = 0): Pt => [
  v.ox + ((x - y) * v.tw) / 2,
  v.oy + ((x + y) * v.th) / 2 - z * v.zh,
]

export function poly(ctx: CanvasRenderingContext2D, pts: Pt[], fill?: string | CanvasGradient, stroke?: string, lw = 1): void {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lw
    ctx.stroke()
  }
}

export interface BoxColors {
  top: string
  /** Flaten som vender mot +y (ned til venstre på skjermen). */
  left: string
  /** Flaten som vender mot +x (ned til høyre på skjermen). */
  right: string
  stroke?: string
}

/** Tegner de tre synlige flatene på en akseparallell boks. */
export function box(
  ctx: CanvasRenderingContext2D,
  v: View,
  x: number,
  y: number,
  z: number,
  dx: number,
  dy: number,
  dz: number,
  c: BoxColors,
): void {
  const z1 = z + dz
  poly(ctx, [P(v, x, y + dy, z), P(v, x + dx, y + dy, z), P(v, x + dx, y + dy, z1), P(v, x, y + dy, z1)], c.left, c.stroke, 0.6)
  poly(ctx, [P(v, x + dx, y, z), P(v, x + dx, y + dy, z), P(v, x + dx, y + dy, z1), P(v, x + dx, y, z1)], c.right, c.stroke, 0.6)
  poly(ctx, [P(v, x, y, z1), P(v, x + dx, y, z1), P(v, x + dx, y + dy, z1), P(v, x, y + dy, z1)], c.top, c.stroke, 0.6)
}

/**
 * Setter en transformasjon slik at man kan tegne «flatt» på et plan.
 * Koordinater oppgis i hundredeler av en verdensenhet (100 = 1 enhet),
 * med andreaksen pekende nedover fra `z` (så tekst står riktig vei).
 */
export function onPlaneY(ctx: CanvasRenderingContext2D, v: View, y: number, zTop: number, fn: () => void): void {
  // Plan med fast y: første akse = x, andre akse = nedover langs z.
  const [ex, ey] = P(v, 0, y, zTop)
  ctx.save()
  ctx.transform(v.tw / 200, v.th / 200, 0, v.zh / 100, ex, ey)
  fn()
  ctx.restore()
}

export function onPlaneX(ctx: CanvasRenderingContext2D, v: View, x: number, zTop: number, fn: () => void): void {
  // Plan med fast x: første akse = y (går mot venstre på skjermen), andre akse = nedover.
  const [ex, ey] = P(v, x, 0, zTop)
  ctx.save()
  ctx.transform(-v.tw / 200, v.th / 200, 0, v.zh / 100, ex, ey)
  fn()
  ctx.restore()
}

export function onFloor(ctx: CanvasRenderingContext2D, v: View, z: number, fn: () => void): void {
  const [ex, ey] = P(v, 0, 0, z)
  ctx.save()
  ctx.transform(v.tw / 200, v.th / 200, -v.tw / 200, v.th / 200, ex, ey)
  fn()
  ctx.restore()
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// ---------- Farger ----------

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const k = Math.max(0, Math.min(1, t))
  return `rgb(${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(b1 + (b2 - b1) * k)})`
}

export const shade = (hex: string, amount: number): string =>
  amount >= 0 ? mix(hex, '#ffffff', amount) : mix(hex, '#000000', -amount)

/** Lineær interpolasjon over nøkkelpunkter [t, verdi] der t er minutt på døgnet. */
export function keyframe(t: number, keys: [number, number][]): number {
  const day = 1440
  const m = ((t % day) + day) % day
  for (let i = 0; i < keys.length; i++) {
    const [t0, v0] = keys[i]
    const [t1raw, v1] = keys[(i + 1) % keys.length]
    const t1 = i === keys.length - 1 ? t1raw + day : t1raw
    const mm = i === keys.length - 1 && m < t0 ? m + day : m
    if (mm >= t0 && mm <= t1) return v0 + ((v1 - v0) * (mm - t0)) / (t1 - t0 || 1)
  }
  return keys[0][1]
}
