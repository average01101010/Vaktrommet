import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { ShiftId, StaffId } from '@/types'

export interface SlotRef {
  shift: ShiftId
  slot: number
}

export interface DragState {
  staffId: StaffId
  x: number
  y: number
  /** Vaktplassen pekeren er over akkurat nå. */
  over: SlotRef | null
}

const parseSlot = (value: string | null | undefined): SlotRef | null => {
  if (!value) return null
  const [shift, slot] = value.split(':')
  return { shift: shift as ShiftId, slot: Number(slot) }
}

const slotUnder = (x: number, y: number): SlotRef | null =>
  parseSlot(document.elementFromPoint(x, y)?.closest('[data-slot]')?.getAttribute('data-slot'))

/**
 * Dra-og-slipp for ID-kort med pekerhendelser (fungerer med både mus og touch).
 * Mus: dra med en gang. Touch: hold inne et øyeblikk, så løftes kortet –
 * slik at vanlig rulling i lista ikke forstyrres.
 */
export function useStaffDrag(onDrop: (staffId: StaffId, target: SlotRef | null, from: SlotRef | null) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)
  /** Sann rett etter et slipp – brukes til å ignorere klikket som følger. */
  const justDragged = useRef(false)
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop

  const start = useCallback((e: ReactPointerEvent<HTMLElement>, staffId: StaffId, from: SlotRef | null = null) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const startX = e.clientX
    const startY = e.clientY
    const pointerId = e.pointerId
    const isMouse = e.pointerType === 'mouse'
    let active = false
    let timer: number | undefined

    const begin = (x: number, y: number) => {
      active = true
      setDrag({ staffId, x, y, over: slotUnder(x, y) })
      if (!isMouse) navigator.vibrate?.(8)
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('contextmenu', onContext)
      setDrag(null)
    }
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY)
      if (!active) {
        if (isMouse) {
          if (dist > 6) begin(ev.clientX, ev.clientY)
        } else if (dist > 10) {
          cleanup() // brukeren ruller
        }
        return
      }
      setDrag({ staffId, x: ev.clientX, y: ev.clientY, over: slotUnder(ev.clientX, ev.clientY) })
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      if (active) {
        justDragged.current = true
        window.setTimeout(() => (justDragged.current = false), 50)
        onDropRef.current(staffId, slotUnder(ev.clientX, ev.clientY), from)
      }
      cleanup()
    }
    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) cleanup()
    }
    const onTouchMove = (ev: TouchEvent) => {
      if (active) ev.preventDefault()
    }
    const onContext = (ev: Event) => {
      if (active || !isMouse) ev.preventDefault()
    }

    if (!isMouse) timer = window.setTimeout(() => begin(startX, startY), 240)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('contextmenu', onContext)
  }, [])

  return { drag, start, justDragged }
}
