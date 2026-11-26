import { afterEach, describe, expect, it, vi } from 'vitest'
import { migrateGameState } from '@/engine/migrate'
import { createInitialState, defaultSettings, STATE_VERSION } from '@/engine/simulation'
import type { ShiftId, WardTypeId } from '@/types'
import { clockLevelOf, degreeToMidi, MOODS, SoundEngine, tensionOf, TIMBRES, type SoundCue, type SoundScene } from './sound'

const scene = (over: Partial<SoundScene> = {}): SoundScene => ({
  shift: 'dag',
  ward: 'sykehjem',
  coverage: 1,
  avgStress: 20,
  staffed: true,
  minutesToShiftEnd: 240,
  ...over,
})

const CUES: SoundCue[] = ['tap', 'good', 'bad', 'paper', 'stamp', 'card', 'chime', 'cup', 'fanfare']

/**
 * En liksom-AudioContext: alle noder og parametre finnes og kan kobles sammen,
 * men ingenting spilles. Teller det som blir laget, og lar testen flytte klokka.
 */
function fakeAudio() {
  const created: Record<string, number> = {}
  const param = () => {
    const p: Record<string, unknown> = { value: 0 }
    for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues']) p[m] = () => p
    return p
  }
  const node = (kind: string) => {
    created[kind] = (created[kind] ?? 0) + 1
    const n: Record<string, unknown> = { fftSize: 1024, buffer: null, loop: false, type: '' }
    for (const key of ['gain', 'frequency', 'detune', 'Q', 'pan', 'delayTime', 'threshold', 'knee', 'ratio', 'attack', 'release']) n[key] = param()
    n.connect = (target: unknown) => target
    n.start = () => undefined
    n.stop = () => undefined
    n.getFloatTimeDomainData = (data: Float32Array) => data.fill(0)
    return n
  }
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    state: 'running' as string,
    destination: node('destination'),
    resume: vi.fn(async () => void (ctx.state = 'running')),
    suspend: vi.fn(async () => void (ctx.state = 'suspended')),
    createBuffer: (channels: number, length: number) => ({ getChannelData: () => new Float32Array(length), numberOfChannels: channels }),
  } as Record<string, unknown> & { currentTime: number; state: string; resume: ReturnType<typeof vi.fn>; suspend: ReturnType<typeof vi.fn> }
  for (const kind of ['Gain', 'Oscillator', 'BiquadFilter', 'BufferSource', 'Convolver', 'Delay', 'DynamicsCompressor', 'StereoPanner', 'Analyser']) {
    ctx[`create${kind}`] = () => node(kind)
  }
  vi.stubGlobal('window', { AudioContext: function () { return ctx } })
  return { ctx, created }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('musikalske stemninger', () => {
  it('hver vakt har sin egen skala, og natta er roligst og tynnest', () => {
    const { dag, aften, natt } = MOODS
    expect(dag.scale).not.toEqual(aften.scale)
    expect(aften.scale).not.toEqual(natt.scale)
    // Dag: lys (stor ters og lydisk kvart). Aften og natt: liten ters.
    expect(dag.scale).toContain(4)
    expect(dag.scale).toContain(6)
    expect(aften.scale).toContain(3)
    expect(natt.scale).toContain(3)
    expect(dag.beat).toBeLessThan(aften.beat)
    expect(aften.beat).toBeLessThan(natt.beat)
    expect(natt.density).toBeLessThan(aften.density)
    expect(aften.density).toBeLessThan(dag.density)
    // Natta klinger lengst og har mest rom.
    expect(natt.ring[0]).toBeGreaterThan(dag.ring[1])
    expect(natt.reverb).toBeGreaterThan(dag.reverb)
  })

  it('skalatrinn gir toner i skalaen, over flere oktaver', () => {
    for (const shift of Object.keys(MOODS) as ShiftId[]) {
      const mood = MOODS[shift]
      for (let degree = mood.range[0] - 6; degree <= mood.range[1] + 6; degree++) {
        const midi = degreeToMidi(mood, degree)
        expect(mood.scale, `${shift} trinn ${degree}`).toContain((((midi - mood.root) % 12) + 12) % 12)
        expect(degreeToMidi(mood, degree + mood.scale.length)).toBe(midi + 12)
      }
      expect(degreeToMidi(mood, 0)).toBe(mood.root)
    }
  })

  it('spesialavdelingene har egen klangfarge', () => {
    expect(TIMBRES.demens.cut).toBeLessThan(TIMBRES.sykehjem.cut)
    expect(TIMBRES.lindrende.cut).toBeLessThan(TIMBRES.sykehjem.cut)
    expect(TIMBRES.korttid.cut).toBeGreaterThan(TIMBRES.sykehjem.cut)
    expect(TIMBRES.korttid.overtones).toBeGreaterThan(TIMBRES.demens.overtones)
    expect(Object.keys(TIMBRES).sort()).toEqual((['bofellesskap', 'demens', 'korttid', 'lindrende', 'sykehjem'] satisfies WardTypeId[]).sort())
  })

  it('press kommer av lav dekning, høyt stress eller ubemannet vakt', () => {
    expect(tensionOf(scene())).toBe(0)
    expect(tensionOf(scene({ coverage: 0.85, avgStress: 35 }))).toBe(0)
    expect(tensionOf(scene({ coverage: 0.6 }))).toBeGreaterThan(0.4)
    expect(tensionOf(scene({ avgStress: 75 }))).toBe(1)
    expect(tensionOf(scene({ staffed: false }))).toBe(1)
    expect(tensionOf(scene({ coverage: 0.7 }))).toBeGreaterThan(tensionOf(scene({ coverage: 0.8 })))
  })

  it('veggklokka høres om natta og den siste timen før vaktskifte', () => {
    expect(clockLevelOf(scene())).toBe(0)
    expect(clockLevelOf(scene({ shift: 'natt' }))).toBeGreaterThan(0.5)
    expect(clockLevelOf(scene({ minutesToShiftEnd: 70 }))).toBe(0)
    expect(clockLevelOf(scene({ minutesToShiftEnd: 30 }))).toBeGreaterThan(0.5)
    expect(clockLevelOf(scene({ minutesToShiftEnd: 5 }))).toBe(1)
  })
})

