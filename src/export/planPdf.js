// Dimensioned floor-plan pages, drawn with jsPDF VECTOR primitives from the
// model (never a screenshot) so lines stay crisp and text stays selectable, and
// a wall measures true against the printed scale.
import { resolveWalls, roomPolygon, roomBounds, roomAreaSqft, roomCentroid } from '../lib/geometry.js'
import { openingWorldSegment } from '../lib/openings.js'
import { formatFeetInches } from '../lib/units.js'

const MARGIN = 36
const TITLE_H = 42

const INK = [23, 24, 26]
const ROOM_FILL = [243, 241, 236]
const LINE = [150, 148, 142]
const MUTED = [124, 127, 132]

/** Draw every level as its own page. `scaleDen` = world:paper ratio (48 = 1/4"=1',
 *  96 = 1/8"=1') or 'fit'. Returns the pages added. */
export function buildPlanPages(doc, project, scaleDen = 'fit') {
  const levels = [...project.levels].sort((a, b) => a.index - b.index)
  levels.forEach((level, i) => {
    if (i > 0) doc.addPage('letter', 'landscape')
    drawLevelPage(doc, project, level, scaleDen)
  })
}

function drawLevelPage(doc, project, level, scaleDen) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const areaX = MARGIN
  const areaY = MARGIN
  const areaW = pageW - MARGIN * 2
  const areaH = pageH - MARGIN * 2 - TITLE_H

  const merged = new Set(level.mergedPairs || [])
  const walls = [...resolveWalls(level.rooms, merged), ...(level.walls || []).map((w) => ({ ...w, isExterior: true }))]

  // Content bounds (rooms, in inches). Fall back to a note if empty.
  const b = contentBounds(level)
  if (!b) {
    doc.setFontSize(11).setTextColor(...MUTED)
    doc.text(`${level.name}: no rooms on this level`, areaX, areaY + 20)
    drawTitleBlock(doc, project, level, 'n/a')
    return
  }

  const pad = 44 // room for dimension strings
  const ppi = scaleDen === 'fit' ? Math.min((areaW - pad * 2) / b.w, (areaH - pad * 2) / b.d) : 72 / scaleDen
  const den = Math.round(72 / ppi)
  const drawW = b.w * ppi
  const drawH = b.d * ppi
  const ox = areaX + (areaW - drawW) / 2
  const oy = areaY + (areaH - drawH) / 2
  const X = (wx) => ox + (wx - b.x) * ppi
  const Y = (wy) => oy + (wy - b.y) * ppi

  // Rooms (light fill + label)
  doc.setDrawColor(...LINE).setLineWidth(0.4)
  for (const r of level.rooms) {
    const pts = roomPolygon(r).map((p) => [X(p.x), Y(p.y)])
    fillPolygon(doc, pts, ROOM_FILL)
  }

  // Walls (poché)
  doc.setFillColor(...INK)
  for (const w of walls) {
    const t = w.thicknessIn * ppi
    if (w.y1 === w.y2) doc.rect(X(Math.min(w.x1, w.x2)), Y(w.y1) - t / 2, Math.abs(w.x2 - w.x1) * ppi, t, 'F')
    else if (w.x1 === w.x2) doc.rect(X(w.x1) - t / 2, Y(Math.min(w.y1, w.y2)), t, Math.abs(w.y2 - w.y1) * ppi, 'F')
  }

  // Openings (erase wall + symbol)
  for (const o of level.openings || []) {
    const seg = openingWorldSegment(o, level)
    if (!seg) drawOpening(doc, seg, X, Y, ppi)
    else drawOpening(doc, seg, X, Y, ppi)
  }

  // Room labels
  doc.setTextColor(...INK)
  for (const r of level.rooms) {
    const c = roomCentroid(r)
    const cxp = X(c.x)
    const cyp = Y(c.y)
    doc.setFontSize(8)
    if (r.name) doc.text(r.name, cxp, cyp, { align: 'center' })
    doc.setFontSize(7).setTextColor(...MUTED)
    doc.text(`${roomAreaSqft(r).toFixed(0)} sq ft`, cxp, cyp + 8, { align: 'center' })
    doc.setTextColor(...INK)
  }

  // Overall dimensions (width on top, depth on left)
  doc.setDrawColor(...MUTED).setLineWidth(0.5).setTextColor(...MUTED).setFontSize(7)
  dim(doc, X(b.x), oy - 22, X(b.x + b.w), oy - 22, formatFeetInches(b.w), 'h')
  dim(doc, ox - 26, Y(b.y), ox - 26, Y(b.y + b.d), formatFeetInches(b.d), 'v')

  drawTitleBlock(doc, project, level, `1:${den}`)
}

