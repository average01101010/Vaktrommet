import { describe, expect, it } from 'vitest'
import type { AgentInput } from '../scene/agents'
import { bedRoomId, buildFloorPlan, MAX_BEDS, roomAt, routeBetween, type PlanRoom } from './floorPlan'
import { mealAt, nextMeal, PlanCrowd, type PlanContext, type PlanResidentInput } from './planAgents'

const overlap = (a: PlanRoom, b: PlanRoom) => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6

describe('planløsningen', () => {
  it('gir hver seng sitt eget rom, og resten står som byggetomter', () => {
    for (const beds of [8, 11, 14]) {
      const plan = buildFloorPlan('sykehjem', beds)
      const rooms = plan.rooms.filter((r) => r.kind === 'beboer')
      expect(rooms.map((r) => r.bed)).toEqual(Array.from({ length: beds }, (_, i) => i + 1))
      expect(plan.rooms.filter((r) => r.kind === 'tomt')).toHaveLength(MAX_BEDS - beds)
      expect(new Set(plan.rooms.map((r) => r.id)).size).toBe(plan.rooms.length)
    }
  })

  it('har alle fellesrommene, og ingen rom overlapper hverandre eller korridoren', () => {
    const plan = buildFloorPlan('demens', 11)
    for (const kind of ['vaktrom', 'medisinrom', 'kontor', 'moterom', 'kjokken', 'spisestue', 'stue']) expect(plan.byId[kind]).toBeDefined()
    const corridor = { ...plan.corridor, id: 'korridor' } as unknown as PlanRoom
    for (const a of plan.rooms) {
      expect(overlap(a, corridor)).toBe(false)
      for (const b of plan.rooms) if (a !== b) expect(overlap(a, b)).toBe(false)
    }
  })

  it('legger døra mot korridoren og alle plasser inne i rommet', () => {
    const plan = buildFloorPlan('sykehjem', 14)
    for (const r of plan.rooms) {
      expect(r.door[1]).toBeCloseTo(r.side === 'nord' ? plan.corridor.y : plan.corridor.y + plan.corridor.h)
      expect(r.door[0]).toBeGreaterThan(r.x)
      expect(r.door[0]).toBeLessThan(r.x + r.w)
      for (const [x, y] of Object.values(r.spots)) expect(roomAt(plan, x, y)?.id).toBe(r.id)
    }
  })

  it('bygger utover: det som er bygd blir bredere med flere senger', () => {
    expect(buildFloorPlan('sykehjem', 8).builtW).toBeLessThan(buildFloorPlan('sykehjem', 11).builtW)
    expect(buildFloorPlan('sykehjem', 14).builtW).toBeCloseTo(buildFloorPlan('sykehjem', 14).w)
  })

  it('leder gangveien ut døra, gjennom korridoren og inn neste dør', () => {
    const plan = buildFloorPlan('sykehjem', 8)
    const from = plan.byId[bedRoomId(1)]
    const to = plan.byId.spisestue
    const path = routeBetween(plan, from.spots.seng, from.id, to.spots.sete1, to.id)
    expect(path).toHaveLength(5)
    // De to midterste punktene ligger i korridoren.
    for (const [, y] of path.slice(1, 3)) {
      expect(y).toBeGreaterThan(plan.corridor.y)
      expect(y).toBeLessThan(plan.corridor.y + plan.corridor.h)
    }
    expect(path.at(-1)).toEqual(to.spots.sete1)
    expect(routeBetween(plan, from.spots.seng, from.id, from.spots.stol, from.id)).toEqual([from.spots.stol])
  })
})

