import { useEffect, useRef, useState } from 'react'
import { TIERS } from '@/data/balance'
import { WARD_TYPES } from '@/data/wards'
import { parseSave, type ParsedSave } from '@/engine/actions'
import { cx } from '@/lib/format'
import { copyText, downloadText, fileSizeText, readFileText } from '@/lib/transfer'
import { getAccount, isAccountLinkingAvailable, requestAccountLink, signOut, type Account } from '@/services/auth'
import { useGame } from '@/store/gameStore'
import { useGameState } from '@/store/selectors'
import { Chip } from '../ui/bits'
import { Icon } from '../ui/Icon'

export function AccountPanel({ onDone }: { onDone: () => void }) {
  return (
    <div className="space-y-5">
      <AccountCard />
      <BackupCard onDone={onDone} />
      <ResetCard onDone={onDone} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kontostatus
// ---------------------------------------------------------------------------

function AccountCard() {
  const [account, setAccount] = useState<Account>({ status: 'local' })
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    void getAccount().then((a) => alive && setAccount(a))
    return () => {
      alive = false
    }
  }, [])

  const signedIn = account.status === 'signedIn'
  return (
    <section>
      <h3 className="etikett mb-2">Konto</h3>
      <div className="kort p-3.5">
        <div className="flex items-center gap-3">
          <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', signedIn ? 'bg-skog-soft text-skog' : 'bg-blekk/[0.06] text-blekk-2')}>
            <Icon name="bruker" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-extrabold">{signedIn ? account.email : 'Spiller lokalt og anonymt'}</div>
            <div className="text-[12px] leading-snug text-blekk-2">
              {signedIn
                ? 'Innlogget. Lagringen ligger fortsatt bare på denne enheten.'
                : 'Lagringen ligger bare i nettleseren på denne enheten.'}
            </div>
          </div>
          <Chip tone={signedIn ? 'good' : 'neutral'} className="shrink-0">
            {signedIn ? 'Innlogget' : 'Lokal'}
          </Chip>
        </div>

        {signedIn ? (
          <button
            className="knapp knapp-lys mt-3 w-full"
            onClick={() => void signOut().then(() => setAccount({ status: 'local' }))}
          >
            Logg ut
          </button>
        ) : (
          <button className="knapp knapp-lys mt-3 w-full" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <Icon name="bruker" size={15} /> Koble til konto
          </button>
        )}

        {open && !signedIn && (
          <div className="mt-3 animate-inn rounded-xl bg-blekk/[0.04] p-3">
            {isAccountLinkingAvailable ? (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  setBusy(true)
                  void requestAccountLink(email).then((r) => {
                    setBusy(false)
                    setMessage(
                      r.ok
                        ? { tone: 'good', text: 'Vi har sendt en innloggingslenke. Åpne den på denne enheten.' }
                        : { tone: 'bad', text: r.reason },
                    )
                  })
                }}
              >
                <label htmlFor="konto-epost" className="etikett">
                  E-post
                </label>
                <input
                  id="konto-epost"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="navn@eksempel.no"
                  className="w-full rounded-xl border border-blekk/15 bg-papir px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-skog"
                />
                <button className="knapp knapp-primar w-full" disabled={busy || !email.trim()}>
                  {busy ? 'Sender …' : 'Send innloggingslenke'}
                </button>
                {message && (
                  <p className={cx('text-[12px] font-semibold', message.tone === 'good' ? 'text-skog' : 'text-fare')}>{message.text}</p>
                )}
                <p className="text-[11.5px] leading-snug text-blekk-3">
                  Synkronisering av lagring mellom enheter er ikke aktivert ennå. Bruk eksport og import under inntil videre.
                </p>
              </form>
            ) : (
              <p className="text-[12.5px] leading-snug text-blekk-2">
                Innlogging med e-post kommer sammen med ekte topplister og synkronisering mellom enheter. Inntil da kan du flytte
                spillet med eksport og import under.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Eksport og import
// ---------------------------------------------------------------------------

function BackupCard({ onDone }: { onDone: () => void }) {
  const game = useGameState()
  const exportSave = useGame((s) => s.exportSave)
  const importSave = useGame((s) => s.importSave)
  const toast = useGame((s) => s.toast)
  const [showExport, setShowExport] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedSave | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const exportRef = useRef<HTMLTextAreaElement>(null)

  const filename = `vaktrommet-${game.profile.wardName.toLowerCase().replace(/[^a-z0-9æøå]+/gi, '-').replace(/^-|-$/g, '') || 'lagring'}.json`

  const copy = async () => {
    const json = exportSave()
    if (await copyText(json)) {
      toast(`Lagringen er kopiert (${fileSizeText(json.length)}).`, 'good')
    } else {
      // Nettleseren nektet: vis teksten så den kan merkes og kopieres for hånd.
      setShowExport(json)
      setTimeout(() => exportRef.current?.select(), 50)
    }
  }

  const check = (value: string) => {
    setText(value)
    setParsed(value.trim() ? parseSave(value, Date.now()) : null)
  }

  return (
    <section>
      <h3 className="etikett mb-2">Sikkerhetskopi</h3>
      <div className="kort space-y-3.5 p-3.5">
        <div>
          <div className="text-[14px] font-extrabold">Eksporter lagring</div>
          <p className="mt-0.5 text-[12px] leading-snug text-blekk-2">
            Ta en kopi før du bytter enhet, eller send den med når du melder en feil.
          </p>
          <div className={cx('mt-2 grid gap-2', __CAN_DOWNLOAD__ && 'grid-cols-2')}>
            <button className="knapp knapp-primar" onClick={() => void copy()}>
              <Icon name="kopier" size={15} /> Kopier
            </button>
            {__CAN_DOWNLOAD__ && (
              <button
                className="knapp knapp-lys"
                onClick={() => {
                  downloadText(filename, exportSave())
                  toast('Nedlastingen er startet. Skjer det ingenting, bruk «Kopier».', 'info')
                }}
              >
                <Icon name="nedlast" size={15} /> Last ned fil
              </button>
            )}
          </div>
          {showExport !== null && (
            <div className="mt-2 animate-inn">
              <p className="mb-1 text-[11.5px] font-semibold text-rav-2">
                Nettleseren tillot ikke automatisk kopiering. Teksten er merket – kopier den selv.
              </p>
              <textarea
                ref={exportRef}
                id="eksport-tekst"
                readOnly
                value={showExport}
                rows={4}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-xl border border-blekk/15 bg-papir p-2.5 font-mono text-[10.5px] leading-snug outline-none"
              />
            </div>
          )}
        </div>

        <div className="border-t border-blekk/[0.07] pt-3.5">
          <div className="text-[14px] font-extrabold">Importer lagring</div>
          <p className="mt-0.5 text-[12px] leading-snug text-blekk-2">Lim inn en eksportert lagring, eller velg fila. Eldre versjoner oppgraderes automatisk.</p>
          <textarea
            id="import-tekst"
            value={text}
            onChange={(e) => check(e.target.value)}
            rows={3}
            placeholder='{"app":"vaktrommet", …}'
            spellCheck={false}
            className="mt-2 w-full rounded-xl border border-blekk/15 bg-papir p-2.5 font-mono text-[10.5px] leading-snug outline-none focus:border-skog"
          />
          <input
            ref={fileRef}
            id="import-fil"
            type="file"
            accept=".json,application/json,text/plain"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              void readFileText(file)
                .then(check)
                .catch(() => toast('Kunne ikke lese fila.', 'bad'))
            }}
          />
          <button className="knapp knapp-lys mt-2 w-full" onClick={() => fileRef.current?.click()}>
            <Icon name="opplast" size={15} /> Velg fil
          </button>

          {parsed && !parsed.ok && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-fare-soft px-3 py-2 text-[12px] font-semibold text-fare">
              <Icon name="avvik" size={14} className="mt-px shrink-0" /> {parsed.reason}
            </p>
          )}
          {parsed?.ok && (
            <div className="mt-2 animate-inn rounded-xl border border-skog/20 bg-skog-soft/50 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-skog uppercase">
                <Icon name="hake" size={13} /> Gyldig lagring
              </div>
              <div className="mt-1 text-[14.5px] font-extrabold">{parsed.summary.wardName}</div>
              <div className="text-[12px] text-blekk-2">
                {WARD_TYPES[parsed.summary.wardType].name} · nivå {parsed.summary.tier + 1} ({TIERS[parsed.summary.tier].name}) · døgn{' '}
                {parsed.summary.day} · {parsed.summary.staff} ansatte
                {parsed.summary.rotations > 0 && ` · ${parsed.summary.rotations} overlevert`}
              </div>
              <div className="mt-0.5 font-mono text-[10.5px] text-blekk-3">
                format v{parsed.summary.sourceVersion}
                {parsed.summary.exportedAt && ` · eksportert ${new Date(parsed.summary.exportedAt).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })}`}
              </div>
              <p className="mt-2 text-[12px] font-bold text-rav-2">Dette erstatter spillet du har på denne enheten nå.</p>
              <button
                className="knapp knapp-rav mt-2 w-full"
                onClick={() => {
                  if (importSave(text)) {
                    setText('')
                    setParsed(null)
                    onDone()
                  }
                }}
              >
                Erstatt nåværende spill
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Nullstilling
// ---------------------------------------------------------------------------

function ResetCard({ onDone }: { onDone: () => void }) {
  const resetGame = useGame((s) => s.resetGame)
  const wardName = useGame((s) => s.game.profile.wardName)
  const [step, setStep] = useState<0 | 1 | 2>(0)

  return (
    <section>
      <h3 className="etikett mb-2">Faresone</h3>
      <div className={cx('rounded-[1.1rem] border p-3.5 transition-colors', step > 0 ? 'border-fare/40 bg-fare-soft/60' : 'border-blekk/[0.07] bg-papir')}>
        {step === 0 && (
          <>
            <p className="text-[12.5px] leading-snug text-blekk-2">
              Sletter avdelingen, staben, renommé og fagbøker, og starter helt på nytt. Kan ikke angres.
            </p>
            <button className="knapp mt-2.5 w-full border border-fare/40 bg-papir text-fare" onClick={() => setStep(1)}>
              <Icon name="soppel" size={15} /> Nullstill spill
            </button>
          </>
        )}
        {step === 1 && (
          <div className="animate-inn">
            <div className="text-[14px] font-extrabold text-fare">Nullstille {wardName}?</div>
            <ul className="mt-1.5 space-y-1 text-[12.5px] leading-snug text-blekk">
              <li>
                <b>Slettes:</b> all framdrift, ansatte, oppgraderinger, Kaffekopper, renommé og fagbøker.
              </li>
              <li>
                <b>Beholdes:</b> innstillinger og aktive medlemskap.
              </li>
            </ul>
            <p className="mt-1.5 text-[12px] text-blekk-2">Eksporter lagringen først hvis du vil kunne angre.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="knapp knapp-lys" onClick={() => setStep(0)}>
                Avbryt
              </button>
              <button className="knapp border border-fare/40 bg-papir text-fare" onClick={() => setStep(2)}>
                Fortsett
              </button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="animate-inn">
            <div className="text-[14px] font-extrabold text-fare">Siste bekreftelse</div>
            <p className="mt-1 text-[12.5px] leading-snug text-blekk">Dette kan ikke angres. Spillet starter på nytt med en gang.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="knapp knapp-lys" onClick={() => setStep(0)}>
                Behold spillet
              </button>
              <button
                className="knapp bg-fare text-white shadow-[0_3px_0_#8c3324]"
                onClick={() => {
                  resetGame()
                  setStep(0)
                  onDone()
                }}
              >
                Ja, slett alt
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
