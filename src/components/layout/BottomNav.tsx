import { cx } from '@/lib/format'
import { Icon, type IconName } from '../ui/Icon'

export type TabId = 'avdelingen' | 'turnus' | 'utstyr' | 'tilsyn'

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'avdelingen', label: 'Avdelingen', icon: 'avdeling' },
  { id: 'turnus', label: 'Turnus & Stab', icon: 'turnus' },
  { id: 'utstyr', label: 'Utstyr & Fag', icon: 'utstyr' },
  { id: 'tilsyn', label: 'Tilsyn & Toppliste', icon: 'tilsyn' },
]

export function BottomNav({
  active,
  onChange,
  badges,
}: {
  active: TabId
  onChange: (tab: TabId) => void
  badges: Partial<Record<TabId, number>>
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-blekk/10 bg-papir/95 pb-safe backdrop-blur-md" aria-label="Hovedmeny">
      <div className="mx-auto grid max-w-xl grid-cols-4 pr-[max(0.375rem,env(safe-area-inset-right,0px))] pl-[max(0.375rem,env(safe-area-inset-left,0px))]">
        {TABS.map((t) => {
          const on = t.id === active
          const badge = badges[t.id] ?? 0
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              aria-current={on ? 'page' : undefined}
              className="group relative flex flex-col items-center gap-0.5 px-1 pt-2 pb-1.5"
            >
              <span
                className={cx(
                  'relative grid h-8 w-14 place-items-center rounded-full transition-all duration-300',
                  on ? 'bg-skog text-krem shadow-[0_6px_12px_-6px_rgb(30_77_64/0.8)]' : 'text-blekk-2 group-hover:bg-blekk/5',
                )}
              >
                <Icon name={t.icon} size={20} />
                {badge > 0 && (
                  <span className="absolute -top-1 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rav px-1 font-mono text-[10px] font-bold text-white ring-2 ring-papir">
                    {badge}
                  </span>
                )}
              </span>
              <span className={cx('text-[10.5px] leading-tight font-bold tracking-tight whitespace-nowrap', on ? 'text-skog' : 'text-blekk-3')}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
