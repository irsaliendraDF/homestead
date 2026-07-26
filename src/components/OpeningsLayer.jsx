import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { openingWorldSegment } from '../lib/openings.js'
import { COLOR } from '../tokens.js'

// Openings in 2D as architectural symbols, masking the wall poché behind each.
// Style + swing direction come from the opening; geometry from openingWorldSegment.
const MASK_T = 8

export default function OpeningsLayer() {
  const level = useProject((s) => s.project.levels.find((l) => l.id === s.project.view.activeLevelId))
  const openingPreview = useEditor((s) => s.openingPreview)
  const selectedOpeningId = useEditor((s) => s.selectedOpeningId)

  const openings = (level.openings || []).map((o) =>
    openingPreview && openingPreview.id === o.id ? { ...o, offsetIn: openingPreview.offsetIn } : o
  )

  return (
    <g>
      {openings.map((o) => {
        const seg = openingWorldSegment(o, level)
        if (!seg) return null
        return <OpeningSymbol key={o.id} opening={o} seg={seg} selected={o.id === selectedOpeningId} />
      })}
    </g>
  )
}

function OpeningSymbol({ opening, seg, selected }) {
  const { orientation, line, a, b, near, far, normal } = seg
  const horizontal = orientation === 'H'
  const rect = horizontal
    ? { x: a, y: line - MASK_T / 2, w: b - a, h: MASK_T }
    : { x: line - MASK_T / 2, y: a, w: MASK_T, h: b - a }

  const jamb = (p) =>
    horizontal ? { x1: p.x, y1: line - 3, x2: p.x, y2: line + 3 } : { x1: line - 3, y1: p.y, x2: line + 3, y2: p.y }

  const stroke = { stroke: COLOR.ink, strokeWidth: 1.25, vectorEffect: 'non-scaling-stroke', fill: 'none' }

  // Geometry for the leaf/arc math.
  const width = Math.hypot(far.x - near.x, far.y - near.y) || opening.widthIn
  const along = { x: (far.x - near.x) / (width || 1), y: (far.y - near.y) / (width || 1) }
  const hinge = opening.hinge === 'end' ? far : near
  const other = opening.hinge === 'end' ? near : far
  const sn = opening.swing === 'out' ? { x: -normal.x, y: -normal.y } : normal

  return (
    <g>
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={COLOR.panel} style={{ pointerEvents: 'none' }} />
      <rect
        data-opening-id={opening.id}
        x={rect.x - (horizontal ? 0 : 3)}
        y={rect.y - (horizontal ? 3 : 0)}
        width={rect.w + (horizontal ? 0 : 6)}
        height={rect.h + (horizontal ? 6 : 0)}
        fill="rgba(0,0,0,0)"
        style={{ pointerEvents: 'all', cursor: 'grab' }}
      />
      <line {...jamb(near)} {...stroke} />
      <line {...jamb(far)} {...stroke} />

      <Glyph opening={opening} geom={{ near, far, normal, along, hinge, other, sn, width }} stroke={stroke} />

      {selected && (
        <rect x={rect.x - 1} y={rect.y - 1} width={rect.w + 2} height={rect.h + 2} fill="none" stroke={COLOR.accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
      )}
    </g>
  )
}

function Glyph({ opening, geom, stroke }) {
  const { type, style } = opening
  if (type === 'archway') return <Line a={geom.near} b={geom.far} stroke={stroke} dash="6 5" />
  if (type === 'garage') return <Garage {...geom} stroke={stroke} />

  if (type === 'door') {
    if (style === 'double') return <DoubleDoor {...geom} stroke={stroke} />
    if (style === 'sliding' || style === 'barn') return <Sliding {...geom} stroke={stroke} />
    if (style === 'pocket') return <Pocket {...geom} stroke={stroke} />
    if (style === 'bifold') return <Bifold {...geom} stroke={stroke} />
    return <Leaf hinge={geom.hinge} other={geom.other} sn={geom.sn} width={geom.width} stroke={stroke} />
  }

  // window
  if (style === 'sliding') return <Sliding {...geom} stroke={stroke} />
  if (style === 'awning' || style === 'hopper') return <Awning {...geom} stroke={stroke} />
  if (style === 'casement')
    return (
      <>
        <Glass {...geom} stroke={stroke} />
        <Leaf hinge={geom.hinge} other={geom.other} sn={geom.sn} width={geom.width} stroke={stroke} dash="4 3" />
      </>
    )
  if (style === 'awning') return <Awning {...geom} stroke={stroke} />
  if (style === 'doublehung') return <DoubleHung {...geom} stroke={stroke} />
  return <Glass {...geom} stroke={stroke} /> // picture / fixed
}

// ── primitives ────────────────────────────────────────────
const off = (p, v, d) => ({ x: p.x + v.x * d, y: p.y + v.y * d })
const Line = ({ a, b, stroke, dash }) => <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...stroke} strokeDasharray={dash} />

