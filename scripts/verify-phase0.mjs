// Phase 0 acceptance checks. Run: npm run verify
// Exercises the number layer and the store's undo/redo. Pure Node, no browser.
import { formatFeetInches, parseFeetInches } from '../src/lib/units.js'
import { useProject } from '../src/store/useProject.js'

let failures = 0
function check(label, actual, expected) {
  const ok = Object.is(actual, expected)
  if (!ok) failures++
  const mark = ok ? 'PASS' : 'FAIL'
  const detail = ok ? '' : `  (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`
  console.log(`  [${mark}] ${label}${detail}`)
}

console.log('\nformatFeetInches')
check("formatFeetInches(150) → 12' 6\"", formatFeetInches(150), `12' 6"`)
check("formatFeetInches(144) → 12'", formatFeetInches(144), `12'`)
check('formatFeetInches(6) → 6"', formatFeetInches(6), `6"`)
check('formatFeetInches(0) → 0"', formatFeetInches(0), `0"`)

console.log('\nparseFeetInches round-trips (all four documented formats → 150)')
check('parseFeetInches("12\'6\\"") → 150', parseFeetInches(`12'6"`), 150)
check('parseFeetInches("12.5\'") → 150', parseFeetInches(`12.5'`), 150)
check('parseFeetInches("150\\"") → 150', parseFeetInches(`150"`), 150)
check('parseFeetInches("12 ft 6 in") → 150', parseFeetInches('12 ft 6 in'), 150)

console.log('\nparseFeetInches extras')
check('parseFeetInches("12\' 6\\"") → 150 (with space)', parseFeetInches(`12' 6"`), 150)
check('parseFeetInches("100\'") → 1200', parseFeetInches(`100'`), 1200)
check('parseFeetInches("1200\\"") → 1200', parseFeetInches(`1200"`), 1200)
check('parseFeetInches("30m") → 1181 (metric)', parseFeetInches('30m'), 1181)
check('parseFeetInches("9.1m") → 358 (metric)', parseFeetInches('9.1m'), 358)
check('parseFeetInches("nonsense") → NaN', Number.isNaN(parseFeetInches('nonsense')), true)

console.log('\nstore undo / redo (zundo temporal, 50-step)')
const s = useProject.getState()
const t = useProject.temporal.getState()
t.clear()
s.setName('Alpha')
s.setName('Beta')
check('after two edits, name is Beta', useProject.getState().project.name, 'Beta')
useProject.temporal.getState().undo()
check('undo → Alpha', useProject.getState().project.name, 'Alpha')
useProject.temporal.getState().undo()
check('undo → Untitled homestead', useProject.getState().project.name, 'Untitled homestead')
useProject.temporal.getState().redo()
check('redo → Alpha', useProject.getState().project.name, 'Alpha')

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 0 acceptance checks passed')
}