describe('lydmotoren', () => {
  it('gjør ingenting – og krasjer ikke – uten nettleser eller Web Audio', () => {
    const engine = new SoundEngine()
    engine.setSettings({ sound: true, music: true })
    engine.setScene(scene({ shift: 'natt', coverage: 0.4 }))
    engine.unlock()
    for (const cue of CUES) engine.play(cue)
    engine.setHidden(true)
    engine.setHidden(false)
    expect(engine.debug()).toMatchObject({ state: 'ingen', playing: false, level: 0 })

    vi.stubGlobal('window', {})
    expect(() => new SoundEngine().play('fanfare')).not.toThrow()
    expect(() => new SoundEngine().unlock()).not.toThrow()
  })

  it('starter først ved berøring, og spiller alle lydeffektene', () => {
    const { ctx, created } = fakeAudio()
    const engine = new SoundEngine()
    expect(engine.debug().state).toBe('ingen')
    engine.unlock()
    expect(engine.debug()).toMatchObject({ state: 'running', playing: true })
    // Masterbussen har kompressor, romklang og ekko.
    expect(created.DynamicsCompressor).toBe(1)
    expect(created.Convolver).toBeGreaterThanOrEqual(1)
    expect(created.Delay).toBe(2)

    for (const cue of CUES) {
      const before = (created.Oscillator ?? 0) + (created.BufferSource ?? 0)
      ctx.currentTime += 1
      engine.play(cue)
      expect((created.Oscillator ?? 0) + (created.BufferSource ?? 0), cue).toBeGreaterThan(before)
    }
    expect(engine.debug().stats.cues).toBe(CUES.length)
    // Samme effekt i samme øyeblikk spilles bare én gang.
    engine.play('tap')
    engine.play('tap')
    expect(engine.debug().stats.cues).toBe(CUES.length + 1)
  })

  it('musikken følger vakta, og basspulsen kommer bare under press', () => {
    vi.useFakeTimers()
    const { ctx } = fakeAudio()
    const engine = new SoundEngine()
    engine.setScene(scene())
    engine.unlock()
    const run = (seconds: number) => {
      for (let i = 0; i < seconds * 5; i++) {
        ctx.currentTime += 0.2
        vi.advanceTimersByTime(200)
      }
    }
    run(60)
    const day = engine.debug().stats
    expect(day.chords).toBeGreaterThan(3)
    expect(day.notes).toBeGreaterThan(15)
    expect(day.pulses).toBe(0)
    expect(day.ticks).toBe(0)

    // Natt: langt færre toner på like lang tid, og veggklokka tikker.
    engine.setScene(scene({ shift: 'natt' }))
    run(60)
    const night = engine.debug().stats
    expect(night.notes - day.notes).toBeLessThan(day.notes / 2)
    expect(night.ticks).toBeGreaterThan(40)
    expect(night.pulses).toBe(0)

    // Underdekning: pulsen glir inn …
    engine.setScene(scene({ coverage: 0.45 }))
    run(30)
    const pressed = engine.debug()
    expect(pressed.tension).toBeGreaterThan(0.6)
    expect(pressed.stats.pulses).toBeGreaterThan(10)
    // … og løser seg opp når turnusen er i balanse igjen.
    engine.setScene(scene())
    run(40)
    const calm = engine.debug()
    expect(calm.tension).toBeLessThan(0.05)
    const settled = calm.stats.pulses
    run(20)
    expect(engine.debug().stats.pulses).toBe(settled)
  })

  it('bryterne styrer hver sin del, og en skjult fane setter lyden på vent', () => {
    vi.useFakeTimers()
    const { ctx } = fakeAudio()
    const engine = new SoundEngine()
    engine.unlock()
    expect(engine.debug().playing).toBe(true)

    // Musikk av: den generative musikken stopper, lydeffektene virker fortsatt.
    engine.setSettings({ sound: true, music: false })
    expect(engine.debug().playing).toBe(false)
    ctx.currentTime += 1
    engine.play('card')
    expect(engine.debug().stats.cues).toBe(1)

    // Lydeffekter av: ingen effekter, men musikken kan gå.
    engine.setSettings({ sound: false, music: true })
    expect(engine.debug().playing).toBe(true)
    ctx.currentTime += 1
    engine.play('card')
    expect(engine.debug().stats.cues).toBe(1)

    engine.setHidden(true)
    expect(ctx.suspend).toHaveBeenCalledTimes(1)
    expect(engine.debug().playing).toBe(false)
    engine.setHidden(false)
    expect(ctx.resume).toHaveBeenCalled()
    expect(engine.debug().playing).toBe(true)

    // Alt av: ingenting startes, heller ikke ved berøring.
    const silent = new SoundEngine()
    silent.setSettings({ sound: false, music: false })
    silent.unlock()
    expect(silent.debug().state).toBe('ingen')
  })
})

describe('innstillinger for lyd', () => {
  const T0 = Date.UTC(2026, 10, 25, 8)

  it('nye spill har både lydeffekter og musikk på', () => {
    expect(defaultSettings()).toMatchObject({ sound: true, music: true })
  })

  it('eldre lagringer får musikkbryteren, og den arver valget for lyd', () => {
    for (const hadSound of [true, false]) {
      const old = JSON.parse(JSON.stringify(createInitialState(T0, 3)))
      old.version = 5
      old.settings = { sound: hadSound, haptics: false, notifications: true }
      const m = migrateGameState(old, T0)
      expect(m.version).toBe(STATE_VERSION)
      expect(m.settings).toEqual({ sound: hadSound, music: hadSound, haptics: false, notifications: true })
    }
    // Et valg som allerede er lagret, røres ikke.
    const kept = JSON.parse(JSON.stringify(createInitialState(T0, 3)))
    kept.settings = { sound: false, music: true, haptics: true, notifications: false }
    expect(migrateGameState(kept, T0).settings).toMatchObject({ sound: false, music: true })
  })
})
