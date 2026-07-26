// Furnishings phase — headless checks: catalog, stairs treads, opening styles/
// sizes, and the furniture store path + migration.
import { FURNITURE_CATALOG } from '../src/config.js'
import { FURNITURE_BY_KIND, furnitureStyle, stairTreads, stairSpec, codeRunDepth, STAIR_CODE, isCloset } from '../src/lib/furniture.js'
import { OPENING_STYLES, OPENING_SIZES, useProject, makeDefaultProject, migrateProject } from '../src/store/useProject.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}

console.log('\nfurniture catalog covers what was asked')
{
  const kinds = FURNITURE_CATALOG.map((f) => f.kind)
  for (const need of ['fridge', 'range', 'dishwasher', 'base_cabinet', 'wall_cabinet', 'island', 'bathtub', 'shower', 'vanity', 'toilet', 'stairs']) {
    check(`has ${need}`, kinds.includes(need))
  }
  check('categories present', ['appliance', 'cabinet', 'bath', 'stairs'].every((c) => FURNITURE_CATALOG.some((f) => f.category === c)))
  check('furnitureStyle returns a color', !!furnitureStyle('bathtub').fill)
}

console.log('\nstairs are NBC code-aware (rise ≤ 7-7/8", run ≥ 10")')
{
  const t = stairTreads(120, 108) // run 120, floor-to-floor 108
  check('treads reach the floor height', Math.abs(t[t.length - 1].y1 - 108) < 0.5)
  check('every riser ≤ NBC max (7-7/8")', 108 / t.length <= STAIR_CODE.MAX_RISE_IN + 0.01, String(108 / t.length))

  const s = stairSpec(108, 120, 40)
  console.log(`  108" rise over 120" run → ${s.risers} risers @ ${s.rise.toFixed(2)}", run ${s.run.toFixed(2)}"`)
  check('riser height in code range', s.riseOk)
  check('120" run is too short → runOk false', !s.runOk)
  // size to code: recompute the run depth
  const d = codeRunDepth(108)
  const s2 = stairSpec(108, d, 40)
  check(`sizing run to ${d}" makes it code-compliant`, s2.runOk && s2.riseOk, `run ${s2.run.toFixed(2)}`)
}

console.log('\ncloset elements (thin-walled, not rooms)')
{
  const kinds = FURNITURE_CATALOG.map((f) => f.kind)
  check('has closet', kinds.includes('closet'))
  check('has linen_closet', kinds.includes('linen_closet'))
  check('has walkin_closet', kinds.includes('walkin_closet'))
  check('isCloset flags them', isCloset('closet') && isCloset('wardrobe') && !isCloset('fridge'))
  check('storage category present', FURNITURE_CATALOG.some((f) => f.category === 'storage'))
}

console.log('\nexpanded door/window styles + size presets')
{
  check('door adds barn + dutch', OPENING_STYLES.door.includes('barn') && OPENING_STYLES.door.includes('dutch'))
  check('window adds bay + hopper', OPENING_STYLES.window.includes('bay') && OPENING_STYLES.window.includes('hopper'))
  check('door size presets exist', OPENING_SIZES.door.length >= 4 && OPENING_SIZES.door[0].w > 0)
  check('window size presets exist', OPENING_SIZES.window.length >= 4)
}

console.log('\nfurniture store path + migration')
{
  useProject.getState().setProject(makeDefaultProject())
  const b = FURNITURE_BY_KIND['bathtub']
  useProject.getState().addFurniture({ kind: 'bathtub', label: b.label, category: b.category, x: 40.4, y: 60.6, w: b.w, d: b.d, h: b.h })
  const lvl = useProject.getState().project.levels[0]
  check('furniture added to the active level', (lvl.furniture || []).length === 1)
  check('coords rounded to integers', Number.isInteger(lvl.furniture[0].x) && Number.isInteger(lvl.furniture[0].y))

  const legacy = { levels: [{ id: 'x', index: 0, rooms: [] }], view: {}, landscape: {} }
  const migrated = migrateProject(legacy)
  check('migration adds level.furniture', Array.isArray(migrated.levels[0].furniture))
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all furnishings checks passed')
}
