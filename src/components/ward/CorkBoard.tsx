import { useState } from 'react'
import { DILEMMA_BY_ID, DILEMMA_CHAINS } from '@/data/dilemmas'
import { PROFESSIONS, SKILLS } from '@/data/professions'
import { RESIDENT_PROFILES } from '@/data/residents'
import { meetsRequirement } from '@/engine/actions'
import { renderDilemma } from '@/engine/dilemmas'
import { gameMinutesToRealMs } from '@/engine/time'
import { cx, fmtDuration, fmtInt } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { useGameState } from '@/store/selectors'
import type { ActiveDilemma, DilemmaDef, DilemmaResolution, Effect, Requirement } from '@/types'
import { Chip } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'

const requirementText = (r: Requirement): string =>
  [
    r.profession && `${PROFESSIONS[r.profession].name} på vakt`,
    r.skill && `${SKILLS[r.skill.id].short} ${r.skill.min}+ på vakt`,
  ]
    .filter(Boolean)
    .join(' · ')

/** Konsekvenser vist som små merker. */
export function EffectChips({ effect }: { effect: Effect }) {
  const items: { text: string; good: boolean }[] = []
  const signed = (n: number) => `${n > 0 ? '+' : '−'}${fmtInt(Math.abs(n))}`
  const who = effect.scope === 'paaVakt' ? ' (på vakt)' : ' (alle)'
  if (effect.budget) items.push({ text: `${signed(effect.budget)} kr`, good: effect.budget > 0 })
  if (effect.fagpoeng) items.push({ text: `${signed(effect.fagpoeng)} Fagpoeng`, good: effect.fagpoeng > 0 })
  if (effect.kaffekopper) items.push({ text: `${signed(effect.kaffekopper)} Kaffekopper`, good: effect.kaffekopper > 0 })
  if (effect.trivsel) items.push({ text: `${signed(effect.trivsel)} trivsel`, good: effect.trivsel > 0 })
  if (effect.stress) items.push({ text: `${signed(effect.stress)} stress${who}`, good: effect.stress < 0 })
  if (effect.energy) items.push({ text: `${signed(effect.energy)} energi${who}`, good: effect.energy > 0 })
  if (effect.avvik) items.push({ text: `${signed(effect.avvik)} avvik`, good: effect.avvik < 0 })
  if (effect.passXp) items.push({ text: `+${effect.passXp} pass-XP`, good: true })
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {items.map((i) => (
        <Chip key={i.text} tone={i.good ? 'good' : 'bad'} className="font-mono">
          {i.text}
        </Chip>
      ))}
    </div>
  )
}

/** «Del 2 av 3» for steg i en historiekjede. */
const chainLabel = (def: DilemmaDef): string | null =>
  def.chain ? `Del ${def.chain.step} av ${DILEMMA_CHAINS[def.chain.id]?.steps ?? def.chain.step}` : null

function PostIt({ note, onOpen, index }: { note: ActiveDilemma; onOpen: () => void; index: number }) {
  const raw = DILEMMA_BY_ID[note.defId]
  if (!raw) return null
  const def = renderDilemma(raw, note.subject)
  const part = note.followUpOf ? chainLabel(def) : null
  return (
    <button
      onClick={onOpen}
      className={cx(
        'postit group relative aspect-[1/1.06] w-full animate-pop overflow-hidden p-2.5 pt-5 pb-6 text-left sm:p-3 sm:pt-5 sm:pb-6',
        `postit-${def.color}`,
      )}
      style={{ ['--tilt' as string]: `${note.tilt}deg`, animationDelay: `${index * 70}ms` }}
    >
      <span className="knappenal absolute top-1.5 left-1/2 -translate-x-1/2" />
      {note.followUpOf && (
        <span
          className={cx(
            'absolute top-1 right-1 rotate-[8deg] rounded border-[1.5px] px-1 font-mono text-[8px] font-extrabold tracking-wider uppercase',
            part ? 'border-petrol bg-petrol-soft/90 text-petrol' : 'border-fare bg-fare-soft/90 text-fare',
          )}
        >
          {part ?? 'Oppfølging'}
        </span>
      )}
      <span className="hand line-clamp-2 block text-[1.12rem] leading-[1] font-bold text-blekk sm:text-[1.3rem]">{def.title}</span>
      <span className="hand mt-1 line-clamp-2 block text-[0.9rem] leading-[1.05] text-blekk/75 sm:text-[1rem]">{def.body}</span>
      <span className="hand absolute right-2 bottom-1 hidden text-[0.8rem] text-blekk/55 sm:block">– {def.from}</span>
    </button>
  )
}

