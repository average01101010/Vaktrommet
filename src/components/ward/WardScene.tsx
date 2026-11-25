import { useEffect, useRef } from 'react'
import { liveMinute, minuteOfDay } from '@/engine/time'
import type { UpgradeLevels } from '@/types'
import { Crew, type AgentInput } from './scene/agents'
import { drawScene, type LightLayer } from './scene/draw'
import { makeView, type View } from './scene/iso'

export interface WardSceneProps {
  /** Motorens spillminutt og tidspunktet for siste steg – scenen interpolerer selv. */
  minute: number
  lastTickAt: number
  upgrades: UpgradeLevels
  postIts: number
  trivsel: number
  /** De som er på jobb akkurat nå. */
  crew: AgentInput[]
  className?: string
}

/**
 * 2.5D isometrisk visning av vaktrommet og korridoren, tegnet på et lettvekts
 * 2D-canvas. Ingen spillmotor – bare former, faste stier og litt sprett.
 */
export function WardScene(props: WardSceneProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const latest = useRef(props)
  latest.current = props

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const lightCanvas = document.createElement('canvas')
    const layer: LightLayer = { canvas: lightCanvas, ctx: lightCanvas.getContext('2d')! }
    const crew = new Crew()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let view: View = makeView(1, 1)
    let dpr = 1
    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      dpr = Math.min(2.5, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.round(rect.width))
      const h = Math.max(1, Math.round(rect.height))
      for (const c of [canvas, lightCanvas]) {
        c.width = Math.round(w * dpr)
        c.height = Math.round(h * dpr)
      }
      view = makeView(w, h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    let raf = 0
    let last = performance.now()
    let time = 0
    let crewKey = ''
    let first = true
    let visible = true

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (!visible) return
      time += dt

      const p = latest.current
      // Motoren går i faste steg; lys og veggklokke glir jevnt mellom dem.
      const shownMinute = liveMinute(p, Date.now())

      const opts = { tralle: (p.upgrades.medisintralle ?? 0) >= 1, door3: (p.upgrades.nyfloy ?? 0) >= 1 }
      const key = p.crew.map((c) => c.id).join(',') + `|${opts.tralle}|${opts.door3}`
      if (key !== crewKey || first) {
        crew.sync(p.crew, opts, first)
        crewKey = key
        first = false
      } else {
        // Hold stress/energi oppdatert uten å røre stiene.
        for (const a of crew.agents) {
          const c = p.crew.find((x) => x.id === a.id)
          if (c) {
            a.stress = c.stress
            a.energy = c.energy
          }
        }
      }
      crew.update(reduced ? dt * 0.6 : dt)

      drawScene(
        ctx,
        view,
        {
          minuteOfDay: minuteOfDay(shownMinute),
          time: reduced ? time * 0.4 : time,
          upgrades: p.upgrades,
          postIts: p.postIts,
          trivsel: p.trivsel,
          crew,
        },
        layer,
        dpr,
      )
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
    }
  }, [])

  return (
    <div ref={wrapRef} className={props.className}>
      <canvas ref={canvasRef} className="block h-full w-full" role="img" aria-label="Vaktrommet og korridoren sett ovenfra" />
    </div>
  )
}
