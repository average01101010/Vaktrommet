import type { AdPlacement, BannerDef, BannerId, SeasonPassLevel, ShopItemDef } from '@/types'

// ---------- Rekrutteringspakker (gacha) ----------

export const BANNERS: Record<BannerId, BannerDef> = {
  stillingsannonse: {
    id: 'stillingsannonse',
    name: 'Stillingsannonse',
    blurb: 'Annonse på kommunens nettsider. Du får den som søker.',
    cost: { currency: 'budget', amount: 3500 },
    rates: { vanlig: 0.78, erfaren: 0.19, spesialist: 0.028, ildsjel: 0.002 },
  },
  fagutlysning: {
    id: 'fagutlysning',
    name: 'Fagutlysning',
    blurb: 'Målrettet utlysning i fagmiljøene. Garantert spesialist innen 10 trekk.',
    cost: { currency: 'kaffekopper', amount: 12 },
    rates: { vanlig: 0.45, erfaren: 0.38, spesialist: 0.14, ildsjel: 0.03 },
    pity: { pulls: 10, rarity: 'spesialist' },
    professionWeights: { sykepleier: 30, vernepleier: 28, helsefagarbeider: 28, assistent: 14 },
  },
}

export const BANNER_ORDER: BannerId[] = ['stillingsannonse', 'fagutlysning']

/** Prisen på stillingsannonser øker med antall ansettelser (soft sink). */
export const softBannerCost = (base: number, recruits: number): number =>
  Math.round((base * Math.pow(1.45, recruits)) / 100) * 100

// ---------- Butikk ----------

export const SHOP_ITEMS: ShopItemDef[] = [
  {
    id: 'kaffe_s',
    kind: 'kaffekopper',
    name: 'Termos',
    blurb: '60 Kaffekopper',
    priceNok: 29,
    grants: { kaffekopper: 60 },
  },
  {
    id: 'kaffe_m',
    kind: 'kaffekopper',
    name: 'Pumpekanne',
    blurb: '200 Kaffekopper',
    priceNok: 79,
    grants: { kaffekopper: 200 },
    badge: 'Mest populær',
  },
  {
    id: 'kaffe_l',
    kind: 'kaffekopper',
    name: 'Kaffebar',
    blurb: '600 Kaffekopper',
    priceNok: 199,
    grants: { kaffekopper: 600 },
    badge: '+20 %',
  },
  {
    id: 'vip',
    kind: 'vip',
    name: 'Avdelingsleder Pluss',
    blurb: 'Offline-buffer 24 t (i stedet for 8 t) og lagrede turnusmaler.',
    priceNok: 59,
    badge: 'Månedlig',
  },
  {
    id: 'tilsynspass',
    kind: 'tilsynspass',
    name: 'Tilsynspasset',
    blurb: 'Lås opp den betalte belønningsstien for denne måneden.',
    priceNok: 69,
    badge: 'Sesong',
  },
  {
    id: 'ekstravakt_1',
    kind: 'tidshopp',
    name: 'Ekstravakt · 1 time',
    blurb: 'Hent inn én time drift med en gang.',
    priceKaffe: 15,
    hours: 1,
  },
  {
    id: 'ekstravakt_4',
    kind: 'tidshopp',
    name: 'Ekstravakt · 4 timer',
    blurb: 'Fire timer drift – en hel offline-økt.',
    priceKaffe: 45,
    hours: 4,
  },
  {
    id: 'ekstravakt_8',
    kind: 'tidshopp',
    name: 'Ekstravakt · 8 timer',
    blurb: 'Åtte timer drift på et øyeblikk.',
    priceKaffe: 80,
    hours: 8,
    badge: 'Best verdi',
  },
]

export const SHOP_BY_ID: Record<string, ShopItemDef> = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]))

// ---------- Tilsynspasset (sesongpass) ----------

export const PASS_XP_PER_LEVEL = 300

/** XP-kilder for passet. */
export const PASS_XP = { shiftCompleted: 1, goodShiftBonus: 1, dilemma: 20 } as const

const lvl = (level: number, free: SeasonPassLevel['free'], premium: SeasonPassLevel['premium']): SeasonPassLevel => ({
  level,
  free,
  premium,
})

export const SEASON_PASS_LEVELS: SeasonPassLevel[] = [
  lvl(1, { budget: 1500 }, { kaffekopper: 15 }),
  lvl(2, { fagpoeng: 60 }, { budget: 6000 }),
  lvl(3, { kaffekopper: 5 }, { fagpoeng: 250 }),
  lvl(4, { budget: 4000 }, { kaffekopper: 25 }),
  lvl(5, { fagpoeng: 150 }, { budget: 15000 }),
  lvl(6, { kaffekopper: 8 }, { fagpoeng: 600 }),
  lvl(7, { budget: 9000 }, { kaffekopper: 35 }),
  lvl(8, { fagpoeng: 350 }, { budget: 35000 }),
  lvl(9, { kaffekopper: 10 }, { fagpoeng: 1500 }),
  lvl(10, { budget: 20000 }, { kaffekopper: 50 }),
  lvl(11, { fagpoeng: 700 }, { budget: 70000 }),
  lvl(12, { kaffekopper: 15 }, { kaffekopper: 80 }),
]

// ---------- Rewarded video ----------

export const AD_PLACEMENTS: Record<AdPlacement, { title: string; reward: string }> = {
  dobbel_vaktutbetaling: { title: 'Dobbel vaktutbetaling', reward: 'Dobler Fagpoeng og kr fra forrige vakt' },
  rekruttering_reroll: { title: 'Ny søker', reward: 'Bytt ut den siste søkeren med et nytt trekk' },
}