export function CorkBoard() {
  const game = useGameState()
  const [openUid, setOpenUid] = useState<number | null>(null)
  const [result, setResult] = useState<DilemmaResolution | null>(null)
  const resolveDilemma = useGame((s) => s.resolveDilemma)

  const notes = game.dilemmas.active
  const open = notes.find((n) => n.uid === openUid) ?? null
  const rawDef = open ? DILEMMA_BY_ID[open.defId] : result ? DILEMMA_BY_ID[result.defId] : null
  // Tekstene fylles ut for beboeren saken gjelder – også etter at lappen er tatt ned.
  const subject = open?.subject ?? result?.subject
  const def = rawDef ? renderDilemma(rawDef, subject) : null
  const chain = def?.chain ? DILEMMA_CHAINS[def.chain.id] : null
  // En utsatt sak kommer tilbake som straff; neste steg i en kjede er bare fortsettelsen.
  const postponed = Boolean(open?.followUpOf) && !def?.chain
  const nextIn = gameMinutesToRealMs(Math.max(0, game.dilemmas.nextAt - game.minute))

  const close = () => {
    setOpenUid(null)
    setResult(null)
  }

  return (
    <div>
      <div className="korktavle relative min-h-[8.5rem] p-3">
        {notes.length === 0 ? (
          <div className="grid h-[7rem] place-items-center text-center">
            <div>
              <p className="hand text-[1.35rem] leading-tight font-bold text-[#5c3a1a]/80">Ingen lapper på tavla.</p>
              <p className="mt-0.5 text-[11.5px] font-semibold text-[#5c3a1a]/70">Neste dukker opp om ca. {fmtDuration(nextIn)}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {notes.map((n, i) => (
              <PostIt key={n.uid} note={n} index={i} onOpen={() => setOpenUid(n.uid)} />
            ))}
          </div>
        )}
      </div>

      <Sheet open={Boolean(def && (open || result))} onClose={close} title={result ? 'Slik gikk det' : postponed ? 'Saken du utsatte er tilbake' : open?.followUpOf ? 'Saken fortsetter' : 'Post-it fra vaktrommet'}>
        {def && (
          <>
            <div className={cx('postit mx-auto mt-1 max-w-sm rotate-[-1deg] px-5 pt-7 pb-5', `postit-${def.color}`)}>
              <span className="knappenal absolute top-2 left-1/2 -translate-x-1/2" />
              <div className="hand text-[1.7rem] leading-none font-bold">{def.title}</div>
              <p className="hand mt-2 text-[1.22rem] leading-[1.12] text-blekk/85">{def.body}</p>
              <div className="hand mt-2 text-right text-[1.05rem] text-blekk/60">– {def.from}</div>
            </div>

            {(chain || subject) && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {chain && def.chain && (
                  <Chip tone="petrol" className="font-bold">
                    {chain.title} · del {def.chain.step} av {chain.steps}
                  </Chip>
                )}
                {subject && (
                  <Chip>
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: RESIDENT_PROFILES[subject.profile]?.color }} />
                    {subject.name} · rom {subject.room} · {RESIDENT_PROFILES[subject.profile]?.short}
                  </Chip>
                )}
              </div>
            )}

            {result ? (
              <div className="mt-5 animate-inn text-center">
                <p className="mx-auto max-w-sm text-[14.5px] leading-snug font-semibold text-blekk">{result.outcome}</p>
                <div className="mt-3">
                  <EffectChips effect={result.applied} />
                </div>
                {result.followUpScheduled &&
                  (result.followUpKind === 'kjede' ? (
                    <p className="mt-3 flex items-start gap-2 rounded-xl bg-petrol-soft/80 px-3 py-2 text-left text-[12.5px] leading-snug font-bold text-petrol">
                      <Icon name="klokke" size={15} className="mt-px shrink-0" />
                      Dette er ikke siste ord i saken. Den dukker opp igjen på tavla om et døgns tid.
                    </p>
                  ) : (
                    <p className="mt-3 flex items-start gap-2 rounded-xl bg-rav-soft/80 px-3 py-2 text-left text-[12.5px] leading-snug font-bold text-rav-2">
                      <Icon name="klokke" size={15} className="mt-px shrink-0" />
                      Saken er utsatt, ikke løst. Den kommer tilbake om ett til to døgn – og da blir den dyrere.
                    </p>
                  ))}
                <div className="mt-4 rounded-2xl border border-petrol/15 bg-petrol-soft/60 px-4 py-3 text-left">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-[0.1em] text-petrol uppercase">
                    <Icon name="kurs" size={14} /> Faglig begrunnelse
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-blekk">{def.fagligBegrunnelse}</p>
                  <p className="mt-2 text-[11.5px] leading-snug font-bold text-petrol">{def.kilde}</p>
                </div>
                <button className="knapp knapp-primar mt-5 w-full" onClick={close}>
                  Videre
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {postponed && (
                  <p className="flex items-start gap-2 rounded-xl bg-fare-soft px-3 py-2 text-[12.5px] leading-snug font-bold text-fare">
                    <Icon name="avvik" size={15} className="mt-px shrink-0" />
                    Dette er følgen av at saken ble utsatt. Ingen av valgene er gratis nå.
                  </p>
                )}
                <div className="etikett">Hva gjør du?</div>
                {def.options.map((o) => {
                  const ok = meetsRequirement(game, o.requires)
                  return (
                    <button
                      key={o.id}
                      disabled={!ok}
                      onClick={() => {
                        const r = resolveDilemma(open!.uid, o.id)
                        if (r) {
                          setResult(r)
                          setOpenUid(null)
                        }
                      }}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all',
                        ok
                          ? 'border-blekk/10 bg-papir shadow-kort hover:-translate-y-0.5 hover:border-skog/40 active:translate-y-0'
                          : 'border-dashed border-blekk/15 bg-blekk/[0.03] opacity-70',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[14.5px] leading-tight font-extrabold">{o.label}</div>
                        {o.hint && <div className="mt-0.5 text-[12px] text-blekk-2">{o.hint}</div>}
                        {o.requires && (
                          <div className={cx('mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold', ok ? 'text-skog' : 'text-fare')}>
                            <Icon name={ok ? 'hake' : 'las'} size={12} />
                            {requirementText(o.requires)}
                          </div>
                        )}
                      </div>
                      <Icon name="pil" size={16} className="shrink-0 text-blekk/30" />
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </Sheet>
    </div>
  )
}
