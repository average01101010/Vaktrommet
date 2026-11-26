import { useState } from 'react'
import { PROFESSION_ORDER, PROFESSIONS } from '@/data/professions'
import { useGameState, useModifiers, shiftsByStaff } from '@/store/selectors'
import type { StaffId } from '@/types'
import { Chip, Segmented } from '../ui/bits'
import { IdCard, statusOf, type StaffStatus } from './IdCard'
import { RecruitPanel } from './RecruitPanel'
import { RosterPlanner } from './RosterPlanner'
import { StaffDetailSheet } from './StaffDetailSheet'

type View = 'plan' | 'stab' | 'rekruttering'

export function StaffTab() {
  const [view, setView] = useState<View>('plan')
  const [openStaff, setOpenStaff] = useState<StaffId | null>(null)

  return (
    <div className="space-y-4">
      <Segmented<View>
        value={view}
        onChange={setView}
        options={[
          { id: 'plan', label: 'Vaktplan', icon: 'turnus' },
          { id: 'stab', label: 'Ansatte', icon: 'folk' },
          { id: 'rekruttering', label: 'Rekruttering', icon: 'stjerner' },
        ]}
      />
      {view === 'plan' && <RosterPlanner onOpenStaff={setOpenStaff} />}
      {view === 'stab' && <StaffList onOpenStaff={setOpenStaff} />}
      {view === 'rekruttering' && <RecruitPanel onOpenStaff={setOpenStaff} />}
      <StaffDetailSheet staffId={openStaff} onClose={() => setOpenStaff(null)} />
    </div>
  )
}

function StaffList({ onOpenStaff }: { onOpenStaff: (id: StaffId) => void }) {
  const game = useGameState()
  const mods = useModifiers()
  const onShifts = shiftsByStaff(game, mods)
  const all = game.staffOrder.map((id) => game.staff[id])
  const count = (status: StaffStatus) => all.filter((s) => statusOf(s, game.minute) === status).length
  const sick = count('syk')
  const away = count('borte')
  const gradert = count('gradert')
  const course = count('kurs')
  const stressed = count('stresset')
  const announced = all.filter((s) => s.absence && s.absence.startsAt > game.minute).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PROFESSION_ORDER.map((p) => (
          <Chip key={p}>
            <span className="h-2 w-2 rounded-full" style={{ background: PROFESSIONS[p].color }} />
            {PROFESSIONS[p].name}
            <span className="font-mono">{all.filter((s) => s.profession === p).length}</span>
          </Chip>
        ))}
        {sick > 0 && <Chip tone="bad">Sykefravær {sick}</Chip>}
        {gradert > 0 && <Chip tone="rav">Gradert {gradert}</Chip>}
        {away > 0 && <Chip tone="petrol">Permisjon {away}</Chip>}
        {announced > 0 && <Chip tone="rav">Varslet permisjon {announced}</Chip>}
        {stressed > 0 && <Chip tone="rav">Høyt stress {stressed}</Chip>}
        {course > 0 && <Chip tone="petrol">På kurs {course}</Chip>}
      </div>
      <p className="px-0.5 text-[12.5px] text-blekk-3">Trykk på et ID-kort for kurs, detaljer og status.</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {all.map((s) => (
          <IdCard key={s.id} staff={s} shifts={onShifts[s.id]} onClick={() => onOpenStaff(s.id)} />
        ))}
      </div>
    </div>
  )
}
