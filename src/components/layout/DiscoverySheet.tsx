import { BALANCE } from '@/data/balance'
import { BONUS_SYNERGIES, SYNERGY_BY_ID } from '@/data/synergies'
import { useGame } from '@/store/gameStore'
import { Amount } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'

/** Feiring når en ny synergi er oppdaget. Vises til den er kvittert ut. */
export function DiscoverySheet({ blocked }: { blocked: boolean }) {
  const unseen = useGame((s) => s.game.discoveries.unseen)
  const found = useGame((s) => s.game.discoveries.synergies.length)
  const acknowledge = useGame((s) => s.acknowledgeDiscoveries)
  const defs = unseen.map((id) => SYNERGY_BY_ID[id]).filter(Boolean)
  if (blocked || defs.length === 0) return null

  return (
    <Sheet open onClose={acknowledge} title={defs.length === 1 ? 'Ny synergi oppdaget!' : `${defs.length} nye synergier oppdaget!`}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-skog to-petrol px-4 py-5 text-center text-krem">
        {/* Gnister */}
        {[
          ['10%', '14%', 0],
          ['84%', '18%', 0.5],
          ['3%', '62%', 1],
          ['91%', '58%', 1.4],
          ['30%', '6%', 0.8],
        ].map(([left, top, delay]) => (
          <Icon
            key={`${left}${top}`}
            name="stjerner"
            size={18}
            className="absolute animate-puls text-[#F0C36A]"
            style={{ left, top, animationDelay: `${delay}s` }}
          />
        ))}
        <div className="relative mx-auto grid h-14 w-14 animate-pop place-items-center rounded-full bg-white/15">
          <Icon name="stjerner" size={28} />
        </div>
        <p className="relative mt-2 text-[13px] font-semibold opacity-90">
          Laget ditt traff en kombinasjon som virker. Den står nå i oppdagelsesboka.
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {defs.map((s, i) => (
          <div key={s.id} className="kort animate-inn p-3.5" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="flex items-start justify-between gap-2">
              <div className="text-[15.5px] font-extrabold tracking-tight">{s.name}</div>
              <Amount kind="kaffekopper" className="shrink-0 rounded-full bg-rav-soft px-2 py-0.5 text-[12px] text-rav-2">
                +{BALANCE.discoveryKaffekopper}
              </Amount>
            </div>
            <p className="mt-0.5 text-[13px] leading-snug text-blekk-2">{s.description}</p>
            <p className="mt-1.5 text-[12px] font-bold text-skog">{s.recipe}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center font-mono text-[11px] font-semibold text-blekk-3">
        Oppdaget {found} av {BONUS_SYNERGIES.length}
      </p>
      <button className="knapp knapp-primar mt-3 w-full" onClick={acknowledge}>
        Flott!
      </button>
    </Sheet>
  )
}
