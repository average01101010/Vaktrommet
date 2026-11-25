import type { Profession } from '@/types'

/** Felles farger for avatarer – brukes både på ID-kort (SVG) og i avdelingsvisningen (canvas). */
export const SKIN_TONES = ['#F6D9C6', '#EDC3A2', '#D9A47F', '#A8744F', '#7C5038']
export const HAIR_COLORS = ['#2A211C', '#5B3B24', '#8B5E34', '#D1A45F', '#B9B5AE', '#A44A2C']
/** Hodeplagg bruker egne, dempede stoff-farger. */
export const SCARF_COLORS = ['#3F5E73', '#7B4B5E', '#2E6B5A', '#C98B5B', '#5E5A72', '#8E3B46']

export const SCRUBS: Record<Profession, { top: string; trousers: string }> = {
  sykepleier: { top: '#2F6A80', trousers: '#234E5E' },
  vernepleier: { top: '#2C6E59', trousers: '#1F4D40' },
  helsefagarbeider: { top: '#CF7C40', trousers: '#9E5A2A' },
  assistent: { top: '#8C7A5B', trousers: '#665840' },
}

export const HAIR_STYLE = {
  kort: 0,
  sideskill: 1,
  langt: 2,
  knute: 3,
  krollet: 4,
  hijab: 5,
  tynt: 6,
} as const
