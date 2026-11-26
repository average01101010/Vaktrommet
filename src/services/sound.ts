import type { ShiftId, WardTypeId } from '@/types'

/**
 * Lyden i Vaktrommet: generativ bakgrunnsmusikk, et lavt vaktroms-sus og
 * korte lydeffekter. Alt lages i sanntid med Web Audio – ingen lydfiler.
 *
 * Tjenesten er «best effort»: mangler nettleseren Web Audio (eller kjører
 * koden i en test uten nettleser), skjer det ingenting. Ingenting her leser
 * eller endrer spilltilstanden; den får bare vite hvordan situasjonen er.
 */

export type SoundCue =
  | 'tap' | 'good' | 'bad'
  /** Ny lapp på korktavla / et dilemma er løst */
  | 'paper' | 'stamp'
  /** ID-kort klikkes på plass i turnusen */
  | 'card'
  /** Ringesnor: en varsellampe tennes over en pasientdør */
  | 'chime'
  /** Kaffekopp settes ned (Morgenkaffe, kjøp) */
  | 'cup'
  /** Ny synergi, takkekort eller nytt avdelingsnivå */
  | 'fanfare'

/** Det lydbildet får vite om situasjonen i spillet. */
export interface SoundScene {
  shift: ShiftId
  ward: WardTypeId
  /** Dekning 0–1 på vakta som går. */
  coverage: number
  /** Snittstress 0–100 blant dem som er på vakt. */
  avgStress: number
  /** Er det noen på jobb? En ubemannet vakt er maks press. */
  staffed: boolean
  /** Spillminutter til vaktskiftet. */
  minutesToShiftEnd: number
}

export interface SoundSettings {
  /** Lydeffekter */
  sound: boolean
  /** Musikk og atmosfære */
  music: boolean
}

// ---------------------------------------------------------------------------
// Musikalske stemninger – rene data, så de kan testes uten lyd
// ---------------------------------------------------------------------------

export interface Mood {
  /** Grunntone (MIDI) og skalaens trinn i halvtoner. */
  root: number
  scale: number[]
  /** Sekunder per slag. */
  beat: number
  /** Sannsynlighet for en pianotone på et slag. */
  density: number
  /** Laveste og høyeste skalatrinn melodien beveger seg mellom. */
  range: [number, number]
  /** Hvor lenge en pianotone klinger (sekunder). */
  ring: [number, number]
  /** Slag mellom hver ny akkord i teppet av strykere. */
  chordBeats: [number, number]
  /** Styrken på akkordteppet og hvor mye som sendes til romklangen. */
  pad: number
  reverb: number
  /** Lyshet i klangen (1 = nøytral). */
  bright: number
}

export const MOODS: Record<ShiftId, Mood> = {
  // Dag: lys og varm lydisk pentatonikk i F, rolig gange
  dag: { root: 53, scale: [0, 2, 4, 6, 7, 9], beat: 0.78, density: 0.44, range: [5, 15], ring: [2.2, 4], chordBeats: [6, 10], pad: 1, reverb: 0.32, bright: 1.1 },
  // Aften: lun dorisk i D, litt saktere og mykere
  aften: { root: 50, scale: [0, 2, 3, 5, 7, 9, 10], beat: 0.95, density: 0.33, range: [5, 14], ring: [3, 5], chordBeats: [7, 11], pad: 0.9, reverb: 0.42, bright: 0.85 },
  // Natt: enkelttoner i a-moll med lang klang og mye stillhet
  natt: { root: 45, scale: [0, 3, 5, 7, 10], beat: 1.5, density: 0.13, range: [5, 12], ring: [6, 9], chordBeats: [10, 16], pad: 0.55, reverb: 0.7, bright: 0.65 },
}

