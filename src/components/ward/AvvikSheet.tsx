import { BALANCE } from '@/data/balance'
import { avvikCheckStatus, openAvvikInspectionPenalty, openAvvikTrivselPenalty } from '@/engine/avvik'
import { avvikCloseCost, meetingCooldown, meetingCost } from '@/engine/actions'
import { gameMinutesToRealMs } from '@/engine/time'
import { cx, fmtDuration, fmtInt } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { useGameState } from '@/store/selectors'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'

/**
 * Avvik og pårørende: lederens to aktive grep for kvaliteten på avdelingen.
 * Behandle ulukkede avvik, og sette av tid til pårørendesamtaler.
 */
export function AvvikSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const game = useGameState()
  const resolveAvvik = useGame((s) => s.resolveAvvik)
  const holdMeeting = useGame((s) => s.holdNextOfKinMeeting)
  if (!open) return null

  const openAvvik = game.ward.openAvvik
  const status = avvikCheckStatus(openAvvik)
  const each = avvikCloseCost(game)
  const fp = game.resources.fagpoeng
  const penalty = openAvvikInspectionPenalty(openAvvik)
  const trivselHit = openAvvikTrivselPenalty(openAvvik)
  const wait = meetingCooldown(game)
  const mCost = meetingCost(game)
  const lifts = game.ward.trivsel < BALANCE.meetingTrivselLimit

  return (
    <Sheet open onClose={onClose} title="Avvik og pårørende">
      {/* ---- Ulukkede avvik ---- */}
      <div
        className={cx(
          'rounded-2xl px-3.5 py-3',
          status === 'ok' ? 'bg-skog-soft/70' : status === 'advarsel' ? 'bg-rav-soft/80' : 'bg-fare-soft/80',
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[15px] font-extrabold">
            <span className="font-mono text-[22px]">{openAvvik}</span> ulukkede avvik
          </div>
          <div className="font-mono text-[11px] font-bold text-blekk-3">{fmtInt(game.ward.avvik)} meldt totalt</div>
        </div>
        <p className="mt-1 text-[12.5px] leading-snug text-blekk-2">
          {status === 'ok'
            ? 'Under kontroll. Tilsynet ser at avvik både meldes og lukkes.'
            : status === 'advarsel'
              ? `Haugen vokser. Over ${BALANCE.openAvvikThreshold} ulukkede gir trekk på Ukens tilsyn og i trivselen.`
              : `Trekker nå −${penalty.toFixed(1).replace('.', ',')} tilsynspoeng per vakt og −${trivselHit.toFixed(1).replace('.', ',')} i trivselsmålet.`}
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            className={cx('knapp !py-2 !text-[13px]', openAvvik > 0 && fp >= each ? 'knapp-primar' : 'knapp-flat')}
            disabled={openAvvik === 0 || fp < each}
            onClick={() => resolveAvvik(1)}
          >
            Lukk 1 <span className="font-mono text-[11px] opacity-80">{fmtInt(each)} FP</span>
          </button>
          <button
            className={cx('knapp !py-2 !text-[13px]', openAvvik > 1 && fp >= each * openAvvik ? 'knapp-lys' : 'knapp-flat')}
            disabled={openAvvik < 2 || fp < each * openAvvik}
            onClick={() => resolveAvvik('alle')}
          >
            Behandle alle <span className="font-mono text-[11px] opacity-80">{fmtInt(each * openAvvik)} FP</span>
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-blekk-3">
          Hvert lukket avvik gir +1 trivsel og +{BALANCE.avvikCloseInspectionBonus} tilsynspoeng på vakta. Billigere med Stille rapport, og
          med noen på vakt som har Dok. {BALANCE.avvikCloseDokMin}+.
        </p>
      </div>

      {/* ---- Pårørendesamtale ---- */}
      <div className="mt-3 rounded-2xl border border-blekk/10 bg-papir px-3.5 py-3 shadow-kort">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-petrol-soft text-petrol">
            <Icon name="folk" size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] leading-tight font-extrabold">Pårørendesamtale</div>
            <p className="mt-0.5 text-[12px] leading-snug text-blekk-2">
              Sett av tid til samtaler og et informasjonsmøte. +{BALANCE.meetingTrivsel} trivsel
              {lifts ? ` og +${BALANCE.meetingInspectionBonus} tilsynspoeng, siden trivselen er under ${BALANCE.meetingTrivselLimit} %` : ''}. Gir +
              {BALANCE.meetingStress} stress til dem på vakt. Én gang per spilldøgn.
            </p>
          </div>
        </div>
        <button
          className={cx('knapp mt-2.5 w-full !py-2 !text-[13px]', wait === 0 && fp >= mCost ? 'knapp-primar' : 'knapp-flat')}
          disabled={wait > 0 || fp < mCost}
          onClick={() => holdMeeting()}
        >
          {wait > 0 ? (
            <>
              <Icon name="klokke" size={14} /> Klar om {fmtDuration(gameMinutesToRealMs(wait))}
            </>
          ) : (
            <>
              Hold samtale <span className="font-mono text-[11px] opacity-80">{fmtInt(mCost)} FP</span>
            </>
          )}
        </button>
      </div>
    </Sheet>
  )
}
