import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/data/balance'
import { UPGRADES } from '@/data/upgrades'
import type { GameState } from '@/types'
import {
  applyTemplate,
  assignStaff,
  assignToFirstFree,
  buyUpgrade,
  claimOnboardingReward,
  claimShiftReport,
  dismissOnboarding,
  grantStudyLeave,
  onboardingProgress,
  onboardingVisible,
  resetGame,
  resolveDilemma,
  saveTemplate,
  startCourse,
  suggestShift,
  unassignSlot,
} from './actions'
import { migrateGameState } from './migrate'
import { createInitialState, defaultOnboarding, simulate, STATE_VERSION } from './simulation'

const T0 = Date.UTC(2026, 10, 25, 8)
const fresh = (): GameState => {
  const s = createInitialState(T0, 1234)
  s.resources.fagpoeng = 10_000
  s.resources.budget = 10_000
  return s
}
const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  if (!r.ok) throw new Error((r as unknown as { reason: string }).reason)
  return r as Extract<T, { ok: true }>
}
const completed = (s: GameState): GameState => ({
  ...s,
  onboarding: { filledShift: true, resolvedDilemma: true, trainedOrUpgraded: true, claimedReport: true, dismissed: false },
})

describe('oppstartssjekklista', () => {
  it('et nytt spill starter med alle fire stegene åpne og sjekklista synlig', () => {
    const s = createInitialState(T0, 1)
    expect(s.onboarding).toEqual(defaultOnboarding())
    expect(s.onboardingClaimed).toBe(false)
    expect(onboardingProgress(s)).toBe(0)
    expect(onboardingVisible(s)).toBe(true)
    // Aftenvakta har en ledig plass – det første steget er alltid mulig.
    expect(s.roster.aften.slice(0, 3)).toContain(null)
  })

  it('1: å sette en ansatt på en vaktplass – eller bytte, foreslå bemanning eller bruke mal – huker av turnussteget', () => {
    expect(ok(assignStaff(fresh(), 'aften', 2, 's3')).state.onboarding.filledShift).toBe(true)
    expect(ok(assignToFirstFree(fresh(), 'aften', 's3')).state.onboarding.filledShift).toBe(true)
    expect(ok(assignStaff(fresh(), 'dag', 2, 's1')).state.onboarding.filledShift).toBe(true) // bytte innad på vakta
    const many = fresh()
    many.roster.aften = [null, null, null, null, null]
    expect(ok(suggestShift(many, 'aften')).state.onboarding.filledShift).toBe(true)
    const vip = fresh()
    vip.monetization.vip = true
    const saved = ok(saveTemplate(vip, 'Fast')).state
    expect(ok(applyTemplate(saved, saved.monetization.rosterTemplates[0].id)).state.onboarding.filledShift).toBe(true)

    // Å ta noen av vakt, eller en plassering som ikke endrer noe, teller ikke.
    expect(ok(unassignSlot(fresh(), 'dag', 0)).state.onboarding.filledShift).toBe(false)
    expect(ok(assignStaff(fresh(), 'dag', 0, 's1')).state.onboarding.filledShift).toBe(false)
  })

  it('2: å løse et dilemma huker av korktavla', () => {
    const s = fresh()
    const note = s.dilemmas.active[0]
    expect(note).toBeDefined()
    const r = ok(resolveDilemma(s, note.uid, 'vipps'))
    expect(r.state.onboarding.resolvedDilemma).toBe(true)
    expect(onboardingProgress(r.state)).toBe(1)
  })

  it('3: kurs, oppgradering eller studiepermisjon huker av fagsteget', () => {
    expect(ok(startCourse(fresh(), 's6', 'medikament')).state.onboarding.trainedOrUpgraded).toBe(true)
    const cheapest = [...UPGRADES].filter((u) => !u.requires?.length && (u.minTier ?? 0) === 0).sort((a, b) => a.baseCost - b.baseCost)[0]
    expect(ok(buyUpgrade(fresh(), cheapest.id)).state.onboarding.trainedOrUpgraded).toBe(true)
    expect(ok(grantStudyLeave(fresh(), 's6')).state.onboarding.trainedOrUpgraded).toBe(true)
  })

  it('4: å signere en vaktrapport huker av rapportsteget – den kommer når første vakt er ferdig', () => {
    const s = fresh()
    expect(claimShiftReport(s)).toMatchObject({ ok: false, reason: expect.stringContaining('første vaktrapporten') })
    const after = simulate(s, 8 * 60).state
    expect(after.shift.last?.seen).toBe(false)
    const r = ok(claimShiftReport(after))
    expect(r.state.shift.last?.seen).toBe(true)
    expect(r.state.onboarding.claimedReport).toBe(true)
    expect(claimShiftReport(r.state).ok).toBe(false)
  })

  it('velkomstbonusen kan hentes én gang, og først når alle fire er gjort', () => {
    const s = fresh()
    expect(claimOnboardingReward(s).ok).toBe(false)
    const three = { ...completed(s), onboarding: { ...completed(s).onboarding, claimedReport: false } }
    expect(claimOnboardingReward(three)).toMatchObject({ ok: false, reason: expect.stringContaining('alle fire') })

    const r = ok(claimOnboardingReward(completed(s)))
    expect(r.kaffekopper).toBe(10)
    expect(r.budget).toBe(150)
    expect(r.state.resources.kaffekopper).toBe(s.resources.kaffekopper + BALANCE.onboardingReward.kaffekopper)
    expect(r.state.resources.budget).toBe(s.resources.budget + BALANCE.onboardingReward.budget)
    expect(r.state.onboardingClaimed).toBe(true)
    expect(onboardingVisible(r.state)).toBe(false)
    expect(r.state.events[0]).toMatchObject({ kind: 'avdeling', text: expect.stringContaining('Første vakt') })
    expect(claimOnboardingReward(r.state).ok).toBe(false)
  })

  it('«Hopp over» lukker sjekklista uten bonus', () => {
    const r = ok(dismissOnboarding(fresh()))
    expect(onboardingVisible(r.state)).toBe(false)
    expect(r.state.onboardingClaimed).toBe(false)
    expect(r.state.resources.kaffekopper).toBe(fresh().resources.kaffekopper)
    expect(dismissOnboarding(r.state).ok).toBe(false)
  })

  it('hele løypa fra fersk oppstart, slik en ny spiller går den', () => {
    let s = fresh()
    s = ok(assignToFirstFree(s, 'aften', 's3')).state
    s = ok(resolveDilemma(s, s.dilemmas.active[0].uid, 'vipps')).state
    s = ok(startCourse(s, 's6', 'medikament')).state
    expect(onboardingProgress(s)).toBe(3)
    s = simulate(s, 8 * 60).state
    s = ok(claimShiftReport(s)).state
    expect(onboardingProgress(s)).toBe(4)
    s = ok(claimOnboardingReward(s)).state
    expect(onboardingVisible(s)).toBe(false)
    // Nullstilling gir en ny sjekkliste.
    expect(onboardingVisible(ok(resetGame(s, T0)).state)).toBe(true)
  })
})

