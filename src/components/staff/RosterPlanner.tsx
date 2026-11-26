import { useState } from 'react'
import { createPortal } from 'react-dom'
import { BALANCE, SHIFT_ORDER, SHIFTS } from '@/data/balance'
import { SKILL_ORDER, SKILLS } from '@/data/professions'
import { RESIDENT_PROFILES } from '@/data/residents'
import { BONUS_SYNERGIES, SYNERGIES } from '@/data/synergies'
import { slotsFor } from '@/engine/modifiers'
import { residentMix } from '@/engine/residents'
import { canWork } from '@/engine/absence'
import { restBreachFor, restBreachText } from '@/engine/rest'
import { shiftStartFor, weekdayName } from '@/engine/time'
import { cx, fmtInt, fmtPct } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { shiftsByStaff, useCurrentShift, useGameState, useModifiers, useShiftEvaluation } from '@/store/selectors'
import type { ShiftEvaluation, ShiftId, StaffId } from '@/types'
import { Chip, Meter, SectionTitle } from '../ui/bits'
import { Icon, type IconName } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { GapSheet, gapLabel } from './GapSheet'
import { EmptySlot, IdCard, MiniIdCard } from './IdCard'
import { useStaffDrag, type SlotRef } from './useStaffDrag'

const SHIFT_ICON: Record<ShiftId, IconName> = { dag: 'sol', aften: 'kveld', natt: 'mane' }

