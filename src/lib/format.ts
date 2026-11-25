const NBSP = ' '

/** Heltall med norsk tusenskille (hardt mellomrom). */
export function fmtInt(n: number): string {
  const v = Math.floor(Math.abs(n))
  const s = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return n < 0 && v > 0 ? `−${s}` : s
}

/** Kompakt tall: 12 345 → 12,3k, 1 234 567 → 1,23 mill. */
export function fmtCompact(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs < 10_000) return fmtInt(n)
  if (abs < 1_000_000) return `${sign}${(abs / 1000).toFixed(abs < 100_000 ? 1 : 0).replace('.0', '').replace('.', ',')}k`
  if (abs < 1_000_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs < 10_000_000 ? 2 : 1).replace('.', ',')}${NBSP}mill`
  return `${sign}${(abs / 1_000_000_000).toFixed(2).replace('.', ',')}${NBSP}mrd`
}

export const fmtKr = (n: number): string => `${fmtCompact(n)}${NBSP}kr`

export function fmtSigned(n: number, digits = 0): string {
  const v = digits ? n.toFixed(digits).replace('.', ',') : fmtInt(Math.round(n))
  return n > 0 ? `+${v}` : v.startsWith('−') || n === 0 ? v : `−${v.replace('-', '')}`
}

export const fmtPct = (ratio: number): string => `${Math.round(ratio * 100)}${NBSP}%`

/** Varighet i ms → «3 t 12 min», «45 s». */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 48) return m % 60 ? `${h} t ${m % 60} min` : `${h} t`
  return `${Math.floor(h / 24)} d ${h % 24} t`
}

export const cx = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ')
