import { useMemo, useState } from 'react'
import { BALANCE, SHIFTS, TIERS } from '@/data/balance'
import { WARD_TYPE_ORDER, WARD_TYPES } from '@/data/wards'
import { canRotate } from '@/engine/actions'
import { DILEMMA_BY_ID } from '@/data/dilemmas'
import { SYNERGY_BY_ID } from '@/data/synergies'
import { tierProgress } from '@/engine/modifiers'
import { dayNumber, formatClock, minutesLeftInShift, gameMinutesToRealMs, shiftProgress } from '@/engine/time'
import { cx, fmtCompact, fmtDuration, fmtInt, fmtPct } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { useCurrentShift, useGameState, useLiveMinute, useShiftEvaluation } from '@/store/selectors'
import type { GameEvent, ShiftId } from '@/types'
import { Chip, Meter, SectionTitle } from '../ui/bits'
import { Icon, type IconName } from '../ui/Icon'
import { CorkBoard } from './CorkBoard'
import { MorgenkaffeCard, RivalCard, ThanksPanel } from './Retention'
import { ResidentsPanel } from './ResidentsPanel'
import { RotationSheet } from './RotationSheet'
import type { AgentInput } from './scene/agents'
import type { SceneNote } from './scene/layout'
import { WardScene } from './WardScene'

const SHIFT_ICON: Record<ShiftId, IconName> = { dag: 'sol', aften: 'kveld', natt: 'mane' }

const EVENT_STYLE: Record<GameEvent['kind'], { icon: IconName; tone: string }> = {
  syk: { icon: 'puls', tone: 'text-fare bg-fare-soft' },
  fravaer: { icon: 'klokke', tone: 'text-rav-2 bg-rav-soft' },
  vikar: { icon: 'bruker', tone: 'text-petrol bg-petrol-soft' },
  frisk: { icon: 'hake', tone: 'text-skog bg-skog-soft' },
  kurs: { icon: 'kurs', tone: 'text-petrol bg-petrol-soft' },
  nivaa: { icon: 'stjerner', tone: 'text-rav-2 bg-rav-soft' },
  avdeling: { icon: 'pokal', tone: 'text-rav-2 bg-rav-soft' },
  beboer: { icon: 'bytt', tone: 'text-petrol bg-petrol-soft' },
  oppdagelse: { icon: 'stjerner', tone: 'text-skog bg-skog-soft' },
  takk: { icon: 'hjerte', tone: 'text-[#C2566A] bg-[#F8E1E5]' },
}

