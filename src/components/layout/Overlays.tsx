import { useEffect, useState } from 'react'
import { BALANCE } from '@/data/balance'
import { AD_PLACEMENTS } from '@/data/economy'
import { COUNTIES, PLAYER_PROFESSION_ORDER, PLAYER_PROFESSIONS } from '@/data/league'
import { cx, fmtCompact, fmtDuration, fmtInt } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import type { PlayerProfession } from '@/types'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'

/** «Mens du var borte» – oppsummering av offline-progresjon. */
export function OfflineReportSheet() {
  const report = useGame((s) => s.offlineReport)
  const vip = useGame((s) => s.game.monetization.vip)
  const dismiss = useGame((s) => s.dismissOfflineReport)
  if (!report) return null
  const trivselDiff = Math.round(report.trivselTo - report.trivselFrom)
  const rows: { label: string; value: string; tone?: string }[] = [
    { label: 'Fagpoeng', value: `+${fmtCompact(report.fagpoeng)}`, tone: 'text-skog' },
    { label: 'Budsjettmidler', value: `+${fmtCompact(report.budget)} kr`, tone: 'text-petrol' },
    { label: 'Fullførte vakter', value: fmtInt(report.shifts) },
    { label: 'Avvik', value: fmtInt(report.avvik), tone: report.avvik > 0 ? 'text-fare' : undefined },
    { label: 'Sykmeldinger', value: fmtInt(report.sick), tone: report.sick > 0 ? 'text-fare' : undefined },
    { label: 'Utskrevne beboere', value: fmtInt(report.discharged) },
    {
      label: 'Trivsel',
      value: `${Math.round(report.trivselFrom)} → ${Math.round(report.trivselTo)} %`,
      tone: trivselDiff >= 0 ? 'text-skog' : 'text-fare',
    },
  ]
  return (
    <Sheet open onClose={dismiss} title="Mens du var borte">
      <p className="text-[13.5px] text-blekk-2">
        Du var borte i <b className="text-blekk">{fmtDuration(report.awayMs)}</b>. Vaktene gikk sin gang i{' '}
        <b className="text-blekk">{fmtDuration(report.simulatedMs)}</b>.
      </p>
      <div className="kort mt-3 divide-y divide-blekk/[0.06]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5">
            <span className="text-[13px] font-semibold text-blekk-2">{r.label}</span>
            <span className={cx('font-mono text-[14px] font-extrabold', r.tone)}>{r.value}</span>
          </div>
        ))}
      </div>
      {report.newDilemmas > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-rav-soft/70 px-3 py-2 text-[12.5px] font-bold text-rav-2">
          <Icon name="tavle" size={15} /> {report.newDilemmas} {report.newDilemmas === 1 ? 'ny lapp' : 'nye lapper'} på korktavla
        </p>
      )}
      {report.capped && (
        <p className="mt-3 rounded-xl bg-blekk/[0.05] px-3 py-2 text-[12px] text-blekk-2">
          Offline-bufferen er på <b>{report.capHours} timer</b>.{' '}
          {!vip && `Med Avdelingsleder Pluss utvides den til ${BALANCE.offlineCapHoursVip} timer.`}
        </p>
      )}
      <button className="knapp knapp-primar mt-4 w-full" onClick={dismiss}>
        Tilbake på jobb
      </button>
    </Sheet>
  )
}