/** Klangfarge per avdelingstype: filteråpning og hvor mye overtoner pianoet får. */
export const TIMBRES: Record<WardTypeId, { cut: number; overtones: number }> = {
  sykehjem: { cut: 1, overtones: 1 },
  demens: { cut: 0.68, overtones: 0.55 },
  lindrende: { cut: 0.62, overtones: 0.45 },
  korttid: { cut: 1.4, overtones: 1.5 },
  bofellesskap: { cut: 1.15, overtones: 1.15 },
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

/** 0–1: hvor presset avdelingen er. Styrer basspulsen under musikken. */
export function tensionOf(scene: SoundScene): number {
  if (!scene.staffed) return 1
  return clamp01(Math.max((0.85 - scene.coverage) / 0.45, (scene.avgStress - 35) / 40))
}

/** 0–1: hvor tydelig veggklokka tikker. Svakt hele natta, og den siste timen før vaktskifte. */
export function clockLevelOf(scene: SoundScene): number {
  const beforeHandover = clamp01((60 - scene.minutesToShiftEnd) / 45)
  return Math.max(scene.shift === 'natt' ? 0.7 : 0, beforeHandover)
}

/** Skalatrinn → MIDI-tone, over flere oktaver. */
export function degreeToMidi(mood: Mood, degree: number): number {
  const n = mood.scale.length
  return mood.root + 12 * Math.floor(degree / n) + mood.scale[((degree % n) + n) % n]
}

const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12)

// ---------------------------------------------------------------------------
// Motoren
// ---------------------------------------------------------------------------

const MUSIC_LEVEL = 0.62
const SFX_LEVEL = 0.9
const LOOKAHEAD = 0.6

