import type { Agent, AgentLook, Aid, Anim, BubbleIcon, CarryItem, Garment, ResidentAgent, Walker } from './agents'
import { roundRect, shade, type View } from './iso'
import { HAIR_COLORS, HAIR_STYLE, SCARF_COLORS, SCRUBS, SKIN_TONES } from './palette'

export interface FigureStyle {
  top: string
  trousers: string
  skin: string
  hair: string
  hairStyle: number
  accessory: number
  /** Beboere har ikke ID-kort og hvite sko. */
  staff: boolean
  /** Sivile klær: cardigan, ytterjakke, morgenkåpe eller hettegenser. */
  garment?: Garment
  /** Skjorta under cardiganen. */
  inner?: string
  shoes?: string
  /** Eldre går litt lutet. */
  elderly?: boolean
}

/** Beboere og pårørende: sivile klær, tøfler og eventuelt jakke eller morgenkåpe utenpå. */
export function residentStyle(r: ResidentAgent): FigureStyle {
  const p = r.persona
  const garment = r.wear ?? p.garment
  return {
    top: garment === 'kaape' ? '#B9C7D6' : garment === 'jakke' && r.kind === 'beboer' ? '#5C6B4E' : p.top,
    trousers: garment === 'kaape' ? '#D8DEE4' : p.trousers,
    skin: p.skin,
    hair: p.hair,
    hairStyle: p.hairStyle,
    accessory: p.accessory,
    staff: false,
    garment,
    inner: p.inner,
    shoes: p.shoes,
    elderly: p.elderly,
  }
}

export function styleFor(look: AgentLook): FigureStyle {
  const scrubs = SCRUBS[look.profession]
  return {
    top: scrubs.top,
    trousers: scrubs.trousers,
    skin: SKIN_TONES[look.skin % SKIN_TONES.length],
    hair: (look.hairStyle === HAIR_STYLE.hijab ? SCARF_COLORS : HAIR_COLORS)[look.hair % HAIR_COLORS.length],
    hairStyle: look.hairStyle,
    accessory: look.accessory,
    staff: true,
  }
}

export interface Pose {
  /** Fotpunkt på skjermen. */
  sx: number
  sy: number
  flip: 1 | -1
  away: boolean
  sitting: boolean
  walking: boolean
  phase: number
  time: number
  alpha: number
  tired: boolean
  /** 0–1: hvor travelt figuren har det. Gir foroverlent holdning og fartsstreker. */
  hurry?: number
  carry?: CarryItem | null
  aid?: Aid | null
  anim?: Anim | null
}

