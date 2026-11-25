import { BALANCE } from '@/data/balance'
import { CONTACT_EMAIL } from '@/lib/contact'
import { WARD_TYPES } from '@/data/wards'
import { STATE_VERSION } from '@/engine/simulation'
import { dayNumber } from '@/engine/time'
import type { GameState } from '@/types'

export type FeedbackKind = 'feil' | 'forslag' | 'annet'

export const FEEDBACK_KINDS: Record<FeedbackKind, string> = { feil: 'Feil', forslag: 'Forslag', annet: 'Annet' }

/** Adresse for tilbakemeldinger (kan overstyres med VITE_FEEDBACK_EMAIL). */
export const FEEDBACK_EMAIL = CONTACT_EMAIL

export const versionLabel = (): string => `v${__APP_VERSION__} · lagringsformat ${STATE_VERSION} · balanse ${BALANCE.version}`

/** Teknisk kontekst som hjelper ved feilsøking. Inneholder ingen kontaktinformasjon. */
export function technicalInfo(game: GameState): string {
  return [
    `Versjon: ${versionLabel()}`,
    `Avdeling: ${WARD_TYPES[game.wardType].name}, nivå ${game.tier + 1}, døgn ${dayNumber(game.minute)}, oppdrag ${game.prestige.rotations + 1}`,
    `Stab/beboere: ${game.staffOrder.length}/${game.residents.length}`,
    `Skjerm: ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
    `Nettleser: ${navigator.userAgent}`,
  ].join('\n')
}

export function buildFeedbackReport(opts: {
  kind: FeedbackKind
  message: string
  tech: string | null
  save: string | null
}): string {
  const parts = [`Vaktrommet – ${FEEDBACK_KINDS[opts.kind].toLowerCase()}`, '', opts.message.trim()]
  if (opts.tech) parts.push('', '--- Teknisk info ---', opts.tech)
  if (opts.save) parts.push('', '--- Lagring ---', opts.save)
  return parts.join('\n')
}

/** mailto-lenke uten lagringsfil (den blir for lang for en lenke). */
export function feedbackMailto(email: string, kind: FeedbackKind, body: string): string {
  const subject = `Vaktrommet: ${FEEDBACK_KINDS[kind].toLowerCase()}`
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.slice(0, 1800))}`
}