describe('migrering v8 → v9', () => {
  const v8 = (patch: (raw: Record<string, any>) => void): Record<string, any> => {
    const raw = JSON.parse(JSON.stringify(createInitialState(T0, 5))) as Record<string, any>
    raw.version = 8
    delete raw.onboarding
    delete raw.onboardingClaimed
    patch(raw)
    return raw
  }

  it('erfarne spillere slipper sjekklista', () => {
    for (const patch of [
      (r: Record<string, any>) => void (r.lifetime.shiftsCompleted = 3),
      (r: Record<string, any>) => void (r.lifetime.dilemmasResolved = 1),
      (r: Record<string, any>) => void (r.prestige.rotations = 1),
    ]) {
      const m = migrateGameState(v8(patch), T0)
      expect(m.version).toBe(STATE_VERSION)
      expect(STATE_VERSION).toBe(9)
      expect(m.onboardingClaimed).toBe(true)
      expect(m.onboarding.dismissed).toBe(true)
      expect(onboardingVisible(m)).toBe(false)
      // De får ingen bonus de ikke har hentet.
      expect(m.resources.kaffekopper).toBe(createInitialState(T0, 5).resources.kaffekopper)
    }
  })

  it('en lagring som aldri har fullført en vakt eller løst et dilemma, får sjekklista', () => {
    const m = migrateGameState(v8(() => {}), T0)
    expect(m.onboarding).toEqual(defaultOnboarding())
    expect(m.onboardingClaimed).toBe(false)
    expect(onboardingVisible(m)).toBe(true)
  })

  it('er idempotent, og rører ikke en v9-lagring som allerede har tatt stilling', () => {
    const m = migrateGameState(v8((r) => void (r.lifetime.shiftsCompleted = 2)), T0)
    expect(migrateGameState(JSON.parse(JSON.stringify(m)), T0)).toEqual(m)
    // En ny spiller i v9 som har spilt et døgn, beholder fremdriften sin.
    const playing = fresh()
    playing.onboarding.filledShift = true
    playing.lifetime.shiftsCompleted = 5
    const again = migrateGameState(JSON.parse(JSON.stringify(playing)), T0)
    expect(again.onboarding).toMatchObject({ filledShift: true, resolvedDilemma: false, dismissed: false })
    expect(again.onboardingClaimed).toBe(false)
  })
})
