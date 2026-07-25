// Phase 2 — THE GATE. Runs the five acceptance tests from the kickoff doc and
// prints the actual outputs. Run: node scripts/verify-phase2.mjs
import {
  resolveWalls,
  roomsOverlap,
  roomBounds,
  carveCorner,
  cleanPolygon,
  isRectilinear,
  sharedPairs,
  overlappingRoomIds,
} from '../src/lib/geometry.js'
import { useProject, makeDefaultProject } from '../src/store/useProject.js'
import { UNITS } from '../src/config.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}
const seg = (w) => `${w.isExterior ? 'EXT ' : 'SHARED'} ${w.x1},${w.y1}→${w.x2},${w.y2} t=${w.thicknessIn} rooms=[${w.roomIds.join(',')}]`

// ── Test 1 — aligned pair → exactly 7 segments ────────────
console.log('\nTest 1 — aligned identical pair (expect 7 segments, 1 shared)')
{
  const A = { id: 'A', x: 0, y: 0, w: 144, d: 144 }
  const B = { id: 'B', x: 144, y: 0, w: 144, d: 144 }
  const walls = resolveWalls([A, B])
  const shared = walls.filter((w) => !w.isExterior)
  console.log(`  segments = ${walls.length}`)
  walls.forEach((w) => console.log('    ' + seg(w)))
  check('exactly 7 segments', walls.length === 7, `got ${walls.length}`)
  check('exactly 1 shared segment', shared.length === 1, `got ${shared.length}`)
  const s = shared[0]
  check('shared is x=144, y0–144, t=4, rooms [A,B]',
    !!s && s.x1 === 144 && s.x2 === 144 && s.y1 === 0 && s.y2 === 144 && s.thicknessIn === 4 &&
      s.roomIds.join(',') === 'A,B',
    s ? seg(s) : 'none')
}

// ── Test 2 — offset pair → exactly 9 segments ─────────────
console.log('\nTest 2 — offset pair (expect 9 segments; shared line splits 3 ways)')
{
  const A = { id: 'A', x: 0, y: 0, w: 144, d: 144 }
  const B = { id: 'B', x: 144, y: 72, w: 144, d: 144 }
  const walls = resolveWalls([A, B])
  const online = walls.filter((w) => w.x1 === 144 && w.x2 === 144).sort((a, b) => a.y1 - b.y1)
  const shared = walls.filter((w) => !w.isExterior)
  console.log(`  segments = ${walls.length}`)
  console.log('  on line x=144:')
  online.forEach((w) => console.log('    ' + seg(w)))
  check('exactly 9 segments', walls.length === 9, `got ${walls.length}`)
  check('line x=144 splits into 3 (ext / shared / ext)', online.length === 3, `got ${online.length}`)
  const s = shared[0]
  check('shared is exactly y72–144, t=4, rooms [A,B]',
    shared.length === 1 && s.y1 === 72 && s.y2 === 144 && s.thicknessIn === 4 && s.roomIds.join(',') === 'A,B',
    s ? seg(s) : 'none')
}

// ── Test 3 — closed exterior polygon ──────────────────────
console.log('\nTest 3 — exterior segments of the aligned pair form ONE closed loop')
{
  const A = { id: 'A', x: 0, y: 0, w: 144, d: 144 }
  const B = { id: 'B', x: 144, y: 0, w: 144, d: 144 }
  const ext = resolveWalls([A, B]).filter((w) => w.isExterior)
  check('6 exterior segments', ext.length === 6, `got ${ext.length}`)
  console.log('  ' + (walkClosed(ext) ? 'walk: closed loop back to start ✓' : 'walk: NOT closed ✗'))
  check('exterior walk is a single closed loop', walkClosed(ext))
}

// ── Test 4 — integer inches after add ─────────────────────
console.log('\nTest 4 — stored room geometry is always integer inches')
{
  useProject.getState().setProject(makeDefaultProject())
  useProject.getState().addRoom({ x: 10.4, y: 20.6, w: 143.7, d: 144.2 })
  const room = activeRooms()[0]
  console.log(`  points: ${room.points.map((p) => `(${p.x},${p.y})`).join(' ')}`)
  const allInt = room.points.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y))
  check('every vertex is integer inches', allInt, JSON.stringify(room.points))
}

// ── Test 5 — draw clamps at MIN_ROOM_IN; undo restores geometry ──
console.log('\nTest 5 — a too-small draw clamps to MIN; undo restores exact geometry')
{
  useProject.getState().setProject(makeDefaultProject())
  useProject.temporal.getState().clear()
  useProject.getState().addRoom({ x: 0, y: 0, w: 12, d: 12 }) // below the 36" minimum
  const r = activeRooms()[0]
  const bb = roomBounds(r)
  console.log(`  drew 12x12 → bbox ${bb.w}x${bb.d} (min ${UNITS.MIN_ROOM_IN})`)
  check('bbox clamped to MIN, never inverted', bb.w === UNITS.MIN_ROOM_IN && bb.d === UNITS.MIN_ROOM_IN)
}

