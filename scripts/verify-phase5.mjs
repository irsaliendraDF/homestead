// Phase 5 — utilities. Headless checks for the run math: orthogonal routing,
// length, and runs following fixtures (live totals).
import { orthogonalize, runLengthIn, effectiveRunPoints, systemRunTotalsFt, fixtureFootprint } from '../src/lib/runs.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}

console.log('\northogonalize inserts corners (every segment H or V)')
{
  const o = orthogonalize([{ x: 0, y: 0 }, { x: 100, y: 50 }])
  console.log('  ' + o.map((p) => `(${p.x},${p.y})`).join(' '))
  check('a diagonal click becomes an L (3 points)', o.length === 3 && o[1].x === 100 && o[1].y === 0)
  const allAxis = o.every((p, i) => i === 0 || p.x === o[i - 1].x || p.y === o[i - 1].y)
  check('every segment is axis-aligned', allAxis)
}

console.log('\nrun length (orthogonal)')
{
  check('L of 100 + 50 = 150"', runLengthIn([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }]) === 150)
}

console.log('\nruns follow their fixtures (live)')
{
  const fixtures = [
    { id: 'A', system: 'water', kind: 'water_heater', x: 0, y: 0 },
    { id: 'B', system: 'water', kind: 'sink', x: 100, y: 50 },
  ]
  const run = { id: 'r', system: 'water', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }], fromFixtureId: 'A', toFixtureId: 'B' }
  check('length before move = 150', runLengthIn(effectiveRunPoints(run, fixtures)) === 150)
  // Drag B to (200,50): endpoint follows, length grows.
  const drag = { id: 'B', x: 200, y: 50 }
  const eff = effectiveRunPoints(run, fixtures, drag)
  check('endpoint follows the dragged fixture', eff[eff.length - 1].x === 200)
  check('length updates live to 250', runLengthIn(eff) === 250, String(runLengthIn(eff)))
}

console.log('\nper-system totals (feet)')
{
  const fixtures = [
    { id: 'A', system: 'water', kind: 'sink', x: 0, y: 0 },
    { id: 'B', system: 'water', kind: 'sink', x: 144, y: 0 },
    { id: 'C', system: 'electrical', kind: 'outlet', x: 0, y: 0 },
    { id: 'D', system: 'electrical', kind: 'panel', x: 0, y: 60 },
  ]
  const runs = [
    { system: 'water', points: [{ x: 0, y: 0 }, { x: 144, y: 0 }], fromFixtureId: 'A', toFixtureId: 'B' },
    { system: 'electrical', points: [{ x: 0, y: 0 }, { x: 0, y: 60 }], fromFixtureId: 'C', toFixtureId: 'D' },
  ]
  const t = systemRunTotalsFt(runs, fixtures)
  console.log(`  water=${t.water}ft electrical=${t.electrical}ft`)
  check('water total = 12 ft', t.water === 12)
  check('electrical total = 5 ft', t.electrical === 5)
}

console.log('\nfixture footprint lookup')
{
  check('water_heater is 24x24', fixtureFootprint('water_heater').w === 24)
  check('unknown kind falls back to 12x12', fixtureFootprint('nope').w === 12)
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 5 checks passed')
}
