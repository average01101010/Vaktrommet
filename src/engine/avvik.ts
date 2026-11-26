import { BALANCE } from '@/data/balance'

/**
 * Ulukkede avvik: meldt, men ikke behandlet. Tilsynet ser etter at avvik både
 * meldes og lukkes, så en voksende haug koster – gradvis, og med et tak.
 */

/** Ulukkede avvik over terskelen. */
const overThreshold = (open: number): number => Math.max(0, open - BALANCE.openAvvikThreshold)

/** Trekk i tilsynspoeng per vakt for ulukkede avvik. */
export const openAvvikInspectionPenalty = (open: number): number =>
  Math.min(BALANCE.openAvvikInspectionMax, overThreshold(open) * BALANCE.openAvvikInspectionPenalty)

/** Trekk i trivselsmålet for ulukkede avvik. */
export const openAvvikTrivselPenalty = (open: number): number =>
  Math.min(BALANCE.openAvvikTrivselMax, overThreshold(open) * BALANCE.openAvvikTrivselPer)

/** Status på tilsynets sjekkpunkt «Avvik meldes og lukkes». */
export function avvikCheckStatus(open: number): 'ok' | 'advarsel' | 'kritisk' {
  if (open <= BALANCE.openAvvikOk) return 'ok'
  if (open <= BALANCE.openAvvikThreshold) return 'advarsel'
  return 'kritisk'
}
