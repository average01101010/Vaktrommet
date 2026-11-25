import type { RosterTemplate } from './roster'
import type { Profession, Rarity, StaffId } from './staff'

/** Soft currency: budsjett (kr) og Fagpoeng. Hard currency: Kaffekopper. */
export interface Resources {
  budget: number
  fagpoeng: number
  kaffekopper: number
}

export type CurrencyId = keyof Resources

export interface Reward {
  budget?: number
  fagpoeng?: number
  kaffekopper?: number
  passXp?: number
  /**
   * Kr / Fagpoeng oppgitt som spilltimer med spillerens nåværende inntjening.
   * Gjøres om til beløp av resolveReward() når belønningen hentes, slik at den
   * er like mye verdt på nivå 5 som på nivå 1.
   */
  budgetHours?: number
  fagpoengHours?: number
}

// ---------- Rekruttering (gacha) ----------

export type BannerId = 'stillingsannonse' | 'fagutlysning'

export interface BannerDef {
  id: BannerId
  name: string
  blurb: string
  cost: { currency: CurrencyId; amount: number }
  /** Offentlige droprates, summerer til 1. */
  rates: Record<Rarity, number>
  /** Garantert minst `rarity` innen `pulls` trekk. */
  pity?: { pulls: number; rarity: Rarity }
  /** Valgfri vekting av yrker (ellers standardfordeling). */
  professionWeights?: Partial<Record<Profession, number>>
}

export interface GachaState {
  pity: Record<BannerId, number>
  totalPulls: number
  /** Siste trekk – kan re-rulles én gang via rewarded ad. */
  lastPull: { banner: BannerId; staffId: StaffId; rerolled: boolean } | null
}

// ---------- Sesongpass ----------

export interface SeasonPassLevel {
  level: number
  free: Reward
  premium: Reward
}

export interface SeasonPassState {
  /** F.eks. «2026-11». Nullstilles ved ny måned. */
  seasonId: string
  xp: number
  premium: boolean
  claimedFree: number[]
  claimedPremium: number[]
}

// ---------- Butikk ----------

export type ShopItemKind = 'kaffekopper' | 'vip' | 'tilsynspass' | 'tidshopp'

export interface ShopItemDef {
  id: string
  kind: ShopItemKind
  name: string
  blurb: string
  /** Pris i ekte penger (NOK) – håndteres av betalingsleverandør. */
  priceNok?: number
  /** Pris i Kaffekopper (kjøp i spillet). */
  priceKaffe?: number
  grants?: Reward
  /** For tidshopp: antall reelle timer som simuleres. */
  hours?: number
  badge?: string
}

/** Plasseringer for frivillige rewarded video ads. */
export type AdPlacement = 'dobbel_vaktutbetaling' | 'rekruttering_reroll'

export interface MonetizationState {
  vip: boolean
  seasonPass: SeasonPassState
  gacha: GachaState
  rosterTemplates: RosterTemplate[]
  /** Antall rewarded ads sett i dag (for evt. dagsgrense). */
  adsWatched: number
  /** Logg over kjøp – synkes til server for kvittering/validering. */
  purchases: { itemId: string; at: number }[]
}
