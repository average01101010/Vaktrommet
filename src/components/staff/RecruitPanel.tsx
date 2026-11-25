import { useState } from 'react'
import { BALANCE, RARITY, RARITY_ORDER } from '@/data/balance'
import { BANNER_ORDER, BANNERS } from '@/data/economy'
import { recruitCost } from '@/engine/actions'
import { cx, fmtInt } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { useGameState } from '@/store/selectors'
import type { BannerId, StaffId } from '@/types'
import { Amount, Chip } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'
import { IdCard } from './IdCard'

const RARITY_DOT: Record<string, string> = {
  vanlig: '#A7AEAF',
  erfaren: '#2B5B6C',
  spesialist: '#D97736',
  ildsjel: '#E3B341',
}

const pct = (v: number) => `${(v * 100).toFixed(v < 0.01 ? 1 : v < 0.1 ? 1 : 0).replace('.', ',')} %`

export function RecruitPanel({ onOpenStaff }: { onOpenStaff: (id: StaffId) => void }) {
  const game = useGameState()
  const [revealed, setRevealed] = useState<StaffId | null>(null)
  const [revealKey, setRevealKey] = useState(0)
  const { recruit, rerollRecruit } = useGame.getState()
  const full = game.staffOrder.length >= BALANCE.staffCap
  const last = game.monetization.gacha.lastPull

  const pull = (banner: BannerId) => {
    const id = recruit(banner)
    if (id) {
      setRevealed(id)
      setRevealKey((k) => k + 1)
    }
  }

  const hired = revealed ? game.staff[revealed] : null
  const canReroll = Boolean(hired && last && last.staffId === hired.id && !last.rerolled)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[13px] text-blekk-2">Lys ut stillinger og trekk nye kolleger. Sannsynlighetene står på hver utlysning.</p>
        <Chip tone={full ? 'bad' : 'neutral'} className="shrink-0 font-mono">
          <Icon name="folk" size={12} /> {game.staffOrder.length}/{BALANCE.staffCap}
        </Chip>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {BANNER_ORDER.map((id) => {
          const b = BANNERS[id]
          const cost = recruitCost(game, id)
          const affordable = game.resources[b.cost.currency] >= cost
          const premium = b.cost.currency === 'kaffekopper'
          const pity = game.monetization.gacha.pity[id]
          return (
            <div
              key={id}
              className={cx(
                'relative overflow-hidden rounded-[1.1rem] border p-4 shadow-kort',
                premium ? 'border-rav/30 bg-gradient-to-br from-[#FFF6EA] to-rav-soft' : 'border-blekk/[0.07] bg-papir',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="etikett">{premium ? 'Rekrutteringspakke' : 'Standard'}</div>
                  <h3 className="mt-0.5 text-lg leading-tight font-extrabold tracking-tight">{b.name}</h3>
                </div>
                <div
                  className={cx(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                    premium ? 'bg-rav text-white' : 'bg-skog-soft text-skog',
                  )}
                >
                  <Icon name={premium ? 'stjerner' : 'folk'} size={20} />
                </div>
              </div>
              <p className="mt-1 text-[12.5px] text-blekk-2">{b.blurb}</p>

              {/* Droprates */}
              <div className="mt-3 overflow-hidden rounded-xl border border-blekk/[0.08] bg-papir/70">
                <div className="flex h-2">
                  {RARITY_ORDER.map((r) => (
                    <div key={r} style={{ width: `${b.rates[r] * 100}%`, background: RARITY_DOT[r] }} />
                  ))}
                </div>
                <div className="grid grid-cols-4 divide-x divide-blekk/[0.07] text-center">
                  {RARITY_ORDER.map((r) => (
                    <div key={r} className="px-1 py-1.5">
                      <div className="font-mono text-[12px] font-extrabold">{pct(b.rates[r])}</div>
                      <div className="flex items-center justify-center gap-1 text-[9.5px] font-bold text-blekk-3">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: RARITY_DOT[r] }} />
                        {RARITY[r].name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {b.pity && (
                <p className="mt-1.5 text-[11px] font-semibold text-rav-2">
                  Garanti: {RARITY[b.pity.rarity].name} eller bedre om{' '}
                  <span className="font-mono font-bold">{b.pity.pulls - pity}</span> trekk
                </p>
              )}

              <button
                className={cx('knapp mt-3 w-full', premium ? 'knapp-rav' : 'knapp-primar')}
                disabled={!affordable || full}
                onClick={() => pull(id)}
              >
                {full ? 'Staben er full' : 'Lys ut stilling'}
                {!full && (
                  <Amount kind={b.cost.currency} className="[&_svg]:text-white/90">
                    {fmtInt(cost)}
                  </Amount>
                )}
              </button>
            </div>
          )
        })}
      </div>

      <Sheet open={Boolean(hired)} onClose={() => setRevealed(null)} title="Ny kollega!">
        {hired && (
          <div className="flex flex-col items-center">
            <p className="mb-2 text-center text-[13px] text-blekk-2">
              {hired.rarity === 'ildsjel'
                ? 'En ekte ildsjel! Slike vokser ikke på trær.'
                : hired.rarity === 'spesialist'
                  ? 'En spesialist takket ja. Det merkes på fagmiljøet.'
                  : 'Kontrakten er signert og nøkkelkortet laminert.'}
            </p>
            <div key={revealKey} className="w-48 animate-pop">
              <div className="origin-top animate-sving">
                <IdCard staff={hired} />
              </div>
            </div>
            <div className="mt-5 grid w-full gap-2">
              <button
                className="knapp knapp-primar w-full"
                onClick={() => {
                  setRevealed(null)
                }}
              >
                Velkommen på laget
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="knapp knapp-lys"
                  onClick={() => {
                    const id = hired.id
                    setRevealed(null)
                    onOpenStaff(id)
                  }}
                >
                  Se detaljer
                </button>
                <button
                  className="knapp knapp-lys"
                  disabled={!canReroll}
                  onClick={async () => {
                    const id = await rerollRecruit()
                    if (id) {
                      setRevealed(id)
                      setRevealKey((k) => k + 1)
                    }
                  }}
                >
                  <Icon name="spill" size={13} filled className="shrink-0" /> {canReroll ? 'Ny søker' : 'Allerede byttet'}
                  {canReroll && <span className="rounded-full bg-rav-soft px-1.5 py-0.5 text-[10px] font-bold text-rav-2">Reklame</span>}
                </button>
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
