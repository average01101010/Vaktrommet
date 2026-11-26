import { BALANCE } from '@/data/balance'
import { DILEMMA_BY_ID, RANDOM_DILEMMAS } from '@/data/dilemmas'
import { RESIDENT_FEMALE_NAMES } from '@/data/residents'
import type {
  AbsenceKind,
  DilemmaDef,
  DilemmaSubject,
  GameState,
  Resident,
  ResidentProfileId,
  ShiftId,
  WardTypeId,
} from '@/types'
import { pickWeighted, rand } from './rng'
import { shiftAt } from './time'

// ---------------------------------------------------------------------------
// Tekst: plassholdere for beboeren et dilemma handler om
// ---------------------------------------------------------------------------

/**
 * Plassholdere som kan brukes i alle tekster i et dilemma. Pronomenene følger
 * beboerens navn, så tekstene kan skrives én gang og passe alle.
 */
export const DILEMMA_PLACEHOLDERS = ['beboer', 'rom', 'han', 'Han', 'hans', 'Hans', 'ham', 'forelder'] as const
type Placeholder = (typeof DILEMMA_PLACEHOLDERS)[number]

const PLACEHOLDER_RE = /\{([A-Za-zæøåÆØÅ]+)\}/g

function placeholderValues(subject: DilemmaSubject | undefined): Record<Placeholder, string> {
  const female = subject ? RESIDENT_FEMALE_NAMES.has(subject.name) : true
  return {
    beboer: subject?.name ?? 'beboeren',
    rom: subject ? String(subject.room) : '–',
    han: female ? 'hun' : 'han',
    Han: female ? 'Hun' : 'Han',
    hans: female ? 'hennes' : 'hans',
    Hans: female ? 'Hennes' : 'Hans',
    ham: female ? 'henne' : 'ham',
    forelder: female ? 'mor' : 'far',
  }
}

/** Setter beboerens navn, rom og pronomen inn i en dilemmatekst. */
export function fillText(text: string, subject?: DilemmaSubject): string {
  if (!text.includes('{')) return text
  const values = placeholderValues(subject)
  return text.replace(PLACEHOLDER_RE, (match, key: string) => (key in values ? values[key as Placeholder] : match))
}

const textsOf = (def: DilemmaDef): string[] => [
  def.title,
  def.body,
  def.from,
  def.fagligBegrunnelse,
  ...def.options.flatMap((o) => [o.label, o.hint ?? '', o.outcome]),
]

/** Plassholderne et dilemma bruker i tekstene sine. */
export const placeholdersIn = (def: DilemmaDef): string[] => [
  ...new Set(textsOf(def).flatMap((t) => [...t.matchAll(PLACEHOLDER_RE)].map((m) => m[1]))),
]

const usesResidentCache = new Map<string, boolean>()

/** Dilemmaet handler om en konkret beboer: enten via profilkrav eller via plassholdere i teksten. */
export function usesResident(def: DilemmaDef): boolean {
  let known = usesResidentCache.get(def.id)
  if (known === undefined) {
    known = Boolean(def.triggers?.residentProfile) || placeholdersIn(def).length > 0
    usesResidentCache.set(def.id, known)
  }
  return known
}

/** Dilemmaet slik det skal vises: alle tekster ferdig utfylt for beboeren det gjelder. */
export function renderDilemma(def: DilemmaDef, subject?: DilemmaSubject): DilemmaDef {
  if (!usesResident(def)) return def
  const t = (text: string) => fillText(text, subject)
  return {
    ...def,
    title: t(def.title),
    body: t(def.body),
    from: t(def.from),
    fagligBegrunnelse: t(def.fagligBegrunnelse),
    options: def.options.map((o) => ({ ...o, label: t(o.label), hint: o.hint && t(o.hint), outcome: t(o.outcome) })),
  }
}

// ---------------------------------------------------------------------------
// Utvelgelse: hvilke dilemmaer passer situasjonen akkurat nå?
// ---------------------------------------------------------------------------

/** Det utvelgelsen ser på. */
export interface DilemmaContext {
  wardType: WardTypeId
  shift: ShiftId
  tier: number
  /** Profilene som finnes blant beboerne nå. */
  profiles: ReadonlySet<ResidentProfileId>
  /** Snittstress i hele staben (0–100). */
  avgStress: number
  trivsel: number
  /** Fraværstypene som finnes i staben nå. */
  absences: ReadonlySet<AbsenceKind>
}

export function dilemmaContext(state: GameState): DilemmaContext {
  const staff = state.staffOrder.map((id) => state.staff[id])
  return {
    wardType: state.wardType,
    shift: shiftAt(state.minute),
    tier: state.tier,
    profiles: new Set(state.residents.map((r) => r.profile)),
    avgStress: staff.length ? staff.reduce((sum, s) => sum + s.stress, 0) / staff.length : 0,
    trivsel: state.ward.trivsel,
    absences: new Set(staff.flatMap((s) => (s.absence ? [s.absence.kind] : []))),
  }
}

/** Stemmer dilemmaets triggere og nivåkrav med situasjonen? */
export function matchesTriggers(def: DilemmaDef, ctx: DilemmaContext): boolean {
  if ((def.minTier ?? 0) > ctx.tier) return false
  const t = def.triggers
  if (!t) return true
  if (t.isFollowUpOnly) return false
  if (t.wardTypes && !t.wardTypes.includes(ctx.wardType)) return false
  if (t.shifts && !t.shifts.includes(ctx.shift)) return false
  if (t.residentProfile && !ctx.profiles.has(t.residentProfile)) return false
  if (t.minStress !== undefined && ctx.avgStress < t.minStress) return false
  if (t.maxTrivsel !== undefined && ctx.trivsel > t.maxTrivsel) return false
  if (t.absence && !t.absence.some((kind) => ctx.absences.has(kind))) return false
  return true
}

