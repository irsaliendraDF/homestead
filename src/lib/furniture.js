// Furniture / fixtures placed inside the house. x,y = CENTER, rotation in 90°
// steps (like landscape objects). Everything here is display styling — the model
// stores only kind/position/size/rotation.
import { FURNITURE_CATALOG } from '../config.js'

export const FURNITURE_BY_KIND = Object.fromEntries(FURNITURE_CATALOG.map((f) => [f.kind, f]))

export const FURNITURE_CATEGORIES = ['appliance', 'cabinet', 'bath', 'stairs']
export const CATEGORY_LABEL = { appliance: 'Appliances', cabinet: 'Cupboards', bath: 'Bathroom', stairs: 'Stairs' }

// 2D + 3D colors per category.
export const CATEGORY_STYLE = {
  appliance: { fill: '#C9CDD1', stroke: '#9BA1A6' },
  cabinet: { fill: '#CDB08A', stroke: '#A98D66' },
  bath: { fill: '#DCE3E6', stroke: '#AEBDC2' },
  stairs: { fill: '#C4BEB2', stroke: '#A39D90' },
}

export const furnitureStyle = (kind) => CATEGORY_STYLE[FURNITURE_BY_KIND[kind]?.category] || CATEGORY_STYLE.cabinet

/**
 * Tread rectangles for a straight stair run (in local coords, run along +z):
 * returns [{ z0, z1, y0, y1 }] climbing from 0 to totalRise. ~7" risers.
 */
export function stairTreads(runDepth, totalRise) {
  const steps = Math.max(2, Math.round(totalRise / 7))
  const tread = runDepth / steps
  const riser = totalRise / steps
  const out = []
  for (let i = 0; i < steps; i++) {
    out.push({ z0: i * tread, z1: runDepth, y0: 0, y1: (i + 1) * riser })
  }
  return out
}
