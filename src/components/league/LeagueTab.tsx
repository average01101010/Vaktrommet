import { useEffect, useMemo, useState } from 'react'
import { BALANCE, INSPECTION_TIERS } from '@/data/balance'
import { PASS_XP_PER_LEVEL, SEASON_PASS_LEVELS, SHOP_ITEMS } from '@/data/economy'
import { COUNTIES, PLAYER_PROFESSION_ORDER, PLAYER_PROFESSIONS } from '@/data/league'
import { SKILLS } from '@/data/professions'
import { incomeRates, inspectionQualified, passLevel, resolveReward } from '@/engine/actions'
import { driftScore, qualityIndex } from '@/engine/scoring'
import { inspectionAverage, inspectionFor } from '@/engine/simulation'
import { isoWeekNumber, msUntilNextSeason, msUntilNextWeek } from '@/engine/time'
import { cx, fmtCompact, fmtDuration, fmtInt, fmtPct } from '@/lib/format'
import { fetchLeaderboard, type LeaderboardResult } from '@/services/leaderboard'
import { getPurchaseProvider } from '@/services/monetization'
import { useGame } from '@/store/gameStore'
import { useCurrentShift, useGameState, useShiftEvaluation } from '@/store/selectors'
import type { LeagueId, PlayerProfession, Reward, ShopItemDef } from '@/types'
import { Amount, Chip, Meter, SectionTitle, Segmented } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { RewardLine } from '../ui/RewardLine'
import { RivalCard } from '../ward/Retention'

type View = 'tilsyn' | 'toppliste' | 'butikk' | 'pass'

