import { useState } from 'react'
import { BALANCE, TIERS } from '@/data/balance'
import { RESIDENT_PROFILES } from '@/data/residents'
import { SELECTABLE_WARD_TYPES, WARD_TYPES } from '@/data/wards'
import { rotationPreview } from '@/engine/actions'
import { tierThreshold } from '@/engine/modifiers'
import { cx, fmtCompact } from '@/lib/format'
import { useGame } from '@/store/gameStore'
import { useGameState } from '@/store/selectors'
import type { ResidentProfileId, StaffId, WardTypeId } from '@/types'
import { MiniIdCard } from '../staff/IdCard'
import { Chip } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'

/** Endgame: overlever avdelingen og velg nytt oppdrag. */
export function RotationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const game = useGameState()
  const rotateWard = useGame((s) => s.rotateWard)
  const [wardType, setWardType] = useState<WardTypeId>(SELECTABLE_WARD_TYPES[0])
  const [keep, setKeep] = useState<StaffId[]>([])
  const [name, setName] = useState('')
  const [confirm, setConfirm] = useState(false)
  if (!open) return null

  const preview = rotationPreview(game)
  const chosen = WARD_TYPES[wardType]
  const nextTop = tierThreshold(TIERS.length - 1, game.prestige.rotations + 1)
  const toggle = (id: StaffId) =>
    setKeep((k) => (k.includes(id) ? k.filter((x) => x !== id) : k.length < BALANCE.rotationKeepStaff ? [...k, id] : k))
  const close = () => {
    setConfirm(false)
    onClose()
  }

  return (
    <Sheet open onClose={close} title="Overlever avdelingen" className="sm:max-w-xl">
      <p className="text-[13.5px] leading-snug text-blekk-2">
        {game.profile.wardName} er blitt et kompetansesenter. Lever den videre i gode hender, og ta med deg det du har lært til
        et nytt oppdrag.
      </p>

      {/* Det du tar med */}
      <div className="mt-3 rounded-2xl bg-skog p-3.5 text-krem">
        <div className="text-[10.5px] font-bold tracking-[0.12em] uppercase opacity-70">Dette tar du med deg</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <div className="font-mono text-xl leading-none font-extrabold">+{preview.renommeGain}</div>
            <div className="mt-1 text-[11.5px] font-bold">Renommé</div>
            <div className="text-[10.5px] opacity-75">
              +{Math.round(BALANCE.renommeFagpoeng * 100)} % Fagpoeng og budsjett per poeng, for alltid
            </div>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <div className="flex items-center gap-1.5 font-mono text-xl leading-none font-extrabold">
              <Icon name="kurs" size={18} /> {preview.fagbok.maxed ? 'Maks' : `Nivå ${preview.fagbok.level}`}
            </div>
            <div className="mt-1 text-[11.5px] font-bold">«{preview.fagbok.name}»</div>
            <div className="text-[10.5px] opacity-75">{WARD_TYPES[preview.fagbok.wardType].fagbok.effectText} per nivå</div>
          </div>
        </div>
        <p className="mt-2.5 text-[11.5px] leading-snug opacity-85">
          Kaffekopper (+{BALANCE.rotationKaffekopper}), kjøp, pass og {fmtCompact(preview.bankedDrift)} driftspoeng blir også med.
          Budsjett, Fagpoeng, oppgraderinger, nivå og resten av staben starter på nytt.
        </p>
      </div>

      {/* Nytt oppdrag */}
      <div className="etikett mt-4 mb-1.5">Velg nytt oppdrag</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {SELECTABLE_WARD_TYPES.map((id) => {
          const w = WARD_TYPES[id]
          const active = id === wardType
          const top = (Object.entries(w.profileWeights) as [ResidentProfileId, number][]).sort((a, b) => b[1] - a[1]).slice(0, 2)
          return (
            <button
              key={id}
              onClick={() => setWardType(id)}
              className={cx(
                'rounded-2xl border px-3.5 py-3 text-left transition-all',
                active ? 'border-rav bg-rav-soft/70 shadow-kort' : 'border-blekk/10 bg-papir hover:border-blekk/25',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14.5px] font-extrabold tracking-tight">{w.name}</span>
                {(game.prestige.fagboker[id] ?? 0) > 0 && (
                  <Chip className="!py-0.5 font-mono !text-[10px]">Fagbok {game.prestige.fagboker[id]}</Chip>
                )}
              </div>
              <p className="mt-0.5 text-[12px] leading-snug text-blekk-2">{w.blurb}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {top.map(([p, weight]) => (
                  <span key={p} className="rounded-full px-2 py-0.5 text-[10.5px] font-bold text-white" style={{ background: RESIDENT_PROFILES[p].color }}>
                    {RESIDENT_PROFILES[p].short} {weight} %
                  </span>
                ))}
              </div>
              <div className="mt-1.5 font-mono text-[10.5px] font-semibold text-blekk-2">{w.modsText}</div>
            </button>
          )
        })}
      </div>

      {/* Nøkkelansatte */}
      <div className="mt-4 mb-1 flex items-end justify-between">
        <span className="etikett">Ta med inntil {BALANCE.rotationKeepStaff} nøkkelansatte</span>
        <span className="font-mono text-[11px] font-bold text-blekk-3">
          {keep.length}/{BALANCE.rotationKeepStaff}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {game.staffOrder.map((id) => (
          <MiniIdCard
            key={id}
            staff={game.staff[id]}
            selected={keep.includes(id)}
            onClick={() => toggle(id)}
            className={cx(!keep.includes(id) && keep.length >= BALANCE.rotationKeepStaff && 'opacity-45')}
          />
        ))}
      </div>

      <label className="mt-4 block">
        <span className="etikett">Navn på den nye avdelingen</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={28}
          placeholder={chosen.name}
          className="mt-1 w-full rounded-xl border border-blekk/15 bg-papir px-3.5 py-2.5 text-[15px] font-bold outline-none focus:border-skog"
        />
      </label>

      <p className="mt-3 text-[11.5px] leading-snug text-blekk-3">
        Neste avdeling krever {fmtCompact(nextTop)} Fagpoeng for å bli kompetansesenter. Fagboka «{chosen.fagbok.name}» (
        {chosen.fagbok.effectText}) venter når du overleverer den.
      </p>

      {confirm ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="knapp knapp-lys" onClick={() => setConfirm(false)}>
            Avbryt
          </button>
          <button
            className="knapp knapp-rav"
            onClick={() => {
              if (rotateWard({ wardType, keepStaff: keep, wardName: name.trim() || chosen.name })) {
                setKeep([])
                setName('')
                close()
              }
            }}
          >
            Bekreft overlevering
          </button>
        </div>
      ) : (
        <button className="knapp knapp-primar mt-3 w-full !py-3 !text-[15px]" onClick={() => setConfirm(true)}>
          Start på {chosen.name.toLowerCase()}
          <Icon name="pil" size={16} />
        </button>
      )}
    </Sheet>
  )
}
