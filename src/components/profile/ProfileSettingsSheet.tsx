import { useEffect, useState } from 'react'
import { Segmented } from '../ui/bits'
import { Sheet } from '../ui/Sheet'
import { AccountPanel } from './AccountPanel'
import { ProfilePanel } from './ProfilePanel'
import { SettingsPanel } from './SettingsPanel'

type View = 'profil' | 'konto' | 'innstillinger'

/**
 * Profil & Innstillinger. Åpnes fra avdelingsnavnet i toppfeltet og samler
 * identitet og karriere, konto og sikkerhetskopi, og preferanser.
 */
export function ProfileSettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [view, setView] = useState<View>('profil')
  // Arket åpner alltid på profilen.
  useEffect(() => {
    if (open) setView('profil')
  }, [open])

  return (
    <Sheet open={open} onClose={onClose} title="Profil & Innstillinger" className="sm:max-w-xl">
      <div className="sticky top-0 z-10 -mx-5 mb-4 bg-krem px-5 pb-2">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { id: 'profil', label: 'Profil', icon: 'bruker' },
            { id: 'konto', label: 'Konto', icon: 'nedlast' },
            { id: 'innstillinger', label: 'Innstillinger', icon: 'tannhjul' },
          ]}
        />
      </div>
      {view === 'profil' && <ProfilePanel />}
      {view === 'konto' && <AccountPanel onDone={onClose} />}
      {view === 'innstillinger' && <SettingsPanel />}
    </Sheet>
  )
}