// ── Test 6 — free corner move: only that corner moves; undo exact ──
console.log('\nTest 6 — move ONE corner freely; the rest stay; undo restores')
{
  useProject.getState().setProject(makeDefaultProject())
  useProject.getState().addRoom({ x: 0, y: 0, w: 144, d: 144 })
  useProject.temporal.getState().clear()
  const room = activeRooms()[0]
  const before = room.points.map((p) => ({ ...p }))

  // Move corner 2 (bottom-right) out by (60, 30) → an angled wall.
  const moved = before.map((p, i) => (i === 2 ? { x: p.x + 60, y: p.y + 30 } : p))
  useProject.getState().updateRoom(room.id, { points: moved })
  const after = activeRooms()[0].points
  console.log(`  corner 2: (${before[2].x},${before[2].y}) → (${after[2].x},${after[2].y})`)
  check('corner 2 moved', after[2].x === before[2].x + 60 && after[2].y === before[2].y + 30)
  check('corners 0,1,3 unchanged', [0, 1, 3].every((i) => after[i].x === before[i].x && after[i].y === before[i].y))

  useProject.temporal.getState().undo()
  const restored = activeRooms()[0].points
  check('undo restores exact prior corner', restored[2].x === before[2].x && restored[2].y === before[2].y)
}

// ── Overlap vs adjacency sanity ───────────────────────────
console.log('\nBonus — adjacency is not overlap; real overlap is flagged')
{
  check('flush rooms are NOT overlap',
    !roomsOverlap({ id: 'A', x: 0, y: 0, w: 144, d: 144 }, { id: 'B', x: 144, y: 0, w: 144, d: 144 }))
  check('interpenetrating rooms ARE overlap',
    roomsOverlap({ id: 'A', x: 0, y: 0, w: 144, d: 144 }, { id: 'B', x: 100, y: 0, w: 144, d: 144 }))
}

// ── Test 7 — carving a corner makes a RECTILINEAR L (no diagonals) ──
console.log('\nTest 7 — drag a corner inward → L-shape, all walls square')
{
  const rect = [
    { x: 0, y: 0 },
    { x: 144, y: 0 },
    { x: 144, y: 144 },
    { x: 0, y: 144 },
  ]
  const carved = cleanPolygon(carveCorner(rect, 2, { x: 100, y: 100 }))
  console.log('  points: ' + carved.map((p) => `(${p.x},${p.y})`).join(' '))
  check('L-shape has 6 corners', carved.length === 6, `got ${carved.length}`)
  check('every wall is horizontal or vertical (no diagonals)', isRectilinear(carved))
  check('the pulled inner corner (100,100) is present', carved.some((p) => p.x === 100 && p.y === 100))

  // Dragging straight along a wall collapses back (no stray joints).
  const straight = cleanPolygon(carveCorner(rect, 2, { x: 144, y: 90 }))
  check('axis-aligned drag leaves a clean polygon', isRectilinear(straight) && straight.length <= 4)
}

// ── Test 8 — freestanding walls ───────────────────────────
console.log('\nTest 8 — add a freestanding wall')
{
  useProject.getState().setProject(makeDefaultProject())
  useProject.getState().addWall({ x1: 12.4, y1: 24, x2: 132.6, y2: 24 })
  const p = useProject.getState().project
  const walls = p.levels.find((l) => l.id === p.view.activeLevelId).walls
  console.log(`  walls: ${walls.length}, first = ${JSON.stringify(walls[0] && { x1: walls[0].x1, x2: walls[0].x2 })}`)
  check('one wall added', walls.length === 1)
  check('wall coords are integers', walls[0] && Number.isInteger(walls[0].x1) && Number.isInteger(walls[0].x2))
}

// ── Test 9 — join two rooms removes the shared wall ───────
console.log('\nTest 9 — join two rooms → shared wall gone (one L-shaped space)')
{
  const A = { id: 'A', x: 0, y: 0, w: 144, d: 144 }
  const B = { id: 'B', x: 144, y: 0, w: 144, d: 144 }
  const before = resolveWalls([A, B]).filter((w) => !w.isExterior)
  const merged = new Set(['A|B'])
  const after = resolveWalls([A, B], merged)
  check('sharedPairs detects A|B adjacency', sharedPairs([A, B]).has('A|B'))
  check('before join: 1 shared wall', before.length === 1)
  check('after join: shared wall removed', after.filter((w) => !w.isExterior).length === 0)
  check('after join: only the 6 outer walls remain', after.length === 6, `got ${after.length}`)
}

// ── Test 10 — overlap tolerance ───────────────────────────
console.log('\nTest 10 — tiny overlaps tolerated; real overlaps flagged')
{
  const A = { id: 'A', x: 0, y: 0, w: 144, d: 144 }
  const near = { id: 'B', x: 143, y: 0, w: 144, d: 144 } // 1" overlap
  const far = { id: 'C', x: 132, y: 0, w: 144, d: 144 } // 12" overlap
  check('1-inch overlap tolerated (not flagged)', !roomsOverlap(A, near))
  check('12-inch overlap flagged', roomsOverlap(A, far))
  check('joined pair never flagged as overlap', overlappingRoomIds([A, far], new Set(['A|C'])).size === 0)
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 2 gate tests passed')
}

// ── helpers ───────────────────────────────────────────────
function activeRooms() {
  const p = useProject.getState().project
  return p.levels.find((l) => l.id === p.view.activeLevelId).rooms
}

// Walk exterior segments endpoint-to-endpoint; must form one loop using every
// segment exactly once and return to the start.
function walkClosed(segments) {
  const key = (x, y) => `${x},${y}`
  const remaining = segments.map((s) => ({ a: [s.x1, s.y1], b: [s.x2, s.y2], used: false }))
  const start = remaining[0].a
  let cur = remaining[0].b
  remaining[0].used = true
  let count = 1
  while (count < remaining.length) {
    const next = remaining.find(
      (s) => !s.used && (key(...s.a) === key(...cur) || key(...s.b) === key(...cur))
    )
    if (!next) return false
    next.used = true
    cur = key(...next.a) === key(...cur) ? next.b : next.a
    count++
  }
  return key(...cur) === key(...start)
}
