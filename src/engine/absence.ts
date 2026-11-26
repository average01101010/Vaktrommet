import { ABSENCES, VIKAR_SKILLS } from '@/data/absence'
import { BALANCE } from '@/data/balance'
import type { Absence, AbsenceKind, GameState, Modifiers, RosterGap, ShiftId, StaffId, StaffMember } from '@/types'
import { slotsFor } from './modifiers'
import { pick, rand, randInt } from './rng'
import { gainXp, pushEvent, type StepTotals } from './simulation'
import { formatClock, MIN_PER_DAY, MIN_PER_HOUR, MIN_PER_SHIFT, shiftAt } from './time'

/**
 * Fravær og permisjoner, og hullene de lager i turnusen.
 *
 * Et fravær har en start og en slutt. Ligger starten fram i tid, er det
 * varslet: den ansatte jobber som vanlig, og lederen har tid til å planlegge.
 */

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
const firstName = (s: StaffMember): string => s.name.split(' ')[0]

/** Fraværet har begynt (ikke bare varslet). */
export const absenceActive = (s: StaffMember, minute: number): s is StaffMember & { absence: Absence } =>
  s.absence !== null && minute >= s.absence.startsAt

/** Helt borte fra jobb: syk, hjemme med sykt barn eller i permisjon. Gradert sykmeldte er delvis på jobb. */
export const isAway = (s: StaffMember, minute: number): boolean => absenceActive(s, minute) && s.absence.kind !== 'gradert_syk'

export const isGradert = (s: StaffMember, minute: number): boolean => absenceActive(s, minute) && s.absence.kind === 'gradert_syk'

/** Kan settes i arbeid akkurat nå (ikke borte og ikke på kurs). */
export const isAvailable = (s: StaffMember, minute: number): boolean => !isAway(s, minute) && s.course === null

/** Kan stå på denne vakta: gradert sykmeldte går bare dagvakt. */
export const canWork = (s: StaffMember, shift: ShiftId, minute: number): boolean =>
  isAvailable(s, minute) && (!isGradert(s, minute) || shift === 'dag')

/** Andel av full kapasitet (og lønn) den ansatte står for. */
export const capacityOf = (s: StaffMember, minute: number): number => (isGradert(s, minute) ? BALANCE.gradertCapacity : 1)

/** Fraværet slik det skal vises: hva det er, om det er varslet, og hvor lenge det varer. */
export interface AbsenceStatus {
  kind: AbsenceKind
  name: string
  stamp: string
  /** Varslet, men ikke begynt. */
  announced: boolean
  /** Spillminutter til det begynner (0 når det pågår) og til den ansatte er tilbake. */
  startsIn: number
  endsIn: number
  /** Hele spilldøgn igjen, rundet opp. */
  daysLeft: number
}

export function absenceStatus(s: StaffMember, minute: number): AbsenceStatus | null {
  const a = s.absence
  if (!a) return null
  const def = ABSENCES[a.kind]
  const endsIn = Math.max(0, a.endsAt - minute)
  return {
    kind: a.kind,
    name: def.name,
    stamp: def.stamp,
    announced: minute < a.startsAt,
    startsIn: Math.max(0, a.startsAt - minute),
    endsIn,
    daysLeft: Math.max(1, Math.ceil(endsIn / MIN_PER_DAY)),
  }
}

// ---------------------------------------------------------------------------
// Tilkallingsvikaren
// ---------------------------------------------------------------------------

/** En vikar slik synergimotoren ser henne: helsefagarbeider på nivå 1, uthvilt, uten særtrekk. */
export const VIKAR: StaffMember = {
  id: 'vikar',
  name: 'Tilkallingsvikar',
  profession: 'helsefagarbeider',
  rarity: 'vanlig',
  skills: VIKAR_SKILLS,
  stamina: 70,
  energy: 70,
  stress: 20,
  level: 1,
  xp: 0,
  trait: null,
  absence: null,
  strain: 0,
  course: null,
  avatar: { skin: 1, hair: 2, hairStyle: 0, accessory: 0 },
  badgeNo: 'VIKAR',
  hiredAt: 0,
}

// ---------------------------------------------------------------------------
// Start og slutt
// ---------------------------------------------------------------------------

/** Legger inn et fravær. Med `noticeHours` er det varslet og begynner først da. Muterer utkastet. */
export function startAbsence(d: GameState, s: StaffMember, kind: AbsenceKind, days: number, noticeHours = 0): Absence {
  const startsAt = d.minute + noticeHours * MIN_PER_HOUR
  s.absence = { kind, startsAt, endsAt: startsAt + days * MIN_PER_DAY }
  return s.absence
}

const dayWord = (days: number): string => (days === 1 ? '1 døgn' : `${days} døgn`)

