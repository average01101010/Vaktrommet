import { DILEMMA_BY_ID } from '@/data/dilemmas'
import { PROFESSIONS } from '@/data/professions'
import { RESIDENT_PROFILES } from '@/data/residents'
import { meetingCooldown } from '@/engine/actions'
import { avvikCheckStatus } from '@/engine/avvik'
import { renderDilemma } from '@/engine/dilemmas'
import { dayNumber, gameMinutesToRealMs, MIN_PER_DAY, minuteOfDay } from '@/engine/time'
import { cx, fmtDuration } from '@/lib/format'
import { useCurrentShift, useGameState, useShiftEvaluation } from '@/store/selectors'
import type { TabId } from '../layout/BottomNav'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { MAX_BEDS, ROOM_INFO, type CommonRoomKind, type PlanRoom } from './plan/floorPlan'
import { mealAt, MEALS, nextMeal } from './plan/planAgents'

interface RoomSheetProps {
  room: PlanRoom | null
  onClose: () => void
  /** Be kameraet følge en figur: `b<beboer-id>` eller `a<ansatt-id>`. */
  onFollow: (key: string) => void
  onEnterVaktrom: () => void
  onOpenAvvik: () => void
  onNavigate: (tab: TabId) => void
}

const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-blekk/[0.05] px-3 py-2">
      <div className="text-[10.5px] font-bold tracking-wide text-blekk-3 uppercase">{label}</div>
      <div className="mt-0.5 text-[13.5px] font-extrabold">{children}</div>
    </div>
  )
}

