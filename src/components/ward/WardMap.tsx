import { useEffect, useMemo, useRef } from 'react'
import { SHIFT_ORDER } from '@/data/balance'
import { liveMinute, MIN_PER_DAY, MIN_PER_SHIFT, minuteOfDay } from '@/engine/time'
import { sound } from '@/services/sound'
import type { WardTypeId } from '@/types'
import type { AgentInput } from './scene/agents'
import { fitCamera as fitPlan, panBy, PlanRenderer, toWorld, type Camera } from './plan/drawPlan'
import { bedRoomId, buildFloorPlan, roomAt, type FloorPlan, type PlanRoom } from './plan/floorPlan'
import { PlanCrowd, type PlanResidentInput } from './plan/planAgents'

export interface WardMapProps {
  minute: number
  lastTickAt: number
  wardType: WardTypeId
  beds: number
  residents: PlanResidentInput[]
  crew: AgentInput[]
  /** Navn på de som er på jobb (id → navn). */
  staffNames: Record<string, string>
  coverage: number
  avgStress: number
  /** Romnumre der beboeren har en sak på korktavla. */
  flaggedRooms: number[]
  /** Antall lapper på korktavla. */
  notes: number
  selected: string | null
  /** Figuren kameraet følger: `b<beboer-id>` eller `a<ansatt-id>`. */
  followed: string | null
  onRoom: (room: PlanRoom) => void
  onStopFollow: () => void
  className?: string
}

const RAPPORT_MINUTES = 20
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Zoomen som viser alt som er bygd, pluss neste par byggetomter. */
function fitCamera(plan: FloorPlan, w: number, h: number): Camera {
  const shown = Math.min(plan.w, plan.builtW + (plan.builtW < plan.w ? 2.8 : 0))
  // Merkelappene øverst og vaktlinja nederst ligger oppå kartet: hold bygget unna dem.
  return fitPlan(plan, shown, w, h, Math.min(84, h * 0.24), Math.min(30, h * 0.08))
}

/**
 * Hele avdelingen i 2.5D: korridoren, fellesrommene og ett rom per
 * beboer. Kartet kan dras og zoomes, og et trykk på et rom åpner det.
 * Som resten av scenen er dette en ren avspeiling av spilltilstanden.
 */
