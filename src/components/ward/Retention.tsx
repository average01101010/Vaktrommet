import { useState } from 'react'
import { BALANCE } from '@/data/balance'
import { MORGENKAFFE_REWARDS } from '@/data/economy'
import { incomeRates, resolveReward, streakStatus } from '@/engine/actions'
import { gameMinutesToRealMs } from '@/engine/time'
import { cx, fmtCompact, fmtDuration, fmtInt } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { useGameState } from '@/store/selectors'
import { useRival } from '@/store/useRival'
import { Chip, Meter, SectionTitle } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { RewardLine } from '../ui/RewardLine'
import { Sheet } from '../ui/Sheet'

// ---------------------------------------------------------------------------
// Morgenkaffe
// ---------------------------------------------------------------------------

/** Daglig innsjekk: sju kopper, én automatisk avspaseringsdag i uka. */
export function MorgenkaffeCard() {
  const game = useGameState()
  const checkIn = useGame((s) => s.checkInMorgenkaffe)
  const toast = useGame((s) => s.toast)
  const status = streakStatus(game, Date.now())
  const week = MORGENKAFFE_REWARDS.length
  // Antall kopper som er drukket i inneværende belønningsuke.
  const done = status.canCheckIn ? (status.nextCount - 1) % week : ((Math.max(1, status.count) - 1) % week) + 1
  const next = resolveReward(game, MORGENKAFFE_REWARDS[status.rewardDay - 1])

  return (
    <div className={cx('kort overflow-hidden', status.canCheckIn && 'ring-2 ring-rav/60')}>
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-rav text-white">
            <Icon name="kaffe" size={17} />
          </span>
          <div>
            <div className="text-[14px] leading-tight font-extrabold">Morgenkaffe</div>
            <div className="text-[11.5px] leading-tight font-semibold text-blekk-3">
              {status.broken
                ? 'Rekka ble brutt – ny start i dag'
                : status.count > 0
                  ? `${status.count} ${status.count === 1 ? 'dag' : 'dager'} på rad`
                  : 'Sjekk inn hver dag du er innom'}
            </div>
          </div>
        </div>
        <Chip
          tone={status.freeDayAvailable ? 'good' : 'neutral'}
          className="shrink-0 !text-[10.5px]"
          title="Én dag uten innsjekk i uka bryter ikke rekka – laget for deg som går turnus."
        >
          <Icon name={status.freeDayAvailable ? 'hake' : 'klokke'} size={11} />
          {status.freeDayAvailable ? 'Avspasering ledig' : 'Avspasering brukt'}
        </Chip>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 px-3.5">
        {MORGENKAFFE_REWARDS.map((r, i) => {
          const taken = i < done
          const upNext = status.canCheckIn && i === done
          return (
            <div
              key={i}
              className={cx(
                'flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors',
                taken ? 'bg-rav-soft text-rav-2' : upNext ? 'animate-puls bg-rav text-white' : 'bg-blekk/[0.05] text-blekk/30',
              )}
            >
              <Icon name={taken ? 'hake' : 'kaffe'} size={15} />
              <span className="font-mono text-[9.5px] font-bold">{r.kaffekopper ? `+${r.kaffekopper}` : i + 1}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-blekk/[0.07] px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="etikett">{status.canCheckIn ? `Dag ${status.rewardDay}` : `I morgen · dag ${(status.rewardDay % week) + 1}`}</div>
          <RewardLine
            approx={!status.canCheckIn}
            reward={status.canCheckIn ? next : resolveReward(game, MORGENKAFFE_REWARDS[status.rewardDay % week])}
          />
        </div>
        {status.canCheckIn ? (
          <button
            className="knapp knapp-rav shrink-0"
            onClick={() => {
              const reward = checkIn()
              if (!reward) return
              const parts = [
                reward.budget && `${fmtCompact(reward.budget)} kr`,
                reward.fagpoeng && `${fmtCompact(reward.fagpoeng)} Fagpoeng`,
                reward.kaffekopper && `${reward.kaffekopper} Kaffekopper`,
              ].filter(Boolean)
              toast(`God vakt! +${parts.join(', +')}`, 'good')
            }}
          >
            Ta morgenkaffen
          </button>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-bold text-skog">
            <Icon name="hake" size={14} /> Tatt i dag
          </span>
        )}
      </div>
      {status.canCheckIn && status.usesFreeDay && (
        <p className="border-t border-blekk/[0.07] bg-skog-soft/50 px-3.5 py-2 text-[11.5px] font-semibold text-skog">
          Du var borte i går. Ukas avspaseringsdag redder rekka di.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rivalen rett over deg
// ---------------------------------------------------------------------------

export function RivalCard({ compact = false }: { compact?: boolean }) {
  const game = useGameState()
  const { rival, loaded, score } = useRival()
  if (!loaded) return null

  if (!rival) {
    return (
      <div className="kort flex items-center gap-3 p-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E3B341] text-white">
          <Icon name="pokal" size={18} />
        </span>
        <div>
          <div className="text-[13.5px] font-extrabold">Du leder Driftsligaen</div>
          <div className="text-[12px] text-blekk-2">Ingen foran deg i utvalget. Hold avstanden.</div>
        </div>
      </div>
    )
  }

  // Driftspoeng per spilltime: Fagpoeng teller 1:1, kroner 1:40 (se driftScore).
  const rates = incomeRates(game)
  const perRealMinute = (rates.fagpoeng + rates.budget / 40) * BALANCE.gameMinutesPerRealSecond
  const eta = perRealMinute > 0 ? (rival.gap / perRealMinute) * 60_000 : null

  return (
    <div className="kort p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="etikett">Rivalen rett over deg</span>
        <span className="font-mono text-[10.5px] font-bold text-blekk-3">
          {rival.playerRank ? `Du er nr. ${rival.playerRank} av ${rival.total}` : `${rival.total} avdelinger`}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-petrol font-mono text-[12.5px] font-extrabold text-krem">
          {rival.entry.rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-extrabold">{rival.entry.wardName}</div>
          <div className="truncate text-[11.5px] font-semibold text-blekk-3">Blant {rival.scopeLabel}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[15px] leading-none font-extrabold text-rav-2">−{fmtCompact(rival.gap)}</div>
          <div className="mt-0.5 text-[9.5px] font-bold tracking-wide text-blekk-3 uppercase">poeng bak</div>
        </div>
      </div>
      <Meter className="mt-2.5" value={score} max={Math.max(1, rival.entry.score)} color="#D97736" height={5} />
      {!compact && (
        <div className="mt-1.5 flex justify-between font-mono text-[10.5px] font-semibold text-blekk-3">
          <span>Du: {fmtInt(score)}</span>
          <span>{fmtInt(rival.entry.score)}</span>
        </div>
      )}
      {eta !== null && (
        <p className="mt-1.5 text-[11.5px] text-blekk-2">
          Med dagens drift går du forbi om ca. <b className="font-mono text-blekk">{fmtDuration(eta)}</b>.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Takkekort fra pårørende
// ---------------------------------------------------------------------------

export function ThanksPanel() {
  const game = useGameState()
  const [open, setOpen] = useState(false)
  const cards = game.thanks.cards
  if (cards.length === 0) return null
  const latest = cards[0]
  const active = game.minute < game.thanks.activeUntil
  const left = gameMinutesToRealMs(Math.max(0, game.thanks.activeUntil - game.minute))

  return (
    <div>
      <SectionTitle
        right={
          active && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-skog">
              <Icon name="hjerte" size={12} filled /> +{Math.round(BALANCE.thanksTrivselBoost * 100)} % trivselsmål · {fmtDuration(left)}
            </span>
          )
        }
      >
        Takkekort
      </SectionTitle>
      <button
        onClick={() => setOpen(true)}
        className="relative block w-full rotate-[-0.6deg] rounded-xl border border-[#E7D9C0] bg-[#FFFBF2] px-4 pt-3.5 pb-3 text-left shadow-kort transition-transform hover:rotate-0"
      >
        <Icon name="hjerte" size={18} filled className="absolute top-3 right-3 text-[#D9534F]" />
        <p className="hand pr-7 text-[1.2rem] leading-[1.15] text-blekk">{latest.text}</p>
        <p className="hand mt-1.5 text-right text-[1.02rem] text-blekk/60">– {latest.from}</p>
      </button>
      <p className="mt-1.5 px-0.5 text-[11px] text-blekk-3">
        Skrives en beboer ut mens trivselen er over {BALANCE.thanksTrivselThreshold} %, sender pårørende et kort.
        {game.thanks.total > 1 && ` ${game.thanks.total} kort totalt.`}
      </p>

      <Sheet open={open} onClose={() => setOpen(false)} title="Takkekort fra pårørende">
        <div className="space-y-3">
          {cards.map((c, i) => (
            <div
              key={c.id}
              className="rounded-xl border border-[#E7D9C0] bg-[#FFFBF2] px-4 pt-3.5 pb-3 shadow-kort"
              style={{ transform: `rotate(${i % 2 ? 0.5 : -0.5}deg)` }}
            >
              <p className="hand text-[1.25rem] leading-[1.15] text-blekk">{c.text}</p>
              <p className="hand mt-1.5 text-right text-[1.05rem] text-blekk/60">– {c.from}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] leading-snug text-blekk-2">
          Hvert kort løfter trivselsmålet med {Math.round(BALANCE.thanksTrivselBoost * 100)} % i {BALANCE.thanksHours} spilltimer.
        </p>
      </Sheet>
    </div>
  )
}