describe('livet på kartet', () => {
  const residents: PlanResidentInput[] = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: i % 2 ? 'Olav' : 'Astrid',
    room: i + 1,
    profile: i === 7 ? 'palliasjon' : 'ernaering',
  }))
  const crew: AgentInput[] = [
    { id: 's1', profession: 'sykepleier', skin: 0, hair: 0, hairStyle: 0, accessory: 0, stress: 20, energy: 80 },
    { id: 's2', profession: 'assistent', skin: 1, hair: 1, hairStyle: 1, accessory: 0, stress: 20, energy: 80 },
  ]
  const ctx = (minuteOfDay: number, extra: Partial<PlanContext> = {}): PlanContext => ({ minuteOfDay, day: 0, night: false, rapport: false, urgency: 0, ...extra })
  const run = (crowd: PlanCrowd, seconds: number, c: PlanContext, plan = buildFloorPlan('sykehjem', 8)) => {
    for (let t = 0; t < seconds; t += 0.1) crowd.update(0.1, plan, residents, crew, { s1: 'Ingrid', s2: 'Thea' }, c)
  }

  it('kjenner måltidene', () => {
    expect(mealAt(8 * 60 + 45)?.name).toBe('Frokost')
    expect(mealAt(11 * 60)).toBeNull()
    expect(nextMeal(11 * 60)).toEqual({ name: 'Middag', inMinutes: 120 })
    expect(nextMeal(23 * 60).name).toBe('Frokost')
  })

  it('har alle beboerne i hver sin seng om natta', () => {
    const plan = buildFloorPlan('sykehjem', 8)
    const crowd = new PlanCrowd()
    run(crowd, 1, ctx(2 * 60, { night: true }), plan)
    const inBed = crowd.figures.filter((f) => f.kind === 'beboer')
    expect(inBed).toHaveLength(8)
    for (const f of inBed) {
      expect(f.pose).toBe('ligger')
      expect(f.room).toBe(bedRoomId(residents.find((r) => `b${r.id}` === f.key)!.room))
    }
  })

  it('samler beboerne i spisestua til måltid, mens den skrøpeligste får maten på rommet', () => {
    const plan = buildFloorPlan('sykehjem', 8)
    const crowd = new PlanCrowd()
    run(crowd, 1, ctx(2 * 60, { night: true }), plan)
    run(crowd, 90, ctx(13 * 60 + 10), plan)
    const at = (id: number) => crowd.find(`b${id}`)!
    for (let id = 1; id <= 7; id++) {
      expect(at(id).room).toBe('spisestue')
      expect(at(id).pose).toBe('sitter')
    }
    expect(at(8).room).toBe(bedRoomId(8))
    // Ingen deler stol.
    const seats = new Set(crowd.figures.filter((f) => f.room === 'spisestue' && f.kind === 'beboer').map((f) => `${f.x},${f.y}`))
    expect(seats.size).toBe(7)
  })

  it('setter pleierne rundt bordet i vaktrommet under rapporten', () => {
    const crowd = new PlanCrowd()
    run(crowd, 60, ctx(15 * 60, { rapport: true }))
    for (const f of crowd.figures.filter((x) => x.kind === 'ansatt')) {
      expect(f.room).toBe('vaktrom')
      expect(f.pose).toBe('sitter')
    }
  })

  it('tenner ringesnorer når vakta er presset, og en pleier rykker ut og slukker dem', () => {
    const crowd = new PlanCrowd()
    run(crowd, 1, ctx(10 * 60))
    run(crowd, 240, ctx(10 * 60, { urgency: 1 }))
    expect(crowd.rings).toBeGreaterThan(2)
    // Flere har ringt enn det lyser lamper nå: noen er besvart.
    expect(crowd.lamps.size).toBeLessThan(crowd.rings)
    expect(crowd.lamps.size).toBeLessThanOrEqual(4)
  })

  it('fjerner figurer som ikke lenger er på avdelingen', () => {
    const plan = buildFloorPlan('sykehjem', 8)
    const crowd = new PlanCrowd()
    crowd.update(0.1, plan, residents, crew, {}, ctx(10 * 60))
    expect(crowd.figures).toHaveLength(10)
    crowd.update(0.1, plan, residents.slice(0, 5), crew.slice(0, 1), {}, ctx(10 * 60))
    expect(crowd.figures).toHaveLength(6)
  })
})