export function WardMap(props: WardMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const latest = useRef(props)
  latest.current = props
  const plan = useMemo(() => buildFloorPlan(props.wardType, props.beds), [props.wardType, props.beds])
  const planRef = useRef(plan)
  planRef.current = plan
  const api = useRef<{ zoom: (factor: number) => void; fit: () => void } | null>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const crowd = new PlanCrowd()
    const renderer = new PlanRenderer()
    // Til utprøving i konsollen: __vaktrommetMap.clock = 23 * 60 viser avdelingen kl. 23.
    const dev: { crowd: PlanCrowd; clock: number | null } = { crowd, clock: null }
    if (import.meta.env.DEV) Object.assign(window, { __vaktrommetMap: dev })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 1
    let h = 1
    let dpr = 1
    let cam: Camera = { x: 0, y: 0, u: 10 }
    let fitted = ''
    let userMoved = false
    const limits = () => {
      const fit = fitCamera(planRef.current, w, h)
      return { min: fit.u * 0.8, max: Math.max(fit.u * 1.2, 110) }
    }
    const constrain = () => {
      const p = planRef.current
      const { min, max } = limits()
      cam.u = clamp(cam.u, min, max)
      cam.x = clamp(cam.x, -3, p.w + 3)
      cam.y = clamp(cam.y, -3, p.h + 3)
    }
    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      dpr = Math.min(2.5, window.devicePixelRatio || 1)
      w = Math.max(1, Math.round(rect.width))
      h = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      if (!userMoved) cam = fitCamera(planRef.current, w, h)
      constrain()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    api.current = {
      zoom: (factor) => {
        userMoved = true
        cam.u *= factor
        constrain()
      },
      fit: () => {
        userMoved = false
        latest.current.onStopFollow()
        cam = fitCamera(planRef.current, w, h)
      },
    }

    // ---- Dra, knip og trykk ----
    const pointers = new Map<number, { x: number; y: number }>()
    let moved = 0
    let pinch = 0
    const local = (e: PointerEvent | WheelEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const zoomAt = (sx: number, sy: number, factor: number) => {
      const [wx, wy] = toWorld(cam, w, h, sx, sy)
      cam.u *= factor
      constrain()
      const [nx, ny] = toWorld(cam, w, h, sx, sy)
      cam.x += wx - nx
      cam.y += wy - ny
      constrain()
    }
    const down = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, local(e))
      if (pointers.size === 1) moved = 0
      pinch = 0
    }
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      const now = local(e)
      pointers.set(e.pointerId, now)
      if (pointers.size === 1) {
        moved += Math.abs(now.x - prev.x) + Math.abs(now.y - prev.y)
        if (moved > 6) {
          userMoved = true
          if (latest.current.followed) latest.current.onStopFollow()
          panBy(cam, now.x - prev.x, now.y - prev.y)
          constrain()
        }
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch > 0 && dist > 0) {
          userMoved = true
          zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / pinch)
        }
        pinch = dist
        moved = 99
      }
    }
    const up = (e: PointerEvent) => {
      const at = pointers.get(e.pointerId)
      pointers.delete(e.pointerId)
      pinch = 0
      if (at && pointers.size === 0 && moved <= 6) {
        const [wx, wy] = toWorld(cam, w, h, at.x, at.y)
        const room = roomAt(planRef.current, wx, wy)
        if (room) latest.current.onRoom(room)
      }
    }
    const cancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      pinch = 0
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      userMoved = true
      const at = local(e)
      zoomAt(at.x, at.y, Math.exp(-e.deltaY * 0.0015))
    }
    const key = (e: KeyboardEvent) => {
      const moves: Record<string, [number, number]> = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }
      const m = moves[e.key]
      if (m) {
        e.preventDefault()
        userMoved = true
        panBy(cam, m[0], m[1])
        constrain()
      } else if (e.key === '+' || e.key === '=') api.current?.zoom(1.25)
      else if (e.key === '-') api.current?.zoom(0.8)
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', cancel)
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('keydown', key)

    let raf = 0
    let last = performance.now()
    let time = 0
    let visible = true
    let rings = 0

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (!visible) return
      time += dt
      const p = latest.current
      const plan = planRef.current
      const planKey = `${plan.wardType}|${plan.beds}`
      if (planKey !== fitted) {
        // Ny avdeling eller flere rom: ram inn på nytt.
        fitted = planKey
        if (!userMoved) cam = fitCamera(plan, w, h)
        constrain()
      }
      const shown = liveMinute(p, Date.now())
      const mod = dev.clock ?? minuteOfDay(shown)
      const intoShift = ((shown % MIN_PER_SHIFT) + MIN_PER_SHIFT) % MIN_PER_SHIFT
      const shift = SHIFT_ORDER[Math.floor((((shown % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY) / MIN_PER_SHIFT)] ?? 'dag'
      const urgency = p.crew.length === 0 ? 1 : clamp(Math.max((0.85 - p.coverage) / 0.45, (p.avgStress - 35) / 40), 0, 1)
      crowd.update(reduced ? dt * 0.6 : dt, plan, p.residents, p.crew, p.staffNames, {
        minuteOfDay: mod,
        day: Math.floor(shown / MIN_PER_DAY),
        night: dev.clock !== null ? mod >= 22 * 60 || mod < 6 * 60 : shift === 'natt',
        rapport: MIN_PER_SHIFT - intoShift <= RAPPORT_MINUTES || intoShift < RAPPORT_MINUTES,
        urgency,
      })
      if (crowd.rings > rings) sound.play('chime')
      rings = crowd.rings

      if (p.followed) {
        const f = crowd.find(p.followed)
        if (f) {
          const k = 1 - Math.exp(-dt * 4)
          cam.u += (Math.max(cam.u, 44) - cam.u) * k
          cam.x += (f.x - cam.x) * k
          cam.y += (f.y - cam.y) * k
        }
      }

      renderer.draw(ctx, cam, w, h, dpr, {
        plan,
        figures: crowd.figures,
        lamps: crowd.lamps,
        minuteOfDay: mod,
        time: reduced ? time * 0.4 : time,
        flagged: new Set(p.flaggedRooms.map(bedRoomId)),
        notes: p.notes,
        selected: p.selected,
        followed: p.followed,
      })
    }
    raf = requestAnimationFrame(frame)
    const onVisibility = () => {
      visible = document.visibilityState === 'visible'
      last = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('keydown', key)
      api.current = null
    }
  }, [])

  const tool = 'pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-papir/92 text-[17px] leading-none font-extrabold text-blekk shadow-kort backdrop-blur active:scale-95'
  return (
    <div ref={wrapRef} className={props.className}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="block h-full w-full cursor-grab touch-none outline-none active:cursor-grabbing"
        role="img"
        aria-label="Avdelingen sett på skrå ovenfra. Dra for å flytte, knip eller rull for å zoome, og trykk på et rom for å åpne det."
      />
      <div className="pointer-events-none absolute right-2.5 bottom-9 z-10 flex flex-col gap-1.5">
        <button type="button" className={tool} aria-label="Zoom inn" onClick={() => api.current?.zoom(1.3)}>
          +
        </button>
        <button type="button" className={tool} aria-label="Zoom ut" onClick={() => api.current?.zoom(1 / 1.3)}>
          −
        </button>
        <button type="button" className={`${tool} !text-[10px]`} aria-label="Vis hele avdelingen" onClick={() => api.current?.fit()}>
          Hele
        </button>
      </div>
    </div>
  )
}
