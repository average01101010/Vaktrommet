/** Utgiver og behandlingsansvarlig. */
export const PUBLISHER = 'Industrispill AS'

/**
 * Kontakt- og tilbakemeldingsadresse. Kan overstyres med VITE_FEEDBACK_EMAIL
 * (f.eks. en egen adresse for en betatest).
 */
export const CONTACT_EMAIL = (import.meta.env.VITE_FEEDBACK_EMAIL as string | undefined)?.trim() || 'Jonas@grubleriet.no'
