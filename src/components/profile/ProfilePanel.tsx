import { useState } from 'react'
import { BALANCE, TIERS } from '@/data/balance'
import { COUNTIES, PLAYER_PROFESSION_ORDER, PLAYER_PROFESSIONS } from '@/data/league'
import { WARD_TYPE_ORDER, WARD_TYPES } from '@/data/wards'
import { validateWardName } from '@/engine/actions'
import { careerStats, driftScore } from '@/engine/scoring'
import { dayNumber } from '@/engine/time'
import { cx, fmtCompact, fmtInt } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { useGameState } from '@/store/selectors'
import type { PlayerProfession } from '@/types'
import { Chip } from '../ui/bits'
import { Icon } from '../ui/Icon'

export function ProfilePanel() {
  const game = useGameState()
  const updateProfile = useGame((s) => s.updateProfile)
  const toast = useGame((s) => s.toast)
  const profile = game.profile
  const [wardName, setWardName] = useState(profile.wardName)
  const [county, setCounty] = useState(profile.county)
  const [profession, setProfession] = useState<PlayerProfession>(profile.profession)

  const nameError = validateWardName(wardName)
  const dirty = wardName.trim() !== profile.wardName || county !== profile.county || profession !== profile.profession
  const career = careerStats(game)
  const prestige = game.prestige
  const bonus = Math.round(prestige.renomme * BALANCE.renommeFagpoeng * 100)
  const fagboker = WARD_TYPE_ORDER.filter((id) => (prestige.fagboker[id] ?? 0) > 0)

  const stats: { label: string; value: string }[] = [
    { label: 'Fullførte vakter', value: fmtInt(career.shiftsCompleted) },
    { label: 'Løste dilemmaer', value: fmtInt(career.dilemmasResolved) },
    { label: 'Fagpoeng totalt', value: fmtCompact(career.fagpoeng) },
    { label: 'Rekrutterte ansatte', value: fmtInt(career.recruits) },
    { label: 'Budsjett forvaltet', value: `${fmtCompact(career.budget)} kr` },
    { label: 'Sykefravær (døgn)', value: fmtInt(Math.round(career.sickDays)) },
    { label: 'Døgn i drift', value: fmtInt(dayNumber(game.minute)) },
    { label: 'Driftspoeng', value: fmtCompact(driftScore(game)) },
  ]

  return (
    <div className="space-y-5">
      {/* ---- Identitet ---- */}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (updateProfile({ wardName, county, profession })) toast('Profilen er lagret.', 'good')
        }}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-skog text-krem">
            <Icon name="avdeling" size={24} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[17px] leading-tight font-extrabold tracking-tight">{profile.wardName}</div>
            <div className="truncate text-[12px] font-semibold text-blekk-3">
              {WARD_TYPES[game.wardType].name} · Nivå {game.tier + 1} · {TIERS[game.tier].name}
            </div>
          </div>
        </div>

        <label className="block" htmlFor="profil-navn">
          <span className="flex items-end justify-between">
            <span className="etikett">Navn på avdelingen</span>
            <span className={cx('font-mono text-[10.5px] font-semibold', nameError ? 'text-fare' : 'text-blekk-3')}>
              {[...wardName.trim()].length}/{BALANCE.wardNameMax}
            </span>
          </span>
          <input
            id="profil-navn"
            value={wardName}
            onChange={(e) => setWardName(e.target.value)}
            maxLength={BALANCE.wardNameMax + 8}
            aria-invalid={Boolean(nameError)}
            className={cx(
              'mt-1 w-full rounded-xl border bg-papir px-3.5 py-2.5 text-[15px] font-bold outline-none',
              nameError ? 'border-fare/60 focus:border-fare' : 'border-blekk/15 focus:border-skog',
            )}
          />
          {nameError && <span className="mt-1 block text-[11.5px] font-semibold text-fare">{nameError}</span>}
        </label>

        <label className="block" htmlFor="profil-fylke">
          <span className="etikett">Fylke</span>
          <select
            id="profil-fylke"
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
                aria-pressed={profession === p}
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
          <p className="mt-1.5 text-[11.5px] text-blekk-3">Fylke og yrkesgruppe brukes til filtrering i topplistene.</p>
        </div>

        <button className="knapp knapp-primar w-full" disabled={!dirty || Boolean(nameError)}>
          {dirty ? 'Lagre endringer' : 'Ingen endringer'}
        </button>
      </form>

      {/* ---- Prestisje og fagbøker ---- */}
      <section>
        <h3 className="etikett mb-2">Renommé og fagbøker</h3>
        <div className="overflow-hidden rounded-2xl bg-skog text-krem">
          <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
            <div className="px-2 py-3">
              <div className="font-mono text-2xl leading-none font-extrabold">{prestige.renomme}</div>
              <div className="mt-1 text-[10.5px] font-bold tracking-wide uppercase opacity-75">Renommé</div>
            </div>
            <div className="px-2 py-3">
              <div className="font-mono text-2xl leading-none font-extrabold">+{bonus} %</div>
              <div className="mt-1 text-[10.5px] font-bold tracking-wide uppercase opacity-75">Varig bonus</div>
            </div>
            <div className="px-2 py-3">
              <div className="font-mono text-2xl leading-none font-extrabold">{prestige.rotations}</div>
              <div className="mt-1 text-[10.5px] font-bold tracking-wide uppercase opacity-75">Overlevert</div>
            </div>
          </div>
          <p className="border-t border-white/10 px-3.5 py-2 text-[11.5px] leading-snug opacity-85">
            Hvert renommépoeng gir +{Math.round(BALANCE.renommeFagpoeng * 100)} % Fagpoeng og budsjett på alle avdelinger du
            leder.
          </p>
        </div>

        <div className="kort mt-2 divide-y divide-blekk/[0.06]">
          {fagboker.length === 0 ? (
            <p className="px-3.5 py-3 text-[12.5px] leading-snug text-blekk-2">
              Ingen fagbøker ennå. Du skriver den første når du overleverer en avdeling som har nådd nivå {TIERS.length}.
            </p>
          ) : (
            fagboker.map((id) => {
              const level = prestige.fagboker[id]
              return (
                <div key={id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-petrol-soft text-petrol">
                    <Icon name="kurs" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-extrabold">{WARD_TYPES[id].fagbok.name}</div>
                    <div className="truncate text-[11.5px] text-blekk-2">
                      {WARD_TYPES[id].fagbok.effectText} per nivå · {WARD_TYPES[id].name}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex justify-end gap-[3px]">
                      {Array.from({ length: BALANCE.fagbokMaxLevel }, (_, i) => (
                        <span key={i} className={cx('h-2 w-4 rounded-full', i < level ? 'bg-petrol' : 'bg-blekk/12')} />
                      ))}
                    </div>
                    <div className="mt-1 font-mono text-[10px] font-bold text-blekk-3">
                      nivå {level}/{BALANCE.fagbokMaxLevel}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {prestige.history.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {prestige.history
              .slice()
              .reverse()
              .map((h, i) => (
                <div key={`${h.minute}-${i}`} className="flex items-center gap-2 rounded-xl bg-blekk/[0.04] px-3 py-2">
                  <Icon name="hake" size={14} className="shrink-0 text-skog" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{h.wardName}</span>
                  <Chip className="shrink-0 !py-0.5 !text-[10px]">{WARD_TYPES[h.wardType]?.name ?? h.wardType}</Chip>
                  <span className="shrink-0 font-mono text-[10.5px] font-semibold text-blekk-3">
                    {fmtCompact(h.drift)} · K{h.quality}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* ---- Livstidsstatistikk ---- */}
      <section>
        <h3 className="etikett mb-2">Karrieren i tall</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="kort px-3 py-2.5">
              <div className="font-mono text-[17px] leading-tight font-extrabold text-blekk">{s.value}</div>
              <div className="mt-0.5 text-[10.5px] leading-tight font-bold text-blekk-3">{s.label}</div>
            </div>
          ))}
        </div>
        {prestige.rotations > 0 && (
          <p className="mt-1.5 text-[11.5px] text-blekk-3">Tallene gjelder hele karrieren, på tvers av overleverte avdelinger.</p>
        )}
      </section>
    </div>
  )
}
