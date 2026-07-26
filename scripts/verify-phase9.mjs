// Phase 9 — walkthrough collision. Headless checks: solid segments exclude
// passable openings, and you can't walk through a wall but can through a doorway.
import { collisionSegments, isClear, resolveMove } from '../src/lib/walk.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}

// A single 12'×12' room. Top wall at y=0 (line), spanning x 0..144.
const room = {
  id: 'R',
  name: 'Room 1',
  type: 'Living',
  points: [{ x: 0, y: 0 }, { x: 144, y: 0 }, { x: 144, y: 144 }, { x: 0, y: 144 }],
}

console.log('\nsolid walls block; a doorway is a gap')
{
  // No openings → the top wall is solid across its whole span.
  const solid = collisionSegments({ rooms: [room], walls: [], openings: [], mergedPairs: [] })
  const topSpanSolid = solid.filter((s) => Math.abs(s.y1) < 1 && Math.abs(s.y2) < 1).reduce((a, s) => a + Math.abs(s.x2 - s.x1), 0)
  check('top wall fully solid (~144")', Math.abs(topSpanSolid - 144) < 2, String(topSpanSolid))

  // A 36" door centered on the top wall (edge 0, offset 54..90).
  const door = { id: 'd', type: 'door', style: 'single', kind: 'room', roomId: 'R', edgeIndex: 0, offsetIn: 54, widthIn: 36, heightIn: 80, sillHeightIn: 0 }
  const withDoor = collisionSegments({ rooms: [room], walls: [], openings: [door], mergedPairs: [] })
  const solidLen = withDoor.filter((s) => Math.abs(s.y1) < 1 && Math.abs(s.y2) < 1).reduce((a, s) => a + Math.abs(s.x2 - s.x1), 0)
  check('doorway removes ~36" of solid wall', Math.abs(solidLen - (144 - 36)) < 4, String(solidLen))

  const radius = 12
  // Try to walk north through the wall at x=20 (no door there) — blocked.
  const blocked = resolveMove(20, 30, 0, -40, withDoor, radius)
  check('cannot walk through a solid wall', blocked.y > 0, JSON.stringify(blocked))
  // Walk north through the doorway at x=72 — passes to y<0.
  const through = resolveMove(72, 30, 0, -40, withDoor, radius)
  check('can walk through the doorway', through.y < 0, JSON.stringify(through))
}

console.log('\nwindows are NOT walk-through (block at eye height)')
{
  const win = { id: 'w', type: 'window', style: 'picture', kind: 'room', roomId: 'R', edgeIndex: 0, offsetIn: 54, widthIn: 36, heightIn: 48, sillHeightIn: 36 }
  const withWin = collisionSegments({ rooms: [room], walls: [], openings: [win], mergedPairs: [] })
  const solidLen = withWin.filter((s) => Math.abs(s.y1) < 1 && Math.abs(s.y2) < 1).reduce((a, s) => a + Math.abs(s.x2 - s.x1), 0)
  check('window leaves the wall solid for collision', Math.abs(solidLen - 144) < 2, String(solidLen))
  check('blocked at a window', resolveMove(72, 30, 0, -40, withWin, 12).y > 0)
}

console.log('\nsliding along a wall works')
{
  const solid = collisionSegments({ rooms: [room], walls: [], openings: [], mergedPairs: [] })
  // Move diagonally into the top wall — should slide sideways, not stop dead.
  const slid = resolveMove(72, 20, 20, -30, solid, 12)
  check('slides along x when blocked in y', slid.x > 72 && slid.y >= 20 - 1)
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 9 checks passed')
}
