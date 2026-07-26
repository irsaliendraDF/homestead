// Electrical planning-check logic (references, not certification).
import { electricalChecks } from '../src/lib/electrical.js'
import { ELECTRICAL, FIXTURE_CATALOG } from '../src/config.js'
import { makeDefaultProject } from '../src/store/useProject.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}
const has = (checks, re) => checks.some((c) => re.test(c.message))

console.log('\nnew electrical fixtures exist')
{
  const kinds = FIXTURE_CATALOG.filter((f) => f.system === 'electrical').map((f) => f.kind)
  for (const k of ['switch', 'switch_3way', 'gfci_outlet', 'range_receptacle', 'smoke_detector', 'co_detector', 'subpanel']) {
    check(`has ${k}`, kinds.includes(k))
  }
  check('receptacle limit default 8', ELECTRICAL.RECEPTACLES_PER_CIRCUIT === 8)
}

console.log('\nreceptacles-per-circuit limit')
{
  const p = makeDefaultProject()
  p.levels[0].rooms = [{ id: 'r', type: 'Living', points: [] }]
  p.levels[0].fixtures = Array.from({ length: 9 }, (_, i) => ({ id: 'o' + i, system: 'electrical', kind: 'outlet', circuit: 1 }))
  const c = electricalChecks(p)
  check('9 receptacles on one circuit → over-limit warning', has(c, /Circuit 1 has 9 receptacles/))

  p.levels[0].fixtures = Array.from({ length: 6 }, (_, i) => ({ id: 'o' + i, system: 'electrical', kind: 'outlet', circuit: 1 }))
  check('6 receptacles → no over-limit warning', !has(electricalChecks(p), /over your 8/))
}

console.log('\nsmoke alarms per bedroom + per storey')
{
  const p = makeDefaultProject()
  p.levels[0].rooms = [{ id: 'b', type: 'Bedroom', points: [] }]
  let c = electricalChecks(p)
  check('bedroom without a smoke alarm is flagged', has(c, /bedroom/i) && has(c, /smoke alarm/i))
  // add a smoke alarm → bedroom + storey satisfied
  p.levels[0].fixtures = [{ id: 's', system: 'electrical', kind: 'smoke_detector' }]
  c = electricalChecks(p)
  check('adding a smoke alarm clears the storey warning', !has(c, /no smoke alarm/))
}

console.log('\nhallway switch + 3-way reminder')
{
  const p = makeDefaultProject()
  p.levels[0].rooms = [{ id: 'h', type: 'Hall', points: [] }]
  let c = electricalChecks(p)
  check('hall without a switch is flagged', has(c, /hallway lighting needs a wall switch/i))
  check('3-way reminder present', has(c, /3-way/i))
  p.levels[0].fixtures = [{ id: 'sw', system: 'electrical', kind: 'switch' }]
  check('adding a switch clears the hall warning', !has(electricalChecks(p), /needs a wall switch/))
}

console.log('\nrange needs a 40A plug')
{
  const p = makeDefaultProject()
  p.levels[0].furniture = [{ id: 'r', kind: 'range' }]
  check('electric range without a range plug → info', has(electricalChecks(p), /40 A \/ 240 V/))
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all electrical checks passed')
}
