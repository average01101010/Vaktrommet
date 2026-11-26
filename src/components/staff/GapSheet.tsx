import { ABSENCES } from '@/data/absence'
import { BALANCE, SHIFTS } from '@/data/balance'
import { PROFESSIONS, SKILLS } from '@/data/professions'
import { absenceStatus } from '@/engine/absence'
import { gapHours, overtimeCandidates, overtimeCost, vikarCost } from '@/engine/actions'
import { cx, fmtInt } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { useGameState } from '@/store/selectors'
import type { RosterGap } from '@/types'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { topSkills } from './IdCard'

/** Kort tekst for hvordan et hull er løst – brukes på vaktplassen. */
export function gapLabel(gap: RosterGap, coverName?: string): { text: string; tone: 'fare' | 'rav' | 'petrol' | 'skog' } {
  if (gap.cover === 'vikar') return { text: 'Vikar', tone: 'petrol' }
  if (gap.cover === 'overtid') return { text: coverName ? `Ekstra: ${coverName}` : 'Ekstravakt', tone: 'skog' }
  if (gap.cover === 'under') return { text: 'Underbemannet', tone: 'rav' }
  return { text: 'Dekk hullet', tone: 'fare' }
}

/**
 * Hull i turnusen: den som skulle hatt vakta, er borte. Lederen velger mellom
 * tilkallingsvikar, ekstravakt til en fast ansatt, eller å kjøre underbemannet.
 */
export function GapSheet({ gapId, onClose }: { gapId: number | null; onClose: () => void }) {
  const game = useGameState()
  const resolveGap = useGame((s) => s.resolveGap)
  const gap = gapId === null ? null : (game.gaps.find((g) => g.id === gapId) ?? null)
  if (!gap) return <Sheet open={false} onClose={onClose}>{null}</Sheet>

  const absent = game.staff[gap.staffId]
  const status = absent ? absenceStatus(absent, game.minute) : null
  const hours = Math.round(gapHours(game, gap) * 10) / 10
  const ongoing = gap.until - game.minute <= 480
  const vikar = vikarCost(game, gap)
  const candidates = overtimeCandidates(game, gap)
  const budget = game.resources.budget
  const done = gap.cover === 'vikar' || gap.cover === 'overtid'
  const choose = (choice: Parameters<typeof resolveGap>[1]) => {
    if (resolveGap(gap.id, choice)) onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Hull i turnusen">
      <div className="rounded-2xl bg-fare-soft/70 px-3.5 py-3">
        <div className="text-[14px] leading-snug font-extrabold text-blekk">
          {absent?.name ?? 'En ansatt'} kommer ikke på {SHIFTS[gap.shift].name.toLowerCase()}
          {ongoing ? ' – vakta går nå' : ' – neste vakt'}
        </div>
        <div className="mt-0.5 text-[12.5px] font-semibold text-blekk-2">
          {status ? `${status.name}, ${status.daysLeft === 1 ? '1 døgn' : `${status.daysLeft} døgn`} igjen` : 'Fravær'} ·{' '}
          {absent ? PROFESSIONS[absent.profession].name : ''} · {hours} timer å dekke
        </div>
        {status && ABSENCES[status.kind].acute && (
          <p className="mt-1.5 text-[11.5px] leading-snug text-blekk-2">
            Plassen står fortsatt i navnet til {absent?.name.split(' ')[0]}, som er tilbake på den etter fraværet. Valget gjelder bare denne vakta.
          </p>
        )}
      </div>

      {done ? (
        <p className="mt-4 rounded-xl bg-skog-soft px-3 py-2.5 text-[13px] font-bold text-skog">
          Plassen er dekket for denne vakta: {gapLabel(gap, gap.coverId ? game.staff[gap.coverId]?.name.split(' ')[0] : undefined).text.toLowerCase()}.
        </p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {/* 1. Tilkallingsvikar */}
          <button
            disabled={budget < vikar}
            onClick={() => choose({ cover: 'vikar' })}
            className={cx(
              'flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all',
              budget >= vikar ? 'border-blekk/10 bg-papir shadow-kort hover:-translate-y-0.5 hover:border-petrol/40' : 'border-dashed border-blekk/15 opacity-60',
            )}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-petrol-soft text-petrol">
              <Icon name="bruker" size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] leading-tight font-extrabold">Ring inn tilkallingsvikar</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-blekk-2">
                Dekker stell og måltider, men kjenner ikke beboerne og har ikke legemiddelansvar.
              </span>
            </span>
            <span className="shrink-0 font-mono text-[13px] font-extrabold text-fare">−{fmtInt(vikar)} kr</span>
          </button>

          {/* 2. Ekstravakt til en fast ansatt */}
          <div className="rounded-2xl border border-blekk/10 bg-papir px-3.5 py-3 shadow-kort">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-skog-soft text-skog">
                <Icon name="klokke" size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] leading-tight font-extrabold">Spør fast ansatt om ekstravakt</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-blekk-2">
                  Full fagkompetanse. Overtidstillegg på {Math.round(BALANCE.overtimeWageBonus * 100)} %, og det koster den ansatte +
                  {BALANCE.overtimeStress} stress og −{BALANCE.overtimeEnergy} energi.
                </span>
              </span>
            </div>
            {candidates.length === 0 ? (
              <p className="mt-2 text-[12px] font-semibold text-blekk-3">Ingen ledige: alle er på vakta, borte eller har allerede en ekstravakt.</p>
            ) : (
              <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                {candidates.map((id) => {
                  const s = game.staff[id]
                  const cost = overtimeCost(game, gap, s)
                  const tired = s.stress >= 50 || s.energy < 30
                  return (
                    <button
                      key={id}
                      disabled={budget < cost}
                      onClick={() => choose({ cover: 'overtid', staffId: id })}
                      className={cx(
                        'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors',
                        budget >= cost ? 'border-blekk/10 hover:border-skog/50 hover:bg-skog-soft/40' : 'border-dashed border-blekk/15 opacity-60',
                      )}
                    >
                      <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: PROFESSIONS[s.profession].color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-extrabold">
                          {s.name.split(' ')[0]} <span className="font-mono text-[10.5px] font-bold text-blekk-3">{PROFESSIONS[s.profession].short}</span>
                        </span>
                        <span className={cx('block truncate text-[10.5px] font-semibold', tired ? 'text-fare' : 'text-blekk-3')}>
                          {tired ? `Sliten: stress ${Math.round(s.stress)}, energi ${Math.round(s.energy)}` : topSkills(s, 2).map((k) => `${SKILLS[k].short} ${s.skills[k]}`).join(' · ')}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[11.5px] font-extrabold text-fare">−{fmtInt(cost)} kr</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 3. Underbemanning */}
          <button
            onClick={() => choose({ cover: 'under' })}
            className={cx(
              'flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all',
              gap.cover === 'under' ? 'border-rav bg-rav-soft/70' : 'border-blekk/10 bg-papir shadow-kort hover:-translate-y-0.5 hover:border-rav/50',
            )}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rav-soft text-rav-2">
              <Icon name="avvik" size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] leading-tight font-extrabold">Kjør med underbemanning</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-blekk-2">
                Ingen ekstra lønn. Resten av vaktlaget får mer å gjøre: lavere dekning, mer stress og større fare for avvik.
              </span>
            </span>
            <span className="shrink-0 font-mono text-[13px] font-extrabold text-blekk-3">0 kr</span>
          </button>
        </div>
      )}
    </Sheet>
  )
}
