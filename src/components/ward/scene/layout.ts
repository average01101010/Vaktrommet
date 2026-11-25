import type { PostItColor, WardTypeId } from '@/types'
import { WORLD } from './iso'

/**
 * Det scenen trenger å vite om avdelingens form og preg: hvor mange
 * pasientdører som vises, hvor de står, og interiøret for hver avdelingstype.
 * Brukes både av tegningen (draw.ts) og av pleiernes stier (agents.ts).
 */
export interface DoorSlot {
  index: number
  /** Venstre kant og bredde langs veggen (verdensenheter). */
  x: number
  w: number
  /** Midten av døra – der pleieren står. */
  cx: number
  label: string
  state: 'open' | 'closed' | 'ajar'
}

/** Antall synlige pasientdører følger sengetallet (8 → 3, 11 → 4, 14 → 5). */
export const doorCountFor = (beds: number): number => (beds >= 14 ? 5 : beds >= 11 ? 4 : 3)

const DOOR_WIDTH: Record<number, number> = { 3: 0.9, 4: 0.82, 5: 0.74 }
const DOOR_STATES: DoorSlot['state'][] = ['open', 'closed', 'ajar', 'closed', 'ajar']

export function doorLayout(count: number): DoorSlot[] {
  const n = Math.max(3, Math.min(5, count))
  const w = DOOR_WIDTH[n]
  const wall = WORLD.W - WORLD.SPLIT
  const gap = (wall - n * w) / (n + 1)
  return Array.from({ length: n }, (_, i) => {
    const x = WORLD.SPLIT + gap + i * (w + gap)
    return { index: i, x, w, cx: x + w / 2, label: String(i + 1), state: DOOR_STATES[i] }
  })
}

/** Tilstanden til varsellampa over en dør. */
export type DoorAlarm = 'none' | 'blink' | 'handling' | 'ok'

export interface SceneNote {
  color: PostItColor
  followUp: boolean
}

export const NOTE_COLORS: Record<PostItColor, string> = { gul: '#FBE38A', rosa: '#F9BFCC', mint: '#C3E6CB', bla: '#BFE0EE' }

/** Farger og stemning for korridoren i hver avdelingstype. */
export interface WardLook {
  dado: string
  lino: string
  linoEdge: string
  /** Egne dørfarger (gjenkjenning på demensavdeling), ellers treverk. */
  doorColors: string[] | null
  /** Ekstra demping av lyset på dagtid (0 = ingen). */
  dim: number
  /** Varm tone lagt over hele scenen (0 = ingen). */
  warm: number
}

export const WARD_LOOKS: Record<WardTypeId, WardLook> = {
  sykehjem: { dado: '#BCD0C4', lino: '#D6DFD5', linoEdge: '#BCCBBE', doorColors: null, dim: 0, warm: 0 },
  demens: {
    dado: '#EBDCA9',
    lino: '#E4DDCB',
    linoEdge: '#D3C8AE',
    doorColors: ['#C9705B', '#5E8FA8', '#7FA36B', '#D9A441', '#9A78A8'],
    dim: 0,
    warm: 0.12,
  },
  korttid: { dado: '#B8D2DE', lino: '#DDE4E7', linoEdge: '#C2CED4', doorColors: null, dim: 0, warm: 0 },
  bofellesskap: { dado: '#DDC9A4', lino: '#E2DAC8', linoEdge: '#CFC4AA', doorColors: null, dim: 0, warm: 0.08 },
  lindrende: { dado: '#CFC2D3', lino: '#DDD6D2', linoEdge: '#C9BFBD', doorColors: null, dim: 0.13, warm: 0.3 },
}
