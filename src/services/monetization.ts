import type { AdPlacement, ShopItemDef } from '@/types'

/**
 * Kroker for betaling og rewarded video. MVP-en bruker demo-leverandører som
 * alltid lykkes; bytt dem ut med ekte SDK-er (f.eks. Stripe / AdMob / AppLovin)
 * uten å røre spillkoden.
 */
export interface PurchaseProvider {
  readonly isDemo: boolean
  /** Returnerer en kvittering som serveren kan validere, eller null ved avbrudd. */
  purchase(item: ShopItemDef): Promise<{ receipt: string } | null>
}

export interface RewardedAdProvider {
  readonly isDemo: boolean
  /** Løser til true når videoen er sett ferdig. */
  show(placement: AdPlacement): Promise<boolean>
}

const demoPurchases: PurchaseProvider = {
  isDemo: true,
  purchase: async (item) => ({ receipt: `demo-${item.id}-${Date.now()}` }),
}

let purchaseProvider: PurchaseProvider = demoPurchases
let adProvider: RewardedAdProvider | null = null

export const getPurchaseProvider = (): PurchaseProvider => purchaseProvider
export const setPurchaseProvider = (p: PurchaseProvider): void => {
  purchaseProvider = p
}

/** Null = bruk den innebygde demo-overlayen i UI-et. */
export const getAdProvider = (): RewardedAdProvider | null => adProvider
export const setAdProvider = (p: RewardedAdProvider | null): void => {
  adProvider = p
}
