// THE single coordinate conversion. Import from here; never swap axes ad hoc.
//
// Plan space (2D editor):  x → right, y → down (screen-natural), inches.
// Three space (3D scene):  x → right, y → UP (elevation), z → "into screen".
//
// The mapping: plan (x, y) at elevation e  ⇄  three (x, e, y).
// So plan-y becomes three-z, and elevation becomes three-y. 1 unit = 1 inch.

/**
 * Plan → three. Returns a [x, y, z] tuple ready for a three position.
 * @param {number} planX  inches, left→right
 * @param {number} planY  inches, top→bottom
 * @param {number} [elevationIn=0]  inches above grade
 * @returns {[number, number, number]}
 */
export function planToThree(planX, planY, elevationIn = 0) {
  return [planX, elevationIn, planY]
}

/**
 * Three → plan. Inverse of planToThree.
 * @param {number} x  three x
 * @param {number} y  three y (elevation)
 * @param {number} z  three z
 * @returns {{ x: number, y: number, elevationIn: number }}
 */
export function threeToPlan(x, y, z) {
  return { x, y: z, elevationIn: y }
}

/** Plan point object → three tuple. */
export function planPointToThree(pt, elevationIn = 0) {
  return planToThree(pt.x, pt.y, elevationIn)
}
