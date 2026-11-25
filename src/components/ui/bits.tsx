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

/** Av/på-bryter med ledetekst. */
export function Toggle({
  checked,
  onChange,
  icon,
  label,
  description,
  disabled = false,
  id,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  icon: IconName
  label: string
  description?: ReactNode
  disabled?: boolean
  id: string
}) {
  return (
    <div className="flex items-start gap-3 px-3.5 py-3">
      <span className={cx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl', checked ? 'bg-skog-soft text-skog' : 'bg-blekk/[0.06] text-blekk-3')}>
        <Icon name={icon} size={17} />
      </span>
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[14px] leading-tight font-extrabold">{label}</span>
        {description && <span className="mt-0.5 block text-[12px] leading-snug text-blekk-2">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40',
          checked ? 'bg-skog' : 'bg-blekk/20',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-papir shadow-[0_1px_3px_rgb(28_37_38/0.35)] transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}
