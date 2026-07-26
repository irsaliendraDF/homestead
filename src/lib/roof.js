// Roof geometry generated from the exterior footprint bounding box — simple,
// not per-plane accurate (a planning massing, per the scope guard). Ridge runs
// along the longer axis. pitchRise is rise-per-12-run. Built as raw triangles;
// the material is double-sided so winding never leaves a hole.
import * as THREE from 'three'

const P = (arr, ...pts) => pts.forEach((p) => arr.push(p[0], p[1], p[2]))

function gableTris(x0, x1, z0, z1, eaveY, pitch) {
  const w = x1 - x0
  const d = z1 - z0
  const alongX = w >= d
  const rise = (Math.min(w, d) / 2) * (pitch / 12)
  const ridgeY = eaveY + rise
  const t = []
  if (alongX) {
    const zm = (z0 + z1) / 2
    const eA0 = [x0, eaveY, z0]
    const eA1 = [x1, eaveY, z0]
    const eB0 = [x0, eaveY, z1]
    const eB1 = [x1, eaveY, z1]
    const r0 = [x0, ridgeY, zm]
    const r1 = [x1, ridgeY, zm]
    P(t, eA0, eA1, r1); P(t, eA0, r1, r0) // south slope
    P(t, eB1, eB0, r0); P(t, eB1, r0, r1) // north slope
    P(t, eA0, r0, eB0) // west gable
    P(t, eA1, eB1, r1) // east gable
  } else {
    const xm = (x0 + x1) / 2
    const eA0 = [x0, eaveY, z0]
    const eA1 = [x0, eaveY, z1]
    const eB0 = [x1, eaveY, z0]
    const eB1 = [x1, eaveY, z1]
    const r0 = [xm, ridgeY, z0]
    const r1 = [xm, ridgeY, z1]
    P(t, eA0, eA1, r1); P(t, eA0, r1, r0) // west slope
    P(t, eB1, eB0, r0); P(t, eB1, r0, r1) // east slope
    P(t, eA0, r0, eB0) // south gable
    P(t, eA1, eB1, r1) // north gable
  }
  return t
}

function hipTris(x0, x1, z0, z1, eaveY, pitch) {
  const w = x1 - x0
  const d = z1 - z0
  const alongX = w >= d
  const rise = (Math.min(w, d) / 2) * (pitch / 12)
  const ridgeY = eaveY + rise
  const c00 = [x0, eaveY, z0]
  const c10 = [x1, eaveY, z0]
  const c11 = [x1, eaveY, z1]
  const c01 = [x0, eaveY, z1]
  const t = []
  if (alongX) {
    const zm = (z0 + z1) / 2
    const rL = [x0 + d / 2, ridgeY, zm]
    const rR = [x1 - d / 2, ridgeY, zm]
    P(t, c00, c10, rR); P(t, c00, rR, rL) // south slope
    P(t, c11, c01, rL); P(t, c11, rL, rR) // north slope
    P(t, c00, rL, c01) // west hip
    P(t, c10, c11, rR) // east hip
  } else {
    const xm = (x0 + x1) / 2
    const rL = [xm, ridgeY, z0 + w / 2]
    const rR = [xm, ridgeY, z1 - w / 2]
    P(t, c00, c01, rR); P(t, c00, rR, rL) // west slope
    P(t, c11, c10, rL); P(t, c11, rL, rR) // east slope
    P(t, c00, c10, rL) // south hip
    P(t, c01, c11, rR) // north hip
  }
  return t
}

/** BufferGeometry for a gable/hip roof over the bbox, or null for flat. */
export function roofGeometry(style, bbox, pitchRise, eaveY) {
  if (!bbox || style === 'flat') return null
  const x0 = bbox.x
  const x1 = bbox.x + bbox.w
  const z0 = bbox.y
  const z1 = bbox.y + bbox.d
  const tris = style === 'hip' ? hipTris(x0, x1, z0, z1, eaveY, pitchRise) : gableTris(x0, x1, z0, z1, eaveY, pitchRise)
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3))
  geom.computeVertexNormals()
  return geom
}

/** Peak height above the eave, for readouts. */
export function roofRiseIn(style, bbox, pitchRise) {
  if (!bbox || style === 'flat') return 0
  return Math.round((Math.min(bbox.w, bbox.d) / 2) * (pitchRise / 12))
}
