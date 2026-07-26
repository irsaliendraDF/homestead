// Spec-sheet pages: room / opening / utility / landscape / planting schedules,
// the companion report, and garden-systems parts lists. Plain vector text.
import { roomBounds, roomAreaSqft } from '../lib/geometry.js'
import { systemRunTotalsFt, FIXTURE_BY_KIND } from '../lib/runs.js'
import { LANDSCAPE_BY_KIND } from '../lib/landscape.js'
import { checkGarden, zoneCapacity, PLANT_BY_ID } from '../lib/companions.js'
import { computeSystem } from '../lib/gardensystems.js'
import { SYSTEMS } from '../config.js'
import { formatFeetInches } from '../lib/units.js'

const MARGIN = 36
const INK = [23, 24, 26]
const LINE = [150, 148, 142]
const MUTED = [124, 127, 132]

export function buildSpecPages(doc, project) {
  doc.addPage('letter', 'landscape')
  const W = makeWriter(doc)

  roomSchedule(W, project)
  openingSchedule(W, project)
  utilitySchedule(W, project)
  landscapeSchedule(W, project)
  plantingSchedule(W, project)
  companionReport(W, project)
  systemsSchedule(W, project)
}

function roomSchedule(W, project) {
  W.heading('Room schedule')
  W.cols(['Level', 'Room', 'Type', 'Size (bbox)', 'Area'], [0, 90, 230, 320, 470])
  let total = 0
  for (const lvl of project.levels) {
    for (const r of lvl.rooms) {
      const b = roomBounds(r)
      const a = roomAreaSqft(r)
      total += a
      W.cols([lvl.name, r.name || '—', r.type || '—', `${formatFeetInches(b.w)} × ${formatFeetInches(b.d)}`, `${a.toFixed(0)} sq ft`], [0, 90, 230, 320, 470])
    }
  }
  W.gap(4)
  W.line(`Total floor area: ${Math.round(total)} sq ft`, 0, true)
  W.gap(10)
}

function openingSchedule(W, project) {
  const rows = []
  for (const lvl of project.levels) {
    for (const o of lvl.openings || []) rows.push({ lvl: lvl.name, o })
  }
  if (!rows.length) return
  W.heading('Opening schedule')
  W.cols(['Level', 'Type', 'Style', 'Size (W×H)'], [0, 90, 200, 320])
  for (const { lvl, o } of rows) {
    W.cols([lvl, o.type, o.style || '—', `${formatFeetInches(o.widthIn)} × ${formatFeetInches(o.heightIn)}`], [0, 90, 200, 320])
  }
  W.gap(10)
}

function utilitySchedule(W, project) {
  const fixtures = {} // system -> { kind: count }
  for (const lvl of project.levels) {
    for (const f of lvl.fixtures || []) {
      fixtures[f.system] = fixtures[f.system] || {}
      fixtures[f.system][f.kind] = (fixtures[f.system][f.kind] || 0) + 1
    }
  }
  const anyFix = Object.keys(fixtures).length
  const totals = {}
  for (const lvl of project.levels) {
    const t = systemRunTotalsFt(lvl.runs || [], lvl.fixtures || [])
    for (const k of Object.keys(t)) totals[k] = (totals[k] || 0) + t[k]
  }
  if (!anyFix && !Object.keys(totals).length) return
  W.heading('Utilities schedule')
  for (const sys of Object.keys(SYSTEMS)) {
    const kinds = fixtures[sys]
    const runFt = totals[sys]
    if (!kinds && !runFt) continue
    W.line(SYSTEMS[sys].label, 0, true)
    if (kinds) for (const k of Object.keys(kinds)) W.small(`   ${FIXTURE_BY_KIND[k]?.label || k} × ${kinds[k]}`)
    if (runFt) W.small(`   Run length: ${Math.round(runFt)} ft`)
  }
  W.gap(10)
}

