import { BALANCE, SHIFT_ORDER } from '@/data/balance'
import { DILEMMA_BY_ID } from '@/data/dilemmas'
import { SKILL_ORDER } from '@/data/professions'
import { emptyUpgradeLevels } from '@/data/upgrades'
import { WARD_TYPES } from '@/data/wards'
import type { GameState, StaffId, StaffMember } from '@/types'
import { modifiersFor } from './modifiers'
import { syncResidents } from './residents'
import { createInitialState, STATE_VERSION } from './simulation'
import { emptySkills } from './staffFactory'

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Fyller `saved` med standardverdier fra `defaults`: manglende felter legges
 * til, felter med feil type erstattes, og ukjente felter fjernes. Lister og
 * oppslagstabeller (stab, oppgraderinger) håndteres eksplisitt av kalleren.
 */
function fill<T>(saved: unknown, defaults: T): T {
  if (Array.isArray(defaults)) return (Array.isArray(saved) ? saved : defaults) as T
  if (isObject(defaults)) {
    const src = isObject(saved) ? saved : {}
    const out: Json = {}
    for (const key of Object.keys(defaults)) out[key] = fill(src[key], (defaults as Json)[key])
    return out as T
  }
  if (defaults === null) return (saved === undefined ? null : saved) as T
  return (typeof saved === typeof defaults && !(typeof saved === 'number' && Number.isNaN(saved)) ? saved : defaults) as T
}

const staffTemplate = (id: StaffId): StaffMember => ({
  id,
  name: 'Ukjent ansatt',
  profession: 'assistent',
  rarity: 'vanlig',
  skills: emptySkills(),
  stamina: 66,
  energy: 66,
  stress: 20,
  level: 1,
  xp: 0,
  trait: null,
  sickUntil: null,
  course: null,
  avatar: { skin: 0, hair: 0, hairStyle: 0, accessory: 0 },
  badgeNo: '00000',
  hiredAt: 0,
})

/**
 * Løfter en lagret spilltilstand – av hvilken som helst eldre versjon – til
 * dagens GameState uten å nullstille spilleren. Nye felter får trygge
 * standardverdier; det spilleren har opparbeidet beholdes.
 *
 * Funksjonen er idempotent og kjøres ved hver innlasting, også når versjonen
 * stemmer, slik at en skadet eller delvis lagring aldri krasjer spillet.
 */
export function migrateGameState(raw: unknown, nowMs: number): GameState {
  if (!isObject(raw)) return createInitialState(nowMs)
  const defaults = createInitialState(nowMs, typeof raw.rng === 'number' ? raw.rng : nowMs)
  const fromVersion = typeof raw.version === 'number' ? raw.version : 1

  const d = fill(raw, defaults)
  d.version = STATE_VERSION
  d.rng = typeof raw.rng === 'number' ? raw.rng : defaults.rng

  // ---- Stab: behold akkurat de ansatte spilleren har, fyll manglende felter ----
  const staff: Record<StaffId, StaffMember> = {}
  if (isObject(raw.staff)) {
    for (const [id, value] of Object.entries(raw.staff)) {
      if (!isObject(value)) continue
      const s = fill(value, staffTemplate(id))
      s.id = id
      for (const skill of SKILL_ORDER) s.skills[skill] = Math.max(0, Math.min(BALANCE.skillCeiling, s.skills[skill]))
      s.energy = Math.max(0, Math.min(s.stamina, s.energy))
      staff[id] = s
    }
  }
  if (Object.keys(staff).length === 0) {
    d.staff = defaults.staff
    d.staffOrder = defaults.staffOrder
  } else {
    d.staff = staff
    const order = (Array.isArray(raw.staffOrder) ? raw.staffOrder : []).filter(
      (id): id is StaffId => typeof id === 'string' && id in staff,
    )
    for (const id of Object.keys(staff)) if (!order.includes(id)) order.push(id)
    d.staffOrder = order
  }

  // ---- Turnus: fem plasser per vakt, kun ansatte som finnes ----
  for (const shift of SHIFT_ORDER) {
    const row = isObject(raw.roster) && Array.isArray(raw.roster[shift]) ? (raw.roster[shift] as unknown[]) : []
    d.roster[shift] = Array.from({ length: BALANCE.maxSlots }, (_, i) => {
      const id = row[i]
      return typeof id === 'string' && id in d.staff ? id : null
    })
  }
  d.monetization.rosterTemplates = d.monetization.rosterTemplates.filter(
    (t) => isObject(t) && isObject(t.roster) && SHIFT_ORDER.every((sh) => Array.isArray(t.roster[sh])),
  )

  // ---- Oppslagstabeller: nye nøkler får nivå 0 ----
  d.upgrades = { ...emptyUpgradeLevels(), ...(isObject(raw.upgrades) ? fill(raw.upgrades, emptyUpgradeLevels()) : {}) }
  if (!(d.wardType in WARD_TYPES)) d.wardType = 'sykehjem'
  d.tier = Math.max(0, Math.min(5, Math.floor(d.tier)))

  // ---- Tid: minuttet må ligge på et helt steg; framtidig tidsstempel nulles ----
  d.minute = Math.max(0, Math.floor(d.minute / BALANCE.stepMin) * BALANCE.stepMin)
  if (d.lastTickAt > nowMs) d.lastTickAt = nowMs

  // ---- Dilemmaer som ikke finnes lenger, tas ned ----
  d.dilemmas.active = d.dilemmas.active.filter((a) => isObject(a) && typeof a.defId === 'string' && a.defId in DILEMMA_BY_ID)

  // ---- v1 → v2 ----
  if (fromVersion < 2) {
    // Tilsynet målte sum av timer i v1; ukens resultat starter på nytt som snitt per vakt.
    d.inspection.scoreSum = 0
    d.inspection.shifts = 0
    d.inspection.claimed = []
    // Vaktrapporten og akkumulatoren fikk nye felter (fylt med 0 av fill()).
  }

  // Forrige vaktrapport ligger bak en nullbar referanse og må fylles for seg.
  if (isObject(d.shift.last)) {
    d.shift.last = fill(d.shift.last, {
      id: 0, shift: 'dag', day: 1, fagpoeng: 0, budget: 0, avvik: 0, avgCoverage: 0,
      inspectionScore: 0, synergyIds: [], doubled: false, seen: true,
    } as NonNullable<GameState['shift']['last']>)
  } else {
    d.shift.last = null
  }

  // ---- Beboere: eldre lagringer har ingen – ta inn et fullt belegg nå ----
  const hadResidents = Array.isArray(raw.residents) && raw.residents.length > 0
  if (!hadResidents) {
    d.residents = []
    syncResidents(d, modifiersFor(d), true)
  } else {
    d.residents = d.residents.filter(
      (r) => isObject(r) && typeof r.profile === 'string' && typeof r.dischargeAt === 'number' && typeof r.room === 'number',
    )
  }

  return d
}