export function LeagueTab() {
  const [view, setView] = useState<View>('tilsyn')
  const game = useGameState()
  const average = inspectionAverage(game)
  const claimable = inspectionQualified(game)
    ? INSPECTION_TIERS.filter((t, i) => average >= t.score && !game.inspection.claimed.includes(i)).length
    : 0
  const level = passLevel(game)
  const pass = game.monetization.seasonPass
  const passClaimable = SEASON_PASS_LEVELS.filter(
    (l) => l.level <= level && (!pass.claimedFree.includes(l.level) || (pass.premium && !pass.claimedPremium.includes(l.level))),
  ).length

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28">
      <Segmented<View>
        value={view}
        onChange={setView}
        options={[
          { id: 'tilsyn', label: 'Tilsyn', icon: 'tavle', badge: claimable },
          { id: 'toppliste', label: 'Toppliste', icon: 'pokal' },
          { id: 'butikk', label: 'Butikk', icon: 'butikk' },
          { id: 'pass', label: 'Pass', icon: 'pass', badge: passClaimable },
        ]}
      />
      {view === 'tilsyn' && <InspectionPanel />}
      {view === 'toppliste' && <LeaderboardPanel />}
      {view === 'butikk' && <ShopPanel />}
      {view === 'pass' && <PassPanel />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ukens tilsyn
// ---------------------------------------------------------------------------

function InspectionPanel() {
  const game = useGameState()
  const shift = useCurrentShift()
  const ev = useShiftEvaluation(shift)
  const claimInspection = useGame((s) => s.claimInspection)
  const insp = inspectionFor(game.inspection.weekKey)
  const average = inspectionAverage(game)
  const shifts = game.inspection.shifts
  const qualified = inspectionQualified(game)
  const focusNow = insp.focus.reduce((n, id) => n + ev.coverageBySkill[id], 0) / insp.focus.length
  const last = game.shift.last

  return (
    <div className="space-y-4">
      <div className="kort relative overflow-hidden">
        <div className="bg-gradient-to-br from-petrol to-skog px-4 pt-4 pb-5 text-krem">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold tracking-[0.16em] uppercase opacity-75">
              Ukens tilsyn · uke {isoWeekNumber(game.inspection.weekKey)}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 font-mono text-[10.5px] font-bold">
              <Icon name="klokke" size={12} /> {fmtDuration(msUntilNextWeek(Date.now()))}
            </span>
          </div>
          <h2 className="mt-1.5 text-[1.45rem] leading-tight font-extrabold tracking-tight">{insp.title}</h2>
          <p className="mt-1 text-[13px] leading-snug opacity-90">{insp.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {insp.focus.map((id) => (
              <span key={id} className="rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-bold">
                {SKILLS[id].name}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="etikett">Snitt per vakt</div>
              <div className="font-mono text-3xl leading-none font-extrabold text-skog">
                {shifts > 0 ? average.toFixed(1).replace('.', ',') : '–'}
                <span className="text-sm font-semibold text-blekk-3"> /100</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-right">
              <div>
                <div className="etikett">Forrige vakt</div>
                <div className="font-mono text-lg leading-none font-extrabold">{last ? Math.round(last.inspectionScore) : '–'}</div>
              </div>
              <div>
                <div className="etikett">Fokus nå</div>
                <div className={cx('font-mono text-lg leading-none font-extrabold', focusNow >= 0.9 ? 'text-skog' : focusNow >= 0.6 ? 'text-rav-2' : 'text-fare')}>
                  {fmtPct(focusNow)}
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-4 mb-7">
            <Meter value={average} max={100} color="#D97736" height={9} />
            {INSPECTION_TIERS.map((t) => (
              <div key={t.name} className="absolute top-[-3px] -translate-x-1/2" style={{ left: `${t.score}%` }}>
                <div className={cx('mx-auto h-[15px] w-[15px] rounded-full border-2 border-papir', average >= t.score ? 'bg-skog' : 'bg-krem-3')} />
                <div className="mt-1 text-center font-mono text-[9.5px] font-bold text-blekk-3">{t.score}</div>
              </div>
            ))}
          </div>

          <div className={cx('mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold', qualified ? 'bg-skog-soft text-skog' : 'bg-rav-soft/70 text-rav-2')}>
            <Icon name={qualified ? 'hake' : 'klokke'} size={14} />
            {qualified
              ? `${fmtInt(shifts)} vakter vurdert denne uka – resultatet teller`
              : `${shifts} av ${BALANCE.inspectionMinShifts} vakter før resultatet teller`}
          </div>

          <div className="space-y-2">
            {INSPECTION_TIERS.map((t, i) => {
              const reached = qualified && average >= t.score
              const claimed = game.inspection.claimed.includes(i)
              return (
                <div key={t.name} className={cx('flex items-center gap-3 rounded-xl border px-3 py-2.5', reached ? 'border-skog/20 bg-skog-soft/50' : 'border-blekk/[0.07] bg-papir')}>
                  <div className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full', reached ? 'bg-skog text-krem' : 'bg-blekk/[0.06] text-blekk-3')}>
                    <Icon name={reached ? 'hake' : 'las'} size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-extrabold">
                      {t.name} <span className="font-mono text-[11px] font-semibold text-blekk-3">snitt {t.score}+</span>
                    </div>
                    <RewardLine reward={{ kaffekopper: t.kaffekopper }} />
                    <span className="ml-2 font-mono text-[11px] font-semibold text-blekk-3">+{t.passXp} pass-XP</span>
                  </div>
                  <button
                    className={cx('knapp !py-1.5 !text-xs', reached && !claimed ? 'knapp-rav' : 'knapp-flat')}
                    disabled={!reached || claimed}
                    onClick={() => claimInspection(i)}
                  >
                    {claimed ? 'Hentet' : 'Hent'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="kort p-4">
        <div className="etikett">Tilsynet ser etter</div>
        <ul className="mt-2 space-y-1.5">
          {insp.checklist.map((c) => (
            <li key={c} className="flex items-start gap-2 text-[13px] font-semibold text-blekk-2">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-blekk/25 bg-papir text-skog">
                {focusNow >= 0.9 && <Icon name="hake" size={11} strokeWidth={3} />}
              </span>
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] leading-snug text-blekk-3">
          Hver fullførte vakt får 0–100 poeng: dekningen på fokusområdene, minus {BALANCE.inspectionAvvikPenalty} per avvik.
          Resultatet er snittet. Flere vakter – fra tidshopp eller lengre offline-buffer – gir derfor ikke høyere resultat.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toppliste
// ---------------------------------------------------------------------------

function LeaderboardPanel() {
  const game = useGameState()
  const [league, setLeague] = useState<LeagueId>('drift')
  const [county, setCounty] = useState<string>('alle')
  const [profession, setProfession] = useState<PlayerProfession | 'alle'>('alle')
  const [result, setResult] = useState<LeaderboardResult | null>(null)

  const drift = driftScore(game)
  const quality = useMemo(() => qualityIndex(game), [game])
  // Oppdater lista når filtre endres eller poengsummen har flyttet seg merkbart.
  const driftBucket = Math.floor(drift / 50)
  const qualityBucket = Math.floor(quality.index / 5)
  const profile = game.profile

  useEffect(() => {
    let alive = true
    void fetchLeaderboard(
      { league, county, profession },
      { profile, drift, kvalitet: quality.index, qualified: quality.qualified },
    ).then((r) => {
      if (alive) setResult(r)
    })
    return () => {
      alive = false
    }
  }, [league, county, profession, driftBucket, qualityBucket, quality.qualified, profile.wardName, profile.county, profile.profession])

  const rows = useMemo(() => {
    if (!result) return []
    const top = result.entries.slice(0, 8)
    const me = result.entries.find((e) => e.isPlayer)
    if (!me || me.rank <= 8) return top
    const near = result.entries.slice(Math.max(8, me.rank - 2), me.rank + 1)
    return [...top, null, ...near]
  }, [result])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { id: 'drift', name: 'Driftsligaen', sub: 'Total poengsum', score: fmtCompact(drift) },
            { id: 'kvalitet', name: 'Kvalitetsindeksen', sub: 'Effektivitet, 0–1000', score: quality.qualified ? String(quality.index) : '–' },
          ] as const
        ).map((l) => (
          <button
            key={l.id}
            onClick={() => setLeague(l.id)}
            className={cx(
              'rounded-2xl border px-3.5 py-3 text-left transition-all',
              league === l.id ? 'border-transparent bg-skog text-krem shadow-loft' : 'border-blekk/10 bg-papir shadow-kort',
            )}
          >
            <div className="text-[13.5px] font-extrabold tracking-tight">{l.name}</div>
            <div className={cx('text-[11px] font-semibold', league === l.id ? 'opacity-75' : 'text-blekk-3')}>{l.sub}</div>
            <div className="mt-1.5 font-mono text-xl leading-none font-extrabold">{l.score}</div>
          </button>
        ))}
      </div>

      {league === 'drift' && <RivalCard />}

      {league === 'kvalitet' && (
        <div className="kort p-3.5">
          <div className="flex items-center justify-between">
            <span className="etikett">Slik regnes indeksen din</span>
            {!quality.qualified && (
              <Chip tone="rav">Rangeres etter {BALANCE.qualityMinHours} t drift</Chip>
            )}
          </div>
          <div className="mt-2.5 space-y-2">
            {quality.parts.map((p) => (
              <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_4.6rem_2.6rem] items-center gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-bold">{p.label}</div>
                  <Meter value={p.score} max={1} color={p.score >= 0.7 ? '#1E4D40' : p.score >= 0.45 ? '#D97736' : '#B4432F'} height={5} className="mt-1" />
                </div>
                <span className="text-right font-mono text-[11px] font-semibold text-blekk-2">{p.display}</span>
                <span className="text-right font-mono text-[10.5px] font-bold text-blekk-3">{Math.round(p.weight * 100)} %</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-blekk-3">
            Bare forholdstall teller, og 30 % handler om ressursbruk: dekning per lønnskrone og hvor mye av lagets kompetanse som faktisk treffer et behov. Tidshopp, flere senger og en dyr, overkvalifisert stab løfter ikke indeksen.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="etikett">Fylke</span>
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className="mt-1 w-full rounded-xl border border-blekk/12 bg-papir px-2.5 py-2 text-[13px] font-bold outline-none focus:border-skog"
          >
            <option value="alle">Hele landet</option>
            <option value={profile.county}>Mitt fylke ({profile.county})</option>
            {COUNTIES.filter((c) => c !== profile.county).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="min-w-0 flex-1">
          <span className="etikett">Yrkesgruppe</span>
          <select
            value={profession}
            onChange={(e) => setProfession(e.target.value as PlayerProfession | 'alle')}
            className="mt-1 w-full rounded-xl border border-blekk/12 bg-papir px-2.5 py-2 text-[13px] font-bold outline-none focus:border-skog"
          >
            <option value="alle">Alle yrker</option>
            {PLAYER_PROFESSION_ORDER.map((p) => (
              <option key={p} value={p}>
                {PLAYER_PROFESSIONS[p]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <SectionTitle
          right={
            result && (
              <span className="font-mono text-[11px] font-bold text-blekk-3">
                {result.playerRank ? `Din plass: ${result.playerRank} av ${result.total}` : `${result.total} avdelinger`}
              </span>
            )
          }
        >
          Rangering
        </SectionTitle>
        <div className="kort divide-y divide-blekk/[0.06] overflow-hidden">
          {rows.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-blekk-3">Ingen avdelinger i dette utvalget ennå.</div>}
          {rows.map((e, i) =>
            e === null ? (
              <div key={`gap-${i}`} className="py-1 text-center font-mono text-xs text-blekk-3">
                ···
              </div>
            ) : (
              <div key={e.id} className={cx('flex items-center gap-3 px-3 py-2.5', e.isPlayer && 'bg-rav-soft/70')}>
                <span
                  className={cx(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[11.5px] font-extrabold',
                    e.rank === 1 ? 'bg-[#E3B341] text-white' : e.rank === 2 ? 'bg-[#AEB6B8] text-white' : e.rank === 3 ? 'bg-[#B98052] text-white' : 'bg-blekk/[0.06] text-blekk-2',
                  )}
                >
                  {e.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-extrabold">
                    {e.wardName}
                    {e.isPlayer && <span className="ml-1.5 text-[10.5px] font-bold text-rav-2">(deg)</span>}
                  </div>
                  <div className="truncate text-[11px] font-semibold text-blekk-3">
                    {e.county} · {PLAYER_PROFESSIONS[e.profession]}
                  </div>
                </div>
                <span className="font-mono text-[13.5px] font-extrabold">{league === 'drift' ? fmtCompact(e.score) : e.score}</span>
              </div>
            ),
          )}
        </div>
        {result?.source === 'demo' && (
          <p className="mt-2 px-1 text-[11.5px] text-blekk-3">
            Demo-toppliste med fiktive avdelinger. Ekte, server-validert rangering kobles på med innlogging.
          </p>
        )}
        {league === 'kvalitet' && !quality.qualified && (
          <p className="mt-1 px-1 text-[11.5px] font-semibold text-rav-2">Du kommer med på lista etter ett døgn i drift.</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Butikk
// ---------------------------------------------------------------------------

function ShopPanel() {
  const game = useGameState()
  const purchase = useGame((s) => s.purchase)
  const timeSkip = useGame((s) => s.timeSkip)
  const isDemo = getPurchaseProvider().isDemo
  const byKind = (kind: ShopItemDef['kind']) => SHOP_ITEMS.filter((i) => i.kind === kind)
  const vip = game.monetization.vip
  const premium = game.monetization.seasonPass.premium

  return (
    <div className="space-y-5">
      {isDemo && (
        <p className="flex items-center gap-2 rounded-xl bg-petrol-soft px-3 py-2 text-[12px] font-bold text-petrol">
          <Icon name="info" size={15} /> Testmodus: ingen betaling gjennomføres. Kjøp innvilges direkte.
        </p>
      )}

      <div>
        <SectionTitle>Medlemskap</SectionTitle>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[...byKind('vip'), ...byKind('tilsynspass')].map((item) => {
            const owned = item.kind === 'vip' ? vip : premium
            return (
              <div key={item.id} className="relative overflow-hidden rounded-[1.1rem] border border-rav/25 bg-gradient-to-br from-[#FFF6EA] to-rav-soft p-4 shadow-kort">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-rav text-white">
                    <Icon name={item.kind === 'vip' ? 'stjerner' : 'pass'} size={20} />
                  </div>
                  {item.badge && <Chip tone="rav">{item.badge}</Chip>}
                </div>
                <h3 className="mt-2.5 text-[16px] font-extrabold tracking-tight">{item.name}</h3>
                <p className="mt-0.5 text-[12.5px] text-blekk-2">{item.blurb}</p>
                <button className={cx('knapp mt-3 w-full', owned ? 'knapp-flat' : 'knapp-rav')} disabled={owned} onClick={() => void purchase(item.id)}>
                  {owned ? (
                    <>
                      <Icon name="hake" size={15} /> Aktivt
                    </>
                  ) : (
                    <span className="font-mono">{item.priceNok} kr</span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <SectionTitle right={<Amount kind="kaffekopper" className="text-[12px]">{fmtInt(game.resources.kaffekopper)}</Amount>}>
          Kaffekopper
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {byKind('kaffekopper').map((item, i) => (
            <button
              key={item.id}
              onClick={() => void purchase(item.id)}
              className="kort relative flex flex-col items-center px-2 pt-4 pb-2.5 text-center transition-transform hover:-translate-y-0.5"
            >
              {item.badge && (
                <span className="absolute -top-2 rounded-full bg-rav px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-white uppercase">
                  {item.badge}
                </span>
              )}
              <div className="flex h-10 items-end justify-center text-rav">
                {Array.from({ length: i + 1 }, (_, k) => (
                  <Icon key={k} name="kaffe" size={22 + i * 2} className={k > 0 ? '-ml-2.5' : ''} />
                ))}
              </div>
              <div className="mt-1.5 text-[13px] font-extrabold">{item.name}</div>
              <div className="font-mono text-[12px] font-bold text-rav-2">{item.grants?.kaffekopper}</div>
              <div className="mt-2 w-full rounded-lg bg-skog py-1.5 font-mono text-[12px] font-bold text-krem">{item.priceNok} kr</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Tidshopp</SectionTitle>
        <div className="space-y-2">
          {byKind('tidshopp').map((item) => (
            <div key={item.id} className="kort flex items-center gap-3 px-3.5 py-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-petrol-soft text-petrol">
                <Icon name="lyn" size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-extrabold">{item.name}</span>
                  {item.badge && <Chip tone="rav" className="!py-0.5 !text-[9.5px]">{item.badge}</Chip>}
                </div>
                <div className="text-[12px] text-blekk-2">{item.blurb}</div>
              </div>
              <button
                className="knapp knapp-primar !py-2"
                disabled={game.resources.kaffekopper < (item.priceKaffe ?? 0)}
                onClick={() => timeSkip(item.id)}
              >
                <Amount kind="kaffekopper" className="[&_svg]:text-krem/85">
                  {item.priceKaffe}
                </Amount>
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 px-1 text-[11.5px] text-blekk-3">
          Hurtigkurs for ansatte på kurs finner du på ID-kortet deres under Turnus & Stab.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tilsynspasset
// ---------------------------------------------------------------------------

const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember']

function PassPanel() {
  const game = useGameState()
  const claimPass = useGame((s) => s.claimPass)
  const purchase = useGame((s) => s.purchase)
  const pass = game.monetization.seasonPass
  const level = passLevel(game)
  const maxLevel = SEASON_PASS_LEVELS.length
  const intoLevel = level >= maxLevel ? PASS_XP_PER_LEVEL : pass.xp % PASS_XP_PER_LEVEL
  const month = MONTHS[Number(pass.seasonId.split('-')[1]) - 1] ?? ''
  // Kr og Fagpoeng i passet følger inntjeningen. Regn ut ratene én gang for hele lista.
  const rates = useMemo(() => incomeRates(game), [game])

  return (
    <div className="space-y-4">
      <div className="kort overflow-hidden">
        <div className="bg-gradient-to-br from-rav to-[#B4612A] px-4 py-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold tracking-[0.16em] uppercase opacity-80">Sesong · {month}</span>
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-mono text-[10.5px] font-bold">
              <Icon name="klokke" size={12} /> {fmtDuration(msUntilNextSeason(Date.now()))}
            </span>
          </div>
          <h2 className="mt-1 text-[1.45rem] leading-tight font-extrabold tracking-tight">Tilsynspasset</h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 font-mono text-lg font-extrabold">{level}</div>
            <div className="flex-1">
              <Meter value={intoLevel} max={PASS_XP_PER_LEVEL} color="#fff" track="rgb(255 255 255 / 0.25)" height={7} />
              <div className="mt-1 flex justify-between font-mono text-[10.5px] font-bold opacity-90">
                <span>{level >= maxLevel ? 'Alle nivåer nådd' : `${Math.floor(intoLevel)}/${PASS_XP_PER_LEVEL} XP`}</span>
                <span>Nivå {Math.min(maxLevel, level + 1)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-[12px] leading-snug text-blekk-2">
            XP tjenes på fullførte vakter, dilemmaer og ukens tilsyn. Kr og Fagpoeng følger inntjeningen din, så belønningene
            vokser med avdelingen.
          </p>
          {pass.premium ? (
            <Chip tone="rav">
              <Icon name="hake" size={12} /> Betalt sti aktiv
            </Chip>
          ) : (
            <button className="knapp knapp-rav shrink-0 !py-2 !text-[12.5px]" onClick={() => void purchase('tilsynspass')}>
              Lås opp · <span className="font-mono">69 kr</span>
            </button>
          )}
        </div>
      </div>

      <div className="kort overflow-hidden">
        <div className="grid grid-cols-[2.6rem_1fr_1fr] items-center gap-2 border-b border-blekk/[0.07] px-3 py-2">
          <span />
          <span className="etikett text-center">Gratis</span>
          <span className="etikett text-center !text-rav-2">Tilsynspasset</span>
        </div>
        <div className="divide-y divide-blekk/[0.06]">
          {SEASON_PASS_LEVELS.map((l) => {
            const reached = level >= l.level
            return (
              <div key={l.level} className={cx('grid grid-cols-[2.6rem_1fr_1fr] items-stretch gap-2 px-3 py-2', !reached && 'opacity-60')}>
                <div className="grid place-items-center">
                  <span className={cx('grid h-7 w-7 place-items-center rounded-full font-mono text-[11.5px] font-extrabold', reached ? 'bg-skog text-krem' : 'bg-blekk/[0.07] text-blekk-3')}>
                    {l.level}
                  </span>
                </div>
                <PassCell
                  reward={resolveReward(game, l.free, rates)}
                  state={pass.claimedFree.includes(l.level) ? 'claimed' : reached ? 'ready' : 'locked'}
                  onClaim={() => claimPass(l.level, 'free')}
                />
                <PassCell
                  premium
                  reward={resolveReward(game, l.premium, rates)}
                  state={pass.claimedPremium.includes(l.level) ? 'claimed' : !pass.premium ? 'paywall' : reached ? 'ready' : 'locked'}
                  onClaim={() => claimPass(l.level, 'premium')}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PassCell({
  reward,
  state,
  onClaim,
  premium = false,
}: {
  reward: Reward
  state: 'locked' | 'ready' | 'claimed' | 'paywall'
  onClaim: () => void
  premium?: boolean
}) {
  return (
    <button
      disabled={state !== 'ready'}
      onClick={onClaim}
      className={cx(
        'flex min-h-[2.9rem] items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1.5 text-left transition-all',
        state === 'ready'
          ? 'border-rav bg-rav-soft shadow-kort hover:-translate-y-0.5'
          : premium
            ? 'border-rav/15 bg-rav-soft/35'
            : 'border-blekk/[0.07] bg-blekk/[0.025]',
      )}
    >
      <RewardLine reward={reward} approx={state !== 'claimed' && Boolean(reward.budget || reward.fagpoeng)} />
      {state === 'claimed' ? (
        <Icon name="hake" size={15} className="shrink-0 text-skog" />
      ) : state === 'ready' ? (
        <span className="shrink-0 rounded-full bg-rav px-2 py-0.5 text-[10px] font-extrabold text-white">Hent</span>
      ) : (
        <Icon name="las" size={13} className="shrink-0 text-blekk/30" />
      )}
    </button>
  )
}
