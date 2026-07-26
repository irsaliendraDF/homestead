// Companion-planting intelligence — baked-in, offline, deterministic. Relationships
// are NEVER stored; they're derived from PLANT_CATALOG on the fly (so the rule set
// can improve without migrating projects). This is planning guidance, not a
// horticultural authority — local climate and variety win.
import { PLANT_CATALOG, GARDEN } from '../config.js'

export const PLANT_BY_ID = Object.fromEntries(PLANT_CATALOG.map((p) => [p.id, p]))

export const plantSpacing = (id) => PLANT_BY_ID[id]?.spacingIn ?? GARDEN.DEFAULT_SPACING_IN

// A stable, muted color per crop (2D + 3D share this).
const CROP_PALETTE = ['#6E9F5B', '#C98A3B', '#B5533F', '#7C8F3F', '#4E8E6A', '#9A6FB0', '#C9A227', '#5B8D9F', '#8A7B4F', '#B0795E']
export const cropColor = (id) => {
  const i = PLANT_CATALOG.findIndex((p) => p.id === id)
  return CROP_PALETTE[(i < 0 ? 0 : i) % CROP_PALETTE.length]
}

/** Verdict + plain-language reason for two crops sharing space. */
export function companionVerdict(cropA, cropB) {
  const A = PLANT_BY_ID[cropA]
  const B = PLANT_BY_ID[cropB]
  if (!A || !B || cropA === cropB) return { verdict: 'neutral', reason: '' }
  const aFoeB = A.foes?.includes(cropB)
  const bFoeA = B.foes?.includes(cropA)
  const aFriendB = A.friends?.includes(cropB)
  const bFriendA = B.friends?.includes(cropA)

  // Foe takes precedence over friend if a pair somehow lists both.
  if (aFoeB || bFoeA) {
    let reason
    if (aFoeB && bFoeA) reason = `${A.label} and ${low(B.label)} clash`
    else if (aFoeB) reason = `${A.label} stunts ${low(B.label)}`
    else reason = `${B.label} stunts ${low(A.label)}`
    return { verdict: 'bad', reason }
  }
  if (aFriendB || bFriendA) {
    const helper = aFriendB ? A : B
    const helped = aFriendB ? B : A
    return { verdict: 'good', reason: `${helper.label} helps ${low(helped.label)}` }
  }
  return { verdict: 'neutral', reason: '' }
}

const low = (label) => label.charAt(0).toLowerCase() + label.slice(1)

const rectOf = (e) => (e.kind === 'plant' ? { x: e.x, y: e.y, w: 0, d: 0 } : { x: e.x, y: e.y, w: e.w, d: e.d })

/** Shortest gap between two garden entities (0 if touching/overlapping). */
export function entityGap(a, b) {
  const A = rectOf(a)
  const B = rectOf(b)
  const dx = Math.max(B.x - (A.x + A.w), A.x - (B.x + B.w), 0)
  const dy = Math.max(B.y - (A.y + A.d), A.y - (B.y + B.d), 0)
  return Math.hypot(dx, dy)
}

/**
 * Every good/bad neighbor relationship within GARDEN.ADJACENCY_IN. Entities are
 * individual plants (points) and zones (crop blocks). Neutral pairs are omitted.
 * O(n²) — only call this when the intel overlay is on, and memoize it.
 */
export function checkGarden(plants = [], zones = []) {
  const entities = [
    ...plants.map((p) => ({ id: p.id, kind: 'plant', crop: p.plantId, x: p.x, y: p.y })),
    ...zones.map((z) => ({ id: z.id, kind: 'zone', crop: z.cropId, x: z.x, y: z.y, w: z.w, d: z.d })),
  ]
  const out = []
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i]
      const b = entities[j]
      if (!a.crop || !b.crop) continue
      if (entityGap(a, b) > GARDEN.ADJACENCY_IN) continue
      const v = companionVerdict(a.crop, b.crop)
      if (v.verdict !== 'neutral') out.push({ a, b, verdict: v.verdict, reason: v.reason })
    }
  }
  return out
}

/** Block-planting capacity of a zone (whole plants that fit at crop spacing). */
export function zoneCapacity(zone) {
  const s = plantSpacing(zone.cropId)
  if (!s) return 0
  return Math.floor(zone.w / s) * Math.floor(zone.d / s)
}

/** Over-planting check: how many individual plants sit inside a zone vs capacity. */
export function zoneOverPlanting(zone, plants) {
  const capacity = zoneCapacity(zone)
  const count = plants.filter((p) => p.zoneId === zone.id).length
  return { capacity, count, over: count > capacity }
}
