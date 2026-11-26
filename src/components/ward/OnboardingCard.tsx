import { BALANCE, SHIFT_ORDER, SHIFTS } from '@/data/balance'
import { modifiersFor, slotsFor } from '@/engine/modifiers'
import { ONBOARDING_STEPS, onboardingProgress, onboardingVisible } from '@/engine/actions'
import { gameMinutesToRealMs, minutesLeftInShift } from '@/engine/time'
import { cx, fmtDuration } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { useGameState } from '@/store/selectors'
import type { OnboardingStep } from '@/types'
import type { TabId } from '../layout/BottomNav'
import { Icon, type IconName } from '../ui/Icon'

/** Hvor et steg tar spilleren: en annen fane, eller et sted lenger ned på Avdelingen. */
export type OnboardingTarget = { tab: TabId } | { scrollTo: 'korktavla' | 'vaktrapport' }

const STEPS: Record<OnboardingStep, { title: string; hint: string; icon: IconName; target: OnboardingTarget }> = {
  filledShift: {
    title: 'Sett opp turnusen',
    hint: 'Dra et ID-kort inn på en vaktplass.',
    icon: 'turnus',
    target: { tab: 'turnus' },
  },
  resolvedDilemma: {
    title: 'Ta en lapp på korktavla',
    hint: 'Vaktrommet venter på en beslutning fra deg.',
    icon: 'tavle',
    target: { scrollTo: 'korktavla' },
  },
  trainedOrUpgraded: {
    title: 'Løft fagmiljøet',
    hint: 'Kjøp en oppgradering, eller send en ansatt på kurs.',
    icon: 'kurs',
    target: { tab: 'utstyr' },
  },
  claimedReport: {
    title: 'Signer vaktrapporten',
    hint: 'Rapporten kommer når vakta er ferdig.',
    icon: 'hake',
    target: { scrollTo: 'vaktrapport' },
  },
}

/**
 * Oppstart på vaktrommet: fire steg som viser hele kjerne-loopen. Stegene
 * hukes av når spilleren faktisk gjør tingene, og et trykk tar en dit.
 */
export function OnboardingCard({ onNavigate, className }: { onNavigate: (target: OnboardingTarget) => void; className?: string }) {
  const game = useGameState()
  const claim = useGame((s) => s.claimOnboardingReward)
  const dismiss = useGame((s) => s.dismissOnboarding)
  if (!onboardingVisible(game)) return null

  const done = onboardingProgress(game)
  const total = ONBOARDING_STEPS.length
  const complete = done === total
  const report = game.shift.last
  const reward = BALANCE.onboardingReward
  // Første vakt med en ledig plass – det er dit steg 1 peker.
  const slots = slotsFor(modifiersFor(game))
  const openShift = SHIFT_ORDER.find((sh) => game.roster[sh].slice(0, slots).includes(null))

  return (
    <section
      aria-label="Første vakt som avdelingsleder"
      className={cx('kort relative animate-inn overflow-hidden border-rav/25 bg-gradient-to-b from-rav-soft/60 to-papir p-3.5', className)}
    >
      <button
        onClick={dismiss}
        className="absolute top-2.5 right-3 text-[11px] font-bold text-blekk-3 underline-offset-2 hover:text-blekk hover:underline"
      >
        Hopp over
      </button>
      <div className="pr-16">
        <div className="etikett text-rav-2">Oppstart på vaktrommet</div>
        <h2 className="text-[16px] leading-tight font-extrabold tracking-tight">Første vakt som avdelingsleder</h2>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blekk/10">
          <div className="h-full rounded-full bg-skog transition-[width] duration-500" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <span className="font-mono text-[12px] font-extrabold text-skog" aria-label={`${done} av ${total} steg fullført`}>
          {done}/{total}
        </span>
      </div>

      {complete ? (
        <div className="mt-3 animate-inn text-center">
          <p className="text-[13px] leading-snug text-blekk-2">Turnus, beslutninger, fagutvikling og rapport – du har vært innom hele vakta.</p>
          <button className="knapp knapp-rav mt-2.5 w-full !py-2.5 !text-[14px]" onClick={claim}>
            <Icon name="stjerner" size={16} /> Hent velkomstbonus (+{reward.kaffekopper} Kaffekopper)
          </button>
          <p className="mt-1 font-mono text-[11px] font-semibold text-blekk-3">+ {reward.budget} kr til budsjettet</p>
        </div>
      ) : (
        <ol className="mt-2.5 space-y-1.5">
          {ONBOARDING_STEPS.map((key, i) => {
            const step = STEPS[key]
            const ok = game.onboarding[key]
            // Rapporten finnes ikke før første vakt er ferdig – si når den kommer.
            const waiting = key === 'claimedReport' && !ok && !report
            const hint = waiting
              ? `Kommer om ca. ${fmtDuration(gameMinutesToRealMs(minutesLeftInShift(game.minute)))}, når vakta er ferdig.`
              : key === 'filledShift'
                ? openShift
                  ? `Dra et ID-kort inn på en ledig plass – ${SHIFTS[openShift].name.toLowerCase()} mangler folk.`
                  : 'Dra et ID-kort inn på en vaktplass, eller bytt to som står på samme vakt.'
                : step.hint
            return (
              <li key={key}>
                <button
                  disabled={ok}
                  onClick={() => onNavigate(step.target)}
                  className={cx(
                    'flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all',
                    ok ? 'border-skog/15 bg-skog-soft/50' : 'border-blekk/10 bg-papir hover:-translate-y-0.5 hover:border-rav/40 hover:shadow-kort',
                  )}
                >
                  <span
                    className={cx(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold',
                      ok ? 'bg-skog text-krem' : 'bg-rav-soft text-rav-2',
                    )}
                  >
                    {ok ? <Icon name="hake" size={14} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-[13.5px] leading-tight font-extrabold', ok && 'text-skog line-through decoration-skog/40')}>
                      {step.title}
                    </span>
                    {!ok && <span className="mt-0.5 block text-[11.5px] leading-snug text-blekk-2">{hint}</span>}
                  </span>
                  {!ok && <Icon name="pil" size={15} className="shrink-0 text-blekk/30" />}
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
