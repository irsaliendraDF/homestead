// Phase 10 — polish. Headless check for "duplicate a level": everything copies
// with fresh ids, and openings re-point at the NEW rooms (not the originals).
import { useProject, makeDefaultProject } from '../src/store/useProject.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}

console.log('\nduplicate a level (rooms, openings, furniture) with fresh ids')
{
  useProject.getState().setProject(makeDefaultProject())
  useProject.getState().addRoom({ x: 0, y: 0, w: 144, d: 144 })
  const mainId = useProject.getState().project.view.activeLevelId
  const mainLevel = useProject.getState().project.levels.find((l) => l.id === mainId)
  const roomId = mainLevel.rooms[0].id
  useProject.getState().addOpening({ type: 'door', host: { kind: 'room', roomId, edgeIndex: 0 }, offsetIn: 40 })
  useProject.getState().addFurniture({ kind: 'stairs', label: 'Stairs', category: 'stairs', x: 60, y: 60, w: 40, d: 120, h: 108 })

  useProject.getState().duplicateLevel(mainId)
  const p = useProject.getState().project
  check('now 2 levels', p.levels.length === 2)
  const dup = p.levels.find((l) => l.id === p.view.activeLevelId)
  check('active is the new copy', dup.id !== mainId && dup.name.endsWith('copy'))
  check('new level is above (index 1)', dup.index === 1)
  check('copied the room', dup.rooms.length === 1 && dup.rooms[0].id !== roomId)
  check('copied the opening', (dup.openings || []).length === 1)
  check('copied the furniture', (dup.furniture || []).length === 1)
  check('opening re-points at the NEW room', dup.openings[0].roomId === dup.rooms[0].id)
  check('original level untouched', p.levels.find((l) => l.id === mainId).rooms[0].id === roomId)
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 10 checks passed')
}
