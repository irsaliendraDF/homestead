import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { furnitureStyle, isCloset } from '../lib/furniture.js'
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
  const levels = useProject((s) => s.project.levels)
  const activeId = useProject((s) => s.project.view.activeLevelId)
  const selectedId = useEditor((s) => s.selectedFurnitureId)
  const preview = useEditor((s) => s.furniturePreview)

  const level = levels.find((l) => l.id === activeId)
  const below = levels.find((l) => l.index === level.index - 1)
  const items = (level.furniture || []).map((f) => (preview && preview.id === f.id ? { ...f, ...preview } : f))
  const downStairs = (below?.furniture || []).filter((f) => f.kind === 'stairs')
  const hs = 8 / zoom

  return (
    <g>
      {/* Stairwell coming UP from the level below (open in this floor). */}
      {downStairs.map((f) => (
        <g key={`dn${f.id}`} transform={`translate(${f.x} ${f.y}) rotate(${f.rotation || 0})`} style={{ pointerEvents: 'none' }}>
          <rect x={-f.w / 2} y={-f.d / 2} width={f.w} height={f.d} fill="none" stroke={COLOR.muted} strokeWidth={1} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
          <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize={11 / zoom} fill={COLOR.muted} style={{ fontFamily: 'DM Sans, sans-serif' }}>
            stairwell ▽
          </text>
        </g>
      ))}
      {items.map((f) => {
        const st = furnitureStyle(f.kind)
        const sel = f.id === selectedId
        return (
          <g key={f.id}>
            <g transform={`translate(${f.x} ${f.y}) rotate(${f.rotation || 0})`}>
              <rect data-furniture-id={f.id} x={-f.w / 2} y={-f.d / 2} width={f.w} height={f.d} fill={st.fill} stroke={sel ? COLOR.accent : st.stroke} strokeWidth={sel ? 2 : 1} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'all', cursor: 'move' }} />
              <Glyph kind={f.kind} w={f.w} d={f.d} label={f.label} stroke={st.stroke} />
            </g>
            {sel && <Handles obj={f} hs={hs} />}
          </g>
        )
      })}
    </g>
  )
}

// Minimal plan glyphs so key items read at a glance (drawn in local coords).
function Glyph({ kind, w, d, label, stroke }) {
  const s = { stroke, strokeWidth: 1, fill: 'none', vectorEffect: 'non-scaling-stroke', style: { pointerEvents: 'none' } }
  if (isCloset(kind)) {
    // closet rod along the back + a name so it reads as a closet, not a room
    return (
      <g>
        <line x1={-w / 2 + 3} y1={-d / 2 + 4} x2={w / 2 - 3} y2={-d / 2 + 4} {...s} />
        <line x1={-w / 2 + 3} y1={-d / 2 + 4} x2={w / 2 - 3} y2={-d / 2 + 4} {...s} strokeDasharray="2 4" />
        <text x={0} y={4} textAnchor="middle" fontSize={9} fill={stroke} style={{ pointerEvents: 'none', fontFamily: 'DM Sans, sans-serif' }}>
          {label || 'Closet'}
        </text>
      </g>
    )
  }
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
    // Direction-of-travel arrow + UP label (ascends toward -y in local coords).
    lines.push(<line key="run" x1={0} y1={d / 2 - 4} x2={0} y2={-d / 2 + 4} {...s} />)
    lines.push(<path key="head" d={`M ${-4} ${-d / 2 + 10} L 0 ${-d / 2 + 4} L 4 ${-d / 2 + 10}`} {...s} />)
    lines.push(
      <text key="up" x={6} y={-d / 2 + 12} fontSize={10} fill={s.stroke} style={{ pointerEvents: 'none', fontFamily: 'DM Sans, sans-serif' }}>
        UP
      </text>
    )
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