function Leaf({ hinge, other, sn, width, stroke, dash }) {
  const open = off(hinge, sn, width)
  const ax = (other.x - hinge.x) / (width || 1)
  const ay = (other.y - hinge.y) / (width || 1)
  const sweep = sn.x * ay - sn.y * ax > 0 ? 1 : 0
  return (
    <>
      <line x1={hinge.x} y1={hinge.y} x2={open.x} y2={open.y} {...stroke} strokeDasharray={dash} />
      <path d={`M ${open.x} ${open.y} A ${width} ${width} 0 0 ${sweep} ${other.x} ${other.y}`} {...stroke} strokeDasharray={dash} />
    </>
  )
}

function DoubleDoor({ near, far, sn, width, stroke }) {
  const mid = { x: (near.x + far.x) / 2, y: (near.y + far.y) / 2 }
  return (
    <>
      <Leaf hinge={near} other={mid} sn={sn} width={width / 2} stroke={stroke} />
      <Leaf hinge={far} other={mid} sn={sn} width={width / 2} stroke={stroke} />
    </>
  )
}

function Glass({ near, far, normal, stroke }) {
  const o = 1.75
  return (
    <>
      <Line a={off(near, normal, o)} b={off(far, normal, o)} stroke={stroke} />
      <Line a={off(near, normal, -o)} b={off(far, normal, -o)} stroke={stroke} />
    </>
  )
}

function DoubleHung({ near, far, normal, stroke }) {
  const mid = { x: (near.x + far.x) / 2, y: (near.y + far.y) / 2 }
  return (
    <>
      <Glass near={near} far={far} normal={normal} stroke={stroke} />
      <Line a={off(mid, normal, 3)} b={off(mid, normal, -3)} stroke={stroke} />
    </>
  )
}

function Awning({ near, far, normal, stroke }) {
  const mid = { x: (near.x + far.x) / 2, y: (near.y + far.y) / 2 }
  const tip = off(mid, normal, Math.max(10, 0.2 * Math.hypot(far.x - near.x, far.y - near.y)))
  return (
    <>
      <Glass near={near} far={far} normal={normal} stroke={stroke} />
      <Line a={near} b={tip} stroke={stroke} dash="4 3" />
      <Line a={far} b={tip} stroke={stroke} dash="4 3" />
    </>
  )
}

function Sliding({ near, far, along, normal, width, stroke }) {
  const o = 2.2
  const aEnd = off(near, along, width * 0.55)
  const bStart = off(far, along, -width * 0.55)
  return (
    <>
      <Line a={off(near, normal, o)} b={off(aEnd, normal, o)} stroke={stroke} />
      <Line a={off(bStart, normal, -o)} b={off(far, normal, -o)} stroke={stroke} />
    </>
  )
}

function Pocket({ near, far, along, normal, width, stroke }) {
  const o = 2
  const into = off(far, along, width) // slides into the wall past the far jamb
  return (
    <>
      {/* door panel in the opening */}
      <Line a={off(near, normal, o)} b={off(far, normal, o)} stroke={stroke} />
      {/* pocket cavity, dashed, into the wall */}
      <Line a={off(far, normal, o)} b={off(into, normal, o)} stroke={stroke} dash="4 3" />
      <Line a={off(far, normal, -o)} b={off(into, normal, -o)} stroke={stroke} dash="4 3" />
    </>
  )
}

function Bifold({ near, far, along, sn, width, stroke }) {
  const q = width / 4
  const p1 = off(off(near, along, q), sn, q)
  const p2 = off(near, along, width / 2)
  const p3 = off(off(near, along, 3 * q), sn, q)
  return (
    <>
      <Line a={near} b={p1} stroke={stroke} />
      <Line a={p1} b={p2} stroke={stroke} />
      <Line a={p2} b={p3} stroke={stroke} />
      <Line a={p3} b={far} stroke={stroke} />
    </>
  )
}

function Garage({ near, far, along, normal, stroke }) {
  const width = Math.hypot(far.x - near.x, far.y - near.y)
  const ticks = []
  for (let i = 1; i < 4; i++) {
    const p = off(near, along, (width * i) / 4)
    ticks.push(<Line key={i} a={off(p, normal, 2.5)} b={off(p, normal, -2.5)} stroke={stroke} />)
  }
  return (
    <>
      <Line a={off(near, normal, 2.5)} b={off(far, normal, 2.5)} stroke={stroke} />
      <Line a={off(near, normal, -2.5)} b={off(far, normal, -2.5)} stroke={stroke} />
      {ticks}
    </>
  )
}
