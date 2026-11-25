import { useEffect, useRef } from 'react'
import { liveMinute, MIN_PER_DAY, MIN_PER_SHIFT, minuteOfDay } from '@/engine/time'
import type { UpgradeLevels, WardTypeId } from '@/types'
import { Crew, type AgentInput, type CrewContext } from './scene/agents'
import { drawScene, type LightLayer } from './scene/draw'
import { makeView, type View } from './scene/iso'
import { doorCountFor, doorLayout, type DoorSlot, type SceneNote } from './scene/layout'

export interface WardSceneProps {
  /** Motorens spillminutt og tidspunktet for siste steg – scenen interpolerer selv. */
  minute: number
  lastTickAt: number
  upgrades: UpgradeLevels
  wardType: WardTypeId
  /** Antall senger – styrer hvor mange pasientdører som vises. */
  beds: number
  trivsel: number
  /** Dekning (0–1) og snittstress på vakta som går: bestemmer tempoet i rommet. */
  coverage: number
  avgStress: number
  /** Et takkekort fra pårørende virker akkurat nå. */
  thanksActive: boolean
  /** Aktive Post-it-lapper. */
  notes: SceneNote[]
  /** De som er på jobb akkurat nå. */
  crew: AgentInput[]
  className?: string
}

/** De siste og første minuttene av en vakt brukes til rapport rundt bordet. */
const RAPPORT_MINUTES = 20

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * 2.5D isometrisk visning av vaktrommet og korridoren, tegnet på et lettvekts
 * 2D-canvas. Ingen spillmotor – bare former, faste stier og litt sprett.
 *
 * Scenen er en ren avspeiling av spilltilstanden: døgnrytme og vaktskifte
 * styrer hvor pleierne er, dekning og stress styrer tempoet, og senger,
 * oppgraderinger og avdelingstype styrer hva som står i rommet.
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
    let doors: DoorSlot[] = []

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (!visible) return
      time += dt

      const p = latest.current
      // Motoren går i faste steg; lys, klokke og koreografi glir jevnt mellom dem.
      const shownMinute = liveMinute(p, Date.now())
      const intoShift = ((shownMinute % MIN_PER_SHIFT) + MIN_PER_SHIFT) % MIN_PER_SHIFT
      const night = Math.floor((((shownMinute % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY) / MIN_PER_SHIFT) === 2

      const context: CrewContext = {
        // Rapport: de siste minuttene av vakta og de første av den neste (overlapp).
        rapport: MIN_PER_SHIFT - intoShift <= RAPPORT_MINUTES || intoShift < RAPPORT_MINUTES,
        night,
        // Tempoet i rommet: underdekning og stress gir hastverk; en ubemannet vakt er maks press.
        urgency: p.crew.length === 0 ? 1 : clamp01(Math.max((0.85 - p.coverage) / 0.45, (p.avgStress - 35) / 40)),
        stille: (p.upgrades.stillerapport ?? 0) >= 1,
        residentInChair: !night,
      }

      const doorCount = doorCountFor(p.beds)
      if (doors.length !== doorCount) doors = doorLayout(doorCount)
      crew.setLayout(doors, (p.upgrades.medisintralle ?? 0) >= 1)

      const key = p.crew.map((c) => c.id).join(',')
      if (key !== crewKey || first) {
        crew.sync(p.crew, context, first)
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
      crew.update(reduced ? dt * 0.6 : dt, context, time)

      drawScene(
        ctx,
        view,
        {
          minuteOfDay: minuteOfDay(shownMinute),
          time: reduced ? time * 0.4 : time,
          upgrades: p.upgrades,
          wardType: p.wardType,
          doors,
          alarms: doors.map((d) => crew.alarmState(d.index)),
          notes: p.notes,
          trivsel: p.trivsel,
          thanksActive: p.thanksActive,
          residentPresent: context.residentInChair,
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
