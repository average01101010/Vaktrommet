import type { Agent, AgentLook, BubbleIcon } from './agents'
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
}

/** Tegner en stilisert figur. Alt er enkle former – ingen rigg, bare litt sprett. */
export function drawFigure(ctx: CanvasRenderingContext2D, v: View, st: FigureStyle, p: Pose): void {
  const s = v.s
  const swing = p.walking ? Math.sin(p.phase) : 0
  const bob = p.walking ? Math.abs(Math.sin(p.phase)) * 2.4 * s : Math.sin(p.time * 2 + p.phase) * 0.5 * s
  const sit = p.sitting ? 7 * s : 0

  ctx.save()
  ctx.globalAlpha *= p.alpha
  ctx.translate(p.sx, p.sy)

  // Skygge
  ctx.fillStyle = 'rgba(28,37,38,0.2)'
  ctx.beginPath()
  ctx.ellipse(0, 0, (9 - (p.walking ? Math.abs(swing) : 0)) * s, 4 * s, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.scale(p.flip, 1)
  const lean = p.tired ? 1.5 * s : 0
  ctx.translate(lean, sit)

  // Bein og sko
  if (!p.sitting) {
    for (const side of [-1, 1] as const) {
      const lift = Math.max(0, swing * side) * 3 * s
      const fwd = swing * side * 2.2 * s
      const lx = side * 3.4 * s + fwd
      ctx.fillStyle = st.trousers
      roundRect(ctx, lx - 2.6 * s, -11 * s - lift, 5.2 * s, 10 * s, 2 * s)
      ctx.fill()
      ctx.fillStyle = st.staff ? '#FAF7F0' : '#6B5B4B'
      roundRect(ctx, lx - 3 * s + (p.away ? 0 : 0.8 * s), -2.8 * s - lift, 6.4 * s, 3.2 * s, 1.6 * s)
      ctx.fill()
    }
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

  // Armer / hender
  const armSwing = swing * 3 * s
  ctx.fillStyle = shade(st.top, -0.08)
  roundRect(ctx, -10.6 * s, bodyTop + 3 * s + armSwing * 0.3, 4.2 * s, 11 * s, 2.1 * s)
  ctx.fill()
  roundRect(ctx, 6.4 * s, bodyTop + 3 * s - armSwing * 0.3, 4.2 * s, 11 * s, 2.1 * s)
  ctx.fill()
  ctx.fillStyle = st.skin
  ctx.beginPath()
  ctx.arc(-8.5 * s, bodyTop + 14.6 * s + armSwing * 0.3, 2.2 * s, 0, Math.PI * 2)
  ctx.arc(8.5 * s, bodyTop + 14.6 * s - armSwing * 0.3, 2.2 * s, 0, Math.PI * 2)
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
): void {
  if (alpha <= 0.01) return
  const s = v.s
  const w = 20 * s
  const h = 18 * s
  const float = Math.sin(time * 2.4 + sx * 0.05) * 1.2 * s
  const pop = 0.6 + 0.4 * alpha
  ctx.save()
  ctx.globalAlpha = alpha
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

/** Fotpunkt → skjerm for en agent. */
export const agentPose = (a: Agent, sx: number, sy: number, time: number): Pose => ({
  sx,
  sy,
  flip: a.flip,
  away: a.away,
  sitting: a.sitting,
  walking: a.mode !== 'act',
  phase: a.phase,
  time,
  alpha: a.alpha,
  tired: a.energy < 18,
})
