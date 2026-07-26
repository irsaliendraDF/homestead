import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { furnitureStyle } from '../lib/furniture.js'
import { objectFootprint } from '../lib/landscape.js'
import { COLOR } from '../tokens.js'

// Furniture (appliances / cupboards / bath / stairs) in the 2D plan, per level.
// Center-anchored, 90° rotation, 8-handle resize. A few kinds get a plan glyph.
const HANDLES = [
  { id: 'nw', fx: 0, fy: 0, cursor: 'nwse-resize' },
  { id: 'ne', fx: 1, fy: 0, cursor: 'nesw-resize' },
  { id: 'se', fx: 1, fy: 1, cursor: 'nwse-resize' },
  { id: 'sw', fx: 0, fy: 1, cursor: 'nesw-resize' },
  { id: 'n', fx: 0.5, fy: 0, cursor: 'ns-resize' },
  { id: 'e', fx: 1, fy: 0.5, cursor: 'ew-resize' },
  { id: 's', fx: 0.5, fy: 1, cursor: 'ns-resize' },
  { id: 'w', fx: 0, fy: 0.5, cursor: 'ew-resize' },
]

export default function FurnitureLayer({ zoom }) {
  const level = useProject((s) => s.project.levels.find((l) => l.id === s.project.view.activeLevelId))
  const selectedId = useEditor((s) => s.selectedFurnitureId)
  const preview = useEditor((s) => s.furniturePreview)

  const items = (level.furniture || []).map((f) => (preview && preview.id === f.id ? { ...f, ...preview } : f))
  const hs = 8 / zoom

  return (
    <g>
      {items.map((f) => {
        const st = furnitureStyle(f.kind)
        const sel = f.id === selectedId
        return (
          <g key={f.id}>
            <g transform={`translate(${f.x} ${f.y}) rotate(${f.rotation || 0})`}>
              <rect data-furniture-id={f.id} x={-f.w / 2} y={-f.d / 2} width={f.w} height={f.d} fill={st.fill} stroke={sel ? COLOR.accent : st.stroke} strokeWidth={sel ? 2 : 1} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'all', cursor: 'move' }} />
              <Glyph kind={f.kind} w={f.w} d={f.d} stroke={st.stroke} />
            </g>
            {sel && <Handles obj={f} hs={hs} />}
          </g>
        )
      })}
    </g>
  )
}

// Minimal plan glyphs so key items read at a glance (drawn in local coords).
function Glyph({ kind, w, d, stroke }) {
  const s = { stroke, strokeWidth: 1, fill: 'none', vectorEffect: 'non-scaling-stroke', style: { pointerEvents: 'none' } }
  if (kind === 'bathtub') return <ellipse cx={0} cy={0} rx={w / 2 - 3} ry={d / 2 - 3} {...s} />
  if (kind === 'toilet') return <ellipse cx={0} cy={d / 2 - 8} rx={w / 2 - 2} ry={7} {...s} />
  if (kind === 'shower') return <line x1={-w / 2} y1={-d / 2} x2={w / 2} y2={d / 2} {...s} />
  if (kind === 'vanity' || kind === 'range') return <ellipse cx={0} cy={0} rx={Math.min(w, d) / 3} ry={Math.min(w, d) / 3} {...s} />
  if (kind === 'stairs') {
    const treads = Math.max(2, Math.round(d / 11))
    const lines = []
    for (let i = 1; i < treads; i++) {
      const y = -d / 2 + (i * d) / treads
      lines.push(<line key={i} x1={-w / 2} y1={y} x2={w / 2} y2={y} {...s} />)
    }
    return <g>{lines}</g>
  }
  return null
}

function Handles({ obj, hs }) {
  const f = objectFootprint(obj)
  return (
    <g>
      <rect x={f.left} y={f.top} width={f.fw} height={f.fh} fill="none" stroke={COLOR.accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
      {HANDLES.map((h) => (
        <rect key={h.id} data-furniture-handle={h.id} data-furniture-id={obj.id} x={f.left + h.fx * f.fw - hs / 2} y={f.top + h.fy * f.fh - hs / 2} width={hs} height={hs} fill={COLOR.panel} stroke={COLOR.accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'all', cursor: h.cursor }} />
      ))}
    </g>
  )
}
