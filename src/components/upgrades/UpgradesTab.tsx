import { useState } from 'react'
import { UPGRADE_BY_ID, UPGRADES_BY_TRACK, upgradeCost } from '@/data/upgrades'
import { upgradeStatus } from '@/engine/actions'
import { cx, fmtCompact, fmtInt } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { useGameState } from '@/store/selectors'
import type { UpgradeDef, UpgradeId, UpgradeTrack } from '@/types'
import { Amount, Chip } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'

const ROW_H = 132

const TRACKS: Record<UpgradeTrack, { title: string; lead: string; color: string }> = {
  utstyr: {
    title: 'Fysisk utstyr',
    lead: 'Betales med driftsbudsjettet. Det du kjøper, dukker opp i avdelingen.',
    color: '#2B5B6C',
  },
  fag: {
    title: 'Faglig metodikk',
    lead: 'Betales med Fagpoeng. Rutiner og kompetanse som løfter hele laget.',
    color: '#1E4D40',
  },
}

export function UpgradesTab() {
  const game = useGameState()
  const [track, setTrack] = useState<UpgradeTrack>('utstyr')
  const [openId, setOpenId] = useState<UpgradeId | null>(null)
  const defs = UPGRADES_BY_TRACK[track]
  const rows = Math.max(...defs.map((d) => d.pos.row)) + 1
  const currency = track === 'utstyr' ? 'budget' : 'fagpoeng'

  const owned = defs.reduce((n, d) => n + (game.upgrades[d.id] ?? 0), 0)
  const total = defs.reduce((n, d) => n + d.maxLevel, 0)

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Sporvelger */}
      <div className="grid grid-cols-2 gap-2">
        {(['utstyr', 'fag'] as const).map((t) => {
          const active = t === track
          const cur = t === 'utstyr' ? 'budget' : 'fagpoeng'
          return (
            <button
              key={t}
              onClick={() => setTrack(t)}
              className={cx(
                'rounded-2xl border px-3.5 py-3 text-left transition-all',
                active ? 'border-transparent text-krem shadow-loft' : 'border-blekk/10 bg-papir text-blekk shadow-kort',
              )}
              style={active ? { background: `linear-gradient(135deg, ${TRACKS[t].color}, ${t === 'utstyr' ? '#1E4D40' : '#2B5B6C'})` } : undefined}
            >
              <div className="flex items-center gap-2">
                <Icon name={t === 'utstyr' ? 'utstyr' : 'fag'} size={18} />
                <span className="text-[14px] font-extrabold tracking-tight">{TRACKS[t].title}</span>
              </div>
              <Amount kind={cur} className={cx('mt-1.5 text-[13px]', active && '[&_svg]:text-krem/80')}>
                {cur === 'budget' ? `${fmtCompact(game.resources.budget)} kr` : fmtCompact(game.resources.fagpoeng)}
              </Amount>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-3 px-0.5">
        <p className="text-[12.5px] text-blekk-2">{TRACKS[track].lead}</p>
        <span className="shrink-0 font-mono text-[11px] font-bold text-blekk-3">
          {owned}/{total}
        </span>
      </div>

      {/* Tre */}
      <div className="kort relative px-2 py-3 sm:px-4">
        <svg
          className="pointer-events-none absolute top-3 left-2 w-[calc(100%-1rem)] sm:left-4 sm:w-[calc(100%-2rem)]"
          style={{ height: rows * ROW_H }}
          viewBox={`0 0 300 ${rows * 100}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {defs.flatMap((d) =>
            (d.requires ?? []).map((req) => {
              const from = UPGRADE_BY_ID[req.id].pos
              const met = (game.upgrades[req.id] ?? 0) >= req.level
              const x1 = from.col * 100 + 50
              const y1 = from.row * 100 + 78
              const x2 = d.pos.col * 100 + 50
              const y2 = d.pos.row * 100 + 12
              const my = (y1 + y2) / 2
              return (
                <path
                  key={`${req.id}-${d.id}`}
                  d={`M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                  fill="none"
                  stroke={met ? TRACKS[track].color : 'rgb(28 37 38 / 0.16)'}
                  strokeWidth={met ? 2.5 : 2}
                  strokeDasharray={met ? undefined : '5 5'}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )
            }),
          )}
        </svg>
        <div className="relative grid grid-cols-3 gap-x-2" style={{ gridTemplateRows: `repeat(${rows}, ${ROW_H}px)` }}>
          {defs.map((d) => (
            <div key={d.id} className="flex items-center justify-center" style={{ gridColumn: d.pos.col + 1, gridRow: d.pos.row + 1 }}>
              <Node def={d} color={TRACKS[track].color} onOpen={() => setOpenId(d.id)} />
            </div>
          ))}
        </div>
      </div>

      <UpgradeSheet id={openId} onClose={() => setOpenId(null)} currency={currency} />
    </div>
  )
}

