// The gate. Rooms are CENTERLINE rectangles (x,y,w,d in integer inches). This
// module turns a set of rooms into a deduplicated wall set, and answers the
// adjacency/overlap and interior-area questions that ride on the same model.
//
// Pure and deterministic. Memoize callers on the rooms array (resolveWalls runs
// on every render otherwise — see the risks list).
import { DEFAULTS } from '../config.js'

const EXTERIOR = DEFAULTS.WALL_THICKNESS_IN // 6"
const INTERIOR = DEFAULTS.INTERIOR_WALL_IN // 4"

// Outward normals. H edges face north/south (±y), V edges face east/west (±x).
// Two edges oppose when they share a line and carry opposite normals.
const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' }

/** The 4 centerline edges of a room. line = the fixed coordinate; span = the
 *  varying range along the edge. */
function roomEdges(room) {
  const { id, x, y, w, d } = room
  return [
    { orientation: 'H', line: y, span: [x, x + w], normal: 'N', roomId: id }, // top
    { orientation: 'H', line: y + d, span: [x, x + w], normal: 'S', roomId: id }, // bottom
    { orientation: 'V', line: x, span: [y, y + d], normal: 'W', roomId: id }, // left
    { orientation: 'V', line: x + w, span: [y, y + d], normal: 'E', roomId: id }, // right
  ]
}

const overlaps = (a, b) => Math.max(a[0], b[0]) < Math.min(a[1], b[1])

function toSegment(orientation, line, a, b) {
  return orientation === 'H'
    ? { x1: a, y1: line, x2: b, y2: line }
    : { x1: line, y1: a, x2: line, y2: b }
}

/**
 * resolveWalls(rooms) → wall segments.
 * Each: { id, x1, y1, x2, y2, thicknessIn, isExterior, roomIds:[sorted] }.
 * SHARED segments (a boundary between two rooms) are emitted once. No collinear
 * post-merge — counts stay predictable and openings attach per-segment later.
 */
export function resolveWalls(rooms) {
  const edges = rooms.flatMap(roomEdges)

  // Bucket by (orientation, line): only edges on the same line can interact.
  const buckets = new Map()
  for (const e of edges) {
    const key = `${e.orientation}|${e.line}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(e)
  }

  const walls = []
  const sharedSeen = new Set()

  for (const e of edges) {
    const bucket = buckets.get(`${e.orientation}|${e.line}`)
    const opposing = bucket.filter(
      (o) => o.roomId !== e.roomId && o.normal === opposite[e.normal] && overlaps(e.span, o.span)
    )

    // Split points: this edge's endpoints + every opposing endpoint clamped in.
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
        // SHARED — emit once via canonical key.
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
        // EXTERIOR — unique to this room edge.
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

  return walls
}

/** Two rooms overlap when their centerline rectangles intersect with positive
 *  area. Zero-area edge contact (flush rooms) is adjacency, NOT overlap. */
export function roomsOverlap(a, b) {
  const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const iy = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y)
  return ix > 0 && iy > 0
}

/** Ids of all rooms that overlap at least one other room. */
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

/**
 * Interior clear area of a room, in square inches. Each side's inset is half
 * the wall thickness on that side: 3" where exterior, 2" where fully shared.
 * A partially-shared side is treated as exterior for its inset (the exposed run
 * governs the outer dimension) — the honest builder figure for simple rooms.
 */
export function roomInteriorInsets(room, rooms) {
  const others = rooms.filter((r) => r.id !== room.id)
  const sideShared = (line, orientation, span, normal) => {
    // Fully shared if opposing coverage spans the whole side.
    const covered = coverageLength(line, orientation, span, normal, others)
    return covered >= span[1] - span[0] - 1e-6
  }
  const top = sideShared(room.y, 'H', [room.x, room.x + room.w], 'N')
  const bottom = sideShared(room.y + room.d, 'H', [room.x, room.x + room.w], 'S')
  const left = sideShared(room.x, 'V', [room.y, room.y + room.d], 'W')
  const right = sideShared(room.x + room.w, 'V', [room.y, room.y + room.d], 'E')
  const half = (shared) => (shared ? INTERIOR / 2 : EXTERIOR / 2)
  return { top: half(top), bottom: half(bottom), left: half(left), right: half(right) }
}

function coverageLength(line, orientation, span, normal, others) {
  const need = normal
  let total = 0
  for (const r of others) {
    for (const e of roomEdges(r)) {
      if (e.orientation !== orientation || e.line !== line) continue
      if (e.normal !== opposite[need]) continue
      const a = Math.max(span[0], e.span[0])
      const b = Math.min(span[1], e.span[1])
      if (b > a) total += b - a
    }
  }
  return total
}

/** Interior clear area in SQUARE FEET (for the inspector). */
export function roomInteriorSqft(room, rooms) {
  const ins = roomInteriorInsets(room, rooms)
  const wIn = Math.max(0, room.w - ins.left - ins.right)
  const dIn = Math.max(0, room.d - ins.top - ins.bottom)
  return (wIn * dIn) / 144
}
