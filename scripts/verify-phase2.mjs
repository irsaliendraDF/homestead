// Phase 2 — THE GATE. Runs the five acceptance tests from the kickoff doc and
// prints the actual outputs. Run: node scripts/verify-phase2.mjs
import { resolveWalls, roomsOverlap } from '../src/lib/geometry.js'
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
  console.log(`  stored: x=${room.x} y=${room.y} w=${room.w} d=${room.d}`)
  const allInt = [room.x, room.y, room.w, room.d].every(Number.isInteger)
  check('x,y,w,d all integers', allInt, JSON.stringify(room))
}

// ── Test 5 — clamp + undo ─────────────────────────────────
console.log('\nTest 5 — resize clamps at MIN_ROOM_IN; undo restores exact geometry')
{
  useProject.getState().setProject(makeDefaultProject())
  useProject.temporal.getState().clear()
  useProject.getState().addRoom({ x: 0, y: 0, w: 144, d: 144 })
  const id = activeRooms()[0].id
  const before = { ...activeRooms()[0] }

  useProject.getState().updateRoom(id, { w: 12, d: 12 }) // below the 36" minimum
  const clamped = activeRooms()[0]
  console.log(`  requested 12x12 → stored ${clamped.w}x${clamped.d} (min ${UNITS.MIN_ROOM_IN})`)
  check('width clamped to MIN, never inverted', clamped.w === UNITS.MIN_ROOM_IN)
  check('depth clamped to MIN, never inverted', clamped.d === UNITS.MIN_ROOM_IN)

  useProject.temporal.getState().undo()
  const restored = activeRooms()[0]
  check('undo restores exact prior w', restored.w === before.w, `${restored.w} vs ${before.w}`)
  check('undo restores exact prior d', restored.d === before.d, `${restored.d} vs ${before.d}`)
}

// ── Overlap vs adjacency sanity ───────────────────────────
console.log('\nBonus — adjacency is not overlap; real overlap is flagged')
{
  check('flush rooms are NOT overlap',
    !roomsOverlap({ id: 'A', x: 0, y: 0, w: 144, d: 144 }, { id: 'B', x: 144, y: 0, w: 144, d: 144 }))
  check('interpenetrating rooms ARE overlap',
    roomsOverlap({ id: 'A', x: 0, y: 0, w: 144, d: 144 }, { id: 'B', x: 100, y: 0, w: 144, d: 144 }))
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