/** Demo-overlay for rewarded video. Byttes ut med ekte annonse-SDK via services/monetization. */
export function AdOverlay() {
  const ad = useGame((s) => s.ad)
  const finishAd = useGame((s) => s.finishAd)
  const [left, setLeft] = useState(3)
  useEffect(() => {
    if (!ad) return
    setLeft(3)
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000)
    return () => clearInterval(t)
  }, [ad])
  if (!ad) return null
  const info = AD_PLACEMENTS[ad.placement]
  return (
    <div className="fixed inset-0 z-[80] grid animate-inn place-items-center bg-blekk/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-krem text-center shadow-loft">
        <div className="bg-gradient-to-br from-petrol to-skog px-6 py-10 text-krem">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/15">
            <Icon name="spill" size={26} filled />
          </div>
          <div className="mt-3 text-[11px] font-bold tracking-[0.18em] uppercase opacity-70">Reklamepause · demo</div>
          <div className="mt-1 text-lg font-extrabold">Her vises en frivillig videoannonse</div>
        </div>
        <div className="px-6 py-5">
          <div className="text-[13px] font-bold">{info.title}</div>
          <div className="text-[12.5px] text-blekk-2">{info.reward}</div>
          <button className="knapp knapp-rav mt-4 w-full" disabled={left > 0} onClick={() => finishAd(true)}>
            {left > 0 ? `Belønning om ${left} …` : 'Hent belønning'}
          </button>
          <button className="mt-2 text-[12px] font-bold text-blekk-3" onClick={() => finishAd(false)}>
            Avbryt
          </button>
        </div>
      </div>
    </div>
  )
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  const dismiss = useGame((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[4.4rem] z-[90] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cx(
            'pointer-events-auto flex max-w-md animate-inn items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-bold shadow-loft',
            t.tone === 'bad' ? 'bg-fare text-white' : t.tone === 'good' ? 'bg-skog text-krem' : 'bg-blekk text-krem',
          )}
        >
          <Icon name={t.tone === 'bad' ? 'avvik' : t.tone === 'good' ? 'hake' : 'info'} size={15} />
          {t.text}
        </button>
      ))}
    </div>
  )
}

/** Første gang: navn på avdelingen, fylke og yrkesgruppe (brukes i topplistene). */
export function Onboarding() {
  const profile = useGame((s) => s.game.profile)
  const updateProfile = useGame((s) => s.updateProfile)
  const [wardName, setWardName] = useState(profile.wardName)
  const [county, setCounty] = useState(profile.county)
  const [profession, setProfession] = useState<PlayerProfession>(profile.profession)
  if (profile.onboarded) return null
  return (
    <Sheet open locked onClose={() => {}} title="Velkommen som avdelingsleder">
      <p className="text-[13.5px] text-blekk-2">
        Du har fått ansvaret for en sliten sykehjemsavdeling. Sett opp vaktlagene, bygg fagmiljøet og gjør den til kommunens
        stolthet.
      </p>
      <form
        className="mt-4 space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          updateProfile({ wardName: wardName.trim() || 'Solsiden, avd. 2', county, profession })
        }}
      >
        <label className="block">
          <span className="etikett">Navn på avdelingen</span>
          <input
            value={wardName}
            onChange={(e) => setWardName(e.target.value)}
            maxLength={BALANCE.wardNameMax}
            className="mt-1 w-full rounded-xl border border-blekk/15 bg-papir px-3.5 py-2.5 text-[15px] font-bold outline-none focus:border-skog"
          />
        </label>
        <label className="block">
          <span className="etikett">Fylke</span>
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className="mt-1 w-full rounded-xl border border-blekk/15 bg-papir px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-skog"
          >
            {COUNTIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div>
          <span className="etikett">Din yrkesgruppe</span>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {PLAYER_PROFESSION_ORDER.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProfession(p)}
                className={cx(
                  'rounded-xl border px-2 py-2 text-[12px] font-bold transition-colors',
                  profession === p ? 'border-skog bg-skog text-krem' : 'border-blekk/12 bg-papir text-blekk-2',
                )}
              >
                {PLAYER_PROFESSIONS[p]}
              </button>
            ))}
          </div>
        </div>
        <button className="knapp knapp-primar w-full !py-3 !text-[15px]">Ta første vakt</button>
        <p className="text-center text-[11px] text-blekk-3">Fylke og yrkesgruppe brukes kun til filtrering i topplistene.</p>
      </form>
    </Sheet>
  )
}
