import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import { SHOP_BY_ID } from '@/data/economy'
import * as actions from '@/engine/actions'
import type { ActionResult, ProfileInput, SaveSummary } from '@/engine/actions'
import { migrateGameState } from '@/engine/migrate'
import { catchUp, createInitialState, STATE_VERSION } from '@/engine/simulation'
import { cue } from '@/lib/feedback'
import { getAdProvider, getPurchaseProvider } from '@/services/monetization'
import type {
  AdPlacement,
  BannerId,
  DilemmaResolution,
  GameState,
  OfflineReport,
  Settings,
  ShiftId,
  SkillId,
  StaffId,
  UpgradeId,
  WardTypeId,
} from '@/types'

export type ToastTone = 'info' | 'good' | 'bad'

export interface Toast {
  id: number
  text: string
  tone: ToastTone
}

interface AdRequest {
  placement: AdPlacement
  resolve: (watched: boolean) => void
}

interface GameStore {
  game: GameState
  offlineReport: OfflineReport | null
  toasts: Toast[]
  /** Aktiv demo-reklame (vises som overlay). */
  ad: AdRequest | null

  tick: (nowMs: number) => void
  dismissOfflineReport: () => void
  toast: (text: string, tone?: ToastTone) => void
  dismissToast: (id: number) => void
  resetGame: () => void

  updateProfile: (input: ProfileInput) => boolean
  updateSettings: (patch: Partial<Settings>) => void
  /** Gjeldende spill som lagringsfil (JSON). */
  exportSave: () => string
  importSave: (json: string) => SaveSummary | null
  restorePurchases: () => Promise<string[]>
  assign: (shift: ShiftId, slot: number, staffId: StaffId) => boolean
  assignFirstFree: (shift: ShiftId, staffId: StaffId) => boolean
  unassign: (shift: ShiftId, slot: number) => void
  suggestShift: (shift: ShiftId) => void
  saveTemplate: (name: string) => void
  applyTemplate: (id: string) => void
  deleteTemplate: (id: string) => void
  buyUpgrade: (id: UpgradeId) => boolean
  resolveDilemma: (uid: number, optionId: string) => DilemmaResolution | null
  startCourse: (staffId: StaffId, skill: SkillId) => boolean
  skipCourse: (staffId: StaffId) => boolean
  recruit: (banner: BannerId) => StaffId | null
  rerollRecruit: () => Promise<StaffId | null>
  dismissStaff: (staffId: StaffId) => boolean
  timeSkip: (itemId: string) => boolean
  purchase: (itemId: string) => Promise<boolean>
  claimPass: (level: number, track: 'free' | 'premium') => void
  claimInspection: (index: number) => void
  doubleLastShift: () => Promise<void>
  markShiftReportSeen: () => void
  rotateWard: (choice: { wardType: WardTypeId; keepStaff: StaffId[]; wardName?: string }) => boolean

  watchAd: (placement: AdPlacement) => Promise<boolean>
  finishAd: (watched: boolean) => void
}

let toastId = 0

/** localStorage kan være blokkert eller full – spillet skal kjøre uansett. */
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Ingen lagring tilgjengelig: fortsett uten.
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch {
      // Se over.
    }
  },
}

// ---------------------------------------------------------------------------
// Debouncet lagring
// ---------------------------------------------------------------------------

type Persisted = { game: GameState }

/** Minste tid mellom to skrivinger til localStorage. */
const SAVE_INTERVAL_MS = 5000

let pendingSave: { name: string; value: { state: Persisted; version?: number } } | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let lastSavedAt = 0

/**
 * Skriver ventende lagring nå. Kalles etter viktige spillerhandlinger og når
 * fanen skjules eller lukkes, så ingenting går tapt mellom de faste skrivingene.
 */
export function flushSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (!pendingSave) return
  const { name, value } = pendingSave
  pendingSave = null
  lastSavedAt = Date.now()
  safeStorage.setItem(name, JSON.stringify(value))
}

/**
 * Lagringsadapter som holder på siste tilstand og skriver høyst hvert femte
 * sekund. Serialiseringen (JSON.stringify av hele spillet) skjer bare når det
 * faktisk skrives – ikke ved hver tilstandsendring.
 */
