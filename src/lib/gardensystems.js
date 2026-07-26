// Garden systems: aquaponics, drying, curing. EVERY number here is a PLANNING
// ESTIMATE (steady-state heuristic), never engineering. The UI must always show
// the "validate before building" framing. All derived values are computed from
// the footprint + config — never stored — so they can't drift.
import { AQUAPONICS, STATIONS, GARDEN_SYSTEM_CATALOG } from '../config.js'
import { plantSpacing } from './companions.js'

export const GARDEN_SYSTEM_BY_KIND = Object.fromEntries(GARDEN_SYSTEM_CATALOG.map((s) => [s.kind, s]))

/** Kind-specific sizing INPUT defaults (stored in system.config). */
export function systemDefaults(kind) {
  if (kind === 'aquaponics') {
    return { growbedToTankRatio: AQUAPONICS.GROWBED_TO_TANK_RATIO, growbedDepthIn: AQUAPONICS.GROWBED_DEPTH_IN }
  }
  return {}
}

const round = (n) => Math.round(n)

/** Aquaponics sizing — bed:tank ratio holds as the footprint changes. */
export function computeAquaponics(system) {
  const cfg = { ...systemDefaults('aquaponics'), ...(system.config || {}) }
  const ratio = cfg.growbedToTankRatio || 1
  const depthIn = cfg.growbedDepthIn || AQUAPONICS.GROWBED_DEPTH_IN

  const areaSqFt = (system.w * system.d) / 144
  const bedVolCuFt = areaSqFt * (depthIn / 12)
  const bedVolGal = bedVolCuFt * AQUAPONICS.GAL_PER_CUBIC_FT
  const tankVolGal = bedVolGal / ratio
  const fishLoadLb = tankVolGal / AQUAPONICS.FISH_GAL_PER_LB
  const sumpGal = tankVolGal * AQUAPONICS.SUMP_FRACTION_OF_TANK

  const s = plantSpacing('herb_leafy')
  const herbCapacity = Math.floor(system.w / s) * Math.floor(system.d / s)
  const beds = Math.max(1, Math.round(areaSqFt / 16))

  return {
    ratio,
    depthIn,
    growBedAreaSqFt: round(areaSqFt),
    growBedVolumeGal: round(bedVolGal),
    tankVolumeGal: round(tankVolGal),
    fishLoadLb: round(fishLoadLb),
    sumpGal: round(sumpGal),
    herbCapacity,
    parts: [
      { item: 'Fish tank', qty: 1 },
      { item: 'Media grow bed(s)', qty: beds },
      { item: 'Sump (optional)', qty: 1 },
      { item: 'Water pump', qty: 1 },
      { item: 'Air pump + stones', qty: 1 },
      { item: 'Bell siphon or timer', qty: beds },
      { item: `Grow media (~${round(bedVolCuFt)} cu ft)`, qty: 1 },
      { item: 'Plumbing (bulkheads, uniseals, pipe)', qty: 1 },
      { item: 'Water test kit', qty: 1 },
      { item: 'Tank heater (climate-dependent)', qty: 1 },
    ],
  }
}

export function computeDrying(system) {
  const gap = STATIONS.drying.HANG_SPACING_IN
  const hangSlots = Math.max(0, Math.floor(system.w / gap) * Math.max(1, Math.floor(system.d / (gap * 2))))
  return {
    capacityLabel: `~${hangSlots} hanging spots`,
    target: STATIONS.drying.TARGET,
    parts: STATIONS.drying.PARTS.map((item) => ({ item, qty: 1 })),
  }
}

export function computeCuring(system) {
  const f = STATIONS.curing.JAR_FOOTPRINT_IN
  const jars = Math.floor(system.w / f) * Math.floor(system.d / f)
  return {
    capacityLabel: `~${jars} jars / containers`,
    target: STATIONS.curing.TARGET,
    parts: STATIONS.curing.PARTS.map((item) => ({ item, qty: 1 })),
  }
}

/** One entry point for any system kind. */
export function computeSystem(system) {
  if (system.kind === 'aquaponics') return { kind: 'aquaponics', ...computeAquaponics(system) }
  if (system.kind === 'drying') return { kind: 'drying', ...computeDrying(system) }
  if (system.kind === 'curing') return { kind: 'curing', ...computeCuring(system) }
  return { kind: system.kind, parts: [] }
}
