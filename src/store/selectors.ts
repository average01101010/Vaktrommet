import { useEffect, useMemo, useState } from 'react'
import { SHIFT_ORDER } from '@/data/balance'
import { modifiersFor, slotsFor } from '@/engine/modifiers'
import { evaluateShift } from '@/engine/synergy'
import { liveMinute, shiftAt } from '@/engine/time'
import type { GameState, Modifiers, ShiftEvaluation, ShiftId, StaffId } from '@/types'
import { useGame } from './gameStore'

export const useGameState = (): GameState => useGame((s) => s.game)

export function useModifiers(): Modifiers {
  const upgrades = useGame((s) => s.game.upgrades)
  const wardType = useGame((s) => s.game.wardType)
  const prestige = useGame((s) => s.game.prestige)
  return useMemo(() => modifiersFor({ upgrades, wardType, prestige }), [upgrades, wardType, prestige])
}

/**
 * Jevnt løpende spillminutt for visning. Motoren går i steg på 15 spillminutter;
 * denne interpolerer mellom dem slik at klokka og framdriftslinjer flyter.
 */
export function useLiveMinute(intervalMs = 500): number {
  const minute = useGame((s) => s.game.minute)
  const lastTickAt = useGame((s) => s.game.lastTickAt)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return liveMinute({ minute, lastTickAt }, Math.max(now, lastTickAt))
}

export function useShiftEvaluation(shift: ShiftId): ShiftEvaluation {
  const game = useGameState()
  const mods = useModifiers()
  return useMemo(() => evaluateShift(game, shift, mods), [game, shift, mods])
}

export const useCurrentShift = (): ShiftId => useGame((s) => shiftAt(s.game.minute))

/** Hvilke vakter hver ansatt står på. */
export function shiftsByStaff(game: GameState, mods: Modifiers): Record<StaffId, ShiftId[]> {
  const slots = slotsFor(mods)
  const out: Record<StaffId, ShiftId[]> = {}
  for (const shift of SHIFT_ORDER) {
    for (const id of game.roster[shift].slice(0, slots)) {
      if (id) (out[id] ??= []).push(shift)
    }
  }
  return out
}
