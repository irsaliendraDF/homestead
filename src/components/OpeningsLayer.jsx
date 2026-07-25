import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { openingWorldSegment } from '../lib/openings.js'
import { COLOR } from '../tokens.js'

// Draws openings in 2D as standard architectural symbols, masking the wall poché
// behind each one. Rendered above walls, below room handles.
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
        return <OpeningSymbol key={o.id} seg={seg} selected={o.id === selectedOpeningId} />
      })}
    </g>
  )
}

function OpeningSymbol({ seg, selected }) {
  const { orientation, line, a, b, near, far, along, normal, type, widthIn } = seg
  const horizontal = orientation === 'H'
  const rect = horizontal
    ? { x: a, y: line - MASK_T / 2, w: b - a, h: MASK_T }
    : { x: line - MASK_T / 2, y: a, w: MASK_T, h: b - a }

  // Jamb ticks across the wall at each end.
  const jamb = (p) =>
    horizontal
      ? { x1: p.x, y1: line - 3, x2: p.x, y2: line + 3 }
      : { x1: line - 3, y1: p.y, x2: line + 3, y2: p.y }
  const j1 = jamb(near)
  const j2 = jamb(far)

  const stroke = { stroke: COLOR.ink, strokeWidth: 1.25, vectorEffect: 'non-scaling-stroke', fill: 'none' }

  return (
    <g>
      {/* Mask the wall behind the opening, plus a transparent hit target. */}
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={COLOR.panel} style={{ pointerEvents: 'none' }} />
      <rect
        data-opening-id={seg.id}
        x={rect.x - (horizontal ? 0 : 3)}
        y={rect.y - (horizontal ? 3 : 0)}
        width={rect.w + (horizontal ? 0 : 6)}
        height={rect.h + (horizontal ? 6 : 0)}
        fill="rgba(0,0,0,0)"
        style={{ pointerEvents: 'all', cursor: 'grab' }}
      />

      {/* Jambs */}
      <line {...j1} {...stroke} />
      <line {...j2} {...stroke} />

      {type === 'door' && <DoorSymbol near={near} far={far} normal={normal} width={widthIn} stroke={stroke} />}
      {type === 'window' && <WindowSymbol near={near} far={far} normal={normal} stroke={stroke} />}
      {type === 'archway' && <line x1={near.x} y1={near.y} x2={far.x} y2={far.y} {...stroke} strokeDasharray="6 5" />}
      {type === 'garage' && <GarageSymbol near={near} far={far} along={along} normal={normal} stroke={stroke} />}

      {selected && (
        <rect
          x={rect.x - 1}
          y={rect.y - 1}
          width={rect.w + 2}
          height={rect.h + 2}
          fill="none"
          stroke={COLOR.accent}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  )
}

function DoorSymbol({ near, far, normal, width, stroke }) {
  // Hinge at `near`; leaf swings open perpendicular (into the room); arc shows swing.
  const openEnd = { x: near.x + normal.x * width, y: near.y + normal.y * width }
  const along = { x: (far.x - near.x) / width, y: (far.y - near.y) / width }
  const cross = normal.x * along.y - normal.y * along.x
  const sweep = cross > 0 ? 1 : 0
  return (
    <>
      <line x1={near.x} y1={near.y} x2={openEnd.x} y2={openEnd.y} {...stroke} />
      <path d={`M ${openEnd.x} ${openEnd.y} A ${width} ${width} 0 0 ${sweep} ${far.x} ${far.y}`} {...stroke} />
    </>
  )
}

function WindowSymbol({ near, far, normal, stroke }) {
  const o = 1.75
  return (
    <>
      <line x1={near.x + normal.x * o} y1={near.y + normal.y * o} x2={far.x + normal.x * o} y2={far.y + normal.y * o} {...stroke} />
      <line x1={near.x - normal.x * o} y1={near.y - normal.y * o} x2={far.x - normal.x * o} y2={far.y - normal.y * o} {...stroke} />
    </>
  )
}

function GarageSymbol({ near, far, along, normal, stroke }) {
  const panels = 4
  const ticks = []
  for (let i = 1; i < panels; i++) {
    const t = i / panels
    const px = near.x + (far.x - near.x) * t
    const py = near.y + (far.y - near.y) * t
    ticks.push(
      <line key={i} x1={px - normal.x * 2.5} y1={py - normal.y * 2.5} x2={px + normal.x * 2.5} y2={py + normal.y * 2.5} {...stroke} />
    )
  }
  return (
    <>
      <line x1={near.x + normal.x * 2.5} y1={near.y + normal.y * 2.5} x2={far.x + normal.x * 2.5} y2={far.y + normal.y * 2.5} {...stroke} />
      <line x1={near.x - normal.x * 2.5} y1={near.y - normal.y * 2.5} x2={far.x - normal.x * 2.5} y2={far.y - normal.y * 2.5} {...stroke} />
      {ticks}
    </>
  )
}
