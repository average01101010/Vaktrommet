import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { RARITY, SHIFT_ORDER, SHIFTS } from '@/data/balance'
import { PROFESSIONS, SKILL_ORDER, SKILLS, TRAITS } from '@/data/professions'
import { cx } from '@/lib/format'
import type { Rarity, ShiftId, SkillId, StaffMember } from '@/types'
import { Meter } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { Avatar } from './Avatar'

const RARITY_STYLE: Record<Rarity, { ring: string; label: string; stars: number; foil: boolean }> = {
  vanlig: { ring: 'transparent', label: 'text-blekk-3', stars: 1, foil: false },
  erfaren: { ring: '#2B5B6C', label: 'text-petrol', stars: 2, foil: false },
  spesialist: { ring: '#D97736', label: 'text-rav-2', stars: 3, foil: true },
  ildsjel: { ring: '#E3B341', label: 'text-[#9A6B00]', stars: 4, foil: true },
}

export const topSkills = (s: StaffMember, n = 3): SkillId[] =>
  [...SKILL_ORDER].filter((id) => s.skills[id] > 0).sort((a, b) => s.skills[b] - s.skills[a]).slice(0, n)

export function SkillPips({
  level,
  color,
  max = 5,
  cap = max,
  compact = false,
}: {
  level: number
  color: string
  max?: number
  /** Egenskapstaket for den ansatte – nivåer over taket vises som låst. */
  cap?: number
  /** Litt mindre ruter, for de smale kortene. */
  compact?: boolean
}) {
  return (
    <span className={cx('inline-flex', compact ? 'gap-[1.5px]' : 'gap-[2px]')} aria-label={`Nivå ${level} av ${cap}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cx(
            'rounded-[2px]',
            compact ? 'h-[6px] w-[6px]' : 'h-[7px] w-[7px]',
            i >= cap && i >= level && 'border border-dashed border-blekk/25',
          )}
          style={{ background: i < level ? color : i >= cap ? 'transparent' : 'rgb(28 37 38 / 0.1)' }}
        />
      ))}
    </span>
  )
}

export function statusOf(s: StaffMember): 'syk' | 'kurs' | 'sliten' | 'stresset' | 'ok' {
  if (s.sickUntil !== null) return 'syk'
  if (s.course) return 'kurs'
  if (s.stress >= 65) return 'stresset'
  if (s.energy < 20) return 'sliten'
  return 'ok'
}

function Lanyard({ color, mini = false }: { color: string; mini?: boolean }) {
  return (
    <>
      <div
        className={cx('nokkelband absolute left-1/2 -translate-x-1/2 rounded-b-[3px]', mini ? 'top-0 h-4 w-2.5' : 'top-0 h-6 w-4')}
        style={{ backgroundColor: color }}
      />
      <div
        className={cx(
          'absolute left-1/2 z-10 -translate-x-1/2 rounded-[3px] border border-blekk/25 bg-gradient-to-b from-[#f3f4f4] to-[#b9c0c1] shadow-sm',
          mini ? 'top-[11px] h-[7px] w-4' : 'top-[18px] h-[10px] w-6',
        )}
      />
    </>
  )
}

function Stamp({ status }: { status: 'syk' | 'kurs' }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[7] grid place-items-center">
      <div
        className={cx(
          'rotate-[-14deg] rounded-md border-[2.5px] px-2 py-0.5 font-mono text-[11px] font-extrabold tracking-[0.18em] uppercase',
          status === 'syk' ? 'border-fare bg-fare-soft/80 text-fare' : 'border-petrol bg-petrol-soft/85 text-petrol',
        )}
      >
        {status === 'syk' ? 'Sykmeldt' : 'På kurs'}
      </div>
    </div>
  )
}

interface IdCardProps {
  staff: StaffMember
  /** Vaktene den ansatte står på. */
  shifts?: ShiftId[]
  selected?: boolean
  dimmed?: boolean
  onClick?: () => void
  onPointerDown?: (e: ReactPointerEvent<HTMLElement>) => void
  className?: string
  style?: CSSProperties
}

/** Laminert ID-kort med nøkkelbånd – full størrelse. */
export function IdCard({ staff: s, shifts = [], selected, dimmed, onClick, onPointerDown, className, style }: IdCardProps) {
  const prof = PROFESSIONS[s.profession]
  const rar = RARITY_STYLE[s.rarity]
  const status = statusOf(s)
  const [first, ...rest] = s.name.split(' ')
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={style}
      className={cx(
        'group relative block w-full pt-[22px] text-left transition-transform duration-200 select-none',
        onClick && 'hover:-translate-y-0.5 active:translate-y-0',
        selected && '-translate-y-1.5',
        dimmed && 'opacity-55',
        className,
      )}
    >
      <Lanyard color={prof.color} />
      <div
        className={cx('laminat', rar.foil && 'laminat-foil')}
        style={{
          boxShadow: selected
            ? '0 0 0 3px #D97736, 0 14px 22px -10px rgb(217 119 54 / 0.7)'
            : rar.ring !== 'transparent'
              ? `0 0 0 2px ${rar.ring}, 0 0 0 5px rgb(255 255 255 / 0.5), 0 10px 18px -10px rgb(28 37 38 / 0.4)`
              : undefined,
        }}
      >
        {/* Hull til klypa */}
        <div className="mx-auto mt-[5px] h-[5px] w-7 rounded-full bg-blekk/20 shadow-[inset_0_1px_1px_rgb(0_0_0/0.25)]" />

        {/* Topptekst */}
        <div
          className="mt-[5px] flex items-center justify-between px-2.5 py-[5px] text-[9px] font-extrabold tracking-[0.14em] text-white/95 uppercase"
          style={{ background: `linear-gradient(90deg, ${prof.color}, ${prof.color}dd)` }}
        >
          <span>{prof.name}</span>
          <span className="font-mono tracking-normal opacity-90">N{s.level}</span>
        </div>

        <div className="flex gap-2.5 px-2.5 pt-2.5">
          <div className="w-[42%] shrink-0 overflow-hidden rounded-lg border border-blekk/10 shadow-[inset_0_1px_2px_rgb(0_0_0/0.15)]">
            <Avatar avatar={s.avatar} profession={s.profession} className="block w-full" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="truncate text-[15px] leading-[1.1] font-extrabold tracking-tight text-blekk">{first}</div>
            <div className="truncate text-[11.5px] leading-tight font-semibold text-blekk-2">{rest.join(' ')}</div>
            <div className={cx('mt-1.5 flex items-center gap-0.5 text-[9.5px] font-bold tracking-wide uppercase', rar.label)}>
              <span aria-hidden className="tracking-[-0.05em]">{'★'.repeat(rar.stars)}</span>
              <span className="ml-1">{RARITY[s.rarity].name}</span>
            </div>
            {s.trait && (
              <div className="mt-1 truncate text-[10px] font-semibold text-blekk-3" title={TRAITS[s.trait].description}>
                {TRAITS[s.trait].name}
              </div>
            )}
          </div>
        </div>

        {/* Egenskaper */}
        <div className="mt-2 space-y-[3px] px-2.5">
          {topSkills(s).map((id) => (
            <div key={id} className="flex items-center justify-between gap-2">
              <span className="truncate text-[10.5px] font-semibold text-blekk-2">{SKILLS[id].short}</span>
              <SkillPips level={s.skills[id]} color={SKILLS[id].color} />
            </div>
          ))}
        </div>

        {/* Energi og stress */}
        <div className="mt-2 grid grid-cols-2 gap-2 px-2.5">
          <div>
            <div className="mb-[3px] flex items-center justify-between text-[8.5px] font-bold tracking-wider text-blekk-3 uppercase">
              <span>Energi</span>
              <span className="font-mono">{Math.round(s.energy)}</span>
            </div>
            <Meter value={s.energy} max={s.stamina} color={s.energy < 20 ? '#B4432F' : '#2A6453'} height={4} />
          </div>
          <div>
            <div className="mb-[3px] flex items-center justify-between text-[8.5px] font-bold tracking-wider text-blekk-3 uppercase">
              <span>Stress</span>
              <span className="font-mono">{Math.round(s.stress)}</span>
            </div>
            <Meter value={s.stress} color={s.stress >= 65 ? '#B4432F' : s.stress >= 40 ? '#D97736' : '#7D8788'} height={4} />
          </div>
        </div>

        {/* Bunnlinje: strekkode, ansattnr. og vakter */}
        <div className="mt-2 flex items-end justify-between gap-2 px-2.5 pb-2">
          <div>
            <div
              className="h-3 w-14 opacity-70"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg,#1C2526 0 1px,transparent 1px 3px,#1C2526 3px 5px,transparent 5px 6px,#1C2526 6px 7px,transparent 7px 10px)',
              }}
            />
            <div className="mt-px font-mono text-[8.5px] tracking-wider text-blekk-3">#{s.badgeNo}</div>
          </div>
          <div className="flex gap-[3px]">
            {SHIFT_ORDER.map((sh) => (
              <span
                key={sh}
                title={SHIFTS[sh].name}
                className={cx(
                  'grid h-[17px] w-[17px] place-items-center rounded-[5px] font-mono text-[9px] font-bold',
                  shifts.includes(sh) ? 'bg-skog text-krem' : 'bg-blekk/[0.07] text-blekk/30',
                )}
              >
                {SHIFTS[sh].short[0]}
              </span>
            ))}
          </div>
        </div>

        {(status === 'syk' || status === 'kurs') && <Stamp status={status} />}
      </div>
    </Tag>
  )
}

/** Kompakt ID-kort for vaktplassene i turnusen. */
export function MiniIdCard({
  staff: s,
  selected,
  onClick,
  onPointerDown,
  className,
  style,
}: Omit<IdCardProps, 'shifts' | 'dimmed'>) {
  const prof = PROFESSIONS[s.profession]
  const rar = RARITY_STYLE[s.rarity]
  const status = statusOf(s)
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={style}
      className={cx('relative block w-full pt-[14px] text-left select-none', className)}
    >
      <Lanyard color={prof.color} mini />
      <div
        className="laminat !rounded-[0.7rem]"
        style={{
          boxShadow: selected
            ? '0 0 0 2.5px #D97736, 0 10px 16px -8px rgb(217 119 54 / 0.7)'
            : rar.ring !== 'transparent'
              ? `0 0 0 1.5px ${rar.ring}, 0 8px 14px -9px rgb(28 37 38 / 0.45)`
              : undefined,
        }}
      >
        <div className="h-[5px]" style={{ background: prof.color }} />
        <div className="px-1.5 pt-1.5">
          <div className="overflow-hidden rounded-md border border-blekk/10">
            <Avatar avatar={s.avatar} profession={s.profession} className="block w-full" />
          </div>
        </div>
        <div className="px-1.5 pt-1 pb-1.5">
          <div className="truncate text-center text-[11px] leading-tight font-extrabold tracking-tight">{s.name.split(' ')[0]}</div>
          <div className="mt-0.5 text-center font-mono text-[8.5px] font-bold tracking-wider" style={{ color: prof.color }}>
            {prof.short}
          </div>
          <div className="mt-1 space-y-[2px]">
            <Meter value={s.energy} max={s.stamina} color={s.energy < 20 ? '#B4432F' : '#2A6453'} height={3} />
            <Meter value={s.stress} color={s.stress >= 65 ? '#B4432F' : s.stress >= 40 ? '#D97736' : '#A7AEAF'} height={3} />
          </div>
        </div>
        {(status === 'syk' || status === 'kurs') && (
          <div className="pointer-events-none absolute inset-0 z-[7] grid place-items-center bg-papir/45">
            <span
              className={cx(
                'rotate-[-12deg] rounded border-2 px-1 font-mono text-[8.5px] font-extrabold tracking-widest uppercase',
                status === 'syk' ? 'border-fare bg-fare-soft text-fare' : 'border-petrol bg-petrol-soft text-petrol',
              )}
            >
              {status === 'syk' ? 'Syk' : 'Kurs'}
            </span>
          </div>
        )}
      </div>
    </Tag>
  )
}

/**
 * ID-kort for valg av nøkkelansatte: nivå, sjeldenhet, særtrekk og de to
 * sterkeste egenskapene – det du trenger for å velge riktig fagkompetanse.
 */
export function KeyStaffCard({
  staff: s,
  selected,
  onClick,
  skillCap,
  className,
}: {
  staff: StaffMember
  selected?: boolean
  onClick?: () => void
  /** Egenskapstaket for den ansatte. */
  skillCap: number
  className?: string
}) {
  const prof = PROFESSIONS[s.profession]
  const rar = RARITY_STYLE[s.rarity]
  const [first] = s.name.split(' ')
  const skills = topSkills(s, 2)
  const label = [
    s.name,
    prof.name,
    `nivå ${s.level}`,
    RARITY[s.rarity].name.toLowerCase(),
    s.trait && TRAITS[s.trait].name.toLowerCase(),
    ...skills.map((id) => `${SKILLS[id].name} ${s.skills[id]}`),
  ]
    .filter(Boolean)
    .join(', ')
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      className={cx(
        'relative block w-full pt-[14px] text-left transition-transform duration-200 select-none',
        selected ? '-translate-y-1' : 'hover:-translate-y-0.5',
        className,
      )}
    >
      <Lanyard color={prof.color} mini />
      <div
        className={cx('laminat !rounded-[0.8rem]', rar.foil && 'laminat-foil')}
        style={{
          boxShadow: selected
            ? '0 0 0 2.5px #D97736, 0 10px 16px -8px rgb(217 119 54 / 0.7)'
            : rar.ring !== 'transparent'
              ? `0 0 0 1.5px ${rar.ring}, 0 8px 14px -9px rgb(28 37 38 / 0.45)`
              : undefined,
        }}
      >
        <div
          className="flex items-center justify-between px-1.5 py-[3px] text-[8.5px] font-extrabold tracking-[0.12em] text-white/95"
          style={{ background: prof.color }}
        >
          <span>{prof.short}</span>
          <span className="font-mono text-[9.5px] tracking-normal">N{s.level}</span>
        </div>
        <div className="flex items-center gap-1.5 px-1.5 pt-1.5">
          <div className="w-[38%] shrink-0 overflow-hidden rounded-md border border-blekk/10">
            <Avatar avatar={s.avatar} profession={s.profession} className="block w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] leading-tight font-extrabold tracking-tight">{first}</div>
            <div className={cx('mt-px text-[10.5px] leading-tight tracking-[-0.05em]', rar.label)} title={RARITY[s.rarity].name}>
              {'★'.repeat(rar.stars)}
            </div>
          </div>
        </div>
        <div
          className={cx(
            'mx-1.5 mt-1.5 truncate rounded-[5px] px-1 py-[2px] text-center text-[9.5px] leading-tight font-bold',
            s.trait ? 'bg-skog/[0.08] text-skog' : 'text-blekk/30',
          )}
          title={s.trait ? TRAITS[s.trait].description : undefined}
        >
          {s.trait ? TRAITS[s.trait].name : 'Ingen særtrekk'}
        </div>
        <div className="mt-1.5 space-y-[3px] border-t border-blekk/[0.07] px-1.5 pt-1.5 pb-1.5">
          {skills.map((id) => (
            <div key={id} className="flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate text-[9.5px] font-semibold text-blekk-2">{SKILLS[id].short}</span>
              <SkillPips level={s.skills[id]} color={SKILLS[id].color} cap={skillCap} compact />
              <span className="w-[7px] text-right font-mono text-[9.5px] font-bold text-blekk">{s.skills[id]}</span>
            </div>
          ))}
        </div>
        {selected && (
          <div className="absolute top-[22px] right-1 z-[8] grid h-[18px] w-[18px] place-items-center rounded-full bg-rav text-white shadow-sm">
            <Icon name="hake" size={11} />
          </div>
        )}
      </div>
    </button>
  )
}

/** Tom vaktplass: en kortholder som venter på et ID-kort. */
export function EmptySlot({
  active,
  locked,
  onClick,
  label,
}: {
  active?: boolean
  locked?: boolean
  onClick?: () => void
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={cx(
        'relative block w-full pt-[14px] transition-transform',
        !locked && 'hover:-translate-y-0.5',
        active && '-translate-y-0.5',
      )}
    >
      <div
        className={cx(
          'grid aspect-[5/8] w-full place-items-center rounded-[0.7rem] border-2 border-dashed transition-colors',
          locked
            ? 'border-blekk/10 bg-blekk/[0.03] text-blekk/25'
            : active
              ? 'animate-puls border-rav bg-rav-soft/60 text-rav-2'
              : 'border-blekk/20 bg-papir/60 text-blekk/40 hover:border-skog/50 hover:text-skog',
        )}
      >
        <div className="flex flex-col items-center gap-1 px-1">
          <Icon name={locked ? 'las' : 'pluss'} size={18} />
          {label && <span className="text-center text-[9px] leading-tight font-bold">{label}</span>}
        </div>
      </div>
    </button>
  )
}
