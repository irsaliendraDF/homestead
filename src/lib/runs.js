// Utility runs are SCHEMATIC: orthogonal lines from a source fixture to a
// destination fixture, per system. No pipe sizing, no loads — intent only.
import { FIXTURE_CATALOG } from '../config.js'

// kind → { system, label, w, d } lookup.
export const FIXTURE_BY_KIND = Object.fromEntries(FIXTURE_CATALOG.map((f) => [f.kind, f]))

export function fixtureFootprint(kind) {
  const f = FIXTURE_BY_KIND[kind]
  return f ? { w: f.w, d: f.d } : { w: 12, d: 12 }
}

/**
 * Force a clicked path orthogonal: between two points that differ on both axes,
 * insert a corner (horizontal segment first, then vertical). Collapses
 * duplicates and collinear points.
 */
export function orthogonalize(points) {
  if (points.length < 2) return [...points]
  const out = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1]
    const p = points[i]
    if (prev.x !== p.x && prev.y !== p.y) out.push({ x: p.x, y: prev.y }) // corner
    out.push({ x: p.x, y: p.y })
  }
  // dedupe consecutive duplicates
  const dedup = out.filter((p, i) => i === 0 || p.x !== out[i - 1].x || p.y !== out[i - 1].y)
  // drop collinear middles
  const clean = []
  for (let i = 0; i < dedup.length; i++) {
    const a = dedup[i - 1]
    const b = dedup[i]
    const c = dedup[i + 1]
    if (!a || !c) {
      clean.push(b)
      continue
    }
    const collinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)
    if (!collinear) clean.push(b)
  }
  return clean
}

/** Total polyline length in inches (orthogonal, so |dx|+|dy| per segment). */
export function runLengthIn(points) {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y)
  }
  return total
}

/** A fixture's live position, honoring an in-progress drag override. */
export function fixturePos(f, drag) {
  return drag && drag.id === f.id ? { x: drag.x, y: drag.y } : { x: f.x, y: f.y }
}

/**
 * A run's points with its endpoints snapped to its fixtures' CURRENT positions,
 * so moving a fixture carries the run (and its length) live.
 */
export function effectiveRunPoints(run, fixtures, drag) {
  const pts = run.points.map((p) => ({ ...p }))
  const from = fixtures.find((f) => f.id === run.fromFixtureId)
  const to = fixtures.find((f) => f.id === run.toFixtureId)
  if (from && pts.length) pts[0] = fixturePos(from, drag)
  if (to && pts.length) pts[pts.length - 1] = fixturePos(to, drag)
  return pts
}

/** Per-system total run length (feet), using live endpoint positions. */
export function systemRunTotalsFt(runs, fixtures = [], drag = null) {
  const totals = {}
  for (const r of runs) {
    totals[r.system] = (totals[r.system] || 0) + runLengthIn(effectiveRunPoints(r, fixtures, drag))
  }
  for (const k of Object.keys(totals)) totals[k] = totals[k] / 12
  return totals
}
