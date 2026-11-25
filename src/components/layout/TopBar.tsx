import { useEffect, useRef, useState } from 'react'
import { TIERS } from '@/data/balance'
import { cx, fmtCompact } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { Icon, type IconName } from '../ui/Icon'

/** Ressurs-brikke som «popper» lett når verdien øker merkbart. */
function Resource({ icon, value, label, tone }: { icon: IconName; value: number; label: string; tone: string }) {
  const [bump, setBump] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    const diff = value - prev.current
    prev.current = value
    if (Math.abs(diff) > Math.max(20, Math.abs(value) * 0.02)) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 350)
      return () => clearTimeout(t)
    }
  }, [value])
  return (
    <div
      title={label}
      className={cx(
        'flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 py-1 pr-2.5 pl-1 transition-transform duration-300',
        bump && 'scale-110',
      )}
    >
      <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full', tone)}>
        <Icon name={icon} size={14} />
      </span>
      <span className="truncate font-mono text-[13px] font-bold text-krem">{fmtCompact(value)}</span>
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function TopBar() {
  const wardName = useGame((s) => s.game.profile.wardName)
  const tier = useGame((s) => s.game.tier)
  const budget = useGame((s) => Math.floor(s.game.resources.budget))
  const fagpoeng = useGame((s) => Math.floor(s.game.resources.fagpoeng))
  const kaffe = useGame((s) => s.game.resources.kaffekopper)

  return (
    <header className="sticky top-0 z-40 bg-skog pt-safe text-krem shadow-[0_6px_18px_-10px_rgb(21_58_48/0.9)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3.5 py-2.5 sm:px-5">
        <div className="min-w-0">
          <div className="truncate text-[15px] leading-tight font-extrabold tracking-tight">{wardName}</div>
          <div className="truncate text-[10.5px] font-bold tracking-[0.1em] text-krem/65 uppercase">
            <span className="hidden sm:inline">Nivå {tier + 1} · </span>
            {TIERS[tier].name}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Resource icon="kr" value={budget} label="Driftsbudsjett (kr)" tone="bg-petrol-soft text-petrol" />
          <Resource icon="fag" value={fagpoeng} label="Fagpoeng" tone="bg-skog-soft text-skog" />
          <Resource icon="kaffe" value={kaffe} label="Kaffekopper" tone="bg-rav text-white" />
        </div>
      </div>
    </header>
  )
}
