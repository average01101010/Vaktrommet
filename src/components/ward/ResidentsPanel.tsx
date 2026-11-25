import { useState } from 'react'
import { SHIFT_ORDER, SHIFTS } from '@/data/balance'
import { SKILL_ORDER, SKILLS } from '@/data/professions'
import { RESIDENT_PROFILES } from '@/data/residents'
import { residentDemand, residentMix } from '@/engine/residents'
import { dayNumber, gameMinutesToRealMs, MIN_PER_DAY } from '@/engine/time'
import { cx, fmtDuration, fmtPct } from '@/lib/format'
import { useCurrentShift, useGameState, useShiftEvaluation } from '@/store/selectors'
import type { Resident } from '@/types'
import { Chip, SectionTitle } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'

const CRITICAL = new Set(['medikament', 'saarstell'])

/** Pleietyngde som tre små søyler. */
function Tyngde({ value }: { value: number }) {
  const level = value >= 1.15 ? 3 : value >= 0.95 ? 2 : 1
  return (
    <span className="inline-flex items-end gap-[2px]" title={`Pleietyngde ${value.toFixed(2).replace('.', ',')}`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cx('w-[3px] rounded-sm', i <= level ? 'bg-blekk-2' : 'bg-blekk/15')}
          style={{ height: 3 + i * 3 }}
        />
      ))}
    </span>
  )
}

