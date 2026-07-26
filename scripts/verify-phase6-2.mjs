// Phase 6.2 — garden systems. Headless checks: aquaponics sizing stays
// internally consistent (bed:tank ratio holds), scales with footprint, and
// every system yields a parts list.
import { computeAquaponics, computeDrying, computeCuring, computeSystem, systemDefaults } from '../src/lib/gardensystems.js'
import { AQUAPONICS } from '../src/config.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}

console.log('\naquaponics sizing is internally consistent')
{
  const sys = { kind: 'aquaponics', w: 96, d: 144, config: systemDefaults('aquaponics') } // 8' x 12'
  const c = computeAquaponics(sys)
  console.log(`  tank=${c.tankVolumeGal}gal bed=${c.growBedVolumeGal}gal fish=${c.fishLoadLb}lb greens=${c.herbCapacity}`)
  // area 96*144/144 = 96 sqft; depth 12" → 96 cu ft → *7.48 = ~718 gal bed; ratio 1 → tank 718; fish 718/7 ~ 103.
  check('grow-bed area = 96 sq ft', c.growBedAreaSqFt === 96)
  check('bed:tank ratio holds (ratio 1 → equal volumes)', c.tankVolumeGal === c.growBedVolumeGal)
  check('fish load = tank / 7', c.fishLoadLb === Math.round(c.tankVolumeGal / AQUAPONICS.FISH_GAL_PER_LB))
  check('has a parts list', c.parts.length >= 5)
}

console.log('\nresizing scales the numbers (bigger footprint → more)')
{
  const small = computeAquaponics({ kind: 'aquaponics', w: 48, d: 48, config: {} })
  const big = computeAquaponics({ kind: 'aquaponics', w: 96, d: 96, config: {} })
  check('4x the area → ~4x the fish load', big.fishLoadLb > small.fishLoadLb * 3)
  check('4x the area → ~4x greens capacity', big.herbCapacity > small.herbCapacity * 3)
}

console.log('\nratio change moves tank volume but not bed volume')
{
  const base = computeAquaponics({ kind: 'aquaponics', w: 96, d: 96, config: { growbedToTankRatio: 1, growbedDepthIn: 12 } })
  const wide = computeAquaponics({ kind: 'aquaponics', w: 96, d: 96, config: { growbedToTankRatio: 2, growbedDepthIn: 12 } })
  check('bed volume unchanged by ratio', base.growBedVolumeGal === wide.growBedVolumeGal)
  check('ratio 2 → tank ≈ half of ratio 1', Math.abs(wide.tankVolumeGal - base.tankVolumeGal / 2) <= 1, `${wide.tankVolumeGal} vs ${base.tankVolumeGal / 2}`)
}

console.log('\ndrying / curing capacity + parts')
{
  const dry = computeDrying({ kind: 'drying', w: 48, d: 72 })
  const cure = computeCuring({ kind: 'curing', w: 36, d: 48 })
  console.log(`  drying: ${dry.capacityLabel}; curing: ${cure.capacityLabel}`)
  check('drying has a capacity + target + parts', dry.capacityLabel && dry.target && dry.parts.length >= 3)
  check('curing jars = floor(36/6)*floor(48/6) = 48', cure.capacityLabel.includes('48'))
}

console.log('\ncomputeSystem dispatches by kind')
{
  check('aquaponics', computeSystem({ kind: 'aquaponics', w: 48, d: 48, config: {} }).kind === 'aquaponics')
  check('drying', computeSystem({ kind: 'drying', w: 48, d: 48 }).kind === 'drying')
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 6.2 checks passed')
}
