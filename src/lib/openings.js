// Openings (doors, windows, archways, garage doors) live on a HOST wall — either
// a room edge (roomId + edgeIndex) or a freestanding wall (wallId) — positioned
// by offsetIn along that wall from its start. Storing them relative to the host
// means moving/reshaping the host carries its openings. World geometry is
// derived on the fly (never stored), same discipline as walls and companions.
import { roomPolygon, pointInPolygon } from './geometry.js'

const EPS = 0.5

/** The host wall's centerline segment + orientation, or null if it's gone. */
export function hostSegment(opening, level) {
  if (opening.kind === 'wall') {
    const w = (level.walls || []).find((x) => x.id === opening.wallId)
    if (!w) return null
    return seg(w.x1, w.y1, w.x2, w.y2)
  }
  const room = level.rooms.find((r) => r.id === opening.roomId)
  if (!room) return null
  const pts = roomPolygon(room)
  if (opening.edgeIndex >= pts.length) return null
  const a = pts[opening.edgeIndex]
  const b = pts[(opening.edgeIndex + 1) % pts.length]
  return seg(a.x, a.y, b.x, b.y)
}

function seg(x1, y1, x2, y2) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const orientation = Math.abs(y2 - y1) < EPS ? 'H' : Math.abs(x2 - x1) < EPS ? 'V' : 'D'
  return { x1, y1, x2, y2, len, orientation, dx: (x2 - x1) / (len || 1), dy: (y2 - y1) / (len || 1) }
}

/** Clamp an offset so the opening stays on the wall (4" reveal at each end). */
export function clampOffset(offsetIn, widthIn, len) {
  const margin = 4
  const max = Math.max(0, len - widthIn - margin)
  return Math.min(Math.max(offsetIn, Math.min(margin, max)), max)
}

/**
 * World geometry of an opening: its endpoints on the wall, the line it sits on,
 * and its param span [a,b] along that line's natural axis (x for H, y for V).
 */
export function openingWorldSegment(opening, level) {
  const s = hostSegment(opening, level)
  if (!s || s.orientation === 'D') return null
  const off = clampOffset(opening.offsetIn, opening.widthIn, s.len)
  const near = { x: s.x1 + s.dx * off, y: s.y1 + s.dy * off }
  const far = { x: s.x1 + s.dx * (off + opening.widthIn), y: s.y1 + s.dy * (off + opening.widthIn) }
  const line = s.orientation === 'H' ? s.y1 : s.x1
  const a = s.orientation === 'H' ? Math.min(near.x, far.x) : Math.min(near.y, far.y)
  const b = s.orientation === 'H' ? Math.max(near.x, far.x) : Math.max(near.y, far.y)

  // Swing/facing normal, pointing into the host room's interior.
  const along = { x: s.dx, y: s.dy }
  let normal = { x: -s.dy, y: s.dx }
  if (opening.kind === 'room') {
    const room = level.rooms.find((r) => r.id === opening.roomId)
    if (room) {
      const mid = { x: (near.x + far.x) / 2, y: (near.y + far.y) / 2 }
      const inside = pointInPolygon(mid.x + normal.x * 2, mid.y + normal.y * 2, roomPolygon(room))
      if (!inside) normal = { x: -normal.x, y: -normal.y }
    }
  }

  return {
    id: opening.id,
    type: opening.type,
    orientation: s.orientation,
    line,
    a,
    b,
    near,
    far,
    along,
    normal,
    widthIn: opening.widthIn,
    sillHeightIn: opening.type === 'door' || opening.type === 'archway' || opening.type === 'garage' ? 0 : opening.sillHeightIn,
    heightIn: opening.heightIn,
  }
}

function distToSegment(px, py, s) {
  const t = Math.max(0, Math.min(1, ((px - s.x1) * (s.x2 - s.x1) + (py - s.y1) * (s.y2 - s.y1)) / (s.len * s.len || 1)))
  const cx = s.x1 + t * (s.x2 - s.x1)
  const cy = s.y1 + t * (s.y2 - s.y1)
  return { dist: Math.hypot(px - cx, py - cy), param: t * s.len }
}

/**
 * Nearest hostable wall (room edge or freestanding wall) to a click point,
 * within `threshold` world inches. Returns the host descriptor + the offset that
 * centers `width` at the click, or null.
 */
export function nearestWallHost(point, level, threshold, width) {
  let best = null
  const consider = (s, host) => {
    if (s.orientation === 'D') return
    const { dist, param } = distToSegment(point.x, point.y, s)
    if (dist > threshold) return
    if (!best || dist < best.dist) best = { dist, host, offset: clampOffset(param - width / 2, width, s.len), len: s.len }
  }
  for (const r of level.rooms) {
    const pts = roomPolygon(r)
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      consider(seg(a.x, a.y, b.x, b.y), { kind: 'room', roomId: r.id, edgeIndex: i })
    }
  }
  for (const w of level.walls || []) {
    consider(seg(w.x1, w.y1, w.x2, w.y2), { kind: 'wall', wallId: w.id })
  }
  return best
}

/**
 * Split a wall of length H (height) into the solid boxes AROUND its openings —
 * no CSG. Piers between openings are full-height; each opening leaves a sill box
 * below (if raised) and a header box above. `openings` are {a,b,sill,head} in
 * param coords already clamped to [0,len].
 * Returns [{ a, b, y0, y1 }] pieces.
 */
export function wallSpans(len, openings, height) {
  const sorted = [...openings].filter((o) => o.b > o.a).sort((x, y) => x.a - y.a)
  const pieces = []
  let cursor = 0
  for (const o of sorted) {
    const a = Math.max(0, o.a)
    const b = Math.min(len, o.b)
    if (a > cursor) pieces.push({ a: cursor, b: a, y0: 0, y1: height }) // full-height pier
    const sill = Math.max(0, o.sill)
    const head = Math.min(height, o.head)
    if (sill > 0) pieces.push({ a, b, y0: 0, y1: sill }) // below the sill
    if (head < height) pieces.push({ a, b, y0: head, y1: height }) // header above
    cursor = Math.max(cursor, b)
  }
  if (cursor < len) pieces.push({ a: cursor, b: len, y0: 0, y1: height })
  return pieces
}
