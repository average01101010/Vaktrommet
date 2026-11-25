import { useState } from 'react'
import { BottomNav, type TabId } from '@/components/layout/BottomNav'
import { DiscoverySheet } from '@/components/layout/DiscoverySheet'
import { AdOverlay, OfflineReportSheet, Onboarding, Toasts } from '@/components/layout/Overlays'
import { TopBar } from '@/components/layout/TopBar'
import { LeagueTab } from '@/components/league/LeagueTab'
import { StaffTab } from '@/components/staff/StaffTab'
import { UpgradesTab } from '@/components/upgrades/UpgradesTab'
import { WardTab } from '@/components/ward/WardTab'
import { INSPECTION_TIERS } from '@/data/balance'
import { UPGRADES } from '@/data/upgrades'
import { inspectionQualified, streakStatus, upgradeStatus } from '@/engine/actions'
import { inspectionAverage } from '@/engine/simulation'
import { useGame } from '@/store/gameStore'
import { useGameLoop } from '@/store/useGameLoop'

export default function App() {
  useGameLoop()
  const [tab, setTab] = useState<TabId>('avdelingen')
  const game = useGame((s) => s.game)
  const offlineOpen = useGame((s) => s.offlineReport !== null)

  // Små varsler i bunnmenyen: ting som venter på spilleren.
  const sick = game.staffOrder.filter((id) => game.staff[id].sickUntil !== null).length
  const affordable = UPGRADES.filter((u) => {
    const st = upgradeStatus(game, u)
    return !st.locked && !st.maxed && st.affordable
  }).length
  const average = inspectionAverage(game)
  const inspection = inspectionQualified(game)
    ? INSPECTION_TIERS.filter((t, i) => average >= t.score && !game.inspection.claimed.includes(i)).length
    : 0

  return (
    <div className="min-h-dvh overflow-x-clip">
      <TopBar />
      <main className="mx-auto max-w-6xl pr-[max(1rem,env(safe-area-inset-right,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pt-4 pb-28 sm:px-5">
        <div key={tab} className="animate-inn">
          {tab === 'avdelingen' && <WardTab onGoToRoster={() => setTab('turnus')} />}
          {tab === 'turnus' && <StaffTab />}
          {tab === 'utstyr' && <UpgradesTab />}
          {tab === 'tilsyn' && <LeagueTab />}
        </div>
      </main>
      <BottomNav
        active={tab}
        onChange={(t) => {
          setTab(t)
          window.scrollTo({ top: 0 })
        }}
        badges={{
          avdelingen: game.dilemmas.active.length + (streakStatus(game, Date.now()).canCheckIn ? 1 : 0),
          turnus: sick,
          utstyr: affordable,
          tilsyn: inspection,
        }}
      />
      <Onboarding />
      <OfflineReportSheet />
      <DiscoverySheet blocked={!game.profile.onboarded || offlineOpen} />
      <AdOverlay />
      <Toasts />
    </div>
  )
}