/** Den ansatte melder fra: «Ingrid (06:18): Våknet med feber …». */
function report(d: GameState, s: StaffMember, kind: AbsenceKind, days: number, suffix: string): void {
  // Meldingen kom litt før hel time – slik de gjør.
  const sentAt = formatClock(d.minute - randInt(d, 4, 52))
  pushEvent(d, ABSENCES[kind].sick ? 'syk' : 'fravaer', `${firstName(s)} (${sentAt}): ${pick(d, ABSENCES[kind].messages)} ${suffix || `(${dayWord(days)})`}`.trim())
}

function countSick(d: GameState, kind: AbsenceKind, days: number, totals: StepTotals): void {
  if (!ABSENCES[kind].sick) return
  d.lifetime.sickDays += kind === 'gradert_syk' ? days * (1 - BALANCE.gradertCapacity) : days
  totals.sick++
}

/** Akutt fravær fra nå av. */
function callInAbsent(d: GameState, s: StaffMember, kind: AbsenceKind, totals: StepTotals): void {
  const [min, max] = ABSENCES[kind].days
  const days = randInt(d, min, max)
  startAbsence(d, s, kind, days)
  if (kind === 'langtidssyk') {
    s.stress = BALANCE.stressAfterSick
    s.strain = 0
  }
  countSick(d, kind, days, totals)
  report(d, s, kind, days, '')
}

/** Fraværet er over: tilbake på jobb, og noen kommer tilbake med noe mer enn de dro med. */
function returnToWork(d: GameState, s: StaffMember, totals: StepTotals): void {
  const kind = s.absence!.kind
  s.absence = null
  if (kind === 'langtidssyk' && rand(d) < BALANCE.gradertAfterSickChance) {
    const [min, max] = ABSENCES.gradert_syk.days
    const days = randInt(d, min, max)
    startAbsence(d, s, 'gradert_syk', days)
    countSick(d, 'gradert_syk', days, totals)
    report(d, s, 'gradert_syk', days, `(${dayWord(days)})`)
    return
  }
  if (kind === 'studiepermisjon') {
    const xp = Math.round(100 * Math.pow(s.level, 1.5) * BALANCE.studyXpShare)
    gainXp(d, s, xp)
    const fagpoeng = BALANCE.studyFagpoeng * (1 + d.tier)
    d.resources.fagpoeng += fagpoeng
    d.lifetime.fagpoeng += fagpoeng
    pushEvent(d, 'kurs', `${s.name} er tilbake fra studiepermisjon: +${xp} erfaring og +${fagpoeng} Fagpoeng til avdelingen.`)
    return
  }
  pushEvent(d, 'frisk', kind === 'gradert_syk' ? `${s.name} er friskmeldt og tilbake i full stilling.` : `${s.name} er tilbake på jobb.`)
}

// ---------------------------------------------------------------------------
// Hver hele spilltime
// ---------------------------------------------------------------------------

/** Vurderes hver hele spilltime: tilbakekomst, slitasje, akutt fravær før vaktstart og nye permisjonssøknader. */
export function hourlyAbsence(d: GameState, onDuty: ReadonlySet<StaffId>, mods: Modifiers, totals: StepTotals): void {
  const minute = d.minute

  for (const id of d.staffOrder) {
    const s = d.staff[id]
    const a = s.absence
    if (a && minute >= a.endsAt) returnToWork(d, s, totals)
    else if (a && a.startsAt > minute - MIN_PER_HOUR && a.startsAt <= minute && !ABSENCES[a.kind].acute && a.kind !== 'gradert_syk') {
      // En varslet permisjon begynner nå.
      pushEvent(d, 'fravaer', `${s.name} har ${ABSENCES[a.kind].name.toLowerCase()} fra nå (${dayWord(Math.round((a.endsAt - a.startsAt) / MIN_PER_DAY))}).`)
    }

    // Slitasje: timer med høyt stress hoper seg opp, og går sakte ned igjen.
    s.strain = s.stress > BALANCE.sickStressThreshold ? Math.min(BALANCE.strainMax, s.strain + 1) : Math.max(0, s.strain - 0.5)

    if (isGradert(s, minute) && s.stress >= BALANCE.gradertStressCap) {
      // For høyt tempo for en som er på vei tilbake: full sykmelding ut perioden.
      s.absence = { ...s.absence!, kind: 'langtidssyk' }
      s.stress = BALANCE.stressAfterSick
      pushEvent(d, 'syk', `${firstName(s)}: Det ble for mye for tidlig. Legen har sykmeldt meg helt igjen.`)
    } else if (!s.absence && s.course === null && s.strain >= BALANCE.strainHoursBeforeSick && s.stress > BALANCE.sickStressThreshold) {
      // Presset over lang tid: risiko for sykmelding.
      const over = (s.stress - BALANCE.sickStressThreshold) / (100 - BALANCE.sickStressThreshold)
      if (rand(d) < over * over * BALANCE.sickMaxChancePerHour * (onDuty.has(id) ? 1 : 0.25)) callInAbsent(d, s, 'langtidssyk', totals)
    }
  }

  // ---- Én time før vaktstart: de som skal på, kan melde seg syke ----
  if (minute % MIN_PER_SHIFT === MIN_PER_SHIFT - MIN_PER_HOUR) {
    const next = shiftAt(minute + MIN_PER_HOUR)
    for (const id of d.roster[next].slice(0, slotsFor(mods))) {
      const s = id ? d.staff[id] : null
      if (!s || s.absence || s.course) continue
      // Mest utsatt er den som er middels stresset og sliten – ikke den som allerede er på vei mot veggen.
      const chance =
        BALANCE.egenmeldingBase +
        BALANCE.egenmeldingFromStress * clamp01((s.stress - 30) / 35) +
        BALANCE.egenmeldingFromFatigue * clamp01(1 - s.energy / (s.stamina * 0.5))
      if (rand(d) < chance) callInAbsent(d, s, 'egenmelding', totals)
      else if (next !== 'natt' && rand(d) < BALANCE.syktBarnChance) callInAbsent(d, s, 'sykt_barn', totals)
    }
  }

  // ---- Én gang i døgnet: søknader om permisjon, varslet et døgn i forveien ----
  if (minute % MIN_PER_DAY === MIN_PER_HOUR) {
    const planned = d.staffOrder.some((id) => {
      const k = d.staff[id].absence?.kind
      return k === 'studiepermisjon' || k === 'velferdspermisjon'
    })
    if (!planned) {
      for (const id of d.staffOrder) {
        const s = d.staff[id]
        if (s.absence || s.course) continue
        const roll = rand(d)
        const kind: AbsenceKind | null =
          roll < BALANCE.velferdChancePerDay ? 'velferdspermisjon' : roll < BALANCE.velferdChancePerDay + BALANCE.studyChancePerDay ? 'studiepermisjon' : null
        if (!kind) continue
        const days = randInt(d, ABSENCES[kind].days[0], ABSENCES[kind].days[1])
        startAbsence(d, s, kind, days, BALANCE.leaveNoticeHours)
        report(d, s, kind, days, `(${dayWord(days)}, fra i morgen)`)
        break
      }
    }
  }

  syncGaps(d, mods)
}

