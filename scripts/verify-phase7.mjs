// Phase 7 — edit in 3D + roof. Headless checks for roof geometry/rise and the
// store paths behind 3D ceiling edits (updateLevel + undo, same as 2D).
import { roofGeometry, roofRiseIn } from '../src/lib/roof.js'
import { useProject, makeDefaultProject } from '../src/store/useProject.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}

const bbox = { x: 0, y: 0, w: 240, d: 360 } // 20' x 30'

console.log('\nroof rise from pitch (rise/12 over the SHORT span)')
{
  // short span 240" → half 120"; pitch 8 → 120 * 8/12 = 80"
  check('gable pitch 8 over 240×360 → 80" rise', roofRiseIn('gable', bbox, 8) === 80, String(roofRiseIn('gable', bbox, 8)))
  check('steeper pitch → taller', roofRiseIn('gable', bbox, 12) > roofRiseIn('gable', bbox, 6))
  check('flat roof has 0 rise', roofRiseIn('flat', bbox, 8) === 0)
}

console.log('\nroof geometry')
{
  const flat = roofGeometry('flat', bbox, 8, 108)
  check('flat → no geometry (rendered as a slab)', flat === null)
  const gable = roofGeometry('gable', bbox, 8, 108)
  const hip = roofGeometry('hip', bbox, 8, 108)
  const gCount = gable?.getAttribute('position')?.count || 0
  const hCount = hip?.getAttribute('position')?.count || 0
  console.log(`  gable verts=${gCount}  hip verts=${hCount}`)
  check('gable builds triangles', gCount > 0 && gCount % 3 === 0)
  check('hip builds triangles', hCount > 0 && hCount % 3 === 0)
  check('no roof for a missing footprint', roofGeometry('gable', null, 8, 108) === null)
}

console.log('\nstore: roof settings + ceiling edit undo (same path as 3D drag)')
{
  useProject.getState().setProject(makeDefaultProject())
  useProject.getState().setRoof({ style: 'hip', pitchRise: 10 })
  check('roof style set to hip', useProject.getState().project.roof.style === 'hip')
  check('default NS pitch is steep (8)', makeDefaultProject().roof.pitchRise === 8)

  useProject.temporal.getState().clear()
  const lvl = useProject.getState().project.levels[0]
  const before = lvl.ceilingHeightIn
  useProject.getState().updateLevel(lvl.id, { ceilingHeightIn: 120 }) // as a 3D drag would commit
  check('ceiling changed to 120', useProject.getState().project.levels[0].ceilingHeightIn === 120)
  useProject.temporal.getState().undo()
  check('undo restores prior ceiling (identical to 2D undo)', useProject.getState().project.levels[0].ceilingHeightIn === before)
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 7 checks passed')
}