function LevelRing({ level, max, color, locked }: { level: number; max: number; color: string; locked: boolean }) {
  const r = 17
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-11 w-11">
      <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgb(28 37 38 / 0.09)" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          opacity={level > 0 ? 1 : 0}
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(level / max) * c} ${c}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-mono text-[12px] font-extrabold" style={{ color: locked ? '#7D8788' : color }}>
        {locked ? <Icon name="las" size={15} /> : level >= max ? <Icon name="hake" size={16} strokeWidth={2.6} /> : level}
      </div>
    </div>
  )
}

function Node({ def, color, onOpen }: { def: UpgradeDef; color: string; onOpen: () => void }) {
  const game = useGameState()
  const st = upgradeStatus(game, def)
  const locked = Boolean(st.locked)
  const ready = !locked && !st.maxed && st.affordable
  return (
    <button
      onClick={onOpen}
      className={cx(
        'relative flex h-[108px] w-full max-w-[9.5rem] flex-col items-center justify-between rounded-2xl border px-1.5 py-2 text-center transition-all hover:-translate-y-0.5',
        locked
          ? 'border-dashed border-blekk/15 bg-krem-2/70 text-blekk-3'
          : st.maxed
            ? 'border-skog/25 bg-skog-soft/80'
            : 'border-blekk/10 bg-papir shadow-kort',
        ready && 'ring-2 ring-rav/70',
      )}
    >
      {ready && <span className="absolute -top-1 -right-1 h-3 w-3 animate-puls rounded-full bg-rav ring-2 ring-papir" />}
      <LevelRing level={st.level} max={def.maxLevel} color={color} locked={locked} />
      <span className="line-clamp-2 w-full text-[11px] leading-[1.15] font-extrabold tracking-tight hyphens-auto [overflow-wrap:anywhere]">{def.name}</span>
      {st.maxed ? (
        <span className="font-mono text-[10px] font-bold text-skog">MAKS</span>
      ) : locked ? (
        <span className="font-mono text-[10px] font-bold">Låst</span>
      ) : (
        <Amount kind={def.currency} size={11} className={cx('text-[10.5px]', st.affordable ? 'text-blekk' : 'text-blekk-3')}>
          {fmtCompact(st.cost)}
        </Amount>
      )}
    </button>
  )
}

function UpgradeSheet({ id, onClose, currency }: { id: UpgradeId | null; onClose: () => void; currency: 'budget' | 'fagpoeng' }) {
  const game = useGameState()
  const buyUpgrade = useGame((s) => s.buyUpgrade)
  const toast = useGame((s) => s.toast)
  const def = id ? UPGRADE_BY_ID[id] : null
  if (!def) return null
  const st = upgradeStatus(game, def)
  const missing = Math.max(0, st.cost - game.resources[currency])
  return (
    <Sheet open onClose={onClose} title={def.name}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone="petrol" className="font-mono">
          Nivå {st.level}/{def.maxLevel}
        </Chip>
        {def.visual && (
          <Chip tone="good">
            <Icon name="avdeling" size={12} /> Vises i avdelingen
          </Chip>
        )}
      </div>
      <p className="mt-2.5 text-[14px] leading-snug text-blekk-2">{def.blurb}</p>

      <div className="mt-3 rounded-2xl bg-blekk/[0.04] p-3.5">
        <div className="etikett">Effekt per nivå</div>
        <div className="mt-0.5 text-[14.5px] font-extrabold text-skog">{def.effectText}</div>
        <div className="mt-2.5 flex gap-1">
          {Array.from({ length: def.maxLevel }, (_, i) => (
            <div key={i} className="flex-1">
              <div className={cx('h-2 rounded-full', i < st.level ? 'bg-skog' : i === st.level ? 'bg-rav/50' : 'bg-blekk/10')} />
              <div className="mt-1 text-center font-mono text-[9.5px] font-semibold text-blekk-3">{fmtCompact(upgradeCost(def, i))}</div>
            </div>
          ))}
        </div>
      </div>

      {st.locked && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-krem-2 px-3 py-2 text-[12.5px] font-bold text-blekk-2">
          <Icon name="las" size={14} /> {st.locked}
        </p>
      )}

      {st.maxed ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-skog-soft py-3 text-[14px] font-extrabold text-skog">
          <Icon name="hake" size={16} /> Fullt oppgradert
        </div>
      ) : (
        <button
          className="knapp knapp-primar mt-4 w-full !py-3 !text-[15px]"
          disabled={Boolean(st.locked) || !st.affordable}
          onClick={() => {
            if (buyUpgrade(def.id)) toast(`${def.name} er oppgradert til nivå ${st.level + 1}.`, 'good')
          }}
        >
          {st.level === 0 ? 'Kjøp' : `Oppgrader til nivå ${st.level + 1}`}
          <Amount kind={currency} className="[&_svg]:text-krem/80">
            {fmtInt(st.cost)}
          </Amount>
        </button>
      )}
      {!st.maxed && !st.locked && missing > 0 && (
        <p className="mt-2 text-center font-mono text-[11.5px] font-semibold text-blekk-3">
          Mangler {fmtCompact(missing)} {currency === 'budget' ? 'kr' : 'Fagpoeng'}
        </p>
      )}
    </Sheet>
  )
}
