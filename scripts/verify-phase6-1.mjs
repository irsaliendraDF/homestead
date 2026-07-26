// Phase 6.1 — garden. Headless checks for companion verdicts, adjacency,
// zone capacity, over-planting, and the Three Sisters preset.
import { companionVerdict, checkGarden, zoneCapacity, zoneOverPlanting, plantSpacing } from '../src/lib/companions.js'
import { GARDEN_PRESETS, GARDEN } from '../src/config.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}

console.log('\ncompanion verdicts')
{
  const v1 = companionVerdict('basil', 'tomato')
  console.log(`  basil+tomato: ${v1.verdict} — "${v1.reason}"`)
  check('basil helps tomato (good)', v1.verdict === 'good' && /basil/i.test(v1.reason) && /tomato/i.test(v1.reason))
  const v2 = companionVerdict('tomato', 'brassica')
  console.log(`  tomato+brassica: ${v2.verdict} — "${v2.reason}"`)
  check('tomato + brassica clash (bad)', v2.verdict === 'bad')
  check('tomato + pepper neutral', companionVerdict('tomato', 'pepper').verdict !== 'bad')
}

console.log('\nadjacency: only flags within GARDEN.ADJACENCY_IN (18")')
{
  const near = checkGarden([{ id: 'a', plantId: 'tomato', x: 0, y: 0 }, { id: 'b', plantId: 'basil', x: 12, y: 0 }], [])
  check('tomato + basil within 18" → 1 good link', near.length === 1 && near[0].verdict === 'good')
  const far = checkGarden([{ id: 'a', plantId: 'tomato', x: 0, y: 0 }, { id: 'b', plantId: 'basil', x: 40, y: 0 }], [])
  check('same pair 40" apart → no link', far.length === 0)
  const bad = checkGarden([{ id: 'a', plantId: 'tomato', x: 0, y: 0 }, { id: 'b', plantId: 'brassica', x: 10, y: 0 }], [])
  check('tomato + brassica within range → 1 bad link', bad.length === 1 && bad[0].verdict === 'bad')
}

console.log('\nzone capacity + over-planting')
{
  const bed = { id: 'z', cropId: 'carrot', x: 0, y: 0, w: 48, d: 96 } // 4' x 8', carrots @ 3"
  const cap = zoneCapacity(bed)
  console.log(`  carrot 4x8 bed capacity = ${cap} (spacing ${plantSpacing('carrot')}")`)
  check('capacity = floor(48/3)*floor(96/3) = 512', cap === 512)
  const under = zoneOverPlanting(bed, [{ id: 'p', plantId: 'carrot', x: 5, y: 5, zoneId: 'z' }])
  check('1 plant in a 512 bed is not over', !under.over && under.count === 1)
  // small bed to force over-planting
  const small = { id: 's', cropId: 'squash', x: 0, y: 0, w: 40, d: 40 } // squash @ 36 → 1x1 = 1
  const plants = [{ id: 'p1', plantId: 'squash', x: 5, y: 5, zoneId: 's' }, { id: 'p2', plantId: 'squash', x: 20, y: 20, zoneId: 's' }]
  const over = zoneOverPlanting(small, plants)
  check('squash bed holds ~1, 2 placed → over', zoneCapacity(small) === 1 && over.over)
}

console.log('\nThree Sisters preset has no mutual foes')
{
  const ts = GARDEN_PRESETS.find((p) => p.id === 'three_sisters')
  const plants = ts.plants.map((id, i) => ({ id: 'p' + i, plantId: id, x: i * 6, y: 0 })) // within adjacency
  const bad = checkGarden(plants, []).filter((c) => c.verdict === 'bad')
  console.log(`  ${ts.plants.join(', ')} → ${bad.length} foe flags`)
  check('corn + bean + squash: no bad flags', bad.length === 0)
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 6.1 checks passed')
}
