import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '@/lib/format'
import { Icon } from './Icon'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  /** Skjul lukkeknapp/klikk-utenfor (f.eks. under obligatoriske valg). */
  locked?: boolean
  className?: string
}

/** Bunnark på mobil, sentrert dialog på større skjermer. */
export function Sheet({ open, onClose, title, children, locked = false, className }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, locked, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 animate-inn bg-blekk/45 backdrop-blur-[2px]"
        onClick={locked ? undefined : onClose}
      />
      <div
        className={cx(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.6rem] bg-krem shadow-loft animate-opp sm:max-w-lg sm:rounded-[1.6rem] sm:animate-inn',
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-blekk/15 sm:hidden" />
        {(title || !locked) && (
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-2">
            <h2 className="text-lg leading-tight font-extrabold tracking-tight text-blekk">{title}</h2>
            {!locked && (
              <button
                onClick={onClose}
                aria-label="Lukk"
                className="-mt-1 -mr-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-blekk-2 hover:bg-blekk/5"
              >
                <Icon name="kryss" size={18} />
              </button>
            )}
          </div>
        )}
        <div className="no-scrollbar overflow-y-auto px-5 pb-6 pb-safe">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