function landscapeSchedule(W, project) {
  const counts = {}
  for (const o of project.landscape.objects || []) counts[o.kind] = (counts[o.kind] || 0) + 1
  if (!Object.keys(counts).length) return
  W.heading('Landscape schedule')
  W.cols(['Object', 'Count'], [0, 220])
  for (const k of Object.keys(counts)) W.cols([LANDSCAPE_BY_KIND[k]?.label || k, String(counts[k])], [0, 220])
  W.gap(10)
}

function plantingSchedule(W, project) {
  const zones = project.landscape.zones || []
  const plants = project.landscape.plants || []
  if (!zones.length && !plants.length) return
  W.heading('Planting schedule')
  if (zones.length) {
    W.cols(['Bed', 'Crop', 'Capacity', 'Spacing'], [0, 150, 320, 430])
    for (const z of zones) {
      const c = PLANT_BY_ID[z.cropId]
      W.cols([z.name || 'Bed', c?.label || z.cropId, `~${zoneCapacity(z)}`, formatFeetInches(c?.spacingIn || 12)], [0, 150, 320, 430])
    }
    W.gap(4)
  }
  if (plants.length) {
    const counts = {}
    for (const p of plants) counts[p.plantId] = (counts[p.plantId] || 0) + 1
    W.line('Individual plants', 0, true)
    for (const k of Object.keys(counts)) {
      const c = PLANT_BY_ID[k]
      W.small(`   ${c?.label || k} × ${counts[k]} · sun ${c?.sun} · water ${c?.water}`)
    }
  }
  W.gap(10)
}

function companionReport(W, project) {
  const conflicts = checkGarden(project.landscape.plants || [], project.landscape.zones || [])
  if (!conflicts.length) return
  W.heading('Companion report')
  const bad = conflicts.filter((c) => c.verdict === 'bad')
  const good = conflicts.filter((c) => c.verdict === 'good')
  if (bad.length) {
    W.line('Watch out', 0, true)
    bad.forEach((c) => W.small(`   ⚠ ${c.reason}`))
  }
  if (good.length) {
    W.line('Good pairings', 0, true)
    good.forEach((c) => W.small(`   ✓ ${c.reason}`))
  }
  W.small('Companion tips are planning guidance, not a horticultural authority.')
  W.gap(10)
}

function systemsSchedule(W, project) {
  const systems = project.landscape.systems || []
  if (!systems.length) return
  W.heading('Garden systems + parts')
  for (const sy of systems) {
    const c = computeSystem(sy)
    W.line(sy.label, 0, true)
    if (sy.kind === 'aquaponics') {
      W.small(`   Fish tank ~${c.tankVolumeGal} gal · grow bed ~${c.growBedVolumeGal} gal · max fish ~${c.fishLoadLb} lb · greens ~${c.herbCapacity}`)
    } else {
      W.small(`   ${c.capacityLabel} · target ${c.target}`)
    }
    W.small(`   Parts: ${c.parts.map((p) => (p.qty > 1 ? `${p.item} ×${p.qty}` : p.item)).join(', ')}`)
    W.small('   Planning estimate — validate before building.')
    W.gap(4)
  }
}

function makeWriter(doc) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const left = MARGIN
  const bottom = pageH - MARGIN
  let y = MARGIN + 8
  const ensure = (h) => {
    if (y + h > bottom) {
      doc.addPage('letter', 'landscape')
      y = MARGIN + 8
    }
  }
  return {
    gap(h = 8) {
      y += h
    },
    heading(t) {
      ensure(30)
      doc.setFontSize(13).setTextColor(...INK).text(t, left, y)
      y += 6
      doc.setDrawColor(...LINE).setLineWidth(0.5).line(left, y, pageW - MARGIN, y)
      y += 14
    },
    line(t, indent = 0, bold = false) {
      ensure(13)
      doc.setFontSize(9).setTextColor(...INK).text(t, left + indent, y)
      y += 13
    },
    small(t) {
      ensure(11)
      doc.setFontSize(8).setTextColor(...MUTED).text(t, left, y)
      y += 11
    },
    cols(vals, xs, muted = false) {
      ensure(13)
      doc.setFontSize(9).setTextColor(...(muted ? MUTED : INK))
      vals.forEach((v, i) => doc.text(String(v), left + xs[i], y))
      y += 13
    },
  }
}