// ---------------------------------------------------------------------------
// Hull i turnusen
// ---------------------------------------------------------------------------

/** Er den ansatte ute av stand til å ta denne vakta på tidspunktet `at`? */
function missesShift(s: StaffMember, shift: ShiftId, at: number): boolean {
  const a = s.absence
  if (!a || at < a.startsAt || at >= a.endsAt) return false
  return a.kind !== 'gradert_syk' || shift !== 'dag'
}

/**
 * Holder lista over hull à jour: ett hull per plass der den oppsatte er borte,
 * for vakta som går og den som kommer. Gamle og utdaterte hull ryddes bort.
 * Muterer utkastet.
 */
export function syncGaps(d: GameState, mods: Modifiers): void {
  const slots = slotsFor(mods)
  const shiftStart = Math.floor(d.minute / MIN_PER_SHIFT) * MIN_PER_SHIFT
  // [vakt, tidspunktet fraværet måles mot, når vakta slutter]
  const windows: [ShiftId, number, number][] = [
    [shiftAt(shiftStart), d.minute, shiftStart + MIN_PER_SHIFT],
    [shiftAt(shiftStart + MIN_PER_SHIFT), shiftStart + MIN_PER_SHIFT, shiftStart + 2 * MIN_PER_SHIFT],
  ]

  const wanted = new Map<string, { shift: ShiftId; slot: number; staffId: StaffId; until: number }>()
  for (const [shift, at, until] of windows) {
    d.roster[shift].slice(0, slots).forEach((id, slot) => {
      const s = id ? d.staff[id] : null
      if (id && s && missesShift(s, shift, at)) wanted.set(`${until}:${slot}`, { shift, slot, staffId: id, until })
    })
  }

  const taken = new Set<StaffId>()
  d.gaps = d.gaps.filter((g) => {
    const w = wanted.get(`${g.until}:${g.slot}`)
    if (!w || w.staffId !== g.staffId) return false
    // Den som tok ekstravakta, kan selv ha blitt borte – da er hullet åpent igjen.
    if (g.cover === 'overtid' && (!g.coverId || !d.staff[g.coverId] || !canWork(d.staff[g.coverId], g.shift, d.minute))) {
      g.cover = 'open'
      delete g.coverId
    }
    wanted.delete(`${g.until}:${g.slot}`)
    if (g.coverId) taken.add(g.coverId)
    return true
  })
  for (const w of wanted.values()) d.gaps.push({ id: ++d.gapCounter, ...w, cover: 'open' })
  d.gaps.sort((a, b) => a.until - b.until || a.slot - b.slot)
}

/** Hullene på en bestemt vakt (den som går, eller den neste). */
export const gapsOn = (state: Pick<GameState, 'gaps'>, shift: ShiftId): RosterGap[] => state.gaps.filter((g) => g.shift === shift)
