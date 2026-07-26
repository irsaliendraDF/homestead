// Electrical PLANNING checks — surfaced as guidance, never certification. Every
// message says "reference"; confirm with the CEC/NBC and a licensed electrician.
import { ELECTRICAL } from '../config.js'

const allFixtures = (project) => project.levels.flatMap((l) => (l.fixtures || []).map((f) => ({ ...f, levelName: l.name, levelId: l.id })))
const roomsOfType = (project, type) => project.levels.flatMap((l) => (l.rooms || []).filter((r) => r.type === type).map((r) => ({ ...r, levelName: l.name })))
const hasKindOnLevel = (l, kind) => (l.fixtures || []).some((f) => f.kind === kind)

/**
 * Returns [{ severity: 'warn' | 'info', message }] — receptacle-per-circuit
 * limits, smoke/CO coverage, hallway switches, dedicated appliance circuits.
 */
export function electricalChecks(project) {
  const out = []
  const fixtures = allFixtures(project)
  const limit = ELECTRICAL.RECEPTACLES_PER_CIRCUIT

  // 1) Receptacles per circuit.
  const receptacles = fixtures.filter((f) => ELECTRICAL.RECEPTACLE_KINDS.includes(f.kind))
  const byCircuit = {}
  let unassigned = 0
  for (const r of receptacles) {
    if (r.circuit == null || r.circuit === '') unassigned++
    else byCircuit[r.circuit] = (byCircuit[r.circuit] || 0) + 1
  }
  for (const c of Object.keys(byCircuit)) {
    if (byCircuit[c] > limit) {
      out.push({ severity: 'warn', message: `Circuit ${c} has ${byCircuit[c]} receptacles — over your ${limit}-per-circuit limit (CEC allows up to 12 on a 15 A circuit).` })
    }
  }
  if (unassigned > 0 && receptacles.length > 0) {
    out.push({ severity: 'info', message: `${unassigned} receptacle${unassigned > 1 ? 's have' : ' has'} no circuit assigned — set a circuit number to track the ${limit}-per-circuit limit.` })
  }

  // 2) Smoke alarms: one per bedroom + one per storey, interconnected (NBC 9.10.19).
  const bedrooms = roomsOfType(project, 'Bedroom')
  const smokeCount = fixtures.filter((f) => f.kind === 'smoke_detector').length
  if (bedrooms.length > smokeCount) {
    out.push({ severity: 'warn', message: `${bedrooms.length} bedroom${bedrooms.length > 1 ? 's' : ''} but ${smokeCount} smoke alarm${smokeCount === 1 ? '' : 's'} — a smoke alarm is required in every bedroom (interconnected, NBC 9.10.19).` })
  }
  for (const l of project.levels) {
    if ((l.rooms || []).length && !hasKindOnLevel(l, 'smoke_detector')) {
      out.push({ severity: 'warn', message: `${l.name}: no smoke alarm — one is required on every storey.` })
    }
  }
  if (smokeCount > 1) out.push({ severity: 'info', message: 'Smoke alarms must be interconnected (all sound together) and hard-wired with battery backup.' })

  // 3) Hallway switches (+ 3-way for pass-throughs).
  for (const l of project.levels) {
    const halls = (l.rooms || []).filter((r) => r.type === 'Hall')
    if (halls.length && !hasKindOnLevel(l, 'switch') && !hasKindOnLevel(l, 'switch_3way')) {
      out.push({ severity: 'warn', message: `${l.name}: hallway lighting needs a wall switch.` })
    }
  }
  if (roomsOfType(project, 'Hall').length) {
    out.push({ severity: 'info', message: 'Use 3-way switches where a hallway, stair, or pass-through has two entrances (control the light from both ends).' })
  }

  // 4) Dedicated range circuit.
  const hasRange = project.levels.some((l) => (l.furniture || []).some((f) => f.kind === 'range') || (l.fixtures || []).some((f) => f.kind === 'range'))
  const hasRangePlug = fixtures.some((f) => f.kind === 'range_receptacle')
  if (hasRange && !hasRangePlug) {
    out.push({ severity: 'info', message: 'Electric range needs a dedicated 40 A / 240 V circuit — add a range plug.' })
  }

  // 5) CO alarm where there's a fuel-burning appliance / propane.
  const hasFuel = project.levels.some((l) => (l.fixtures || []).some((f) => f.system === 'gas' || f.kind === 'furnace'))
  const hasCo = fixtures.some((f) => f.kind === 'co_detector')
  if (hasFuel && !hasCo) {
    out.push({ severity: 'info', message: 'Fuel-burning appliance present — add a CO alarm near sleeping areas.' })
  }

  return out
}
