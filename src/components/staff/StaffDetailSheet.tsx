import { useState } from 'react'
import { BALANCE, RARITY } from '@/data/balance'
import { PROFESSIONS, SKILL_ORDER, SKILLS, TRAITS } from '@/data/professions'
import { courseCost, courseDurationMin, courseSkipCost } from '@/engine/actions'
import { xpForLevel } from '@/engine/simulation'
import { wageOf } from '@/engine/synergy'
import { gameMinutesToRealMs } from '@/engine/time'
import { cx, fmtDuration, fmtInt } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { shiftsByStaff, useGameState, useModifiers } from '@/store/selectors'
import type { StaffId } from '@/types'
import { Amount, Chip, Meter } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { IdCard, SkillPips } from './IdCard'

export function StaffDetailSheet({ staffId, onClose }: { staffId: StaffId | null; onClose: () => void }) {
  const game = useGameState()
  const mods = useModifiers()
  const [confirmDismiss, setConfirmDismiss] = useState(false)
  const s = staffId ? game.staff[staffId] : null
  const { startCourse, skipCourse, dismissStaff } = useGame.getState()

  const close = () => {
    setConfirmDismiss(false)
    onClose()
  }
  if (!s) return <Sheet open={false} onClose={close}>{null}</Sheet>

  const shifts = shiftsByStaff(game, mods)[s.id] ?? []
  const prof = PROFESSIONS[s.profession]
  const busy = s.sickUntil !== null || s.course !== null

  return (
    <Sheet open onClose={close} title={s.name}>
      <div className="grid grid-cols-[minmax(0,11rem)_1fr] gap-4">
        <IdCard staff={s} shifts={shifts} />
        <div className="space-y-2.5 pt-6">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="petrol">{prof.name}</Chip>
            <Chip tone={s.rarity === 'vanlig' ? 'neutral' : 'rav'}>{RARITY[s.rarity].name}</Chip>
          </div>
          {s.trait && (
            <div className="rounded-xl bg-blekk/[0.04] px-3 py-2">
              <div className="text-[12.5px] font-extrabold">{TRAITS[s.trait].name}</div>
              <div className="text-[11.5px] text-blekk-2">{TRAITS[s.trait].description}</div>
            </div>
          )}
          <div>
            <div className="mb-1 flex justify-between text-[11px] font-bold text-blekk-3">
              <span>Nivå {s.level}</span>
              <span className="font-mono">
                {s.level >= BALANCE.maxLevel ? 'Maks' : `${Math.floor(s.xp)}/${xpForLevel(s.level)} XP`}
              </span>
            </div>
            <Meter value={s.level >= BALANCE.maxLevel ? 1 : s.xp} max={s.level >= BALANCE.maxLevel ? 1 : xpForLevel(s.level)} color="#2B5B6C" />
            <p className="mt-1 text-[11px] text-blekk-3">+{Math.round(BALANCE.levelEffect * 100)} % effekt per nivå. Erfaring tjenes på vakt.</p>
          </div>
          <div className="flex justify-between text-[12px] font-semibold text-blekk-2">
            <span>Utholdenhet</span>
            <span className="font-mono font-bold text-blekk">{s.stamina}</span>
          </div>
          <div className="flex justify-between text-[12px] font-semibold text-blekk-2">
            <span>Lønn per time</span>
            <span className="font-mono font-bold text-blekk">{fmtInt(wageOf(s))} kr</span>
          </div>
        </div>
      </div>

      {/* Status */}
      {s.sickUntil !== null && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-fare-soft px-3 py-2.5 text-fare">
          <Icon name="puls" size={18} />
          <div className="text-[12.5px] font-bold">
            Sykmeldt – tilbake om ca. {fmtDuration(gameMinutesToRealMs(s.sickUntil - game.minute))}
          </div>
        </div>
      )}
      {s.course && (
        <div className="mt-4 rounded-xl bg-petrol-soft px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[12.5px] font-bold text-petrol">
              På kurs: {SKILLS[s.course.skill].name} · {fmtDuration(gameMinutesToRealMs(s.course.endsAt - game.minute))} igjen
            </div>
            <button className="knapp knapp-rav !py-1.5 !text-xs" onClick={() => skipCourse(s.id)}>
              <Icon name="lyn" size={13} /> Hurtigkurs
              <Amount kind="kaffekopper" size={12} className="[&_svg]:text-white">
                {courseSkipCost(game, s)}
              </Amount>
            </button>
          </div>
          <Meter
            className="mt-2"
            value={game.minute - s.course.startedAt}
            max={Math.max(1, s.course.endsAt - s.course.startedAt)}
            color="#2B5B6C"
            track="rgb(43 91 108 / 0.18)"
          />
        </div>
      )}

      {/* Kurs */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-end justify-between">
          <span className="etikett">Egenskaper og kurs</span>
          <span className="text-[11px] text-blekk-3">Kurs tar den ansatte ut av vakt</span>
        </div>
        <div className="space-y-1.5">
          {SKILL_ORDER.map((id) => {
            const level = s.skills[id]
            const maxed = level >= mods.maxSkillLevel
            const cost = courseCost(level)
            const dur = gameMinutesToRealMs(courseDurationMin(level, mods.courseSpeedMult))
            const can = !busy && !maxed && game.resources.fagpoeng >= cost
            return (
              <div key={id} className="flex items-center gap-2.5 rounded-xl border border-blekk/[0.07] bg-papir px-3 py-2">
                <span className="h-7 w-1.5 shrink-0 rounded-full" style={{ background: SKILLS[id].color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">{SKILLS[id].name}</div>
                  <SkillPips level={level} color={SKILLS[id].color} />
                </div>
                {maxed ? (
                  <Chip tone="good">
                    <Icon name="hake" size={11} /> Topp
                  </Chip>
                ) : (
                  <button
                    className={cx('knapp !gap-1.5 !px-2.5 !py-1.5 !text-xs', can ? 'knapp-primar' : 'knapp-flat')}
                    disabled={!can}
                    onClick={() => startCourse(s.id, id)}
                    title={`Varighet ${fmtDuration(dur)}`}
                  >
                    <Icon name="kurs" size={13} />
                    <span className="font-mono">{fmtInt(cost)}</span>
                    <span className="font-mono text-[10px] opacity-75">· {fmtDuration(dur)}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-blekk/10 pt-3">
        {confirmDismiss ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-fare-soft px-3 py-2.5">
            <span className="text-[12.5px] font-bold text-fare">Avslutte arbeidsforholdet til {s.name.split(' ')[0]}?</span>
            <div className="flex gap-1.5">
              <button className="knapp knapp-lys !py-1.5 !text-xs" onClick={() => setConfirmDismiss(false)}>
                Avbryt
              </button>
              <button
                className="knapp !bg-fare !py-1.5 !text-xs text-white"
                onClick={() => {
                  if (dismissStaff(s.id)) close()
                }}
              >
                Ja, avslutt
              </button>
            </div>
          </div>
        ) : (
          <button className="text-[12px] font-bold text-blekk-3 hover:text-fare" onClick={() => setConfirmDismiss(true)}>
            Avslutt arbeidsforhold …
          </button>
        )}
      </div>
    </Sheet>
  )
}
