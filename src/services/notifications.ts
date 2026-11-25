import { upcomingNotifications } from '@/engine/notifications'
import type { GameState } from '@/types'

/**
 * Lokale varsler mens spilleren er borte. Varslene planlegges når fanen
 * skjules og avlyses når den vises igjen.
 *
 * Begrensning: dette virker bare så lenge nettleseren holder fanen/appen i
 * live i bakgrunnen. Varsler når appen er helt lukket krever Web Push fra en
 * server, og er ikke bygget ennå.
 */
export type NotificationSupport = 'unsupported' | 'default' | 'granted' | 'denied'

export function notificationSupport(): NotificationSupport {
  try {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
  } catch {
    return 'unsupported'
  }
}

/** Ber om tillatelse. Må kalles fra et trykk. */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (notificationSupport() === 'unsupported') return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return notificationSupport()
  }
}

async function show(title: string, body: string): Promise<void> {
  try {
    // Installert PWA: varsler må gå via service workeren på Android.
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, icon: '/pwa-192.png', badge: '/pwa-192.png', tag: 'vaktrommet' })
      return
    }
    new Notification(title, { body, icon: '/pwa-192.png', tag: 'vaktrommet' })
  } catch {
    // Varsler er et tilbud, ikke en forutsetning.
  }
}

let timers: ReturnType<typeof setTimeout>[] = []

export function cancelAwayNotifications(): void {
  for (const t of timers) clearTimeout(t)
  timers = []
}

/** Planlegger varsler for fraværet som starter nå. */
export function scheduleAwayNotifications(game: GameState, nowMs: number): void {
  cancelAwayNotifications()
  if (!game.settings.notifications || notificationSupport() !== 'granted') return
  for (const n of upcomingNotifications(game, nowMs)) {
    const delay = n.at - nowMs
    if (delay < 30_000) continue // for kort fravær til at et varsel gir mening
    timers.push(setTimeout(() => void show(n.title, n.body), delay))
  }
}
