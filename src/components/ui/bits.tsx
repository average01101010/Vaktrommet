import type { ReactNode } from 'react'
import { cx } from '@/lib/format'
import { Icon, type IconName } from './Icon'

/** Tynn framdriftsstripe. */
export function Meter({
  value,
  max = 100,
  color = 'var(--color-skog)',
  track = 'rgb(28 37 38 / 0.08)',
  className,
  height = 6,
}: {
  value: number
  max?: number
  color?: string
  track?: string
  className?: string
  height?: number
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={cx('w-full overflow-hidden rounded-full', className)} style={{ background: track, height }}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: ReactNode; icon?: IconName; badge?: number }[]
  className?: string
}) {
  return (
    <div className={cx('flex gap-1 rounded-2xl bg-blekk/[0.06] p-1', className)} role="tablist">
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cx(
              'relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[13px] font-bold transition-all',
              active ? 'bg-papir text-skog shadow-kort' : 'text-blekk-2 hover:text-blekk',
            )}
          >
            {o.icon && <Icon name={o.icon} size={16} className="hidden shrink-0 sm:block" />}
            <span className="truncate">{o.label}</span>
            {!!o.badge && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-rav px-1 font-mono text-[10px] font-bold text-white">
                {o.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Chip({
  children,
  tone = 'neutral',
  className,
  title,
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'bad' | 'rav' | 'petrol'
  className?: string
  title?: string
}) {
  const tones = {
    neutral: 'bg-blekk/[0.06] text-blekk-2',
    good: 'bg-skog-soft text-skog',
    bad: 'bg-fare-soft text-fare',
    rav: 'bg-rav-soft text-rav-2',
    petrol: 'bg-petrol-soft text-petrol',
  }
  return (
    <span
      title={title}
      className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] leading-none font-bold', tones[tone], className)}
    >
      {children}
    </span>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3 px-0.5">
      <h3 className="etikett">{children}</h3>
      {right}
    </div>
  )
}

/** Valuta-ikon + tall i mono. */
export function Amount({
  kind,
  children,
  className,
  size = 14,
}: {
  kind: 'budget' | 'fagpoeng' | 'kaffekopper'
  children: ReactNode
  className?: string
  size?: number
}) {
  const icon: IconName = kind === 'budget' ? 'kr' : kind === 'fagpoeng' ? 'fag' : 'kaffe'
  const color = kind === 'budget' ? 'text-petrol' : kind === 'fagpoeng' ? 'text-skog' : 'text-rav-2'
  return (
    <span className={cx('inline-flex items-center gap-1 font-mono font-bold whitespace-nowrap', className)}>
      <Icon name={icon} size={size} className={color} />
      {children}
    </span>
  )
}
