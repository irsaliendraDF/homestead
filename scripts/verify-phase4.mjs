// Phase 4 — openings. Headless checks for the opening math: world segment,
// clamp on the wall, 3D wall segmentation, and that moving the host carries it.
import { openingWorldSegment, clampOffset, wallSpans, nearestWallHost } from '../src/lib/openings.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}

// A room: 12'x12' at origin (polygon). Openings host on edge 0 (top, y=0).
const room = {
  id: 'R',
  name: 'Room 1',
  points: [
    { x: 0, y: 0 },
    { x: 144, y: 0 },
    { x: 144, y: 144 },
    { x: 0, y: 144 },
  ],
}
const level = { rooms: [room], walls: [], openings: [] }

console.log('\nOpening world segment sits on the host wall')
{
  const o = { id: 'o1', type: 'window', kind: 'room', roomId: 'R', edgeIndex: 0, offsetIn: 40, widthIn: 36, heightIn: 48, sillHeightIn: 36 }
  const seg = openingWorldSegment(o, level)
  console.log(`  seg: line=${seg.line} a=${seg.a} b=${seg.b} sill=${seg.sillHeightIn}`)
  check('on the top wall (line y=0)', seg.orientation === 'H' && seg.line === 0)
  check('spans 40→76 along the wall', seg.a === 40 && seg.b === 76)
  check('window keeps its sill height', seg.sillHeightIn === 36)
  check('normal points into the room (+y)', seg.normal.y > 0)
}

console.log('\nDoors/archways/garage sit on the floor (sill 0)')
{
  const d = { id: 'o2', type: 'door', kind: 'room', roomId: 'R', edgeIndex: 0, offsetIn: 10, widthIn: 32, heightIn: 80, sillHeightIn: 20 }
  check('door sill forced to 0', openingWorldSegment(d, level).sillHeightIn === 0)
}

console.log('\nClamp keeps the opening on the wall (past-the-end)')
{
  const len = 144
  check('offset past end clamps to len-width-4', clampOffset(999, 36, len) === len - 36 - 4)
  check('negative offset clamps up', clampOffset(-50, 36, len) >= 0)
}

console.log('\n3D segmentation: a window makes header + sill + two piers')
{
  // Wall length 144, one window a=40..76, sill 36, head 84, wall height 108.
  const pieces = wallSpans(144, [{ a: 40, b: 76, sill: 36, head: 84 }], 108)
  const piers = pieces.filter((p) => p.y0 === 0 && p.y1 === 108)
  const sill = pieces.filter((p) => p.y0 === 0 && p.y1 === 36)
  const header = pieces.filter((p) => p.y0 === 84 && p.y1 === 108)
  console.log(`  pieces=${pieces.length} piers=${piers.length} sill=${sill.length} header=${header.length}`)
  check('two full-height piers (left + right)', piers.length === 2)
  check('one sill box below', sill.length === 1)
  check('one header box above', header.length === 1)
  check('a door (sill 0) makes NO sill box', wallSpans(144, [{ a: 40, b: 72, sill: 0, head: 80 }], 108).filter((p) => p.y1 < 1).length === 0)
}

console.log('\nMoving the host room carries the opening')
{
  const o = { id: 'o1', type: 'window', kind: 'room', roomId: 'R', edgeIndex: 0, offsetIn: 40, widthIn: 36, heightIn: 48, sillHeightIn: 36 }
  const moved = { ...room, points: room.points.map((p) => ({ x: p.x + 100, y: p.y + 50 })) }
  const seg = openingWorldSegment(o, { rooms: [moved], walls: [], openings: [] })
  check('opening world position shifts with the room', seg.line === 50 && seg.a === 140 && seg.b === 176)
}

console.log('\nClicking near a wall finds it as a host')
{
  const hit = nearestWallHost({ x: 70, y: 3 }, level, 12, 32)
  check('found the top edge', hit && hit.host.kind === 'room' && hit.host.edgeIndex === 0, JSON.stringify(hit))
  check('a click far from any wall finds nothing', nearestWallHost({ x: 70, y: 70 }, level, 12, 32) === null)
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 4 checks passed')
}
