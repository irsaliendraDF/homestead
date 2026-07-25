// Screen-space, prioritized snapping. The threshold is passed in as WORLD inches
// (the caller converts 10px at the current zoom) so snapping feels identical at
// every zoom level. Priority: (1) another room's parallel edge, (2) the plot
// boundary, (3) the grid. X and Y snap independently.
import { UNITS } from '../config.js'

const PRIO = { room: 0, plot: 1, grid: 2 }

/** Candidate snap lines per axis from the other rooms and the plot. */
export function snapCandidates(rooms, plot, excludeId) {
  const xs = [] // { v, kind }
  const ys = []
  for (const r of rooms) {
    if (r.id === excludeId) continue
    xs.push({ v: r.x, kind: 'room' }, { v: r.x + r.w, kind: 'room' })
    ys.push({ v: r.y, kind: 'room' }, { v: r.y + r.d, kind: 'room' })
  }
  xs.push({ v: 0, kind: 'plot' }, { v: plot.widthIn, kind: 'plot' })
  ys.push({ v: 0, kind: 'plot' }, { v: plot.depthIn, kind: 'plot' })
  return { xs, ys }
}

/**
 * Best snap for a set of moving edge values on one axis.
 * @param {number[]} movingValues  the edges that can snap (e.g. [left, right])
 * @param {{v:number,kind:string}[]} candidates  lines on this axis
 * @param {number} threshold  world inches
 * @param {number} gridIn  grid spacing for the fallback grid snap
 * @returns {{ delta:number, guide:number|null }}  delta to add to the moving edges
 */
export function snapAxis(movingValues, candidates, threshold, gridIn = UNITS.SNAP_IN) {
  let best = null // { prio, dist, delta, guide }
  const consider = (prio, delta, guide) => {
    const dist = Math.abs(delta)
    if (dist > threshold) return
    if (!best || prio < best.prio || (prio === best.prio && dist < best.dist)) {
      best = { prio, dist, delta, guide }
    }
  }
  for (const mv of movingValues) {
    for (const c of candidates) {
      consider(PRIO[c.kind], c.v - mv, c.v)
    }
    // Grid fallback (lowest priority).
    const nearest = Math.round(mv / gridIn) * gridIn
    consider(PRIO.grid, nearest - mv, nearest)
  }
  return best ? { delta: best.delta, guide: best.guide } : { delta: 0, guide: null }
}
