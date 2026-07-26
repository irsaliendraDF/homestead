// First-person walkthrough collision. Pure + testable: build the solid wall
// segments for a level (walls minus PASSABLE openings — doors/archways/garage),
// and resolve a move with circle-vs-segment collision + wall-sliding.
import { resolveWalls } from './geometry.js'
import { openingWorldSegment } from './openings.js'

const PASSABLE = ['door', 'archway', 'garage']

const seg = (ori, line, a, b) => (ori === 'H' ? { x1: a, y1: line, x2: b, y2: line } : { x1: line, y1: a, x2: line, y2: b })

/** Solid collision segments for a level (openings you can walk through removed). */
export function collisionSegments(level) {
  const merged = new Set(level.mergedPairs || [])
  const walls = [...resolveWalls(level.rooms, merged), ...(level.walls || [])]
  const passable = (level.openings || [])
    .map((o) => openingWorldSegment(o, level))
    .filter((o) => o && PASSABLE.includes(o.type))

  const out = []
  for (const w of walls) {
    const horizontal = Math.abs(w.y1 - w.y2) < 0.5
    const vertical = Math.abs(w.x1 - w.x2) < 0.5
    if (!horizontal && !vertical) {
      out.push({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })
      continue
    }
    const ori = horizontal ? 'H' : 'V'
    const line = horizontal ? w.y1 : w.x1
    const ws = horizontal ? Math.min(w.x1, w.x2) : Math.min(w.y1, w.y2)
    const we = horizontal ? Math.max(w.x1, w.x2) : Math.max(w.y1, w.y2)
    const gaps = passable
      .filter((o) => o.orientation === ori && Math.abs(o.line - line) < 1 && o.b > ws && o.a < we)
      .map((o) => [Math.max(ws, o.a), Math.min(we, o.b)])
      .sort((a, b) => a[0] - b[0])
    let cursor = ws
    for (const [a, b] of gaps) {
      if (a > cursor) out.push(seg(ori, line, cursor, a))
      cursor = Math.max(cursor, b)
    }
    if (cursor < we) out.push(seg(ori, line, cursor, we))
  }
  return out
}

export function distPointSeg(px, py, s) {
  const vx = s.x2 - s.x1
  const vy = s.y2 - s.y1
  const len2 = vx * vx + vy * vy || 1
  let t = ((px - s.x1) * vx + (py - s.y1) * vy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = s.x1 + t * vx
  const cy = s.y1 + t * vy
  return Math.hypot(px - cx, py - cy)
}

export function isClear(x, y, segments, radius) {
  for (const s of segments) if (distPointSeg(x, y, s) < radius) return false
  return true
}

/** Move (x,y) by (dx,dy); if blocked, slide along whichever axis is clear. */
export function resolveMove(x, y, dx, dy, segments, radius) {
  if (isClear(x + dx, y + dy, segments, radius)) return { x: x + dx, y: y + dy }
  const nx = isClear(x + dx, y, segments, radius) ? x + dx : x
  const ny = isClear(nx, y + dy, segments, radius) ? y + dy : y
  return { x: nx, y: ny }
}
