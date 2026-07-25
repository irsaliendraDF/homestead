// Phase 1 acceptance — the parts testable without a browser: viewport math
// (fit + cursor-anchored zoom) and level actions (add/remove/switch preserve
// data, elevation stacking). IndexedDB persistence + refresh are verified live
// in the dev server. Run: node scripts/verify-phase1.mjs
import { fitView, zoomAtPoint, worldToScreen, screenToWorld, ZOOM_MAX } from '../src/lib/viewport.js'
import { useProject, makeDefaultProject } from '../src/store/useProject.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  ' + extra}`)
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps

console.log('\nviewport — fitView centers and clamps')
{
  const vp = fitView(1200, 1800, 800, 600) // 100'x150' plot in an 800x600 canvas
  // depth-limited: zoom ≈ (600/1800)*0.9 = 0.3
  check('fit zoom ≈ 0.3', near(vp.zoom, 0.3, 1e-9), `got ${vp.zoom}`)
  check('fit centers X', near(vp.panX, (800 - 1200 * vp.zoom) / 2), `got ${vp.panX}`)
  check('fit centers Y', near(vp.panY, (600 - 1800 * vp.zoom) / 2), `got ${vp.panY}`)
}

console.log('\nviewport — zoom stays anchored to the cursor')
{
  const vp = { zoom: 0.4, panX: 40, panY: 40 }
  const cursor = { x: 317, y: 205 }
  const worldUnder = screenToWorld(cursor.x, cursor.y, vp)
  const next = zoomAtPoint(vp, 1.2, cursor.x, cursor.y)
  const back = worldToScreen(worldUnder.x, worldUnder.y, next)
  check('world point under cursor is unmoved (zoom in)', near(back.x, cursor.x, 1e-6) && near(back.y, cursor.y, 1e-6),
    `got (${back.x}, ${back.y})`)

  const next2 = zoomAtPoint(vp, 1 / 1.2, cursor.x, cursor.y)
  const back2 = worldToScreen(worldUnder.x, worldUnder.y, next2)
  check('anchored on zoom out too', near(back2.x, cursor.x, 1e-6) && near(back2.y, cursor.y, 1e-6),
    `got (${back2.x}, ${back2.y})`)

  // Even when the requested zoom is clamped, the anchor must hold.
  const clamped = zoomAtPoint({ zoom: 3.9, panX: 10, panY: 10 }, 5, cursor.x, cursor.y)
  const backC = worldToScreen(screenToWorld(cursor.x, cursor.y, { zoom: 3.9, panX: 10, panY: 10 }).x,
    screenToWorld(cursor.x, cursor.y, { zoom: 3.9, panX: 10, panY: 10 }).y, clamped)
  check('anchored at zoom clamp', clamped.zoom === ZOOM_MAX && near(backC.x, cursor.x, 1e-6),
    `zoom ${clamped.zoom}`)
}

console.log('\nlevels — add / switch / remove preserve every level’s data')
{
  const store = useProject.getState()
  // Seed a project with a room on Main so we can prove data survives.
  const base = makeDefaultProject()
  const mainId = base.levels[0].id
  base.levels[0].rooms = [{ id: 'r1', x: 0, y: 0, w: 144, d: 144, name: 'Room 1' }]
  store.setProject(base)

  useProject.getState().addBasement()
  useProject.getState().addLevelAbove()
  let p = useProject.getState().project
  check('now 3 levels', p.levels.length === 3, `got ${p.levels.length}`)

  const main = p.levels.find((l) => l.id === mainId)
  check('Main still holds its room after adding levels', main.rooms.length === 1)

  // Switch active around; data must not move.
  const basement = p.levels.find((l) => l.index < 0)
  useProject.getState().setActiveLevel(basement.id)
  check('active level switched to basement', useProject.getState().project.view.activeLevelId === basement.id)
  check('Main room untouched after switch',
    useProject.getState().project.levels.find((l) => l.id === mainId).rooms.length === 1)

  // Elevations: basement negative, main 0, upper positive; stacked correctly.
  p = useProject.getState().project
  const elev = Object.fromEntries(p.levels.map((l) => [l.index, l.floorElevationIn]))
  check('Main floor elevation = 0', elev[0] === 0, `got ${elev[0]}`)
  check('Basement floor = -(96+12) = -108', elev[-1] === -108, `got ${elev[-1]}`)
  check('Upper floor = 108+12 = 120', elev[1] === 120, `got ${elev[1]}`)

  // Remove basement; the rest stays, elevations recompute.
  useProject.getState().removeLevel(basement.id)
  p = useProject.getState().project
  check('basement removed → 2 levels', p.levels.length === 2)
  check('Main room STILL there after remove', p.levels.find((l) => l.id === mainId).rooms.length === 1)
  check('Main elevation still 0 after recompute', p.levels.find((l) => l.id === mainId).floorElevationIn === 0)
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 1 (headless) acceptance checks passed')
}
