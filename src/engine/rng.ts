/**
 * Seedet, deterministisk RNG (mulberry32). Tilstanden ligger i GameState slik at
 * hele simuleringen kan spilles av på nytt – f.eks. ved server-side validering.
 */
export interface RngHolder {
  rng: number
}

export function rand(h: RngHolder): number {
  h.rng = (h.rng + 0x6d2b79f5) | 0
  let t = h.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const randInt = (h: RngHolder, min: number, max: number): number =>
  min + Math.floor(rand(h) * (max - min + 1))

export const pick = <T>(h: RngHolder, items: readonly T[]): T => items[Math.floor(rand(h) * items.length)]

export function pickWeighted<T>(h: RngHolder, items: readonly T[], weight: (item: T) => number): T {
  let total = 0
  for (const item of items) total += Math.max(0, weight(item))
  let roll = rand(h) * total
  for (const item of items) {
    roll -= Math.max(0, weight(item))
    if (roll < 0) return item
  }
  return items[items.length - 1]
}

export const seedFrom = (n: number): number => (Math.floor(n) ^ 0x9e3779b9) | 0