/** Tegner en stilisert figur. Alt er enkle former – ingen rigg, bare litt sprett. */
export function drawFigure(ctx: CanvasRenderingContext2D, v: View, st: FigureStyle, p: Pose): void {
  const s = v.s
  const wheel = p.aid === 'rullestol'
  const frame = !wheel && !p.sitting && (p.aid === 'rullator' || p.aid === 'prekestol') ? p.aid : null
  const seated = p.sitting || wheel
  const swing = p.walking && !wheel ? Math.sin(p.phase) * (st.elderly ? 0.7 : 1) : 0
  const bounce = p.anim === 'sprett' ? Math.abs(Math.sin(p.time * 5)) * 3.2 * s : 0
  const bob = (p.walking && !wheel ? Math.abs(Math.sin(p.phase)) * (st.elderly ? 1.4 : 2.4) * s : Math.sin(p.time * 2 + p.phase) * 0.5 * s) + bounce
  const sit = wheel ? 4 * s : p.sitting ? 7 * s : 0

  ctx.save()
  ctx.globalAlpha *= p.alpha
  ctx.translate(p.sx, p.sy)

  // Skygge
  ctx.fillStyle = 'rgba(28,37,38,0.2)'
  ctx.beginPath()
  ctx.ellipse(0, 0, (9 - (p.walking ? Math.abs(swing) : 0)) * s, 4 * s, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.scale(p.flip, 1)
  const hurry = p.walking ? (p.hurry ?? 0) : 0
  const lean = (p.tired ? 1.5 * s : hurry * 2.6 * s) + (st.elderly && !seated ? 1.1 * s : 0)
  // Ganghjelpemiddel og ting som bæres, tegnes bak figuren når hen går fra oss.
  if (frame && p.away) drawWalkingAid(ctx, s, frame)
  if (p.carry && p.away) drawCarried(ctx, s, p.carry, p)
  if (wheel) wheelchairBack(ctx, s)
  ctx.translate(lean, sit)
  // Svimmel eller urolig: kroppen svaier
  if (p.anim === 'svimmel') ctx.rotate(Math.sin(p.time * 3.2) * 0.09)
  if (p.anim === 'uro') ctx.translate(Math.sin(p.time * 11) * 0.5 * s, 0)

  // Fartsstreker bak den som har det travelt
  if (hurry > 0.55 && !p.sitting) {
    ctx.strokeStyle = `rgba(28,37,38,${0.22 * hurry})`
    ctx.lineWidth = 1.1 * s
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const [y, len] of [[-24, 7], [-18, 10], [-12, 6]] as const) {
      const wobble = Math.sin(p.phase * 2 + y) * 1.2 * s
      ctx.moveTo(-13 * s + wobble, y * s)
      ctx.lineTo((-13 - len) * s + wobble, y * s)
    }
    ctx.stroke()
  }

  // Bein og sko
  if (!seated) {
    for (const side of [-1, 1] as const) {
      const lift = Math.max(0, swing * side) * 3 * s
      const fwd = swing * side * 2.2 * s
      const lx = side * 3.4 * s + fwd
      ctx.fillStyle = st.trousers
      roundRect(ctx, lx - 2.6 * s, -11 * s - lift, 5.2 * s, 10 * s, 2 * s)
      ctx.fill()
      ctx.fillStyle = st.staff ? '#FAF7F0' : (st.shoes ?? '#6B5B4B')
      roundRect(ctx, lx - 3 * s + (p.away ? 0 : 0.8 * s), -2.8 * s - lift, 6.4 * s, 3.2 * s, 1.6 * s)
      ctx.fill()
    }
  }
  // Morgenkåpa rekker nesten ned til tøflene
  if (st.garment === 'kaape' && !seated) {
    ctx.fillStyle = st.top
    roundRect(ctx, -8.4 * s, -13 * s, 16.8 * s, 9.6 * s, 2.4 * s)
    ctx.fill()
  }

  ctx.translate(0, -bob)

  // Overkropp
  const bodyTop = -28 * s
  const bodyH = 19 * s
  ctx.fillStyle = st.top
  roundRect(ctx, -8.2 * s, bodyTop, 16.4 * s, bodyH, 6.5 * s)
  ctx.fill()
  // Myk skygge nederst på overdelen
  ctx.fillStyle = shade(st.top, -0.16)
  roundRect(ctx, -8.2 * s, bodyTop + bodyH - 5 * s, 16.4 * s, 5 * s, 3 * s)
  ctx.fill()

  // ---- Sivile klær ----
  if (st.garment === 'hettegenser') {
    // Hette i nakken og magelomme
    ctx.fillStyle = shade(st.top, -0.14)
    roundRect(ctx, -6.4 * s, bodyTop - 2.6 * s, 12.8 * s, 6 * s, 3 * s)
    ctx.fill()
    if (!p.away) {
      roundRect(ctx, -4.4 * s, bodyTop + 10.6 * s, 8.8 * s, 4.4 * s, 1.6 * s)
      ctx.fill()
    }
  }
  if (!p.away && (st.garment === 'cardigan' || st.garment === 'jakke')) {
    // Åpen foran: skjorta synes, og cardiganen har knapper
    ctx.fillStyle = st.inner ?? '#F4EEE2'
    ctx.beginPath()
    ctx.moveTo(-2.9 * s, bodyTop + 0.8 * s)
    ctx.lineTo(2.9 * s, bodyTop + 0.8 * s)
    ctx.lineTo(1.7 * s, bodyTop + bodyH - 1.4 * s)
    ctx.lineTo(-1.7 * s, bodyTop + bodyH - 1.4 * s)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = shade(st.top, st.garment === 'jakke' ? -0.3 : 0.32)
    for (const by of [7, 11.4, 15.4]) {
      ctx.beginPath()
      ctx.arc(3.5 * s, bodyTop + by * s, 0.75 * s, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (st.garment === 'kaape') {
    // Belte og sjalskrage
    ctx.fillStyle = shade(st.top, -0.2)
    ctx.fillRect(-8.2 * s, bodyTop + 11.6 * s, 16.4 * s, 2 * s)
    if (!p.away) {
      ctx.fillStyle = shade(st.top, 0.3)
      ctx.beginPath()
      ctx.moveTo(-4.4 * s, bodyTop + 0.4 * s)
      ctx.lineTo(0, bodyTop + 10.8 * s)
      ctx.lineTo(4.4 * s, bodyTop + 0.4 * s)
      ctx.lineTo(2.4 * s, bodyTop + 0.4 * s)
      ctx.lineTo(0, bodyTop + 6.2 * s)
      ctx.lineTo(-2.4 * s, bodyTop + 0.4 * s)
      ctx.closePath()
      ctx.fill()
    }
  }

  // Armer / hender
  const reach = frame || p.anim === 'barre' ? 3 * s : 0 // strekker armene fram mot håndtakene
  const armSwing = swing * 3 * s
  ctx.fillStyle = shade(st.top, -0.08)
  roundRect(ctx, -10.6 * s, bodyTop + 3 * s + armSwing * 0.3, 4.2 * s, 11 * s, 2.1 * s)
  ctx.fill()
  roundRect(ctx, 6.4 * s + reach * 0.4, bodyTop + 3 * s - armSwing * 0.3, 4.2 * s, 11 * s - reach * 0.8, 2.1 * s)
  ctx.fill()
  ctx.fillStyle = st.skin
  ctx.beginPath()
  ctx.arc(-8.5 * s, bodyTop + 14.6 * s + armSwing * 0.3, 2.2 * s, 0, Math.PI * 2)
  ctx.arc(8.5 * s + reach, bodyTop + 14.6 * s - armSwing * 0.3 - reach * 0.8, 2.2 * s, 0, Math.PI * 2)
  ctx.fill()

  if (!p.away) {
    // V-hals
    ctx.fillStyle = st.skin
    ctx.beginPath()
    ctx.moveTo(-3.2 * s, bodyTop + 0.6 * s)
    ctx.lineTo(3.2 * s, bodyTop + 0.6 * s)
    ctx.lineTo(0, bodyTop + 5.4 * s)
    ctx.closePath()
    ctx.fill()
    if (st.staff) {
      // Nøkkelbånd og ID-kort
      ctx.strokeStyle = '#D97736'
      ctx.lineWidth = 1.1 * s
      ctx.beginPath()
      ctx.moveTo(-3 * s, bodyTop + 1 * s)
      ctx.lineTo(1.4 * s, bodyTop + 9 * s)
      ctx.moveTo(3 * s, bodyTop + 1 * s)
      ctx.lineTo(1.4 * s, bodyTop + 9 * s)
      ctx.stroke()
      ctx.fillStyle = '#FFFDF8'
      roundRect(ctx, -0.8 * s, bodyTop + 8.6 * s, 4.6 * s, 5.4 * s, 0.9 * s)
      ctx.fill()
    }
  }

  // Hode
  const hy = bodyTop - 5.6 * s
  const r = 7.6 * s
  ctx.fillStyle = shade(st.skin, -0.1)
  roundRect(ctx, -2.4 * s, bodyTop - 1.8 * s, 4.8 * s, 3.6 * s, 1.4 * s)
  ctx.fill()

  const style = st.hairStyle
  const hair = st.hair
  const isHijab = style === HAIR_STYLE.hijab

  // Hår bak hodet (langt hår) / sjal rundt ansiktet
  if (style === HAIR_STYLE.langt) {
    ctx.fillStyle = hair
    roundRect(ctx, -8.4 * s, hy - 4 * s, 16.8 * s, 15.5 * s, 6 * s)
    ctx.fill()
  }
  if (isHijab) {
    ctx.fillStyle = hair
    ctx.beginPath()
    ctx.arc(0, hy, r + 1.7 * s, 0, Math.PI * 2)
    ctx.fill()
    roundRect(ctx, -7.4 * s, hy + 3 * s, 14.8 * s, 9.4 * s, 4.5 * s)
    ctx.fill()
  }
  if (style === HAIR_STYLE.knute) {
    ctx.fillStyle = hair
    ctx.beginPath()
    ctx.arc(p.away ? 0 : -1.5 * s, hy - 8.6 * s, 3.6 * s, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = st.skin
  ctx.beginPath()
  ctx.arc(0, hy, isHijab ? r - 0.5 * s : r, 0, Math.PI * 2)
  ctx.fill()

  if (p.away) {
    // Bakhode: hår dekker det meste
    ctx.fillStyle = hair
    if (style === HAIR_STYLE.tynt) {
      ctx.beginPath()
      ctx.arc(0, hy, r, Math.PI * 0.05, Math.PI * 0.95)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(0, hy, r + 0.3 * s, 0, Math.PI * 2)
      ctx.fill()
      if (style === HAIR_STYLE.krollet) curls(ctx, hy, r, s, hair)
    }
  } else {
    // Hår foran
    ctx.fillStyle = hair
    if (isHijab) {
      // Pannebånd: øvre del av ansiktssirkelen dekkes av sjalet
      ctx.beginPath()
      ctx.arc(0, hy, r + 0.2 * s, Math.PI * 1.12, Math.PI * 1.88)
      ctx.closePath()
      ctx.fill()
    } else if (style === HAIR_STYLE.tynt) {
      ctx.beginPath()
      ctx.arc(-r * 0.86, hy - 0.5 * s, 2.3 * s, 0, Math.PI * 2)
      ctx.arc(r * 0.86, hy - 0.5 * s, 2.3 * s, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(0, hy, r + 0.4 * s, Math.PI * 1.02, Math.PI * 1.98)
      const fringe = style === HAIR_STYLE.sideskill ? -3.4 * s : -2.2 * s
      ctx.quadraticCurveTo(3 * s, hy + fringe, -r * 0.2, hy - 3.6 * s)
      ctx.quadraticCurveTo(-r * 0.7, hy - 2.4 * s, -r - 0.4 * s, hy + 0.2 * s)
      ctx.closePath()
      ctx.fill()
      if (style === HAIR_STYLE.krollet) curls(ctx, hy, r, s, hair)
      if (style === HAIR_STYLE.langt) {
        roundRect(ctx, -r - 0.6 * s, hy - 1 * s, 3 * s, 10 * s, 1.5 * s)
        ctx.fill()
        roundRect(ctx, r - 2.4 * s, hy - 1 * s, 3 * s, 10 * s, 1.5 * s)
        ctx.fill()
      }
    }

    // Ansikt
    const ex = 1 * s
    ctx.fillStyle = '#1C2526'
    const blink = Math.sin(p.time * 0.9 + p.phase * 3) > 0.985
    if (p.tired || blink) {
      ctx.fillRect(ex - 3.6 * s, hy + 0.6 * s, 2.2 * s, 0.8 * s)
      ctx.fillRect(ex + 1.6 * s, hy + 0.6 * s, 2.2 * s, 0.8 * s)
    } else {
      ctx.beginPath()
      ctx.arc(ex - 2.5 * s, hy + 0.8 * s, 0.95 * s, 0, Math.PI * 2)
      ctx.arc(ex + 2.7 * s, hy + 0.8 * s, 0.95 * s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(217,119,54,0.28)'
    ctx.beginPath()
    ctx.arc(ex - 4.2 * s, hy + 2.8 * s, 1.4 * s, 0, Math.PI * 2)
    ctx.arc(ex + 4.4 * s, hy + 2.8 * s, 1.4 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#1C2526'
    ctx.lineWidth = 0.8 * s
    ctx.lineCap = 'round'
    ctx.beginPath()
    if (p.tired) {
      ctx.moveTo(ex - 1.2 * s, hy + 4.1 * s)
      ctx.lineTo(ex + 1.4 * s, hy + 4.1 * s)
    } else {
      ctx.arc(ex + 0.1 * s, hy + 2.6 * s, 2 * s, Math.PI * 0.2, Math.PI * 0.8)
    }
    ctx.stroke()
    if (st.accessory === 1) {
      ctx.strokeStyle = 'rgba(28,37,38,0.75)'
      ctx.lineWidth = 0.7 * s
      ctx.beginPath()
      ctx.arc(ex - 2.5 * s, hy + 0.8 * s, 2.1 * s, 0, Math.PI * 2)
      ctx.moveTo(ex + 4.8 * s, hy + 0.8 * s)
      ctx.arc(ex + 2.7 * s, hy + 0.8 * s, 2.1 * s, 0, Math.PI * 2)
      ctx.moveTo(ex - 0.4 * s, hy + 0.8 * s)
      ctx.lineTo(ex + 0.6 * s, hy + 0.8 * s)
      ctx.stroke()
    }
  }

  // Sixpence på den som har tatt på seg jakka for å gå ut
  if (st.garment === 'jakke' && st.elderly) {
    ctx.fillStyle = '#4A4F45'
    ctx.beginPath()
    ctx.ellipse(0, hy - 5.2 * s, 8.2 * s, 3.6 * s, 0, Math.PI, Math.PI * 2)
    ctx.fill()
    if (!p.away) {
      roundRect(ctx, -1 * s, hy - 5.8 * s, 9.6 * s, 1.9 * s, 0.9 * s)
      ctx.fill()
    }
  }

  // ---- Tilbake til fotpunktet: hjelpemidler og ting som bæres ----
  ctx.translate(-lean, -sit + bob)
  if (wheel) wheelchairFront(ctx, s, st, p.walking ? p.phase : 0)
  if (frame && !p.away) drawWalkingAid(ctx, s, frame)
  if (p.sitting && !wheel && (p.aid === 'rullator' || p.aid === 'prekestol')) {
    // Parkert ved siden av stolen
    ctx.translate(13 * s, 6 * s)
    drawWalkingAid(ctx, s, p.aid)
    ctx.translate(-13 * s, -6 * s)
  }
  if (p.carry && !p.away) {
    ctx.translate(0, sit - bob)
    drawCarried(ctx, s, p.carry, p)
  }

  ctx.restore()
}

const fillRound = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string): void => {
  ctx.fillStyle = color
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
}
const dot = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}
const line = (ctx: CanvasRenderingContext2D, pts: number[], color: string, width: number): void => {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.stroke()
}

/** Rullator eller prekestol: en enkel ramme foran figuren (koordinater fra fotpunktet). */
function drawWalkingAid(ctx: CanvasRenderingContext2D, s: number, aid: 'rullator' | 'prekestol'): void {
  const tall = aid === 'prekestol'
  const top = tall ? -23 : -16.5
  const metal = tall ? '#3D7868' : '#8E999B'
  line(ctx, [10.5 * s, -2.4 * s, 11.5 * s, top * s], metal, 1.5 * s)
  line(ctx, [18 * s, -2.4 * s, 16.5 * s, (top + 1.5) * s], metal, 1.5 * s)
  line(ctx, [11 * s, -8 * s, 17.4 * s, -8 * s], metal, 1.2 * s)
  if (tall) {
    // Underarmsstøtte
    fillRound(ctx, 7.5 * s, (top - 1.6) * s, 11.5 * s, 2.6 * s, 1.2 * s, '#3B3F40')
  } else {
    // Håndtak inn mot hendene, og en liten kurv
    line(ctx, [11.5 * s, top * s, 8.6 * s, (top + 0.4) * s], '#2A2D2E', 1.9 * s)
    fillRound(ctx, 11.6 * s, -13.4 * s, 5.4 * s, 3.6 * s, 0.9 * s, '#B4432F')
  }
  dot(ctx, 10.5 * s, -2.2 * s, 2.2 * s, '#2A2D2E')
  dot(ctx, 18 * s, -2.2 * s, 2.2 * s, '#2A2D2E')
}

/** Rullestol, del 1: rygg og kjørehåndtak (tegnes bak overkroppen). */
function wheelchairBack(ctx: CanvasRenderingContext2D, s: number): void {
  fillRound(ctx, -9.6 * s, -22 * s, 3 * s, 17 * s, 1.2 * s, '#2B5B6C')
  line(ctx, [-8.4 * s, -22 * s, -12.4 * s, -23.4 * s], '#2A2D2E', 1.7 * s)
}

/** Rullestol, del 2: lår, legger, fotbrett og hjul (tegnes foran overkroppen). */
function wheelchairFront(ctx: CanvasRenderingContext2D, s: number, st: FigureStyle, roll: number): void {
  fillRound(ctx, -7 * s, -6.6 * s, 15 * s, 2.2 * s, 1 * s, '#2B5B6C')
  fillRound(ctx, -3 * s, -10.6 * s, 13 * s, 4.6 * s, 2 * s, st.trousers)
  fillRound(ctx, 6.6 * s, -9.4 * s, 4.4 * s, 7.4 * s, 1.8 * s, st.trousers)
  fillRound(ctx, 6.4 * s, -3.6 * s, 6.6 * s, 3 * s, 1.5 * s, st.shoes ?? '#6B5B4B')
  line(ctx, [5.4 * s, -0.4 * s, 13.6 * s, -0.4 * s], '#55595A', 1.3 * s)
  // Stort drivhjul med eiker som går rundt når stolen ruller
  ctx.strokeStyle = '#3B3F40'
  ctx.lineWidth = 1.7 * s
  ctx.beginPath()
  ctx.arc(-3.4 * s, -6.6 * s, 6.6 * s, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 0.7 * s
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = roll * 0.6 + (i * Math.PI) / 4
    ctx.moveTo(-3.4 * s - Math.cos(a) * 6.2 * s, -6.6 * s - Math.sin(a) * 6.2 * s)
    ctx.lineTo(-3.4 * s + Math.cos(a) * 6.2 * s, -6.6 * s + Math.sin(a) * 6.2 * s)
  }
  ctx.stroke()
  dot(ctx, -3.4 * s, -6.6 * s, 1.3 * s, '#D5DADB')
  dot(ctx, 9.4 * s, -2.2 * s, 2.3 * s, '#2A2D2E')
}

/** Det figuren bærer eller skyver, tegnet ved den fremste hånda (koordinater fra fotpunktet). */
function drawCarried(ctx: CanvasRenderingContext2D, s: number, item: CarryItem, p: Pose): void {
  const scrub = p.anim === 'vask' ? Math.sin(p.time * 7) * 3 * s : 0
  const sitDrop = p.sitting ? 2 * s : 0
  ctx.save()
  ctx.translate(0, sitDrop)
  switch (item) {
    case 'mopp':
      line(ctx, [8.6 * s, -23 * s, 14 * s + scrub, -1.6 * s], '#C99D6B', 1.3 * s)
      fillRound(ctx, 9.4 * s + scrub, -2.6 * s, 9.6 * s, 3 * s, 1.4 * s, '#DCE6EA')
      line(ctx, [11 * s + scrub, -1 * s, 11 * s + scrub, 0.6 * s, 14 * s + scrub, -1 * s, 14 * s + scrub, 0.6 * s, 17 * s + scrub, -1 * s, 17 * s + scrub, 0.6 * s], '#B8C6CC', 0.7 * s)
      break
    case 'stol':
      // En pinnestol som skyves foran
      line(ctx, [11.5 * s, -9 * s, 11.5 * s, -0.6 * s], '#8A6A45', 1.4 * s)
      line(ctx, [18.5 * s, -9 * s, 18.5 * s, -0.6 * s], '#8A6A45', 1.4 * s)
      fillRound(ctx, 10.4 * s, -10.6 * s, 9.4 * s, 2.2 * s, 0.9 * s, '#C99D6B')
      line(ctx, [18.6 * s, -10 * s, 19.2 * s, -20 * s], '#A97F52', 1.6 * s)
      line(ctx, [16.4 * s, -19.4 * s, 20.4 * s, -19.4 * s], '#A97F52', 1.6 * s)
      break
    case 'veske':
      line(ctx, [8.4 * s, -13.6 * s, 7.2 * s, -9.4 * s], '#6E2A33', 0.9 * s)
      line(ctx, [8.4 * s, -13.6 * s, 11.4 * s, -9.4 * s], '#6E2A33', 0.9 * s)
      fillRound(ctx, 5.4 * s, -10 * s, 7.8 * s, 5.6 * s, 1.6 * s, '#8E3B46')
      dot(ctx, 9.3 * s, -8.6 * s, 0.8 * s, '#E9C46A')
      break
    case 'perm':
      fillRound(ctx, 1.6 * s, -22.4 * s, 7.6 * s, 9.6 * s, 1 * s, '#2B5B6C')
      fillRound(ctx, 3.2 * s, -20.4 * s, 4.2 * s, 2.6 * s, 0.5 * s, '#FFFDF8')
      break
    case 'kanne':
      fillRound(ctx, 7 * s, -20 * s, 6.2 * s, 8 * s, 1.6 * s, '#D5DADB')
      fillRound(ctx, 7.6 * s, -21.4 * s, 5 * s, 2 * s, 0.9 * s, '#2A2D2E')
      line(ctx, [13.2 * s, -18 * s, 15.6 * s, -19.6 * s], '#AEB7B9', 1.3 * s)
      break
    case 'lykt':
      fillRound(ctx, 7.4 * s, -15.6 * s, 6 * s, 2.6 * s, 1 * s, '#2A2D2E')
      fillRound(ctx, 12.6 * s, -16.2 * s, 2 * s, 3.8 * s, 0.8 * s, '#FFE7A8')
      break
    case 'papir':
      fillRound(ctx, 5.6 * s, -21.6 * s, 6.6 * s, 8.6 * s, 0.6 * s, '#FFFDF8')
      line(ctx, [6.8 * s, -19.4 * s, 10.8 * s, -19.4 * s, 6.8 * s, -17.4 * s, 10.8 * s, -17.4 * s, 6.8 * s, -15.4 * s, 9.6 * s, -15.4 * s], 'rgba(43,91,108,0.55)', 0.6 * s)
      break
    case 'bag':
      line(ctx, [6.8 * s, -9.6 * s, 9.6 * s, -13.6 * s, 12.4 * s, -9.6 * s], '#2B4353', 1 * s)
      fillRound(ctx, 3.4 * s, -10 * s, 12.6 * s, 6.6 * s, 2.6 * s, '#3F5E73')
      fillRound(ctx, 3.4 * s, -7.4 * s, 12.6 * s, 1.2 * s, 0.6 * s, '#D97736')
      break
    case 'brett':
      fillRound(ctx, 1.4 * s, -17 * s, 13 * s, 1.7 * s, 0.8 * s, '#8E999B')
      fillRound(ctx, 3.4 * s, -20 * s, 3 * s, 3 * s, 0.7 * s, '#FFFDF8')
      fillRound(ctx, 8.4 * s, -20 * s, 3 * s, 3 * s, 0.7 * s, '#FFFDF8')
      dot(ctx, 4.9 * s, -20 * s, 0.9 * s, '#B4432F')
      dot(ctx, 9.9 * s, -20 * s, 0.9 * s, '#2B5B6C')
      break
    case 'teppe':
      fillRound(ctx, p.sitting ? -8.6 * s : 2.4 * s, p.sitting ? -11 * s : -19 * s, p.sitting ? 17.2 * s : 9.4 * s, p.sitting ? 8 * s : 6.4 * s, 2.2 * s, '#E9C46A')
      line(ctx, p.sitting ? [-6 * s, -8 * s, 6 * s, -8 * s, -6 * s, -5.6 * s, 6 * s, -5.6 * s] : [4 * s, -17 * s, 10.4 * s, -17 * s, 4 * s, -15 * s, 10.4 * s, -15 * s], 'rgba(180,97,42,0.6)', 0.8 * s)
      break
    case 'bukett':
      line(ctx, [8.6 * s, -13.6 * s, 9.6 * s, -20 * s], '#3F8A63', 1.4 * s)
      dot(ctx, 9.6 * s, -22 * s, 4.4 * s, '#3F8A63')
      for (const [dx, dy, col] of [[-2.6, -1.4, '#E9897A'], [2.4, -2, '#F2C14E'], [0, -4.4, '#D9534F'], [3.4, 1.4, '#F4EEE2']] as const) dot(ctx, (9.6 + dx) * s, (-22 + dy) * s, 1.8 * s, col)
      break
    case 'koffert':
      line(ctx, [7.4 * s, -12 * s, 9 * s, -13.8 * s, 10.6 * s, -12 * s], '#55595A', 0.9 * s)
      fillRound(ctx, 4.6 * s, -12.2 * s, 8.8 * s, 6.4 * s, 1.2 * s, '#D5DADB')
      fillRound(ctx, 8.3 * s, -11 * s, 1.4 * s, 4 * s, 0.3 * s, '#2E8B62')
      fillRound(ctx, 7 * s, -9.7 * s, 4 * s, 1.4 * s, 0.3 * s, '#2E8B62')
      break
    case 'klut':
      fillRound(ctx, 7.4 * s + scrub, -15.6 * s, 6 * s, 3.8 * s, 1.3 * s, '#8DBBCB')
      break
    case 'pose':
      line(ctx, [7 * s, -11.6 * s, 8.8 * s, -14 * s, 10.6 * s, -11.6 * s], '#C9BFA8', 0.9 * s)
      fillRound(ctx, 5 * s, -11.8 * s, 7.6 * s, 8.4 * s, 1 * s, '#F4EEE2')
      fillRound(ctx, 6 * s, -13.6 * s, 2 * s, 3 * s, 0.8 * s, '#3F8A63')
      dot(ctx, 10.4 * s, -12.2 * s, 1.5 * s, '#E08A3C')
      break
    case 'tallerken':
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 2 ? '#FFFFFF' : '#E6DFD0'
        ctx.beginPath()
        ctx.ellipse(9 * s, (-16.4 - i * 1.1) * s, 5.4 * s, 1.6 * s, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 'nettbrett':
      fillRound(ctx, 2.4 * s, -22.4 * s, 8.6 * s, 10.6 * s, 1.3 * s, '#23292A')
      fillRound(ctx, 3.4 * s, -21.4 * s, 6.6 * s, 8.6 * s, 0.6 * s, '#CFEAF2')
      fillRound(ctx, 3.4 * s, -21.4 * s, 6.6 * s, 1.6 * s, 0.4 * s, '#1E4D40')
      break
    case 'kurv':
      line(ctx, [5 * s, -12.6 * s, 9 * s, -16.4 * s, 13 * s, -12.6 * s], '#8C4E2A', 1 * s)
      fillRound(ctx, 4 * s, -12.8 * s, 10 * s, 5.4 * s, 1.4 * s, '#B5653A')
      for (const [x, col] of [[5.6, '#B4432F'], [8.2, '#7B4B8E'], [10.8, '#E9C46A']] as const) fillRound(ctx, x * s, -14.8 * s, 1.5 * s, 3.2 * s, 0.6 * s, col)
      break
    case 'avis':
      // Holdes oppslått foran brystet
      fillRound(ctx, -9.6 * s, -23 * s, 19.2 * s, 11.4 * s, 0.8 * s, '#F4EEE2')
      line(ctx, [0, -23 * s, 0, -11.6 * s], 'rgba(28,37,38,0.3)', 0.6 * s)
      fillRound(ctx, -8 * s, -21.4 * s, 6.4 * s, 2 * s, 0.3 * s, 'rgba(28,37,38,0.55)')
      line(ctx, [-8 * s, -17.6 * s, -1.6 * s, -17.6 * s, -8 * s, -15.6 * s, -1.6 * s, -15.6 * s, 1.6 * s, -20.4 * s, 8 * s, -20.4 * s, 1.6 * s, -18.4 * s, 8 * s, -18.4 * s, 1.6 * s, -16.4 * s, 8 * s, -16.4 * s], 'rgba(28,37,38,0.3)', 0.6 * s)
      break
    case 'kopp':
      fillRound(ctx, 7.2 * s, -17.2 * s, 4 * s, 3.8 * s, 0.9 * s, '#FFFDF8')
      line(ctx, [11.2 * s, -16.2 * s, 12.4 * s, -15.4 * s, 11.2 * s, -14.4 * s], '#E2DCCF', 0.8 * s)
      break
  }
  ctx.restore()
}

function curls(ctx: CanvasRenderingContext2D, hy: number, r: number, s: number, hair: string): void {
  ctx.fillStyle = hair
  ctx.beginPath()
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (1.02 + (i / 6) * 0.96)
    ctx.moveTo(Math.cos(a) * r, hy + Math.sin(a) * r)
    ctx.arc(Math.cos(a) * (r + 0.4 * s), hy + Math.sin(a) * (r + 0.4 * s), 2.7 * s, 0, Math.PI * 2)
  }
  ctx.fill()
}

/** Statusboble over hodet. */
export function drawBubble(
  ctx: CanvasRenderingContext2D,
  v: View,
  sx: number,
  sy: number,
  icon: BubbleIcon,
  alpha: number,
  time: number,
  whisper = false,
): void {
  if (alpha <= 0.01) return
  const s = v.s
  const w = 20 * s
  const h = 18 * s
  const float = Math.sin(time * 2.4 + sx * 0.05) * 1.2 * s
  // En dempet boble er mindre og blekere
  const pop = (0.6 + 0.4 * alpha) * (whisper ? 0.78 : 1)
  ctx.save()
  ctx.globalAlpha = alpha * (whisper ? 0.72 : 1)
  ctx.translate(sx, sy - 47 * s + float)
  ctx.scale(pop, pop)
  ctx.shadowColor = 'rgba(28,37,38,0.25)'
  ctx.shadowBlur = 6 * s
  ctx.shadowOffsetY = 2 * s
  ctx.fillStyle = '#FFFDF8'
  roundRect(ctx, -w / 2, -h, w, h, 7 * s)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-3 * s, -0.5 * s)
  ctx.lineTo(0, 4 * s)
  ctx.lineTo(3 * s, -0.5 * s)
  ctx.closePath()
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.translate(0, -h / 2)
  drawIcon(ctx, icon, s, time)
  ctx.restore()
}

function drawIcon(ctx: CanvasRenderingContext2D, icon: BubbleIcon, s: number, time: number): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  switch (icon) {
    case 'kaffe': {
      ctx.fillStyle = '#D97736'
      roundRect(ctx, -4.6 * s, -2 * s, 8 * s, 6.6 * s, 2 * s)
      ctx.fill()
      ctx.strokeStyle = '#D97736'
      ctx.lineWidth = 1.3 * s
      ctx.beginPath()
      ctx.arc(4 * s, 1 * s, 2 * s, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(28,37,38,0.35)'
      ctx.lineWidth = 1 * s
      const w = Math.sin(time * 3) * 0.8 * s
      ctx.beginPath()
      ctx.moveTo(-2.4 * s, -3.4 * s)
      ctx.quadraticCurveTo(-3.4 * s + w, -5 * s, -2.4 * s, -6.4 * s)
      ctx.moveTo(1 * s, -3.4 * s)
      ctx.quadraticCurveTo(0 + w, -5 * s, 1 * s, -6.4 * s)
      ctx.stroke()
      break
    }
    case 'rapport': {
      ctx.fillStyle = '#2B5B6C'
      roundRect(ctx, -4.6 * s, -5.6 * s, 9.2 * s, 11.4 * s, 1.6 * s)
      ctx.fill()
      ctx.fillStyle = '#FFFDF8'
      roundRect(ctx, -3.3 * s, -3.6 * s, 6.6 * s, 8.2 * s, 0.8 * s)
      ctx.fill()
      ctx.fillStyle = '#2B5B6C'
      ctx.fillRect(-2.2 * s, -2.2 * s, 4.4 * s, 0.9 * s)
      ctx.fillRect(-2.2 * s, -0.2 * s, 4.4 * s, 0.9 * s)
      ctx.fillRect(-2.2 * s, 1.8 * s, 2.8 * s, 0.9 * s)
      break
    }
    case 'journal': {
      ctx.fillStyle = '#1E4D40'
      roundRect(ctx, -5.4 * s, -4.6 * s, 10.8 * s, 7.4 * s, 1.4 * s)
      ctx.fill()
      ctx.fillStyle = '#BFE3EE'
      ctx.fillRect(-4.2 * s, -3.4 * s, 8.4 * s, 5 * s)
      ctx.fillStyle = '#1E4D40'
      ctx.fillRect(-3.2 * s, -2.2 * s, 4 * s, 0.9 * s)
      ctx.fillRect(-3.2 * s, -0.4 * s, 6 * s, 0.9 * s)
      roundRect(ctx, -6.4 * s, 3.4 * s, 12.8 * s, 1.8 * s, 0.9 * s)
      ctx.fill()
      break
    }
    case 'medisin': {
      ctx.save()
      ctx.rotate(-0.6)
      ctx.fillStyle = '#B4432F'
      roundRect(ctx, -6 * s, -2.8 * s, 12 * s, 5.6 * s, 2.8 * s)
      ctx.fill()
      ctx.fillStyle = '#F4EEE2'
      ctx.beginPath()
      ctx.arc(3.2 * s, 0, 2.8 * s, -Math.PI / 2, Math.PI / 2)
      ctx.lineTo(0, 2.8 * s)
      ctx.lineTo(0, -2.8 * s)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      break
    }
    case 'hjerte': {
      const beat = 1 + Math.max(0, Math.sin(time * 5)) * 0.12
      ctx.save()
      ctx.scale(beat, beat)
      ctx.fillStyle = '#D9534F'
      ctx.beginPath()
      ctx.moveTo(0, 4.6 * s)
      ctx.bezierCurveTo(-8 * s, -0.6 * s, -4.4 * s, -6.6 * s, 0, -2.4 * s)
      ctx.bezierCurveTo(4.4 * s, -6.6 * s, 8 * s, -0.6 * s, 0, 4.6 * s)
      ctx.fill()
      ctx.restore()
      break
    }
    case 'stress': {
      ctx.fillStyle = '#4C93B8'
      for (const [dx, dy, k] of [[-2.6, 0.4, 1], [3, -1.4, 0.7]] as const) {
        ctx.beginPath()
        ctx.moveTo(dx * s, (dy - 4.4 * k) * s)
        ctx.quadraticCurveTo((dx + 3.4 * k) * s, (dy + 1.6 * k) * s, dx * s, (dy + 2.6 * k) * s)
        ctx.quadraticCurveTo((dx - 3.4 * k) * s, (dy + 1.6 * k) * s, dx * s, (dy - 4.4 * k) * s)
        ctx.fill()
      }
      break
    }
    case 'zzz': {
      ctx.fillStyle = '#2B5B6C'
      ctx.font = `800 ${8 * s}px "JetBrains Mono Variable", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('z', -3.4 * s, 1.6 * s)
      ctx.font = `800 ${6 * s}px "JetBrains Mono Variable", monospace`
      ctx.fillText('z', 1.4 * s, -1.2 * s)
      ctx.font = `800 ${4.4 * s}px "JetBrains Mono Variable", monospace`
      ctx.fillText('z', 4.6 * s, -3.6 * s)
      break
    }
    case 'snakk': {
      // Tre prikker som «snakker»
      ctx.fillStyle = '#2B5B6C'
      for (let i = 0; i < 3; i++) {
        const up = Math.max(0, Math.sin(time * 6 - i * 0.9)) * 1.6 * s
        ctx.beginPath()
        ctx.arc((i - 1) * 4.4 * s, -up, 1.7 * s, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'buss': {
      ctx.fillStyle = '#D97736'
      roundRect(ctx, -6.4 * s, -4.6 * s, 12.8 * s, 7.6 * s, 1.8 * s)
      ctx.fill()
      ctx.fillStyle = '#DDF0F5'
      for (const x of [-5, -1.4, 2.2]) ctx.fillRect(x * s, -3.2 * s, 2.8 * s, 2.8 * s)
      ctx.fillStyle = '#1C2526'
      ctx.beginPath()
      ctx.arc(-3.4 * s, 3.4 * s, 1.5 * s, 0, Math.PI * 2)
      ctx.arc(3.4 * s, 3.4 * s, 1.5 * s, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'svimmel': {
      // Spiral som snurrer, med to små stjerner
      ctx.strokeStyle = '#7B4B8E'
      ctx.lineWidth = 1.4 * s
      ctx.beginPath()
      for (let i = 0; i <= 34; i++) {
        const a = time * 4 + i * 0.36
        const r = (0.6 + i * 0.14) * s
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      ctx.stroke()
      ctx.fillStyle = '#E9C46A'
      for (const [x, y] of [[-6, -4.4], [6.2, 3.4]] as const) {
        ctx.beginPath()
        ctx.arc(x * s, y * s, (1 + Math.max(0, Math.sin(time * 6 + x)) * 0.6) * s, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'utrop': {
      const jump = Math.max(0, Math.sin(time * 9)) * 1.2 * s
      ctx.fillStyle = '#B4432F'
      roundRect(ctx, -1.5 * s, -6 * s - jump, 3 * s, 7.4 * s, 1.4 * s)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, 4.2 * s - jump, 1.7 * s, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'prove': {
      // Prøverør med rød kork
      ctx.save()
      ctx.rotate(0.35)
      ctx.fillStyle = '#EAF4F6'
      roundRect(ctx, -2.2 * s, -5 * s, 4.4 * s, 10.6 * s, 2.1 * s)
      ctx.fill()
      ctx.fillStyle = '#B4432F'
      roundRect(ctx, -2.2 * s, 0.4 * s, 4.4 * s, 5.2 * s, 2.1 * s)
      ctx.fill()
      ctx.fillStyle = '#7D2E22'
      roundRect(ctx, -2.8 * s, -6.6 * s, 5.6 * s, 2.4 * s, 0.9 * s)
      ctx.fill()
      ctx.restore()
      break
    }
    case 'hake': {
      ctx.strokeStyle = '#1E4D40'
      ctx.lineWidth = 2.2 * s
      ctx.beginPath()
      ctx.moveTo(-4.4 * s, 0.4 * s)
      ctx.lineTo(-1.2 * s, 3.4 * s)
      ctx.lineTo(4.6 * s, -3.4 * s)
      ctx.stroke()
      break
    }
  }
}

/** Felles positur for alle figurer i veinettet. */
const walkerPose = (w: Walker, sx: number, sy: number, time: number): Pose => ({
  sx,
  sy,
  flip: w.flip,
  away: w.away,
  sitting: w.sitting,
  walking: w.mode !== 'act',
  phase: w.phase,
  time,
  alpha: w.alpha,
  tired: false,
  hurry: w.hurry,
  carry: w.carry,
  anim: w.anim,
})

/** Fotpunkt → skjerm for en pleier. */
export const agentPose = (a: Agent, sx: number, sy: number, time: number): Pose => ({
  ...walkerPose(a, sx, sy, time),
  tired: a.energy < 18,
})

/** Fotpunkt → skjerm for en beboer eller pårørende. */
export const residentPose = (r: ResidentAgent, sx: number, sy: number, time: number, tired: boolean): Pose => ({
  ...walkerPose(r, sx, sy, time),
  tired,
  aid: r.aid,
})
