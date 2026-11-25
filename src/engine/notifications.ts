import { PROFESSIONS, SKILLS } from '@/data/professions'
import type { GameState } from '@/types'
import { offlineCapHours } from './modifiers'
import { gameMinutesToRealMs, liveMinute } from './time'

export interface PlannedNotification {
  id: string
  /** Epoch ms når varselet skal vises. */
  at: number
  title: string
  body: string
}

/**
 * Hva spilleren bør få beskjed om mens hen er borte: når offline-bufferen
 * er full, og når hvert pågående kurs er ferdig. Ren funksjon av tilstanden –
 * selve varslingen ligger i services/notifications.
 */
export function upcomingNotifications(state: GameState, nowMs: number): PlannedNotification[] {
  const out: PlannedNotification[] = []
  const cap = offlineCapHours(state)
  out.push({
    id: 'buffer',
    at: nowMs + cap * 3_600_000,
    title: 'Offline-bufferen er full',
    body: `${state.profile.wardName} har gått ${cap} timer uten deg. Kom innom og hent inn vaktene.`,
  })
  const minute = liveMinute(state, nowMs)
  for (const id of state.staffOrder) {
    const s = state.staff[id]
    if (!s.course) continue
    out.push({
      id: `kurs-${id}`,
      at: nowMs + gameMinutesToRealMs(Math.max(0, s.course.endsAt - minute)),
      title: 'Kurs fullført',
      body: `${s.name} (${PROFESSIONS[s.profession].name.toLowerCase()}) er ferdig med kurs i ${SKILLS[s.course.skill].name.toLowerCase()}.`,
    })
  }
  return out.sort((a, b) => a.at - b.at)
}
