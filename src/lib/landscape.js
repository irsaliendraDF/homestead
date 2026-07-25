// Landscape objects sit on the site plan (project.landscape.objects), at grade.
// x,y is the object CENTER (rotation is about the center, in 90° steps). Flat
// terrain only — no slopes.
import { LANDSCAPE_CATALOG } from '../config.js'
import { roomBounds } from './geometry.js'

export const LANDSCAPE_BY_KIND = Object.fromEntries(LANDSCAPE_CATALOG.map((o) => [o.kind, o]))

// Muted natural palette + 2D shape + 3D primitive per kind.
export const LANDSCAPE_STYLE = {
  shed: { shape: 'rect', fill: '#D8D3C8', stroke: '#B3AC9E', prim: 'box' },
  garage: { shape: 'rect', fill: '#D8D3C8', stroke: '#B3AC9E', prim: 'box' },
  greenhouse: { shape: 'rect', fill: '#D8E6DF', stroke: '#A9C3B7', prim: 'box' },
  garden_bed: { shape: 'rect', fill: '#C9B79A', stroke: '#A98D66', prim: 'bed' },
  tree: { shape: 'ellipse', fill: '#9DB889', stroke: '#7E9A6C', prim: 'tree' },
  shrub: { shape: 'ellipse', fill: '#A7BE97', stroke: '#88A377', prim: 'shrub' },
  path: { shape: 'rect', fill: '#D6D2CB', stroke: '#C0BBB2', prim: 'flat' },
  driveway: { shape: 'rect', fill: '#CDC9C1', stroke: '#B4AFA6', prim: 'flat' },
  patio: { shape: 'rect', fill: '#DAD5CB', stroke: '#C2BCB1', prim: 'flat' },
  deck: { shape: 'rect', fill: '#CDB89A', stroke: '#AE9973', prim: 'box' },
  fence: { shape: 'rect', fill: '#BCB3A4', stroke: '#9C9384', prim: 'box' },
  pond: { shape: 'ellipse', fill: '#AEC9D2', stroke: '#8FB2BE', prim: 'water' },
  firepit: { shape: 'ellipse', fill: '#C2B6A6', stroke: '#A2937F', prim: 'cylinder' },
  coop: { shape: 'rect', fill: '#D8D3C8', stroke: '#B3AC9E', prim: 'box' },
}

/** Displayed footprint (rotation swaps w/d at 90/270) + world edges. Center coords. */
export function objectFootprint(obj) {
  const swap = (obj.rotation || 0) % 180 !== 0
  const fw = swap ? obj.d : obj.w
  const fh = swap ? obj.w : obj.d
  return {
    fw,
    fh,
    left: obj.x - fw / 2,
    right: obj.x + fw / 2,
    top: obj.y - fh / 2,
    bottom: obj.y + fh / 2,
  }
}

/** Bounding box of the whole house (all rooms, all levels), or null. */
export function houseBounds(project) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let any = false
  for (const lvl of project.levels) {
    for (const r of lvl.rooms || []) {
      const b = roomBounds(r)
      any = true
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w)
      maxY = Math.max(maxY, b.y + b.d)
    }
  }
  return any ? { x: minX, y: minY, w: maxX - minX, d: maxY - minY } : null
}

/** Setbacks to each plot edge (inches): left, right, front (top), rear (bottom). */
export function setbacks(obj, plot) {
  const f = objectFootprint(obj)
  return {
    left: Math.round(f.left),
    right: Math.round(plot.widthIn - f.right),
    front: Math.round(f.top),
    rear: Math.round(plot.depthIn - f.bottom),
  }
}

/** Shortest gap from an object to the house footprint (0 if overlapping), or null. */
export function distanceToHouse(obj, house) {
  if (!house) return null
  const f = objectFootprint(obj)
  const dx = Math.max(house.x - f.right, f.left - (house.x + house.w), 0)
  const dy = Math.max(house.y - f.bottom, f.top - (house.y + house.d), 0)
  return Math.round(Math.hypot(dx, dy))
}