export class SoundEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private sfxBus!: GainNode
  private reverb!: ConvolverNode
  private echo!: GainNode
  private analyser: AnalyserNode | null = null
  private noise!: AudioBuffer
  private settings: SoundSettings = { sound: true, music: true }
  private scene: SoundScene = { shift: 'dag', ward: 'sykehjem', coverage: 1, avgStress: 20, staffed: true, minutesToShiftEnd: 240 }
  private timer: ReturnType<typeof setInterval> | null = null
  private hidden = false
  // ---- Tilstanden i musikken ----
  private nextBeat = 0
  private beatIndex = 0
  private nextChordBeat = 0
  private chord: number[] = [0, 2, 4]
  private melody = 9
  private tension = 0
  private nextTick = 0
  private tock = false
  private lastCue = new Map<SoundCue, number>()
  /** Tellere til feilsøking og test. */
  private stats = { notes: 0, chords: 0, pulses: 0, ticks: 0, cues: 0 }

  // -------------------------------------------------------------------------
  // Oppsett
  // -------------------------------------------------------------------------

  /** Lager lydgrafen. Kalles første gang spilleren rører noe (nettleserens autoplay-regler). */
  private setup(): boolean {
    if (this.ctx) return true
    if (typeof window === 'undefined') return false
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return false
    const ctx = new Ctor()
    this.ctx = ctx

    // Master: alt går gjennom en kompressor, så ingenting stikker seg ut.
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -20
    comp.knee.value = 24
    comp.ratio.value = 3.5
    comp.attack.value = 0.01
    comp.release.value = 0.3
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    comp.connect(this.master).connect(ctx.destination)
    if (typeof ctx.createAnalyser === 'function') {
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = 1024
      this.master.connect(this.analyser)
    }

    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = 0
    this.musicBus.connect(comp)
    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = this.settings.sound ? SFX_LEVEL : 0
    this.sfxBus.connect(comp)

    // Romklang: et impulssvar av støy som dør ut
    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.impulse(ctx, 3.2)
    const wet = ctx.createGain()
    wet.gain.value = 0.9
    this.reverb.connect(wet).connect(this.musicBus)

    // Stereo-ekko: to forsinkelser som svarer hverandre, hver sin side
    this.echo = ctx.createGain()
    const left = ctx.createDelay(1.5)
    const right = ctx.createDelay(1.5)
    left.delayTime.value = 0.42
    right.delayTime.value = 0.63
    const feedback = ctx.createGain()
    feedback.gain.value = 0.3
    const damp = ctx.createBiquadFilter()
    damp.type = 'lowpass'
    damp.frequency.value = 2200
    this.echo.connect(left)
    left.connect(right)
    right.connect(damp).connect(feedback).connect(left)
    this.pan(left, -0.6).connect(this.musicBus)
    this.pan(right, 0.6).connect(this.musicBus)
    right.connect(this.reverb)

    // Støy til sus, tikk og foley
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.startRoomTone(ctx)
    return true
  }

  private impulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds)
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6)
    }
    return buffer
  }

  /** Plasserer en lyd i stereobildet (der nettleseren støtter det). */
  private pan(node: AudioNode, value: number): AudioNode {
    const ctx = this.ctx!
    if (typeof ctx.createStereoPanner !== 'function') return node
    const panner = ctx.createStereoPanner()
    panner.pan.value = value
    node.connect(panner)
    return panner
  }

  /** Vaktroms-sus: lavt, filtrert støy som ligger helt i bakgrunnen. */
  private startRoomTone(ctx: AudioContext): void {
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 380
    const high = ctx.createBiquadFilter()
    high.type = 'highpass'
    high.frequency.value = 80
    const gain = ctx.createGain()
    gain.gain.value = 0.028
    src.connect(low).connect(high).connect(gain).connect(this.musicBus)
    src.start()
  }

  // -------------------------------------------------------------------------
  // Styring utenfra
  // -------------------------------------------------------------------------

  /** Første berøring: start lyden (eller ta den opp igjen etter at nettleseren satte den på vent). */
  unlock(): void {
    try {
      if (!this.settings.sound && !this.settings.music) return
      if (!this.setup() || this.hidden) return
      if (this.ctx!.state === 'suspended') void this.ctx!.resume()
      this.applyLevels()
    } catch {
      // Lyd er pynt – aldri la det stoppe spillet.
    }
  }

  setSettings(next: SoundSettings): void {
    const changed = next.sound !== this.settings.sound || next.music !== this.settings.music
    this.settings = { sound: next.sound, music: next.music }
    if (changed && this.ctx) {
      try {
        this.applyLevels()
      } catch {
        // –
      }
    }
  }

  setScene(scene: SoundScene): void {
    this.scene = scene
  }

  /** Fanen skjules: lyden settes på vent. Kommer den fram igjen, fortsetter den der den slapp. */
  setHidden(hidden: boolean): void {
    this.hidden = hidden
    const ctx = this.ctx
    if (!ctx) return
    try {
      if (hidden) {
        this.stopScheduler()
        void ctx.suspend()
      } else if (this.settings.sound || this.settings.music) {
        void ctx.resume()
        this.applyLevels()
      }
    } catch {
      // –
    }
  }

  /** Myk fade inn og ut når bryterne endres, og start/stopp av den generative musikken. */
  private applyLevels(): void {
    const ctx = this.ctx!
    const now = ctx.currentTime
    this.sfxBus.gain.cancelScheduledValues(now)
    this.sfxBus.gain.setTargetAtTime(this.settings.sound ? SFX_LEVEL : 0, now, 0.08)
    this.musicBus.gain.cancelScheduledValues(now)
    this.musicBus.gain.setTargetAtTime(this.settings.music ? MUSIC_LEVEL : 0, now, this.settings.music ? 0.9 : 0.45)
    if (this.settings.music && !this.hidden) this.startScheduler()
    else this.stopScheduler()
  }

  private startScheduler(): void {
    if (this.timer || !this.ctx) return
    const now = this.ctx.currentTime
    this.nextBeat = now + 0.25
    this.nextTick = now + 0.5
    this.timer = setInterval(() => this.schedule(), 200)
  }

  private stopScheduler(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** Tilstanden akkurat nå – til feilsøking og test i nettleseren. */
  debug(): { state: string; shift: ShiftId; ward: WardTypeId; tension: number; clock: number; playing: boolean; level: number; stats: SoundEngine['stats'] } {
    let level = 0
    if (this.analyser) {
      const data = new Float32Array(this.analyser.fftSize)
      this.analyser.getFloatTimeDomainData(data)
      level = Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length)
    }
    return {
      state: this.ctx?.state ?? 'ingen',
      shift: this.scene.shift,
      ward: this.scene.ward,
      tension: Math.round(this.tension * 100) / 100,
      clock: clockLevelOf(this.scene),
      playing: this.timer !== null,
      level,
      stats: { ...this.stats },
    }
  }

  // -------------------------------------------------------------------------
  // Generativ musikk
  // -------------------------------------------------------------------------

  /** Legger ut det som skal klinge den neste halve sekundet. Kalles fem ganger i sekundet. */
  private schedule(): void {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    try {
      const horizon = ctx.currentTime + LOOKAHEAD
      // Etter en pause (fanen var skjult) starter vi på nytt herfra, ikke med et skred av gamle slag.
      if (this.nextBeat < ctx.currentTime - 0.5) this.nextBeat = ctx.currentTime + 0.1
      if (this.nextTick < ctx.currentTime - 0.5) this.nextTick = ctx.currentTime + 0.1
      // Presset glir sakte inn og ut, så basspulsen aldri kommer brått.
      this.tension += (tensionOf(this.scene) - this.tension) * 0.06
      while (this.nextBeat < horizon) {
        const mood = MOODS[this.scene.shift]
        this.beat(this.nextBeat, mood)
        this.nextBeat += mood.beat
      }
      while (this.nextTick < horizon) {
        this.tick(this.nextTick)
        this.nextTick += 1
      }
    } catch {
      // –
    }
  }

  private beat(t: number, mood: Mood): void {
    const timbre = TIMBRES[this.scene.ward]
    const n = mood.scale.length
    this.beatIndex++

    // ---- Akkordteppet: en ny, åpen akkord av skalaens egne toner ----
    if (this.beatIndex >= this.nextChordBeat) {
      const roots = [0, 0, 3, 4, 5, 2].map((d) => d % n)
      const base = roots[Math.floor(Math.random() * roots.length)]
      this.chord = [base, base + 2, base + 4, ...(Math.random() < 0.5 ? [base + 6] : [])]
      const beats = mood.chordBeats[0] + Math.floor(Math.random() * (mood.chordBeats[1] - mood.chordBeats[0] + 1))
      this.nextChordBeat = this.beatIndex + beats
      this.padChord(t, this.chord.map((d) => degreeToMidi(mood, d + n) - 12), beats * mood.beat, mood, timbre)
      this.stats.chords++
    }

    // ---- Melodien: en tilfeldig vandring som helst lander på akkordens toner ----
    const strong = this.beatIndex % 2 === 0
    if (Math.random() < mood.density * (strong ? 1.25 : 0.75)) {
      const step = [-2, -1, -1, 1, 1, 2, 3, -3][Math.floor(Math.random() * 8)]
      let next = this.melody + step
      if (next < mood.range[0]) next = mood.range[0] + 1 + Math.floor(Math.random() * 3)
      if (next > mood.range[1]) next = mood.range[1] - 1 - Math.floor(Math.random() * 3)
      if (strong && Math.random() < 0.6) {
        // Trekk mot nærmeste akkordtone
        const tones = this.chord.map((d) => ((d % n) + n) % n)
        for (const delta of [0, 1, -1]) {
          if (tones.includes((((next + delta) % n) + n) % n)) {
            next += delta
            break
          }
        }
      }
      this.melody = next
      const humanize = (Math.random() - 0.5) * 0.04
      const ring = mood.ring[0] + Math.random() * (mood.ring[1] - mood.ring[0])
      const velocity = 0.55 + Math.random() * 0.45
      this.piano(t + 0.02 + humanize, degreeToMidi(mood, next), velocity, ring, mood, timbre, this.musicBus)
      // Av og til en tone til: en ters over, eller et lite ekko et halvt slag senere
      const extra = Math.random()
      if (extra < 0.18) this.piano(t + 0.03 + humanize, degreeToMidi(mood, next + 2), velocity * 0.6, ring, mood, timbre, this.musicBus)
      else if (extra < 0.3) this.piano(t + mood.beat / 2, degreeToMidi(mood, next + (Math.random() < 0.5 ? 1 : -1)), velocity * 0.5, ring * 0.8, mood, timbre, this.musicBus)
      this.stats.notes++
    }

    // ---- Press: en dempet basspuls som kommer og går med dekning og stress ----
    if (this.tension > 0.12) {
      this.pulse(t, hz(mood.root - 12), 0.11 * this.tension)
      if (this.tension > 0.55) this.pulse(t + mood.beat / 2, hz(mood.root - 12), 0.06 * this.tension)
      this.stats.pulses++
    }
  }

  /** Rhodes/filtpiano: sinus med litt overtoner og en kort klokkeklang i anslaget. */
  private piano(t: number, midi: number, velocity: number, ring: number, mood: Mood, timbre: { cut: number; overtones: number }, out: AudioNode): void {
    const ctx = this.ctx!
    const f = hz(midi)
    const gain = ctx.createGain()
    const peak = 0.085 * velocity
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(peak * 0.45, t + 0.25)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ring)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = Math.min(9000, 1700 * mood.bright * timbre.cut + f)
    filter.Q.value = 0.4
    const partials: [number, OscillatorType, number, number][] = [
      [1, 'sine', 1, ring],
      [1.003, 'triangle', 0.28, ring],
      [2, 'sine', 0.22 * timbre.overtones * mood.bright, ring * 0.6],
      // Klokkeklangen i anslaget, som på en Rhodes
      [4, 'sine', 0.09 * timbre.overtones * mood.bright, 0.35],
    ]
    for (const [ratio, type, level, length] of partials) {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.value = f * ratio
      const part = ctx.createGain()
      part.gain.setValueAtTime(level, t)
      part.gain.exponentialRampToValueAtTime(0.0001, t + length)
      osc.connect(part).connect(filter)
      osc.start(t)
      osc.stop(t + length + 0.05)
    }
    filter.connect(gain)
    const placed = this.pan(gain, (Math.random() - 0.5) * 0.7)
    placed.connect(out)
    const send = ctx.createGain()
    send.gain.value = mood.reverb
    placed.connect(send).connect(this.reverb)
    const echo = ctx.createGain()
    echo.gain.value = 0.22
    placed.connect(echo).connect(this.echo)
  }

  /** Varmt akkordteppe: lett forstemte sagtenner gjennom et lukket filter, som svulmer sakte opp. */
  private padChord(t: number, midis: number[], seconds: number, mood: Mood, timbre: { cut: number; overtones: number }): void {
    const ctx = this.ctx!
    const attack = Math.min(3, seconds * 0.4)
    const release = 4.5
    const gain = ctx.createGain()
    const peak = 0.02 * mood.pad
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.linearRampToValueAtTime(peak, t + attack)
    gain.gain.setValueAtTime(peak, t + seconds)
    gain.gain.linearRampToValueAtTime(0.0001, t + seconds + release)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 620 * mood.bright * timbre.cut
    filter.Q.value = 0.5
    for (const midi of midis) {
      for (const cents of [-7, 6]) {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.value = hz(midi)
        osc.detune.value = cents
        osc.connect(filter)
        osc.start(t)
        osc.stop(t + seconds + release + 0.1)
      }
    }
    filter.connect(gain)
    gain.connect(this.musicBus)
    const send = ctx.createGain()
    send.gain.value = 0.6
    gain.connect(send).connect(this.reverb)
  }

  private pulse(t: number, freq: number, level: number): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * 1.06, t)
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.08)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), t + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    osc.connect(gain).connect(this.musicBus)
    osc.start(t)
    osc.stop(t + 0.55)
  }

  /** Veggklokka: tikk og takk, bare når natta eller vaktskiftet gjør den hørbar. */
  private tick(t: number): void {
    const level = clockLevelOf(this.scene)
    this.tock = !this.tock
    if (level < 0.03) return
    this.burst(t, 0.016, 'bandpass', this.tock ? 1900 : 2500, 6, 0.05 * level, this.musicBus)
    this.stats.ticks++
  }

  // -------------------------------------------------------------------------
  // Lydeffekter
  // -------------------------------------------------------------------------

  /** Et kort støt av filtrert støy – grunnstoffet i papir, klikk og stempel. */
  private burst(t: number, seconds: number, type: BiquadFilterType, freq: number, q: number, level: number, out: AudioNode, sweepTo?: number): void {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(freq, t)
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + seconds)
    filter.Q.value = q
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(level, t + Math.min(0.004, seconds / 3))
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
    src.connect(filter).connect(gain).connect(out)
    src.start(t, Math.random() * 1.5)
    src.stop(t + seconds + 0.02)
  }

  private tone(t: number, freq: number, seconds: number, level: number, type: OscillatorType = 'sine', glideTo?: number, wet = 0): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + seconds)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(level, t + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
    osc.connect(gain).connect(this.sfxBus)
    if (wet > 0) {
      const send = ctx.createGain()
      send.gain.value = wet
      gain.connect(send).connect(this.reverbFor())
    }
    osc.start(t)
    osc.stop(t + seconds + 0.03)
  }

  /** Romklang for lydeffekter: samme rom, men styrt av effektbryteren. */
  private sfxReverb: ConvolverNode | null = null
  private reverbFor(): AudioNode {
    if (!this.sfxReverb) {
      this.sfxReverb = this.ctx!.createConvolver()
      this.sfxReverb.buffer = this.reverb.buffer
      const wet = this.ctx!.createGain()
      wet.gain.value = 0.7
      this.sfxReverb.connect(wet).connect(this.sfxBus)
    }
    return this.sfxReverb
  }

  /** Spiller en lydeffekt. Trygg å kalle når som helst – uten lydstøtte skjer ingenting. */
  play(cue: SoundCue): void {
    if (!this.settings.sound || this.hidden) return
    try {
      if (!this.setup()) return
      const ctx = this.ctx!
      if (ctx.state === 'suspended') void ctx.resume()
      // Samme effekt flere ganger i samme øyeblikk blir bare støy.
      const last = this.lastCue.get(cue) ?? -1
      if (ctx.currentTime - last < 0.05) return
      this.lastCue.set(cue, ctx.currentTime)
      this.stats.cues++
      const t = ctx.currentTime + 0.01
      const out = this.sfxBus
      switch (cue) {
        case 'tap':
          this.tone(t, 620, 0.07, 0.04)
          break
        case 'good':
          this.tone(t, 660, 0.14, 0.05)
          this.tone(t + 0.09, 880, 0.22, 0.05, 'sine', undefined, 0.2)
          break
        case 'bad':
          this.tone(t, 196, 0.22, 0.07, 'triangle', 170)
          break
        case 'paper':
          // En lapp som rives av blokka og festes
          this.burst(t, 0.09, 'bandpass', 3400, 0.8, 0.13, out, 1500)
          this.burst(t + 0.07, 0.12, 'bandpass', 2200, 0.7, 0.1, out, 4200)
          this.burst(t + 0.2, 0.02, 'highpass', 1800, 0.5, 0.09, out)
          break
        case 'stamp':
          // Dump dunk i bordplata, og et lite smekk fra stempelputa
          this.tone(t, 150, 0.14, 0.15, 'sine', 55)
          this.burst(t, 0.05, 'lowpass', 900, 0.5, 0.09, out)
          this.burst(t + 0.012, 0.03, 'bandpass', 2600, 1.2, 0.05, out)
          break
        case 'card':
          // Plastkort som klikker ned i kortholderen
          this.burst(t, 0.014, 'highpass', 2600, 0.7, 0.09, out)
          this.tone(t, 1850, 0.03, 0.035, 'triangle')
          this.burst(t + 0.05, 0.012, 'highpass', 3400, 0.7, 0.05, out)
          this.tone(t + 0.05, 2400, 0.025, 0.02, 'triangle')
          break
        case 'chime':
          // Ringesnor: to myke toner, den andre litt lavere
          for (const [at, freq] of [[0, 784], [0.32, 659.3]] as const) {
            this.tone(t + at, freq, 1.1, 0.055, 'sine', undefined, 0.5)
            this.tone(t + at, freq * 2, 0.5, 0.012, 'sine')
          }
          break
        case 'cup':
          // Keramikk mot bord
          this.tone(t, 2150, 0.09, 0.05)
          this.tone(t, 3240, 0.06, 0.03)
          this.tone(t, 320, 0.06, 0.07, 'sine', 180)
          this.burst(t, 0.02, 'bandpass', 4200, 1.5, 0.04, out)
          break
        case 'fanfare': {
          // En varm akkord som brettes ut tone for tone
          const mood = MOODS.dag
          const timbre = { cut: 1.1, overtones: 1.2 }
          ;[53, 57, 60, 64, 67, 72].forEach((midi, i) => this.piano(t + i * 0.085, midi, 0.9 - i * 0.05, 2.6, mood, timbre, out))
          break
        }
      }
    } catch {
      // Lyd er pynt – aldri la det stoppe spillet.
    }
  }
}

/** Spillets ene lydmotor. */
export const sound = new SoundEngine()