export function WardTab({ onGoToRoster }: { onGoToRoster: () => void }) {
  const game = useGameState()
  const shift = useCurrentShift()
  const ev = useShiftEvaluation(shift)
  const tp = tierProgress(game)
  const live = useLiveMinute()
  const [showRotation, setShowRotation] = useState(false)
  const fagboker = WARD_TYPE_ORDER.filter((id) => (game.prestige.fagboker[id] ?? 0) > 0)

  const crew: AgentInput[] = useMemo(
    () =>
      ev.present.map((id) => {
        const s = game.staff[id]
        return { id, profession: s.profession, ...s.avatar, stress: s.stress, energy: s.energy }
      }),
    [ev.present, game.staff],
  )

  // Lappene på korktavla i rommet har samme farge som i grensesnittet.
  const notes: SceneNote[] = useMemo(
    () =>
      game.dilemmas.active.map((a) => ({
        color: DILEMMA_BY_ID[a.defId]?.color ?? 'gul',
        // Rød kant bare på utsatte saker som har kommet tilbake – ikke på neste steg i en historie.
        followUp: Boolean(a.followUpOf) && !DILEMMA_BY_ID[a.defId]?.chain,
      })),
    [game.dilemmas.active],
  )

  const avgStress = ev.present.length
    ? ev.present.reduce((n, id) => n + game.staff[id].stress, 0) / ev.present.length
    : 0
  const bonuses = ev.synergies.filter((s) => s.tone === 'bonus')
  const problems = ev.synergies.filter((s) => s.tone === 'malus')
  const left = gameMinutesToRealMs(minutesLeftInShift(live))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      {/* Venstre kolonne står fast på brede skjermer, så rommet alltid er synlig. */}
      <div className="min-w-0 space-y-4 lg:sticky lg:top-[4.75rem]">
        {/* ---- Avdelingsvisning ---- */}
        <div className="kort relative overflow-hidden">
          <div
            className={cx(
              'absolute inset-0 transition-colors duration-[3000ms]',
              shift === 'dag' ? 'bg-[#FBF7EE]' : shift === 'aften' ? 'bg-[#F6E8D6]' : 'bg-[#DCDDE6]',
            )}
          />
          <WardScene
            className="relative aspect-[10/7] w-full"
            minute={game.minute}
            lastTickAt={game.lastTickAt}
            upgrades={game.upgrades}
            wardType={game.wardType}
            beds={ev.beds}
            trivsel={game.ward.trivsel}
            coverage={ev.coverage}
            avgStress={avgStress}
            thanksActive={ev.thanksBoost}
            notes={notes}
            crew={crew}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5 sm:p-3">
            <div className="flex items-center gap-2 rounded-full bg-papir/90 py-1 pr-3 pl-1 shadow-kort backdrop-blur">
              <span
                className={cx(
                  'grid h-7 w-7 place-items-center rounded-full text-white',
                  shift === 'dag' ? 'bg-rav' : shift === 'aften' ? 'bg-[#B4612A]' : 'bg-petrol',
                )}
              >
                <Icon name={SHIFT_ICON[shift]} size={15} />
              </span>
              <span className="text-[12.5px] leading-none font-extrabold">{SHIFTS[shift].name}</span>
              <span className="font-mono text-[12.5px] leading-none font-bold text-blekk-2">{formatClock(live)}</span>
            </div>
            <div className="rounded-full bg-papir/90 px-3 py-1.5 font-mono text-[11px] font-bold text-blekk-2 shadow-kort backdrop-blur">
              Døgn {dayNumber(game.minute)}
            </div>
          </div>
          {ev.present.length === 0 && (
            <button
              onClick={onGoToRoster}
              className="absolute inset-x-6 bottom-8 animate-inn rounded-2xl bg-fare px-4 py-2.5 text-center text-[13px] font-bold text-white shadow-loft"
            >
              Ingen på vakt! Sett opp {SHIFTS[shift].name.toLowerCase()} i turnusen →
            </button>
          )}
          {/* Framdrift i vakta */}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-papir/95 to-papir/0 px-3 pt-5 pb-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blekk/10">
              <div className="h-full rounded-full bg-skog transition-[width] duration-1000 ease-linear" style={{ width: `${shiftProgress(live) * 100}%` }} />
            </div>
            <span className="font-mono text-[10.5px] font-bold text-blekk-2">vaktskifte om {fmtDuration(left)}</span>
          </div>
        </div>

        {/* ---- Nøkkeltall ---- */}
        <div className="grid grid-cols-4 gap-2">
          <Stat icon="hjerte" label="Trivsel" value={`${Math.round(game.ward.trivsel)}`} unit="%" tone={game.ward.trivsel >= 60 ? 'good' : game.ward.trivsel >= 40 ? 'mid' : 'bad'}>
            <Meter value={game.ward.trivsel} color="#C2566A" height={4} />
          </Stat>
          <Stat icon="folk" label="Dekning" value={`${Math.round(ev.coverage * 100)}`} unit="%" tone={ev.coverage >= 0.9 ? 'good' : ev.coverage >= 0.6 ? 'mid' : 'bad'}>
            <Meter value={Math.min(1, ev.coverage)} max={1} color="#1E4D40" height={4} />
          </Stat>
          <Stat icon="puls" label="Stress" value={`${Math.round(avgStress)}`} tone={avgStress >= 65 ? 'bad' : avgStress >= 40 ? 'mid' : 'good'}>
            <Meter value={avgStress} color={avgStress >= 65 ? '#B4432F' : '#D97736'} height={4} />
          </Stat>
          <Stat icon="avvik" label="Avvik" value={fmtCompact(game.ward.avvik)} tone={ev.rates.avvik * 24 > 3 ? 'bad' : ev.rates.avvik * 24 > 1 ? 'mid' : 'good'}>
            <div className="font-mono text-[9.5px] font-semibold text-blekk-3">
              {(ev.rates.avvik * 24).toFixed(1).replace('.', ',')}/døgn
            </div>
          </Stat>
        </div>

        {/* ---- Inntjening og synergier ---- */}
        <div className="kort p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-5">
              <div>
                <div className="etikett">Fagpoeng</div>
                <div className="font-mono text-[17px] font-extrabold text-skog">
                  +{ev.rates.fagpoeng.toFixed(1).replace('.', ',')}
                  <span className="text-[11px] font-semibold text-blekk-3">/t</span>
                </div>
              </div>
              <div>
                <div className="etikett">Budsjett</div>
                <div className="font-mono text-[17px] font-extrabold text-petrol">
                  +{fmtInt(ev.rates.budgetNet)}
                  <span className="text-[11px] font-semibold text-blekk-3"> kr/t</span>
                </div>
              </div>
            </div>
            <button className="knapp knapp-lys !py-2 !text-[12.5px]" onClick={onGoToRoster}>
              <Icon name="turnus" size={15} /> Turnus
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ev.thanksBoost && (
              <Chip tone="rav" title="Takkekort fra pårørende løfter trivselsmålet">
                <Icon name="hjerte" size={12} filled /> Takkekort +{Math.round(BALANCE.thanksTrivselBoost * 100)} %
              </Chip>
            )}
            {bonuses.map((s) =>
              game.discoveries.synergies.includes(s.id) ? (
                <Chip key={s.id} tone="good" title={s.description}>
                  <Icon name="stjerner" size={12} /> {s.name}
                </Chip>
              ) : (
                <Chip key={s.id} tone="rav" className="animate-puls">
                  <Icon name="stjerner" size={12} /> Ny synergi …
                </Chip>
              ),
            )}
            {problems.map((s) => (
              <Chip key={s.id} tone="bad" title={s.description}>
                <Icon name="avvik" size={12} /> {s.name}
              </Chip>
            ))}
            {ev.synergies.length === 0 && <span className="text-[12px] text-blekk-3">Ingen aktive synergier på denne vakta.</span>}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <MorgenkaffeCard />

        {/* ---- Korktavle ---- */}
        <div>
          <SectionTitle
            right={
              game.dilemmas.active.length > 0 && (
                <span className="text-[11px] font-bold text-rav-2">{game.dilemmas.active.length} venter på deg</span>
              )
            }
          >
            Korktavla
          </SectionTitle>
          <CorkBoard />
        </div>

        <ThanksPanel />

        <ResidentsPanel />

        <RivalCard compact />

        <ShiftReportCard />

        {/* ---- Avdelingsnivå ---- */}
        <div className="kort p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="etikett">Avdelingsnivå {tp.tier + 1}</div>
              <div className="text-[15px] font-extrabold tracking-tight">{TIERS[tp.tier].name}</div>
            </div>
            <Icon name="pokal" size={22} className="text-rav" />
          </div>
          <p className="mt-0.5 text-[12px] text-blekk-2">{TIERS[tp.tier].tagline}</p>
          {tp.next !== null ? (
            <>
              <Meter className="mt-2.5" value={tp.progress} max={1} color="#D97736" />
              <div className="mt-1 flex justify-between font-mono text-[10.5px] font-semibold text-blekk-3">
                <span>{fmtCompact(game.lifetime.fagpoeng)} Fagpoeng totalt</span>
                <span>
                  {TIERS[tp.tier + 1].name}: {fmtCompact(tp.next)}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-[12px] font-bold text-skog">Høyeste nivå nådd. Avdelingen er klar til å overleveres.</p>
          )}
          {(game.prestige.rotations > 0 || fagboker.length > 0) && (
            <div className="mt-3 border-t border-blekk/[0.07] pt-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone="rav" title={`+${Math.round(game.prestige.renomme * BALANCE.renommeFagpoeng * 100)} % Fagpoeng og budsjett`}>
                  <Icon name="stjerner" size={12} /> Renommé <span className="font-mono">{game.prestige.renomme}</span>
                </Chip>
                <Chip>{WARD_TYPES[game.wardType].name}</Chip>
                <Chip className="font-mono">Oppdrag {game.prestige.rotations + 1}</Chip>
              </div>
              {fagboker.map((id) => (
                <div key={id} className="mt-1.5 flex items-center gap-2 text-[11.5px]">
                  <Icon name="kurs" size={13} className="shrink-0 text-petrol" />
                  <span className="min-w-0 flex-1 truncate font-bold">«{WARD_TYPES[id].fagbok.name}»</span>
                  <span className="shrink-0 font-mono text-[10.5px] font-semibold text-blekk-3">
                    nivå {game.prestige.fagboker[id]} · {WARD_TYPES[id].fagbok.effectText}
                  </span>
                </div>
              ))}
            </div>
          )}
          {canRotate(game) && (
            <button className="knapp knapp-rav mt-3 w-full !text-[13px]" onClick={() => setShowRotation(true)}>
              <Icon name="bytt" size={15} /> Overlever avdelingen og ta nytt oppdrag
            </button>
          )}
        </div>
        <RotationSheet open={showRotation} onClose={() => setShowRotation(false)} />

        {/* ---- Logg ---- */}
        {game.events.length > 0 && (
          <div>
            <SectionTitle>Siste nytt</SectionTitle>
            <div className="kort divide-y divide-blekk/[0.06]">
              {game.events.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center gap-2.5 px-3 py-2">
                  <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full', EVENT_STYLE[e.kind].tone)}>
                    <Icon name={EVENT_STYLE[e.kind].icon} size={13} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{e.text}</span>
                  <span className="shrink-0 font-mono text-[10px] text-blekk-3">
                    d{dayNumber(e.at)} {formatClock(e.at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  unit,
  tone,
  children,
}: {
  icon: IconName
  label: string
  value: string
  unit?: string
  tone: 'good' | 'mid' | 'bad'
  children?: React.ReactNode
}) {
  const color = tone === 'good' ? 'text-skog' : tone === 'mid' ? 'text-rav-2' : 'text-fare'
  return (
    <div className="kort px-2.5 py-2.5">
      <div className="flex items-center gap-1 text-blekk-3">
        <Icon name={icon} size={12} className="hidden shrink-0 min-[400px]:block" />
        <span className="truncate text-[9px] font-bold tracking-wide uppercase">{label}</span>
      </div>
      <div className={cx('mt-0.5 font-mono text-[19px] leading-tight font-extrabold', color)}>
        {value}
        {unit && <span className="text-[11px] font-semibold opacity-70">{unit}</span>}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  )
}

/** Rapport fra forrige vakt + rewarded ad for dobbel utbetaling. */
function ShiftReportCard() {
  const last = useGame((s) => s.game.shift.last)
  const doubleLastShift = useGame((s) => s.doubleLastShift)
  if (!last) {
    return (
      <div className="kort border-dashed p-3.5">
        <div className="etikett">Vaktrapport</div>
        <p className="mt-1 text-[12.5px] text-blekk-2">Rapporten kommer når første vakt er ferdig.</p>
      </div>
    )
  }
  const names = last.synergyIds.map((id) => SYNERGY_BY_ID[id]).filter(Boolean)
  return (
    <div className="kort overflow-hidden">
      <div className="flex items-center justify-between bg-skog px-3.5 py-2 text-krem">
        <div className="flex items-center gap-2">
          <Icon name="tavle" size={16} />
          <span className="text-[13px] font-extrabold">Rapport fra {SHIFTS[last.shift].name.toLowerCase()}</span>
        </div>
        <span className="font-mono text-[10.5px] font-semibold opacity-80">døgn {last.day}</span>
      </div>
      <div className="grid grid-cols-4 divide-x divide-blekk/[0.07] text-center">
        {[
          { label: 'Fagpoeng', value: `+${fmtInt(last.fagpoeng * (last.doubled ? 2 : 1))}`, tone: 'text-skog' },
          { label: 'Budsjett', value: `+${fmtCompact(last.budget * (last.doubled ? 2 : 1))}`, tone: 'text-petrol' },
          { label: 'Dekning', value: fmtPct(last.avgCoverage), tone: 'text-blekk' },
          { label: 'Avvik', value: String(last.avvik), tone: last.avvik > 1 ? 'text-fare' : 'text-blekk' },
        ].map((c) => (
          <div key={c.label} className="px-1 py-2.5">
            <div className={cx('font-mono text-[15px] leading-none font-extrabold', c.tone)}>{c.value}</div>
            <div className="mt-1 text-[9px] font-bold tracking-wide text-blekk-3 uppercase">{c.label}</div>
          </div>
        ))}
      </div>
      {names.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-blekk/[0.07] px-3 py-2">
          {names.map((s) => (
            <Chip key={s.id} tone={s.tone === 'bonus' ? 'good' : 'bad'} className="!text-[10.5px]">
              {s.name}
            </Chip>
          ))}
        </div>
      )}
      <div className="border-t border-blekk/[0.07] p-2.5">
        {last.doubled ? (
          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-skog-soft py-2 text-[12.5px] font-bold text-skog">
            <Icon name="hake" size={14} /> Utbetalingen er doblet
          </div>
        ) : (
          <button className="knapp knapp-rav w-full !text-[13px]" onClick={() => void doubleLastShift()}>
            <Icon name="spill" size={14} filled /> Dobbel vaktutbetaling
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">Reklame</span>
          </button>
        )}
      </div>
    </div>
  )
}
