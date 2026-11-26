import { useRef, useState } from 'react'
import { BALANCE } from '@/data/balance'
import { PASS_XP_PER_LEVEL, SEASON_PASS_LEVELS } from '@/data/economy'
import { LEGAL_UPDATED, PRIVACY, TERMS, type LegalSection } from '@/data/legal'
import { PUBLISHER } from '@/lib/contact'
import { passLevel } from '@/engine/actions'
import { cx } from '@/lib/format'
import {
  buildFeedbackReport,
  FEEDBACK_EMAIL,
  FEEDBACK_KINDS,
  feedbackMailto,
  technicalInfo,
  versionLabel,
  type FeedbackKind,
} from '@/lib/feedbackReport'
import { copyText } from '@/lib/transfer'
import { getPurchaseProvider } from '@/services/monetization'
import { notificationSupport, requestNotificationPermission } from '@/services/notifications'
import { useGame } from '@/store/gameStore'
import { useGameState } from '@/store/selectors'
import { Chip, Segmented, Toggle } from '../ui/bits'
import { Icon, type IconName } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'

export function SettingsPanel() {
  const [legal, setLegal] = useState<'personvern' | 'vilkar' | null>(null)
  const [feedback, setFeedback] = useState(false)
  return (
    <div className="space-y-5">
      <Preferences />
      <Memberships />
      <section>
        <h3 className="etikett mb-2">Om spillet</h3>
        <div className="kort divide-y divide-blekk/[0.06]">
          <div className="flex items-center gap-3 px-3.5 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-skog text-krem">
              <Icon name="kaffe" size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold">Vaktrommet</div>
              <div className="text-[11.5px] font-semibold text-blekk-2">Utgitt av {PUBLISHER}</div>
              <div className="font-mono text-[11px] font-semibold text-blekk-3">{versionLabel()}</div>
            </div>
          </div>
          <LinkRow icon="skjold" label="Personvern" onClick={() => setLegal('personvern')} />
          <LinkRow icon="mal" label="Brukervilkår" onClick={() => setLegal('vilkar')} />
          <LinkRow icon="melding" label="Send tilbakemelding / meld feil" onClick={() => setFeedback(true)} />
        </div>
      </section>

      <LegalSheet kind={legal} onClose={() => setLegal(null)} />
      <FeedbackSheet open={feedback} onClose={() => setFeedback(false)} />
    </div>
  )
}

