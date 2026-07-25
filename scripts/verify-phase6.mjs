// Phase 6 — landscape (base). Headless checks for footprint (rotation swap),
// setbacks, and distance-to-house.
import { objectFootprint, setbacks, distanceToHouse, houseBounds } from '../src/lib/landscape.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}

const plot = { widthIn: 100 * 12, depthIn: 150 * 12 } // 100' x 150'

console.log('\nfootprint: rotation swaps width/depth')
{
  const o = { x: 600, y: 900, w: 120, d: 240, rotation: 0 }
  const f0 = objectFootprint(o)
  const f90 = objectFootprint({ ...o, rotation: 90 })
  check('at 0°, fw=120 fh=240', f0.fw === 120 && f0.fh === 240)
  check('at 90°, fw=240 fh=120 (swapped)', f90.fw === 240 && f90.fh === 120)
}

console.log('\nsetback: a shed 10\' from the rear reads 10\'')
{
  // Plot depth 1800". Shed depth 144 (12'). Place so bottom edge is 120" (10') from rear.
  // rear = plotD - bottom = 120. bottom = 1680 → center y = 1680 - 72 = 1608.
  const shed = { x: 600, y: 1608, w: 120, d: 144, rotation: 0 }
  const sb = setbacks(shed, plot)
  console.log(`  rear=${sb.rear}" (${sb.rear / 12}')  front=${sb.front}"  left=${sb.left}"  right=${sb.right}"`)
  check('rear setback = 120" (10\' 0")', sb.rear === 120)
  check('front setback = 1536"', sb.front === 1608 - 72)
}

console.log('\ndistance to house')
{
  const project = {
    levels: [{ rooms: [{ id: 'r', points: [{ x: 400, y: 400 }, { x: 700, y: 400 }, { x: 700, y: 700 }, { x: 400, y: 700 }] }] }],
  }
  const house = houseBounds(project)
  check('house bounds computed', house && house.x === 400 && house.w === 300)
  // Object to the right of the house, 100" gap.
  const obj = { x: 900, y: 550, w: 200, d: 100, rotation: 0 } // left edge = 800, house right = 700 → gap 100
  check('distance to house = 100"', distanceToHouse(obj, house) === 100, String(distanceToHouse(obj, house)))
  // Object overlapping the house → 0.
  check('overlapping → 0', distanceToHouse({ x: 550, y: 550, w: 100, d: 100, rotation: 0 }, house) === 0)
  check('no house → null', distanceToHouse(obj, houseBounds({ levels: [{ rooms: [] }] })) === null)
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 6 checks passed')
}