const debouncedStorage: PersistStorage<Persisted> = {
  getItem: (name) => {
    const raw = safeStorage.getItem(name)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    pendingSave = { name, value }
    if (saveTimer) return
    const wait = Math.max(0, SAVE_INTERVAL_MS - (Date.now() - lastSavedAt))
    saveTimer = setTimeout(flushSave, wait)
  },
  removeItem: (name) => {
    pendingSave = null
    safeStorage.removeItem(name)
  },
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => {
      /** Kjører en ren handling; lagrer ny tilstand eller viser feilmelding. */
      function run<T>(result: ActionResult<T>): (ActionResult<T> & { ok: true }) | null {
        if (!result.ok) {
          get().toast(result.reason, 'bad')
          return null
        }
        set({ game: result.state })
        cue(result.state.settings, 'tap')
        // Spillerhandlinger lagres med en gang – ikke bare ved neste faste skriving.
        flushSave()
        return result
      }

      return {
        game: createInitialState(Date.now()),
        offlineReport: null,
        toasts: [],
        ad: null,

        tick: (nowMs) => {
          const game = get().game
          const { state, report } = catchUp(game, nowMs)
          // Mellom hele simuleringssteg er tilstanden uendret – da rører vi ingenting.
          if (state === game) return
          set(report ? { game: state, offlineReport: report } : { game: state })
          if (report) flushSave()
        },
        dismissOfflineReport: () => set({ offlineReport: null }),

        toast: (text, tone = 'info') => {
          const id = ++toastId
          set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }))
          if (tone !== 'info') cue(get().game.settings, tone)
          setTimeout(() => get().dismissToast(id), 3200)
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

        resetGame: () => {
          if (run(actions.resetGame(get().game, Date.now()))) set({ offlineReport: null })
        },

        updateProfile: (input) => run(actions.updateProfile(get().game, input)) !== null,
        updateSettings: (patch) => void run(actions.updateSettings(get().game, patch)),
        exportSave: () => actions.exportSave(get().game, Date.now()),
        importSave: (json) => {
          const r = run(actions.importSave(get().game, json, Date.now()))
          if (!r) return null
          set({ offlineReport: null })
          get().toast(`Lagringen for «${r.summary.wardName}» er lest inn.`, 'good')
          return r.summary
        },
        restorePurchases: async () => {
          const owned = await getPurchaseProvider().restore().catch(() => [] as string[])
          const r = run(actions.restorePurchases(get().game, owned, Date.now()))
          const restored = r?.restored ?? []
          get().toast(
            restored.length > 0 ? 'Medlemskapene dine er gjenopprettet.' : 'Fant ingen kjøp å gjenopprette.',
            restored.length > 0 ? 'good' : 'info',
          )
          return restored
        },

        assign: (shift, slot, staffId) => run(actions.assignStaff(get().game, shift, slot, staffId)) !== null,
        assignFirstFree: (shift, staffId) => run(actions.assignToFirstFree(get().game, shift, staffId)) !== null,
        unassign: (shift, slot) => void run(actions.unassignSlot(get().game, shift, slot)),
        suggestShift: (shift) => {
          if (run(actions.suggestShift(get().game, shift))) get().toast('Ledige plasser er fylt med best mulig dekning.', 'good')
        },
        saveTemplate: (name) => {
          if (run(actions.saveTemplate(get().game, name))) get().toast(`Malen «${name}» er lagret.`, 'good')
        },
        applyTemplate: (id) => {
          if (run(actions.applyTemplate(get().game, id))) get().toast('Turnusmalen er lagt inn.', 'good')
        },
        deleteTemplate: (id) => void run(actions.deleteTemplate(get().game, id)),

        buyUpgrade: (id) => run(actions.buyUpgrade(get().game, id)) !== null,

        resolveDilemma: (uid, optionId) => run(actions.resolveDilemma(get().game, uid, optionId))?.resolution ?? null,

        startCourse: (staffId, skill) => run(actions.startCourse(get().game, staffId, skill)) !== null,
        skipCourse: (staffId) => run(actions.skipCourse(get().game, staffId)) !== null,

        recruit: (banner) => run(actions.recruit(get().game, banner))?.staffId ?? null,
        rerollRecruit: async () => {
          const last = get().game.monetization.gacha.lastPull
          if (!last || last.rerolled) return null
          if (!(await get().watchAd('rekruttering_reroll'))) return null
          return run(actions.rerollLastRecruit(get().game))?.staffId ?? null
        },
        dismissStaff: (staffId) => run(actions.dismissStaff(get().game, staffId)) !== null,

        timeSkip: (itemId) => {
          const r = run(actions.timeSkip(get().game, itemId))
          if (r) get().toast(`Ekstravakt fullført: +${Math.round(r.gained.fagpoeng)} Fagpoeng, +${Math.round(r.gained.budget)} kr.`, 'good')
          return r !== null
        },

        purchase: async (itemId) => {
          const item = SHOP_BY_ID[itemId]
          if (!item) return false
          const receipt = await getPurchaseProvider().purchase(item)
          if (!receipt) return false
          // TODO(server): send kvitteringen til Supabase Edge Function for validering før innvilgelse.
          const ok = run(actions.grantPurchase(get().game, itemId, Date.now())) !== null
          if (ok) get().toast(`${item.name} er aktivert.`, 'good')
          return ok
        },

        claimPass: (level, track) => void run(actions.claimPassReward(get().game, level, track)),
        claimInspection: (index) => {
          if (run(actions.claimInspectionTier(get().game, index))) get().toast('Tilsynsbelønning hentet.', 'good')
        },

        doubleLastShift: async () => {
          const last = get().game.shift.last
          if (!last || last.doubled) return
          if (!(await get().watchAd('dobbel_vaktutbetaling'))) return
          if (run(actions.doubleLastShift(get().game))) get().toast('Vaktutbetalingen er doblet!', 'good')
        },
        markShiftReportSeen: () => void run(actions.markShiftReportSeen(get().game)),

        rotateWard: (choice) => {
          const ok = run(actions.rotateWard(get().game, choice)) !== null
          if (ok) get().toast('Avdelingen er overlevert. Lykke til med det nye oppdraget!', 'good')
          return ok
        },

        watchAd: (placement) => {
          const provider = getAdProvider()
          if (provider) return provider.show(placement)
          return new Promise<boolean>((resolve) => set({ ad: { placement, resolve } }))
        },
        finishAd: (watched) => {
          const ad = get().ad
          if (!ad) return
          set({ ad: null })
          ad.resolve(watched)
        },
      }
    },
    {
      name: 'vaktrommet-save',
      version: STATE_VERSION,
      storage: debouncedStorage,
      partialize: (s) => ({ game: s.game }),
      // Eldre lagringsformat løftes av merge() under – her sendes det bare videre.
      migrate: (persisted) => persisted as Persisted,
      // Hver innlasting går gjennom migrateGameState: nye felter får trygge
      // standardverdier, og spilleren beholder alt som er opparbeidet.
      merge: (persisted, current) => ({
        ...current,
        game: migrateGameState((persisted as Partial<Persisted> | undefined)?.game, Date.now()),
      }),
    },
  ),
)
