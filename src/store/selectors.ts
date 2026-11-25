import { useMemo } from 'react'
import { SHIFT_ORDER } from '@/data/balance'
import { computeModifiers, slotsFor } from '@/engine/modifiers'
import { evaluateShift } from '@/engine/synergy'
import { shiftAt } from '@/engine/time'
import type { GameState, Modifiers, ShiftEvaluation, ShiftId, StaffId } from '@/types'
import { useGame } from './gameStore'

export const useGameState = (): GameState => useGame((s) => s.game)

export function useModifiers(): Modifiers {
  const upgrades = useGame((s) => s.game.upgrades)
  return useMemo(() => computeModifiers(upgrades), [upgrades])
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