/** Historiekjeder som er i gang: et steg henger på tavla eller er planlagt. */
function chainsInProgress(state: GameState): Set<string> {
  const ids = [...state.dilemmas.active.map((a) => a.defId), ...state.dilemmas.followUps.map((f) => f.defId)]
  return new Set(ids.map((id) => DILEMMA_BY_ID[id]?.chain?.id).filter((id): id is string => Boolean(id)))
}

/**
 * Dilemmaer som kan dukke opp av seg selv akkurat nå: de passer avdelingstype,
 * vakt, beboere og press, henger ikke allerede på tavla, og tilhører ikke en
 * sak som fortsatt har et etterspill til gode.
 */
export function eligibleDilemmas(state: GameState): DilemmaDef[] {
  const ctx = dilemmaContext(state)
  const active = new Set(state.dilemmas.active.map((a) => a.defId))
  const awaiting = new Set(state.dilemmas.followUps.map((f) => f.sourceId))
  const chains = chainsInProgress(state)
  return RANDOM_DILEMMAS.filter(
    (def) =>
      matchesTriggers(def, ctx) &&
      !active.has(def.id) &&
      !awaiting.has(def.id) &&
      !(def.chain && chains.has(def.chain.id)),
  )
}

/** Kontekstuelle dilemmaer trekkes oftere, så en spesialavdeling og en tung natt faktisk merkes. */
export function dilemmaWeight(def: DilemmaDef): number {
  const t = def.triggers
  if (!t) return 1
  if (t.wardTypes) return BALANCE.dilemmaWeightWard
  if (t.shifts || t.residentProfile || t.absence || t.minStress !== undefined || t.maxTrivsel !== undefined) return BALANCE.dilemmaWeightContext
  return 1
}

const subjectOf = (r: Resident): DilemmaSubject => ({ residentId: r.id, name: r.name, room: r.room, profile: r.profile })

/**
 * Velger beboeren et dilemma skal handle om: en med riktig profil, og helst
 * en som ikke allerede står på en annen lapp. Muterer RNG-en i utkastet.
 */
export function pickSubject(d: GameState, def: DilemmaDef): DilemmaSubject | undefined {
  if (d.residents.length === 0) return undefined
  const profile = def.triggers?.residentProfile
  const matching = profile ? d.residents.filter((r) => r.profile === profile) : d.residents
  // En oppfølging må kunne henges opp selv om profilen ikke lenger finnes på avdelingen.
  const candidates = matching.length > 0 ? matching : d.residents
  const busy = new Set(d.dilemmas.active.map((a) => a.subject?.residentId))
  const free = candidates.filter((r) => !busy.has(r.id))
  const pool = free.length > 0 ? free : candidates
  return subjectOf(pool[Math.floor(rand(d) * pool.length)])
}

/** Henger opp en lapp. Beboeren følger med fra forrige steg, eller velges nå. */
export function postDilemma(
  d: GameState,
  defId: string,
  from: { followUpOf?: string; subject?: DilemmaSubject } = {},
): void {
  const def = DILEMMA_BY_ID[defId]
  if (!def) return
  const subject = from.subject ?? (usesResident(def) ? pickSubject(d, def) : undefined)
  d.dilemmas.counter++
  d.dilemmas.active.push({
    uid: d.dilemmas.counter,
    defId,
    postedAt: d.minute,
    tilt: Math.round((rand(d) * 8 - 4) * 10) / 10,
    ...(from.followUpOf ? { followUpOf: from.followUpOf } : {}),
    ...(subject ? { subject } : {}),
  })
}

/**
 * Trekker et nytt dilemma som passer situasjonen. De siste dilemmaene gjentas
 * ikke; er alt som passer brukt nylig, tas det som er lengst siden sist.
 */
export function spawnDilemma(d: GameState): void {
  const eligible = eligibleDilemmas(d)
  if (eligible.length === 0) return
  const recent = d.dilemmas.recent
  const fresh = eligible.filter((def) => !recent.includes(def.id))
  const def =
    fresh.length > 0
      ? pickWeighted(d, fresh, dilemmaWeight)
      : eligible.reduce((oldest, cand) => (recent.indexOf(cand.id) < recent.indexOf(oldest.id) ? cand : oldest))
  postDilemma(d, def.id)
  d.dilemmas.recent = [...recent.filter((id) => id !== def.id), def.id].slice(-BALANCE.dilemmaRecent)
}

/**
 * Utsatte saker og neste steg i historiekjeder kommer tilbake. De får henge
 * selv om tavla er full (én lapp over taket), så de aldri forsvinner i køen.
 */
export function postDueFollowUps(d: GameState): void {
  if (d.dilemmas.followUps.length === 0) return
  const waiting = []
  for (const f of d.dilemmas.followUps) {
    if (!DILEMMA_BY_ID[f.defId]) continue
    const due = f.dueAt <= d.minute
    const room = d.dilemmas.active.length <= BALANCE.dilemmaMaxActive
    const alreadyUp = d.dilemmas.active.some((a) => a.defId === f.defId)
    if (due && room && !alreadyUp) postDilemma(d, f.defId, { followUpOf: f.sourceId, subject: f.subject })
    else if (!(due && alreadyUp)) waiting.push(f)
  }
  d.dilemmas.followUps = waiting
}