function contentBounds(level) {
  if (!level.rooms.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const r of level.rooms) {
    const rb = roomBounds(r)
    minX = Math.min(minX, rb.x)
    minY = Math.min(minY, rb.y)
    maxX = Math.max(maxX, rb.x + rb.w)
    maxY = Math.max(maxY, rb.y + rb.d)
  }
  return { x: minX, y: minY, w: maxX - minX, d: maxY - minY }
}

function fillPolygon(doc, pts, color) {
  doc.setFillColor(...color)
  const lines = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]])
  doc.lines(lines, pts[0][0], pts[0][1], [1, 1], 'F', true)
}

function drawOpening(doc, seg, X, Y, ppi) {
  if (!seg) return
  const horizontal = seg.orientation === 'H'
  const a = { x: X(seg.near.x), y: Y(seg.near.y) }
  const b = { x: X(seg.far.x), y: Y(seg.far.y) }
  const t = 8 * ppi
  // erase the wall poché behind the opening
  doc.setFillColor(255, 255, 255)
  if (horizontal) doc.rect(Math.min(a.x, b.x), Y(seg.line) - t / 2, Math.abs(b.x - a.x), t, 'F')
  else doc.rect(X(seg.line) - t / 2, Math.min(a.y, b.y), t, Math.abs(b.y - a.y), 'F')
  // symbol
  doc.setDrawColor(...INK).setLineWidth(0.5)
  if (seg.type === 'door') {
    const open = { x: a.x + seg.normal.x * (seg.widthIn * ppi), y: a.y + seg.normal.y * (seg.widthIn * ppi) }
    doc.line(a.x, a.y, open.x, open.y)
    doc.line(open.x, open.y, b.x, b.y)
  } else {
    doc.line(a.x, a.y, b.x, b.y)
  }
}

function dim(doc, x1, y1, x2, y2, text, dir) {
  doc.line(x1, y1, x2, y2)
  const tick = 3
  if (dir === 'h') {
    doc.line(x1, y1 - tick, x1, y1 + tick)
    doc.line(x2, y2 - tick, x2, y2 + tick)
    doc.text(text, (x1 + x2) / 2, y1 - 3, { align: 'center' })
  } else {
    doc.line(x1 - tick, y1, x1 + tick, y1)
    doc.line(x2 - tick, y2, x2 + tick, y2)
    doc.text(text, x1 - 3, (y1 + y2) / 2, { align: 'center', angle: 90 })
  }
}

function drawTitleBlock(doc, project, level, scaleLabel) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const y = pageH - MARGIN - TITLE_H + 8
  doc.setDrawColor(...LINE).setLineWidth(0.5)
  doc.line(MARGIN, y, pageW - MARGIN, y)
  doc.setTextColor(...INK).setFontSize(12)
  doc.text(project.name || 'Homestead', MARGIN, y + 16)
  doc.setFontSize(9).setTextColor(...MUTED)
  doc.text(`Level: ${level.name}`, MARGIN, y + 28)
  doc.text(`Scale ${scaleLabel}`, pageW / 2, y + 28, { align: 'center' })
  doc.text(new Date().toLocaleDateString(), pageW - MARGIN, y + 28, { align: 'right' })
  doc.text('Planning drawing — not for construction. Confirm against NBC / local code.', pageW / 2, y + 16, { align: 'center' })
}
