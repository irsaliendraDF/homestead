// The gate, generalized to POLYGON rooms. A room is an ordered list of vertices
// (integer inches) forming its wall centerline loop. A freshly drawn room is a
// rectangle (4 points); corners can then be dragged freely into L-shapes etc.
//
// Axis-aligned edges keep the exact centerline interval algorithm (so the 7/9
// rectangle gate still holds). Diagonal edges render as exterior walls and don't
// share yet — a documented limitation. Pure and deterministic; memoize callers.
import { DEFAULTS } from '../config.js'

const EXTERIOR = DEFAULTS.WALL_THICKNESS_IN // 6"
const INTERIOR = DEFAULTS.INTERIOR_WALL_IN // 4"
const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' }

/** A room's vertex loop. Accepts new-style {points} or legacy {x,y,w,d}. */
export function roomPolygon(room) {
  if (room.points && room.points.length >= 3) return room.points
  const { x = 0, y = 0, w = 0, d = 0 } = room
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + d },
    { x, y: y + d },
  ]
}

/** Rectangle → the 4-point polygon we store for a new room. */
export function rectToPoints({ x, y, w, d }) {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + d },
    { x, y: y + d },
  ]
}

export function pointInPolygon(x, y, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x
    const yi = pts[i].y
    const xj = pts[j].x
    const yj = pts[j].y
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Bounding box of a room, in inches. */
export function roomBounds(room) {
  const pts = roomPolygon(room)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, w: maxX - minX, d: maxY - minY }
}

/** Centroid (vertex average — fine for label placement). */
export function roomCentroid(room) {
  const pts = roomPolygon(room)
  const sum = pts.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / pts.length, y: sum.y / pts.length }
}

/** Signed-area magnitude (shoelace) → square FEET. Centerline area. */
export function roomAreaSqft(room) {
  const pts = roomPolygon(room)
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y)
  }
  return Math.abs(a / 2) / 144
}
// Back-compat name used by earlier components.
export const roomInteriorSqft = roomAreaSqft

// One wall centerline edge, classified H/V/D with its outward normal.
function edgeList(room) {
  const pts = roomPolygon(room)
  const edges = []
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const dx = b.x - a.x
    const dy = b.y - a.y
    if (dx === 0 && dy === 0) continue
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    if (dy === 0) {
      const insideAbove = pointInPolygon(mid.x, mid.y - 0.5, pts)
      edges.push({
        orientation: 'H',
        line: a.y,
        span: [Math.min(a.x, b.x), Math.max(a.x, b.x)],
        normal: insideAbove ? 'S' : 'N',
        roomId: room.id,
        a,
        b,
      })
    } else if (dx === 0) {
      const insideLeft = pointInPolygon(mid.x - 0.5, mid.y, pts)
      edges.push({
        orientation: 'V',
        line: a.x,
        span: [Math.min(a.y, b.y), Math.max(a.y, b.y)],
        normal: insideLeft ? 'E' : 'W',
        roomId: room.id,
        a,
        b,
      })
    } else {
      edges.push({ orientation: 'D', roomId: room.id, a, b })
    }
  }
  return edges
}

const overlaps = (a, b) => Math.max(a[0], b[0]) < Math.min(a[1], b[1])

function toSegment(orientation, line, a, b) {
  return orientation === 'H'
    ? { x1: a, y1: line, x2: b, y2: line }
    : { x1: line, y1: a, x2: line, y2: b }
}

/**
 * resolveWalls(rooms) → [{ id, x1, y1, x2, y2, thicknessIn, isExterior, roomIds }].
 * SHARED boundaries emitted once. No collinear post-merge.
 */
