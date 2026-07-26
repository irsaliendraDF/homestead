// Furniture / fixtures placed inside the house. x,y = CENTER, rotation in 90°
// steps (like landscape objects). Everything here is display styling — the model
// stores only kind/position/size/rotation.
import { FURNITURE_CATALOG } from '../config.js'

export const FURNITURE_BY_KIND = Object.fromEntries(FURNITURE_CATALOG.map((f) => [f.kind, f]))

export const FURNITURE_CATEGORIES = ['appliance', 'cabinet', 'bath', 'storage', 'stairs']
export const CATEGORY_LABEL = { appliance: 'Appliances', cabinet: 'Cupboards', bath: 'Bathroom', storage: 'Closets & storage', stairs: 'Stairs' }

// 2D + 3D colors per category.
export const CATEGORY_STYLE = {
  appliance: { fill: '#C9CDD1', stroke: '#9BA1A6' },
  cabinet: { fill: '#CDB08A', stroke: '#A98D66' },
  bath: { fill: '#DCE3E6', stroke: '#AEBDC2' },
  storage: { fill: '#E2DCD0', stroke: '#B8AF9E' },
  stairs: { fill: '#C4BEB2', stroke: '#A39D90' },
}

export const isCloset = (kind) => ['closet', 'walkin_closet', 'linen_closet', 'wardrobe'].includes(kind)

export const furnitureStyle = (kind) => CATEGORY_STYLE[FURNITURE_BY_KIND[kind]?.category] || CATEGORY_STYLE.cabinet

// NBC 9.8 residential (private) stairs — adopted in Nova Scotia. Planning
// references (confirm exact edition/amendments + your AHJ). Metric → inches.
export const STAIR_CODE = {
  MAX_RISE_IN: 200 / 25.4, // 7-7/8"  (max riser)
  MIN_RISE_IN: 125 / 25.4, // 4-15/16" (min riser)
  MIN_RUN_IN: 255 / 25.4, //  10"     (min run / going)
  MIN_TREAD_IN: 255 / 25.4, // 10"    (min tread depth)
  MIN_HEADROOM_IN: 1950 / 25.4, // 6'-5"
  MIN_WIDTH_IN: 860 / 25.4, // 34"
  COMFORT_RUN_IN: 10.5, // a comfortable going to size to
}

/**
 * Code-aware stair calc for a straight flight. From the floor-to-floor rise and
 * the run (footprint depth), pick the number of risers so the riser height is
 * ≤ NBC max, then report rise / run and whether each is in range.
 */
export function stairSpec(totalRise, runDepth, width) {
  const C = STAIR_CODE
  const risers = Math.max(2, Math.ceil(totalRise / C.MAX_RISE_IN))
  const rise = totalRise / risers
  const treads = Math.max(1, risers - 1)
  const run = runDepth / treads
  return {
    risers,
    treads,
    rise,
    run,
    totalRise,
    runDepth,
    riseOk: rise <= C.MAX_RISE_IN + 0.05 && rise >= C.MIN_RISE_IN - 0.05,
    runOk: run >= C.MIN_RUN_IN - 0.05,
    widthOk: (width ?? Infinity) >= C.MIN_WIDTH_IN - 0.05,
    comfort: 2 * rise + run, // ideal ~24–25"
  }
}

/** Run-depth needed for a code-comfortable flight at the given floor-to-floor rise. */
export function codeRunDepth(totalRise, targetRun = STAIR_CODE.COMFORT_RUN_IN) {
  const treads = Math.max(1, Math.ceil(totalRise / STAIR_CODE.MAX_RISE_IN) - 1)
  return Math.round(treads * targetRun)
}

/**
 * Tread rectangles for a straight stair run (local coords, run along +z):
 * [{ z0, z1, y0, y1 }] climbing to totalRise, with NBC-limited riser height.
 */
export function stairTreads(runDepth, totalRise) {
  const { risers, rise } = stairSpec(totalRise, runDepth)
  const tread = runDepth / risers
  const out = []
  for (let i = 0; i < risers; i++) {
    out.push({ z0: i * tread, z1: runDepth, y0: 0, y1: (i + 1) * rise })
  }
  return out
}