/** Aktive beboere og behovet de genererer på vakta som går nå. */
export function ResidentsPanel() {
  const game = useGameState()
  const shift = useCurrentShift()
  const ev = useShiftEvaluation(shift)
  const [openId, setOpenId] = useState<number | null>(null)
  const mix = residentMix(game)
  const open = game.residents.find((r) => r.id === openId) ?? null
  const daysLeft = (r: Resident) => Math.max(0, Math.ceil((r.dischargeAt - game.minute) / MIN_PER_DAY))

  return (
    <div>
      <SectionTitle
        right={
          <span className="font-mono text-[11px] font-bold text-blekk-3">
            {game.residents.length}/{ev.beds} senger
          </span>
        }
      >
        Beboere og behov
      </SectionTitle>
      <div className="kort p-3.5">
        {/* Beboermiks */}
        <div className="flex h-2 overflow-hidden rounded-full bg-blekk/10">
          {mix.map((m) => (
            <div
              key={m.profile}
              style={{ width: `${(m.count / game.residents.length) * 100}%`, background: RESIDENT_PROFILES[m.profile].color }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {mix.map((m) => (
            <span key={m.profile} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-blekk-2">
              <span className="h-2 w-2 rounded-full" style={{ background: RESIDENT_PROFILES[m.profile].color }} />
              {RESIDENT_PROFILES[m.profile].short}
              <span className="font-mono font-bold text-blekk">{m.count}</span>
            </span>
          ))}
        </div>

        {/* Behov på vakta som går nå */}
        <div className="mt-3.5 mb-1.5 flex items-center justify-between">
          <span className="etikett">Behov på {SHIFTS[shift].name.toLowerCase()}</span>
          {!ev.nurseOnDuty && ev.present.length > 0 && (
            <Chip tone="bad" className="!py-0.5 !text-[10px]">
              <Icon name="avvik" size={11} /> Ingen sykepleier
            </Chip>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {SKILL_ORDER.map((id) => {
            const need = ev.demand[id]
            const c = ev.coverageBySkill[id]
            const critical = CRITICAL.has(id) && need > 0 && c < 0.7
            return (
              <div
                key={id}
                title={`${SKILLS[id].name}: behov ${need.toFixed(1).replace('.', ',')}, dekket ${fmtPct(c)}`}
                className={cx('rounded-lg px-0.5 py-1.5 text-center', critical ? 'bg-fare-soft' : 'bg-blekk/[0.04]')}
              >
                <div className="relative mx-auto h-9 w-2.5 overflow-hidden rounded-full bg-blekk/10">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-700"
                    style={{
                      height: `${need > 0 ? c * 100 : 0}%`,
                      background: need <= 0 ? 'transparent' : c >= 1 ? SKILLS[id].color : c >= 0.6 ? '#D97736' : '#B4432F',
                    }}
                  />
                </div>
                <div className={cx('mt-1 truncate text-[8.5px] font-bold', critical ? 'text-fare' : 'text-blekk-3')}>{SKILLS[id].short}</div>
                <div className="font-mono text-[9.5px] font-bold text-blekk">{need > 0 ? need.toFixed(1).replace('.', ',') : '–'}</div>
              </div>
            )
          })}
        </div>

        {/* Romliste */}
        <div className="mt-3.5 grid grid-cols-2 gap-1.5">
          {game.residents.map((r) => {
            const p = RESIDENT_PROFILES[r.profile]
            const left = daysLeft(r)
            const isNew = game.minute - r.admittedAt < MIN_PER_DAY
            return (
              <button
                key={r.id}
                onClick={() => setOpenId(r.id)}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-blekk/[0.07] bg-papir px-2 py-1.5 text-left transition-colors hover:border-blekk/20"
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-extrabold text-white"
                  style={{ background: p.color }}
                >
                  {r.room}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] leading-tight font-extrabold">{r.name}</span>
                    <Tyngde value={r.tyngde} />
                  </span>
                  <span className="block truncate text-[10.5px] leading-tight font-semibold text-blekk-3">{p.short}</span>
                </span>
                <span
                  className={cx(
                    'shrink-0 rounded-md px-1 py-0.5 font-mono text-[9.5px] font-bold',
                    isNew ? 'bg-skog-soft text-skog' : left <= 1 ? 'bg-rav-soft text-rav-2' : 'text-blekk-3',
                  )}
                >
                  {isNew ? 'Ny' : `${left} d`}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-2.5 text-[11px] leading-snug text-blekk-3">
          Behovet på hver vakt er summen av beboernes profiler. Når noen skrives ut og nye kommer inn, endrer turnusbehovet seg.
        </p>
      </div>

      <Sheet open={Boolean(open)} onClose={() => setOpenId(null)} title={open ? `${open.name} · rom ${open.room}` : ''}>
        {open && (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="rounded-full px-2.5 py-1 text-[11.5px] font-bold text-white"
                style={{ background: RESIDENT_PROFILES[open.profile].color }}
              >
                {RESIDENT_PROFILES[open.profile].name}
              </span>
              <Chip className="font-mono">Pleietyngde {open.tyngde.toFixed(2).replace('.', ',')}</Chip>
            </div>
            <p className="mt-2.5 text-[14px] leading-snug text-blekk-2">{RESIDENT_PROFILES[open.profile].description}</p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-blekk/[0.04] px-3 py-2">
                <div className="etikett">Innkomst</div>
                <div className="font-mono text-[14px] font-extrabold">Døgn {Math.max(1, dayNumber(open.admittedAt))}</div>
              </div>
              <div className="rounded-xl bg-blekk/[0.04] px-3 py-2">
                <div className="etikett">Utskrives om</div>
                <div className="font-mono text-[14px] font-extrabold">
                  {daysLeft(open)} døgn
                  <span className="ml-1.5 text-[11px] font-semibold text-blekk-3">
                    ≈ {fmtDuration(gameMinutesToRealMs(Math.max(0, open.dischargeAt - game.minute)))}
                  </span>
                </div>
              </div>
            </div>

            <div className="etikett mt-4 mb-1.5">Behov per vakt</div>
            <div className="kort overflow-hidden">
              <div className="grid grid-cols-[1fr_3.2rem_3.2rem_3.2rem] items-center border-b border-blekk/[0.07] px-3 py-1.5">
                <span />
                {SHIFT_ORDER.map((sh) => (
                  <span key={sh} className={cx('text-center text-[10.5px] font-extrabold uppercase', sh === shift ? 'text-rav-2' : 'text-blekk-3')}>
                    {SHIFTS[sh].short}
                  </span>
                ))}
              </div>
              {SKILL_ORDER.map((id) => (
                <div key={id} className="grid grid-cols-[1fr_3.2rem_3.2rem_3.2rem] items-center px-3 py-1.5 even:bg-blekk/[0.025]">
                  <span className="flex items-center gap-2 text-[12.5px] font-semibold">
                    <span className="h-2 w-2 rounded-full" style={{ background: SKILLS[id].color }} />
                    {SKILLS[id].name}
                  </span>
                  {SHIFT_ORDER.map((sh) => {
                    const v = residentDemand(open, sh)[id]
                    return (
                      <span
                        key={sh}
                        className={cx('text-center font-mono text-[12px]', v >= 1 ? 'font-extrabold text-blekk' : v > 0 ? 'font-semibold text-blekk-2' : 'text-blekk/25')}
                      >
                        {v > 0 ? v.toFixed(1).replace('.', ',') : '–'}
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </Sheet>
    </div>
  )
}