export function resolveWalls(rooms) {
  const all = rooms.flatMap(edgeList)
  const axis = all.filter((e) => e.orientation !== 'D')
  const diag = all.filter((e) => e.orientation === 'D')

  const buckets = new Map()
  for (const e of axis) {
    const key = `${e.orientation}|${e.line}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(e)
  }

  const walls = []
  const sharedSeen = new Set()

  for (const e of axis) {
    const bucket = buckets.get(`${e.orientation}|${e.line}`)
    const opposing = bucket.filter(
      (o) => o.roomId !== e.roomId && o.normal === opposite[e.normal] && overlaps(e.span, o.span)
    )
    const [lo, hi] = e.span
    const points = new Set([lo, hi])
    for (const o of opposing) {
      if (o.span[0] > lo && o.span[0] < hi) points.add(o.span[0])
      if (o.span[1] > lo && o.span[1] < hi) points.add(o.span[1])
    }
    const cuts = [...points].sort((a, b) => a - b)

    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i]
      const b = cuts[i + 1]
      if (b <= a) continue
      const mid = (a + b) / 2
      const cover = opposing.find((o) => o.span[0] <= mid && mid <= o.span[1])

      if (cover) {
        const key = `${e.orientation}|${e.line}|${a}|${b}`
        if (sharedSeen.has(key)) continue
        sharedSeen.add(key)
        walls.push({
          id: `S|${key}`,
          ...toSegment(e.orientation, e.line, a, b),
          thicknessIn: INTERIOR,
          isExterior: false,
          roomIds: [e.roomId, cover.roomId].sort(),
        })
      } else {
        walls.push({
          id: `E|${e.orientation}|${e.line}|${a}|${b}|${e.roomId}`,
          ...toSegment(e.orientation, e.line, a, b),
          thicknessIn: EXTERIOR,
          isExterior: true,
          roomIds: [e.roomId],
        })
      }
    }
  }

  // Diagonal edges: exterior only (no sharing yet).
  for (const e of diag) {
    walls.push({
      id: `D|${e.roomId}|${e.a.x},${e.a.y}|${e.b.x},${e.b.y}`,
      x1: e.a.x,
      y1: e.a.y,
      x2: e.b.x,
      y2: e.b.y,
      thicknessIn: EXTERIOR,
      isExterior: true,
      roomIds: [e.roomId],
    })
  }

  return walls
}

// ── Overlap (polygon, proper intersection = positive-area) ────
function orient(p, q, r) {
  const v = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  return v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0
}
function segmentsCross(p1, p2, p3, p4) {
  // Proper crossing only — collinear or endpoint-touching is NOT a crossing
  // (that's adjacency, not overlap).
  const d1 = orient(p3, p4, p1)
  const d2 = orient(p3, p4, p2)
  const d3 = orient(p1, p2, p3)
  const d4 = orient(p1, p2, p4)
  return d1 !== d2 && d3 !== d4 && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0
}

export function roomsOverlap(A, B) {
  const pa = roomPolygon(A)
  const pb = roomPolygon(B)
  // bbox reject
  const ba = roomBounds(A)
  const bb = roomBounds(B)
  if (ba.x + ba.w <= bb.x || bb.x + bb.w <= ba.x || ba.y + ba.d <= bb.y || bb.y + bb.d <= ba.y) {
    return false
  }
  for (let i = 0; i < pa.length; i++) {
    const a1 = pa[i]
    const a2 = pa[(i + 1) % pa.length]
    for (let j = 0; j < pb.length; j++) {
      if (segmentsCross(a1, a2, pb[j], pb[(j + 1) % pb.length])) return true
    }
  }
  if (pa.some((p) => pointInPolygon(p.x, p.y, pb))) return true
  if (pb.some((p) => pointInPolygon(p.x, p.y, pa))) return true
  return false
}

// ── Rectilinear corner carving ────────────────────────────
// Dragging a corner to D keeps all walls axis-aligned by replacing that one
// vertex with an L-notch: two new joints (one on each adjacent wall) plus the
// dragged inner corner. No diagonal walls, ever. cleanPolygon() collapses any
// joints that ended up collinear (e.g. a straight-along-the-wall drag).
export function carveCorner(points, i, D) {
  const n = points.length
  const A = points[(i - 1 + n) % n]
  const V = points[i]
  const aVertical = A.x === V.x // incoming wall A→V is vertical
  let j1
  let j2
  if (aVertical) {
    // A→V vertical, V→B horizontal.
    j1 = { x: V.x, y: D.y }
    j2 = { x: D.x, y: V.y }
  } else {
    // A→V horizontal, V→B vertical.
    j1 = { x: D.x, y: V.y }
    j2 = { x: V.x, y: D.y }
  }
  return [...points.slice(0, i), j1, { x: D.x, y: D.y }, j2, ...points.slice(i + 1)]
}

/** Drop duplicate and collinear vertices so the polygon stays minimal. */
export function cleanPolygon(points) {
  const dedup = points.filter((p, i) => {
    const q = points[(i - 1 + points.length) % points.length]
    return !(p.x === q.x && p.y === q.y)
  })
  if (dedup.length < 3) return points
  const out = []
  for (let i = 0; i < dedup.length; i++) {
    const a = dedup[(i - 1 + dedup.length) % dedup.length]
    const b = dedup[i]
    const c = dedup[(i + 1) % dedup.length]
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
    if (cross !== 0) out.push(b) // keep only real corners
  }
  return out.length >= 3 ? out : dedup
}

/** True when every edge is horizontal or vertical (no diagonals). */
export function isRectilinear(points) {
  const n = points.length
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    if (a.x !== b.x && a.y !== b.y) return false
  }
  return true
}

export function overlappingRoomIds(rooms) {
  const bad = new Set()
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (roomsOverlap(rooms[i], rooms[j])) {
        bad.add(rooms[i].id)
        bad.add(rooms[j].id)
      }
    }
  }
  return bad
}