function LinkRow({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-blekk/[0.03]">
      <Icon name={icon} size={18} className="shrink-0 text-blekk-2" />
      <span className="flex-1 text-[14px] font-bold">{label}</span>
      <Icon name="pil" size={15} className="shrink-0 text-blekk/30" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Preferanser
// ---------------------------------------------------------------------------

function Preferences() {
  const settings = useGame((s) => s.game.settings)
  const updateSettings = useGame((s) => s.updateSettings)
  const toast = useGame((s) => s.toast)
  const support = notificationSupport()
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator

  const toggleNotifications = async (next: boolean) => {
    if (!next) return updateSettings({ notifications: false })
    const result = await requestNotificationPermission()
    if (result === 'granted') {
      updateSettings({ notifications: true })
    } else {
      toast(
        result === 'unsupported'
          ? 'Denne nettleseren eller visningen støtter ikke varsler.'
          : 'Varsler er blokkert. Tillat dem i nettleserens innstillinger for siden.',
        'bad',
      )
    }
  }

  return (
    <section>
      <h3 className="etikett mb-2">Preferanser</h3>
      <div className="kort divide-y divide-blekk/[0.06]">
        <Toggle
          id="innst-lyd"
          icon="lyd"
          label="Lydeffekter"
          description="Korte, dempede lyder ved handlinger: kort som klikker på plass, lapper, stempel og ringesnor."
          checked={settings.sound}
          onChange={(next) => updateSettings({ sound: next })}
        />
        <Toggle
          id="innst-musikk"
          icon="lyd"
          label="Musikk og atmosfære"
          description="Rolig bakgrunnsmusikk som følger vakta og stemningen på avdelingen, og et lavt sus fra vaktrommet."
          checked={settings.music}
          onChange={(next) => updateSettings({ music: next })}
        />
        <Toggle
          id="innst-haptikk"
          icon="vibrer"
          label="Haptisk tilbakemelding"
          description={canVibrate ? 'Lett vibrasjon på mobil når du drar kort og bekrefter valg.' : 'Denne enheten eller nettleseren støtter ikke vibrasjon.'}
          checked={settings.haptics}
          onChange={(next) => updateSettings({ haptics: next })}
        />
        <Toggle
          id="innst-varsler"
          icon="bjelle"
          label="Varsler"
          description={
            <>
              Når offline-bufferen er full eller et kurs er ferdig.
              <span className="mt-1 block text-[11px] text-blekk-3">
                {support === 'unsupported'
                  ? 'Ikke støttet her. Prøv i nettleseren eller som installert app.'
                  : support === 'denied'
                    ? 'Blokkert i nettleseren for denne siden.'
                    : 'Virker mens appen ligger åpen i bakgrunnen. Varsler når den er helt lukket kommer senere.'}
              </span>
            </>
          }
          checked={settings.notifications && support === 'granted'}
          disabled={support === 'unsupported'}
          onChange={(next) => void toggleNotifications(next)}
        />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Medlemskap og kjøp
// ---------------------------------------------------------------------------

function Memberships() {
  const game = useGameState()
  const restorePurchases = useGame((s) => s.restorePurchases)
  const [busy, setBusy] = useState(false)
  const vip = game.monetization.vip
  const pass = game.monetization.seasonPass
  const level = passLevel(game)
  const isDemo = getPurchaseProvider().isDemo

  return (
    <section>
      <h3 className="etikett mb-2">Medlemskap og kjøp</h3>
      <div className="kort divide-y divide-blekk/[0.06]">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', vip ? 'bg-rav text-white' : 'bg-blekk/[0.06] text-blekk-3')}>
            <Icon name="stjerner" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-extrabold">Avdelingsleder Pluss</div>
            <div className="text-[12px] leading-snug text-blekk-2">
              Offline-buffer:{' '}
              <b className="font-mono text-blekk">{vip ? BALANCE.offlineCapHoursVip : BALANCE.offlineCapHours} timer</b>
              {vip ? ' · turnusmaler' : ` (${BALANCE.offlineCapHoursVip} timer med Pluss)`}
            </div>
          </div>
          <Chip tone={vip ? 'rav' : 'neutral'} className="shrink-0">
            {vip ? 'Aktiv' : 'Ikke aktiv'}
          </Chip>
        </div>
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', pass.premium ? 'bg-rav text-white' : 'bg-blekk/[0.06] text-blekk-3')}>
            <Icon name="pass" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-extrabold">Tilsynspasset</div>
            <div className="text-[12px] leading-snug text-blekk-2">
              Nivå <b className="font-mono text-blekk">{level}</b> av {SEASON_PASS_LEVELS.length} ·{' '}
              <span className="font-mono">{Math.floor(pass.xp % PASS_XP_PER_LEVEL)}/{PASS_XP_PER_LEVEL}</span> XP · sesong {pass.seasonId}
            </div>
          </div>
          <Chip tone={pass.premium ? 'rav' : 'neutral'} className="shrink-0">
            {pass.premium ? 'Betalt sti' : 'Gratis sti'}
          </Chip>
        </div>
        <div className="px-3.5 py-3">
          <button
            className="knapp knapp-lys w-full"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void restorePurchases().finally(() => setBusy(false))
            }}
          >
            <Icon name="bytt" size={15} /> {busy ? 'Sjekker …' : 'Gjenopprett kjøp'}
          </button>
          <p className="mt-2 text-[11.5px] leading-snug text-blekk-3">
            Gjenoppretter medlemskap fra tidligere kjøp. Nye kjøp gjør du i butikken under Tilsyn & Toppliste.
            {isDemo && ' Testmodus: ingen betaling gjennomføres.'}
          </p>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Personvern og vilkår
// ---------------------------------------------------------------------------

function LegalSheet({ kind, onClose }: { kind: 'personvern' | 'vilkar' | null; onClose: () => void }) {
  const sections: LegalSection[] = kind === 'vilkar' ? TERMS : PRIVACY
  return (
    <Sheet open={kind !== null} onClose={onClose} title={kind === 'vilkar' ? 'Brukervilkår' : 'Personvern'}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone="petrol">{PUBLISHER}</Chip>
        <Chip className="font-mono">Sist endret {LEGAL_UPDATED}</Chip>
      </div>
      <div className="mt-3 space-y-4">
        {sections.map((s) => (
          <section key={s.heading}>
            <h3 className="text-[14.5px] font-extrabold tracking-tight">{s.heading}</h3>
            {s.body.map((p) => (
              <p key={p} className="mt-1 max-w-prose text-[13.5px] leading-relaxed text-blekk-2">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
      <button className="knapp knapp-primar mt-5 w-full" onClick={onClose}>
        Lukk
      </button>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Tilbakemelding
// ---------------------------------------------------------------------------

function FeedbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const game = useGameState()
  const exportSave = useGame((s) => s.exportSave)
  const toast = useGame((s) => s.toast)
  const [kind, setKind] = useState<FeedbackKind>('feil')
  const [message, setMessage] = useState('')
  const [withTech, setWithTech] = useState(true)
  const [withSave, setWithSave] = useState(false)
  const [manual, setManual] = useState<string | null>(null)
  const manualRef = useRef<HTMLTextAreaElement>(null)
  if (!open) return null

  const build = (includeSave: boolean) =>
    buildFeedbackReport({
      kind,
      message,
      tech: withTech ? technicalInfo(game) : null,
      save: includeSave && withSave ? exportSave() : null,
    })

  const copy = async () => {
    const report = build(true)
    if (await copyText(report)) {
      toast('Rapporten er kopiert. Lim den inn i meldingen til oss.', 'good')
    } else {
      setManual(report)
      setTimeout(() => manualRef.current?.select(), 50)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Tilbakemelding">
      <p className="text-[13px] leading-snug text-blekk-2">
        Fortell hva som skjedde, eller hva du savner. Rapporten lages på enheten din og sendes ikke før du selv deler den.
      </p>
      <Segmented<FeedbackKind>
        className="mt-3"
        value={kind}
        onChange={setKind}
        options={(Object.keys(FEEDBACK_KINDS) as FeedbackKind[]).map((id) => ({ id, label: FEEDBACK_KINDS[id] }))}
      />
      <label htmlFor="tilbakemelding-tekst" className="etikett mt-3 block">
        {kind === 'feil' ? 'Hva gjorde du, og hva skjedde?' : 'Din melding'}
      </label>
      <textarea
        id="tilbakemelding-tekst"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        maxLength={4000}
        placeholder={kind === 'feil' ? 'F.eks. «Jeg dro Ingrid til nattevakt, og da forsvant …»' : 'Skriv her …'}
        className="mt-1 w-full rounded-xl border border-blekk/15 bg-papir p-3 text-[14px] leading-snug outline-none focus:border-skog"
      />

      <div className="mt-2 space-y-1.5">
        {[
          { id: 'tb-teknisk', checked: withTech, set: setWithTech, label: 'Legg ved teknisk info', hint: 'Versjon, nivå, skjermstørrelse og nettleser.' },
          { id: 'tb-lagring', checked: withSave, set: setWithSave, label: 'Legg ved lagringen min', hint: 'Gjør det mulig å gjenskape feilen. Inneholder avdelingsnavn, fylke og yrkesgruppe.' },
        ].map((o) => (
          <label key={o.id} htmlFor={o.id} className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-blekk/[0.04] px-3 py-2">
            <input
              id={o.id}
              type="checkbox"
              checked={o.checked}
              onChange={(e) => o.set(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#1E4D40]"
            />
            <span>
              <span className="block text-[13px] font-bold">{o.label}</span>
              <span className="block text-[11.5px] leading-snug text-blekk-3">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <button className="knapp knapp-primar mt-4 w-full" disabled={!message.trim()} onClick={() => void copy()}>
        <Icon name="kopier" size={15} /> Kopier rapport
      </button>
      <a
        className={cx('knapp knapp-lys mt-2 w-full', !message.trim() && 'pointer-events-none opacity-45')}
        href={feedbackMailto(FEEDBACK_EMAIL, kind, build(false))}
      >
        <Icon name="melding" size={15} /> Åpne i e-post
      </a>
      <p className="mt-2 text-[11.5px] leading-snug text-blekk-3">
        Send til <span className="font-mono font-bold text-blekk-2 select-all">{FEEDBACK_EMAIL}</span>. Åpner ikke e-postappen
        seg, kopier rapporten og lim den inn i en e-post til adressen. Lagringen blir bare med via «Kopier rapport».
      </p>
      {manual !== null && (
        <div className="mt-3 animate-inn">
          <p className="mb-1 text-[11.5px] font-semibold text-rav-2">Automatisk kopiering ble ikke tillatt. Teksten er merket – kopier den selv.</p>
          <textarea
            ref={manualRef}
            id="tilbakemelding-rapport"
            readOnly
            value={manual}
            rows={5}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl border border-blekk/15 bg-papir p-2.5 font-mono text-[10.5px] leading-snug outline-none"
          />
        </div>
      )}
    </Sheet>
  )
}