/** Det som åpnes når du trykker på et rom på avdelingskartet. */
export function RoomSheet({ room, onClose, onFollow, onEnterVaktrom, onOpenAvvik, onNavigate }: RoomSheetProps) {
  const game = useGameState()
  const shift = useCurrentShift()
  const ev = useShiftEvaluation(shift)
  if (!room) return null
  const go = (fn: () => void) => () => {
    onClose()
    fn()
  }

  // ---- Byggetomt ----
  if (room.kind === 'tomt') {
    return (
      <Sheet open onClose={onClose} title={`Rom ${room.bed} · Byggetomt`}>
        <p className="text-[13.5px] leading-snug text-blekk-2">
          Her er det plass til et beboerrom til. Avdelingen har {ev.beds} av {MAX_BEDS} rom i denne fløyen. Flere rom gir flere beboere, og da
          trenger du også flere på vakt.
        </p>
        <button className="knapp knapp-primar mt-4 w-full" onClick={go(() => onNavigate('utstyr'))}>
          Se utbygging under Utstyr <Icon name="pil" size={15} />
        </button>
      </Sheet>
    )
  }

  // ---- Beboerrom ----
  if (room.kind === 'beboer') {
    const resident = game.residents.find((r) => r.room === room.bed)
    if (!resident) {
      return (
        <Sheet open onClose={onClose} title={`Rom ${room.bed} · Ledig`}>
          <p className="text-[13.5px] leading-snug text-blekk-2">Rommet er vasket og klart. Neste beboer flytter inn ved neste vaktskifte.</p>
        </Sheet>
      )
    }
    const profile = RESIDENT_PROFILES[resident.profile]
    const daysIn = Math.max(1, Math.floor((game.minute - resident.admittedAt) / MIN_PER_DAY) + 1)
    const daysLeft = Math.max(0, Math.ceil((resident.dischargeAt - game.minute) / MIN_PER_DAY))
    const cases = game.dilemmas.active.filter((a) => a.subject?.residentId === resident.id)
    const level = resident.tyngde >= 1.15 ? 'Høy' : resident.tyngde >= 0.95 ? 'Middels' : 'Lav'
    return (
      <Sheet open onClose={onClose} title={`Rom ${room.bed} · ${resident.name}`}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-10 w-1.5 shrink-0 rounded-full" style={{ background: profile.color }} />
          <div className="min-w-0">
            <div className="text-[14.5px] font-extrabold">{profile.name}</div>
            <p className="mt-0.5 text-[13px] leading-snug text-blekk-2">{profile.description}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Fact label="Pleietyngde">{level}</Fact>
          <Fact label="Bodd her">{daysIn} døgn</Fact>
          <Fact label="Planlagt ut">{daysLeft === 0 ? 'i dag' : `om ${daysLeft} d`}</Fact>
        </div>
        {cases.length > 0 && (
          <div className="mt-3 rounded-2xl bg-rav-soft/80 px-3.5 py-3">
            <div className="text-[11px] font-bold tracking-wide text-blekk-3 uppercase">På korktavla</div>
            <ul className="mt-1 space-y-1">
              {cases.map((a) => {
                const def = DILEMMA_BY_ID[a.defId]
                return (
                  <li key={a.uid} className="flex items-start gap-2 text-[13px] leading-snug font-bold">
                    <Icon name="tavle" size={15} className="mt-0.5 shrink-0" />
                    {def ? renderDilemma(def, a.subject).title : 'En sak venter'}
                  </li>
                )
              })}
            </ul>
            <button
              className="knapp knapp-flat mt-2.5 w-full !py-2 !text-[13px]"
              onClick={go(() => document.getElementById('korktavla')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))}
            >
              Gå til korktavla
            </button>
          </div>
        )}
        <button className="knapp knapp-primar mt-4 w-full" onClick={go(() => onFollow(`b${resident.id}`))}>
          <Icon name="folk" size={16} /> Følg {resident.name.split(' ')[0]}
        </button>
      </Sheet>
    )
  }

  // ---- Fellesrom ----
  const kind = room.kind as CommonRoomKind
  const mod = minuteOfDay(game.minute)
  const meal = mealAt(mod)
  const upcoming = nextMeal(mod)
  const openAvvik = game.ward.openAvvik
  const status = avvikCheckStatus(openAvvik)
  const wait = meetingCooldown(game)
  const onDuty = ev.present.map((id) => game.staff[id]).filter(Boolean)
  return (
    <Sheet open onClose={onClose} title={room.label}>
      <p className="text-[13.5px] leading-snug text-blekk-2">{ROOM_INFO[kind]}</p>

      {kind === 'vaktrom' && (
        <>
          <div className="mt-3 text-[11px] font-bold tracking-wide text-blekk-3 uppercase">På vakt nå · Døgn {dayNumber(game.minute)}</div>
          {onDuty.length === 0 ? (
            <p className="mt-1 text-[13px] font-bold text-fare">Ingen på vakt.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {onDuty.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-xl bg-blekk/[0.05] py-1.5 pr-1.5 pl-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-extrabold">{s.name}</div>
                    <div className="text-[11.5px] text-blekk-3">{PROFESSIONS[s.profession].name}</div>
                  </div>
                  <button className="knapp knapp-flat !px-3 !py-1.5 !text-[12.5px]" onClick={go(() => onFollow(`a${s.id}`))}>
                    Følg
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className="knapp knapp-primar mt-4 w-full" onClick={go(onEnterVaktrom)}>
            Gå inn i vaktrommet <Icon name="pil" size={15} />
          </button>
        </>
      )}

      {kind === 'kontor' && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Fact label="Ulukkede avvik">
              <span className={cx(status === 'kritisk' && 'text-fare')}>{openAvvik}</span>
            </Fact>
            <Fact label="Hull i turnusen">{game.gaps.length}</Fact>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="knapp knapp-primar" onClick={go(onOpenAvvik)}>
              Behandle avvik
            </button>
            <button className="knapp knapp-flat" onClick={go(() => onNavigate('turnus'))}>
              Åpne turnusen
            </button>
          </div>
        </>
      )}

      {kind === 'moterom' && (
        <>
          <div className="mt-3">
            <Fact label="Pårørendesamtale">{wait > 0 ? `Klar om ${fmtDuration(gameMinutesToRealMs(wait))}` : 'Klar nå'}</Fact>
          </div>
          <button className="knapp knapp-primar mt-4 w-full" onClick={go(onOpenAvvik)}>
            Planlegg pårørendesamtale
          </button>
        </>
      )}

      {kind === 'medisinrom' && (
        <div className="mt-3">
          <Fact label="Medisintralle">{(game.upgrades.medisintralle ?? 0) >= 1 ? 'På plass – færre feil ved utdeling' : 'Mangler – kan kjøpes under Utstyr'}</Fact>
        </div>
      )}

      {(kind === 'kjokken' || kind === 'spisestue') && (
        <>
          <div className="mt-3">
            <Fact label={meal ? 'Akkurat nå' : 'Neste måltid'}>
              {meal ? `${meal.name} til kl. ${clock(meal.to)}` : `${upcoming.name} om ${fmtDuration(gameMinutesToRealMs(upcoming.inMinutes))}`}
            </Fact>
          </div>
          <ul className="mt-2 flex gap-2 text-[12px] font-bold text-blekk-2">
            {MEALS.map((m) => (
              <li key={m.name} className={cx('flex-1 rounded-xl px-2 py-1.5 text-center', meal?.name === m.name ? 'bg-skog-soft' : 'bg-blekk/[0.05]')}>
                {m.name}
                <span className="block font-mono text-[11px] text-blekk-3">{clock(m.from)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {kind === 'stue' && (
        <div className="mt-3">
          <Fact label="Trivsel på avdelingen">{Math.round(game.ward.trivsel)} av 100</Fact>
        </div>
      )}
    </Sheet>
  )
}