export function RosterPlanner({ onOpenStaff }: { onOpenStaff: (id: StaffId) => void }) {
  const game = useGameState()
  const mods = useModifiers()
  const current = useCurrentShift()
  const [shift, setShift] = useState<ShiftId>(current)
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [showSynergies, setShowSynergies] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [openGap, setOpenGap] = useState<number | null>(null)
  const openGaps = game.gaps.filter((g) => g.cover === 'open')
  const ev = useShiftEvaluation(shift)
  const { assign, assignFirstFree, unassign, suggestShift } = useGame.getState()

  const slots = slotsFor(mods)
  const row = game.roster[shift]
  const onShifts = shiftsByStaff(game, mods)
  // Hviletid (AML § 10-8) for alle i staben, med turnusen slik den står nå
  const rest = Object.fromEntries(game.staffOrder.map((id) => [id, restBreachFor(game, id, slots)]))

  const { drag, start, justDragged } = useStaffDrag((staffId, target, from) => {
    if (target) {
      if (from && from.shift === target.shift) assign(target.shift, target.slot, staffId)
      else if (assign(target.shift, target.slot, staffId) && from) unassign(from.shift, from.slot)
    } else if (from) {
      unassign(from.shift, from.slot) // dratt ut av vaktplanen
    }
    setActiveSlot(null)
  })

  const pickStaff = (id: StaffId) => {
    if (justDragged.current) return
    if (row.slice(0, slots).includes(id)) {
      onOpenStaff(id)
      return
    }
    if (activeSlot !== null) {
      if (assign(shift, activeSlot, id)) setActiveSlot(null)
    } else {
      assignFirstFree(shift, id)
    }
  }

  const isOver = (ref: SlotRef) => drag?.over?.shift === ref.shift && drag.over.slot === ref.slot

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0 space-y-3">
        {/* Vaktvelger */}
        <div className="flex gap-1.5 rounded-2xl bg-blekk/[0.06] p-1">
          {SHIFT_ORDER.map((id) => {
            const active = id === shift
            const filled = game.roster[id].slice(0, slots).filter(Boolean).length
            return (
              <button
                key={id}
                onClick={() => {
                  setShift(id)
                  setActiveSlot(null)
                }}
                className={cx(
                  'relative flex flex-1 flex-col items-center rounded-xl px-2 py-1.5 transition-all',
                  active ? 'bg-papir text-skog shadow-kort' : 'text-blekk-2',
                )}
              >
                <span className="flex items-center gap-1.5 text-[13px] font-extrabold">
                  <Icon name={SHIFT_ICON[id]} size={15} />
                  {SHIFTS[id].short}
                  {id === current && <span className="h-1.5 w-1.5 animate-puls rounded-full bg-rav" title="Pågår nå" />}
                  <span className="font-mono text-[10.5px] font-bold opacity-60">
                    {filled}/{slots}
                  </span>
                </span>
                <span className="font-mono text-[10px] font-semibold whitespace-nowrap opacity-70">{SHIFTS[id].hours}</span>
              </button>
            )
          })}
        </div>

        {/* Hull som ingen har tatt stilling til ennå */}
        {openGaps.length > 0 && (
          <div className="flex animate-inn items-center gap-2.5 rounded-2xl bg-fare-soft px-3.5 py-2.5">
            <Icon name="avvik" size={18} className="shrink-0 text-fare" />
            <div className="min-w-0 flex-1 text-[12.5px] leading-snug font-bold text-fare">
              {openGaps.length === 1 ? 'Ett hull i turnusen' : `${openGaps.length} hull i turnusen`}:{' '}
              {openGaps.map((g) => `${game.staff[g.staffId]?.name.split(' ')[0] ?? '?'} (${SHIFTS[g.shift].short.toLowerCase()})`).join(', ')}
            </div>
            <button
              className="knapp !bg-fare !px-2.5 !py-1.5 !text-xs text-white"
              onClick={() => {
                setShift(openGaps[0].shift)
                setOpenGap(openGaps[0].id)
              }}
            >
              Løs
            </button>
          </div>
        )}

        {/* Vaktplasser */}
        <div className="kort p-3.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight">
                {SHIFTS[shift].name}
                {ev.weekend && <Chip tone="rav" className="!py-0.5 !text-[10px]">Helg · +{Math.round(BALANCE.weekendWageBonus * 100)} % lønn</Chip>}
              </div>
              <div className="text-[11.5px] font-semibold text-blekk-3">
                {weekdayName(shiftStartFor(game.minute, shift))} · {shift === current ? 'pågår nå' : 'planlagt'} · dra eller trykk et ID-kort inn på en plass
              </div>
            </div>
            <div className="text-right">
              <div
                className={cx(
                  'font-mono text-2xl leading-none font-extrabold',
                  ev.coverage >= 0.9 ? 'text-skog' : ev.coverage >= 0.6 ? 'text-rav-2' : 'text-fare',
                )}
              >
                {fmtPct(ev.coverage)}
              </div>
              <div className="etikett mt-0.5">Dekning</div>
            </div>
          </div>

          <div
            className="mt-2 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.min(BALANCE.maxSlots, slots + 1)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: Math.min(BALANCE.maxSlots, slots + 1) }, (_, i) => {
              const locked = i >= slots
              const id = locked ? null : row[i]
              const ref: SlotRef = { shift, slot: i }
              const gap = locked ? undefined : game.gaps.find((g) => g.shift === shift && g.slot === i)
              const label = gap ? gapLabel(gap, gap.coverId ? game.staff[gap.coverId]?.name.split(' ')[0] : undefined) : null
              return (
                <div
                  key={i}
                  data-slot={locked ? undefined : `${shift}:${i}`}
                  className={cx('rounded-xl transition-all', isOver(ref) && 'scale-[1.04] bg-rav-soft ring-2 ring-rav')}
                >
                  {id && game.staff[id] ? (
                    <MiniIdCard
                      staff={game.staff[id]}
                      restWarning={rest[id]}
                      selected={activeSlot === i}
                      className={cx('touch-pan-y', drag?.staffId === id && 'opacity-30')}
                      onPointerDown={(e) => start(e, id, ref)}
                      onClick={() => {
                        if (justDragged.current) return
                        setActiveSlot(activeSlot === i ? null : i)
                      }}
                    />
                  ) : (
                    <EmptySlot
                      locked={locked}
                      active={activeSlot === i}
                      label={locked ? 'Ny fløy' : 'Ledig'}
                      onClick={() => setActiveSlot(activeSlot === i ? null : i)}
                    />
                  )}
                  {gap && label && (
                    // Hull i turnusen: den oppsatte er borte på denne vakta
                    <button
                      onClick={() => setOpenGap(gap.id)}
                      className={cx(
                        'mt-1 w-full truncate rounded-lg px-1 py-1 text-center text-[10px] leading-tight font-extrabold',
                        label.tone === 'fare' && 'animate-puls bg-fare text-white',
                        label.tone === 'rav' && 'bg-rav-soft text-rav-2',
                        label.tone === 'petrol' && 'bg-petrol-soft text-petrol',
                        label.tone === 'skog' && 'bg-skog-soft text-skog',
                      )}
                    >
                      {label.text}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {activeSlot !== null && (
            <div className="mt-3 flex animate-inn items-center justify-between gap-2 rounded-xl bg-rav-soft/70 px-3 py-2">
              <span className="text-[12px] font-bold text-rav-2">
                {row[activeSlot] ? 'Velg en annen ansatt for å bytte' : 'Velg en ansatt under'}
              </span>
              <div className="flex gap-1.5">
                {row[activeSlot] && (
                  <>
                    <button className="knapp knapp-lys !px-2.5 !py-1.5 !text-xs" onClick={() => onOpenStaff(row[activeSlot]!)}>
                      Detaljer
                    </button>
                    <button
                      className="knapp knapp-lys !px-2.5 !py-1.5 !text-xs"
                      onClick={() => {
                        unassign(shift, activeSlot)
                        setActiveSlot(null)
                      }}
                    >
                      Ta av vakt
                    </button>
                  </>
                )}
                <button className="knapp knapp-flat !px-2 !py-1.5" aria-label="Avbryt" onClick={() => setActiveSlot(null)}>
                  <Icon name="kryss" size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button className="knapp knapp-lys flex-1 !text-[13px]" onClick={() => suggestShift(shift)}>
              <Icon name="tryllestav" size={16} /> Foreslå bemanning
            </button>
            <button className="knapp knapp-lys !text-[13px]" onClick={() => setShowTemplates(true)}>
              <Icon name="mal" size={16} /> Maler
            </button>
          </div>
        </div>

        <ShiftOutlook ev={ev} onShowSynergies={() => setShowSynergies(true)} />
      </div>

      {/* Benken: alle ansatte */}
      <div className="min-w-0">
        <SectionTitle
          right={
            <span className="font-mono text-[11px] font-bold text-blekk-3">
              {game.staffOrder.length}/{BALANCE.staffCap}
            </span>
          }
        >
          Staben
        </SectionTitle>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {game.staffOrder.map((id) => {
            const s = game.staff[id]
            const here = row.slice(0, slots).includes(id)
            const full = !here && (onShifts[id]?.length ?? 0) >= BALANCE.maxShiftsPerStaff
            return (
              <IdCard
                key={id}
                staff={s}
                shifts={onShifts[id]}
                restWarning={rest[id]}
                dimmed={here || full || !canWork(s, shift, game.minute)}
                className={cx('touch-pan-y', drag?.staffId === id && 'opacity-30')}
                onPointerDown={(e) => start(e, id, null)}
                onClick={() => pickStaff(id)}
              />
            )
          })}
        </div>
      </div>

      <GapSheet gapId={openGap} onClose={() => setOpenGap(null)} />

      {/* Kortet som følger pekeren mens man drar */}
      {drag &&
        game.staff[drag.staffId] &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[70] w-[84px] -translate-x-1/2 -translate-y-[60%] rotate-[-4deg] drop-shadow-2xl"
            style={{ left: drag.x, top: drag.y }}
          >
            <MiniIdCard staff={game.staff[drag.staffId]} selected={Boolean(drag.over)} />
          </div>,
          document.body,
        )}

      <SynergySheet open={showSynergies} onClose={() => setShowSynergies(false)} ev={ev} />
      <TemplateSheet open={showTemplates} onClose={() => setShowTemplates(false)} />
    </div>
  )
}

/** Dekning per egenskap, rater og aktive synergier for valgt vakt. */
function ShiftOutlook({ ev, onShowSynergies }: { ev: ShiftEvaluation; onShowSynergies: () => void }) {
  const game = useGameState()
  const bonuses = ev.synergies.filter((s) => s.tone === 'bonus')
  const problems = ev.synergies.filter((s) => s.tone === 'malus')
  return (
    <div className="kort space-y-3.5 p-3.5">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Fagpoeng/t', value: ev.rates.fagpoeng.toFixed(1).replace('.', ','), tone: 'text-skog' },
          { label: 'Netto kr/t', value: fmtInt(ev.rates.budgetNet), tone: 'text-petrol' },
          { label: 'Avvik/døgn', value: (ev.rates.avvik * 24).toFixed(1).replace('.', ','), tone: ev.rates.avvik * 24 > 3 ? 'text-fare' : 'text-blekk' },
          {
            label: 'Stress/t',
            value: `${ev.rates.stress > 0 ? '+' : ''}${ev.rates.stress.toFixed(1).replace('.', ',')}`,
            tone: ev.rates.stress > 2.4 ? 'text-fare' : ev.rates.stress > 0 ? 'text-rav-2' : 'text-skog',
          },
        ].map((r) => (
          <div key={r.label} className="rounded-xl bg-blekk/[0.04] px-1 py-2">
            <div className={cx('font-mono text-[15px] leading-none font-extrabold', r.tone)}>{r.value}</div>
            <div className="mt-1 text-[9px] font-bold tracking-wide text-blekk-3 uppercase">{r.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-1.5 flex items-end justify-between gap-2">
          <span className="etikett">Faglig dekning mot beboernes behov</span>
          <span className="font-mono text-[10.5px] font-semibold text-blekk-3">kapasitet/behov</span>
        </div>
        <div className="space-y-[7px]">
          {SKILL_ORDER.filter((id) => ev.demand[id] > 0).map((id) => {
            const c = ev.coverageBySkill[id]
            const critical = id === 'medikament' || id === 'saarstell'
            const reduced = critical && !ev.nurseOnDuty && ev.present.length > 0
            return (
              <div key={id} className="grid grid-cols-[4.9rem_1fr_3.9rem] items-center gap-2">
                <span className="flex items-center gap-1 truncate text-[11.5px] font-semibold text-blekk-2" title={SKILLS[id].name}>
                  {SKILLS[id].short}
                  {critical && (
                    <span
                      className={cx('h-1.5 w-1.5 shrink-0 rounded-full', c < 0.7 ? 'animate-puls bg-fare' : 'bg-blekk/25')}
                      title="Kritisk egenskap: underdekning gir avvik og lavere trivsel"
                    />
                  )}
                </span>
                <Meter value={c} max={1} color={c >= 1 ? SKILLS[id].color : c >= 0.6 ? '#D97736' : '#B4432F'} height={7} />
                <span className={cx('text-right font-mono text-[10.5px] font-semibold', reduced ? 'text-fare' : 'text-blekk-3')}>
                  {ev.supply[id].toFixed(1).replace('.', ',')}/{ev.demand[id].toFixed(1).replace('.', ',')}
                </span>
              </div>
            )
          })}
        </div>
        {!ev.nurseOnDuty && ev.present.length > 0 && (
          <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-fare-soft px-3 py-2 text-[11.5px] leading-snug font-semibold text-fare">
            <Icon name="avvik" size={14} className="mt-px shrink-0" />
            <span>
              Ingen sykepleier på vakta: bare {Math.round(ev.nurseFactor.medikament * 100)} % av Medisin-kapasiteten og{' '}
              {Math.round(ev.nurseFactor.saarstell * 100)} % av Sår-kapasiteten kan brukes.
            </span>
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-blekk-3">
          <span className="font-semibold">{ev.residents} beboere:</span>
          {residentMix(game).map((m) => (
            <span key={m.profile} className="inline-flex items-center gap-1 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: RESIDENT_PROFILES[m.profile].color }} />
              {m.count} {RESIDENT_PROFILES[m.profile].short.toLowerCase()}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-blekk-3">
          Hver egenskap teller for seg – overskudd i én veier ikke opp for mangel i en annen. Kompetanseutnyttelse nå:{' '}
          <b className="font-mono text-blekk-2">{fmtPct(ev.utilization)}</b>
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="etikett">Synergier på vakta</span>
          <button className="text-[11.5px] font-bold text-petrol underline-offset-2 hover:underline" onClick={onShowSynergies}>
            Oppdagelsesboka {game.discoveries.synergies.length}/{BONUS_SYNERGIES.length}
          </button>
        </div>
        {ev.synergies.length === 0 ? (
          <p className="text-[12px] text-blekk-3">Ingen synergier ennå. Kombiner yrkesgrupper og egenskaper.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {bonuses.map((s) =>
              game.discoveries.synergies.includes(s.id) ? (
                <Chip key={s.id} tone="good" title={s.description}>
                  <Icon name="stjerner" size={12} /> {s.name}
                </Chip>
              ) : (
                <Chip key={s.id} tone="rav" title="Låses opp i oppdagelsesboka når vakta går">
                  <Icon name="stjerner" size={12} /> Uoppdaget synergi
                </Chip>
              ),
            )}
            {problems.map((s) => (
              <Chip key={s.id} tone="bad" title={s.description}>
                <Icon name="avvik" size={12} /> {s.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {/* Hviletid: hvem på vakta har for lite fri, og hvorfor */}
      {ev.restBreaches.length > 0 && (
        <div className="rounded-xl border-[1.5px] border-[#C99A1E] bg-[#FCE9A6]/80 px-3 py-2.5 text-[#5E4300]">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide uppercase">
            <Icon name="avvik" size={14} /> AML § 10-8 – brudd på hviletid
          </div>
          <ul className="mt-1.5 space-y-1">
            {ev.restBreaches.map((b) => (
              <li key={b.staffId} className="text-[12px] leading-snug">
                <b>{game.staff[b.staffId]?.name.split(' ')[0]}</b> ({b.kind === 'kort' ? 'kort hviletid' : 'dobbeltvakt'}): {restBreachText(b.kind, b.shifts)}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] leading-snug opacity-80">
            Gir mer stress og dårligere restitusjon for den det gjelder, og {ev.restBreaches.some((b) => b.kind === 'dobbel') ? '−10' : '−5'} % trivselsmål og
            flere avvik på vakta. Turnusen gjentas hvert døgn, så bruddet skjer hver dag.
          </p>
        </div>
      )}
    </div>
  )
}

const effectText = (e: (typeof SYNERGIES)[number]['effect']): string => {
  const parts: string[] = []
  const pct = (v: number) => `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))} %`
  if (e.fagpoeng) parts.push(`${pct(e.fagpoeng)} Fagpoeng`)
  if (e.budget) parts.push(`${pct(e.budget)} tilskudd`)
  if (e.trivsel) parts.push(`${e.trivsel > 0 ? '+' : '−'}${Math.abs(e.trivsel)} trivsel`)
  if (e.stress) parts.push(`${e.stress > 0 ? '+' : '−'}${Math.abs(e.stress).toFixed(1).replace('.', ',')} stress/t`)
  if (e.avvik) parts.push(`${pct(e.avvik - 1)} avvik`)
  if (e.xp) parts.push(`${pct(e.xp - 1)} erfaring`)
  if (e.trivselMult) parts.push(`${pct(e.trivselMult - 1)} trivselsmål`)
  return parts.join(' · ')
}

/** Oppdagelsesboka: kjente synergier med oppskrift, uoppdagede som silhuetter med faglig hint. */
function SynergySheet({ open, onClose, ev }: { open: boolean; onClose: () => void; ev: ShiftEvaluation }) {
  const discovered = useGame((s) => s.game.discoveries.synergies)
  const active = new Set(ev.synergies.map((s) => s.id))
  const found = BONUS_SYNERGIES.filter((s) => discovered.includes(s.id)).length
  return (
    <Sheet open={open} onClose={onClose} title={`Synergier · ${SHIFTS[ev.shift].name}`}>
      <p className="mb-3 text-[13px] text-blekk-2">
        Riktig faglig sammensetning gir bonus på inntjening og trivsel. Feil bemanning gir stress, avvik og sykefravær. Uten sykepleier reduseres dessuten kapasiteten i Medisin og Sår.
      </p>

      <div className="mb-4">
        <div className="mb-1.5 flex items-end justify-between">
          <span className="etikett">Oppdagelsesboka</span>
          <span className="font-mono text-[11px] font-bold text-blekk-3">
            {found}/{BONUS_SYNERGIES.length} oppdaget
          </span>
        </div>
        <Meter value={found} max={BONUS_SYNERGIES.length} color="#1E4D40" height={5} className="mb-2" />
        <div className="space-y-1.5">
          {BONUS_SYNERGIES.map((s) => {
            const known = discovered.includes(s.id)
            const on = active.has(s.id)
            if (!known) {
              return (
                <div key={s.id} className="rounded-xl border border-dashed border-blekk/20 bg-blekk/[0.03] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-blekk/10 text-blekk/40">
                        <Icon name="las" size={12} />
                      </span>
                      <span aria-label="Uoppdaget synergi" className="h-3 w-28 rounded-full bg-blekk/15" />
                    </span>
                    <Chip tone={on ? 'rav' : 'neutral'} className="!text-[10.5px]">
                      {on ? 'Låses opp når vakta går' : 'Uoppdaget'}
                    </Chip>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-snug text-blekk-2 italic">«{s.hint}»</p>
                </div>
              )
            }
            return (
              <div key={s.id} className={cx('rounded-xl border px-3 py-2', on ? 'border-skog/25 bg-skog-soft/70' : 'border-blekk/[0.07] bg-papir')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-extrabold">{s.name}</span>
                  {on && (
                    <Chip tone="good">
                      <Icon name="hake" size={11} /> Aktiv
                    </Chip>
                  )}
                </div>
                <div className="mt-0.5 text-[12px] text-blekk-2">{s.recipe}</div>
                <div className="mt-1 font-mono text-[11px] font-bold text-skog">{effectText(s.effect)}</div>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-blekk-3">
          Uoppdagede synergier virker også – du må bare finne kombinasjonen. Første treff gir en Kaffekopp og låser oppskriften opp for godt.
        </p>
      </div>

      <div className="mb-2">
        <div className="etikett mb-1.5">Problemer</div>
        <div className="space-y-1.5">
          {SYNERGIES.filter((s) => s.tone === 'malus').map((s) => {
            const on = active.has(s.id)
            return (
              <div key={s.id} className={cx('rounded-xl border px-3 py-2', on ? 'border-fare/25 bg-fare-soft/70' : 'border-blekk/[0.07] bg-papir')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-extrabold">{s.name}</span>
                  {on && (
                    <Chip tone="bad">
                      <Icon name="avvik" size={11} /> Aktiv
                    </Chip>
                  )}
                </div>
                <div className="mt-0.5 text-[12px] text-blekk-2">{s.recipe}</div>
                <div className="mt-1 font-mono text-[11px] font-bold text-fare">{effectText(s.effect)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}

function TemplateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const vip = useGame((s) => s.game.monetization.vip)
  const templates = useGame((s) => s.game.monetization.rosterTemplates)
  const { saveTemplate, applyTemplate, deleteTemplate } = useGame.getState()
  const [name, setName] = useState('')
  return (
    <Sheet open={open} onClose={onClose} title="Turnusmaler">
      {!vip ? (
        <div className="rounded-2xl bg-rav-soft/70 p-4 text-center">
          <Icon name="las" size={22} className="mx-auto text-rav-2" />
          <p className="mt-2 text-[14px] font-bold">Turnusmaler følger med Avdelingsleder Pluss</p>
          <p className="mt-1 text-[12.5px] text-blekk-2">
            Lagre hele vaktplanen som mal (f.eks. «Helg» eller «Ferieavvikling») og bytt med ett trykk. Du finner Pluss i
            butikken under Tilsyn & Toppliste.
          </p>
        </div>
      ) : (
        <>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!name.trim()) return
              saveTemplate(name.trim())
              setName('')
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Navn på mal, f.eks. Helg"
              className="min-w-0 flex-1 rounded-xl border border-blekk/15 bg-papir px-3 py-2 text-sm font-semibold outline-none focus:border-skog"
            />
            <button className="knapp knapp-primar" disabled={!name.trim()}>
              Lagre
            </button>
          </form>
          <div className="mt-3 space-y-2">
            {templates.length === 0 && <p className="text-[13px] text-blekk-3">Ingen maler lagret ennå.</p>}
            {templates.map((t) => (
              <div key={t.id} className="kort flex items-center justify-between gap-2 px-3 py-2.5">
                <div>
                  <div className="text-[14px] font-bold">{t.name}</div>
                  <div className="font-mono text-[10.5px] text-blekk-3">
                    {SHIFT_ORDER.map((sh) => `${SHIFTS[sh].short[0]}${t.roster[sh].filter(Boolean).length}`).join(' · ')}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    className="knapp knapp-primar !py-1.5 !text-xs"
                    onClick={() => {
                      applyTemplate(t.id)
                      onClose()
                    }}
                  >
                    Bruk
                  </button>
                  <button className="knapp knapp-flat !px-2 !py-1.5" aria-label="Slett mal" onClick={() => deleteTemplate(t.id)}>
                    <Icon name="soppel" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  )
}
