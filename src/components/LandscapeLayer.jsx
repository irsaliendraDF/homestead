import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { LANDSCAPE_STYLE, objectFootprint } from '../lib/landscape.js'
import { roomPolygon } from '../lib/geometry.js'
import { COLOR } from '../tokens.js'

// Landscape objects on the site plan. In Site mode `interactive` is true (place /
// move / resize, plus the locked house footprint); in Building mode it renders
// faint and non-interactive so you can see the site while you work indoors.
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

export default function LandscapeLayer({ interactive, zoom }) {
  const project = useProject((s) => s.project)
  const selectedId = useEditor((s) => s.selectedLandscapeId)
  const preview = useEditor((s) => s.landscapePreview)

  const objects = project.landscape.objects.map((o) => (preview && preview.id === o.id ? { ...o, ...preview } : o))
  const selected = interactive ? objects.find((o) => o.id === selectedId) : null
  const hs = 8 / zoom

  return (
    <g opacity={interactive ? 1 : 0.5} style={{ pointerEvents: interactive ? undefined : 'none' }}>
      {/* Locked house footprint (Site mode only). */}
      {interactive &&
        project.levels.flatMap((lvl) =>
          (lvl.rooms || []).map((r) => (
            <polygon
              key={`hf${r.id}`}
              points={roomPolygon(r).map((p) => `${p.x},${p.y}`).join(' ')}
              fill={COLOR.line}
              stroke={COLOR.lineStrong}
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'none' }}
            />
          ))
        )}

      {objects.map((o) => {
        const st = LANDSCAPE_STYLE[o.kind] || { shape: 'rect', fill: '#D8D3C8', stroke: '#B3AC9E' }
        const common = {
          'data-landscape-id': interactive ? o.id : undefined,
          fill: st.fill,
          stroke: st.stroke,
          strokeWidth: 1.25,
          vectorEffect: 'non-scaling-stroke',
          style: { pointerEvents: interactive ? 'all' : 'none', cursor: 'move' },
        }
        return (
          <g key={o.id} transform={`translate(${o.x} ${o.y}) rotate(${o.rotation || 0})`}>
            {st.shape === 'ellipse' ? (
              <ellipse cx={0} cy={0} rx={o.w / 2} ry={o.d / 2} {...common} />
            ) : (
              <rect x={-o.w / 2} y={-o.d / 2} width={o.w} height={o.d} {...common} />
            )}
          </g>
        )
      })}

      {/* Selection outline + resize handles (world-axis footprint). */}
      {selected && <Selection obj={selected} hs={hs} />}
    </g>
  )
}

function Selection({ obj, hs }) {
  const f = objectFootprint(obj)
  return (
    <g>
      <rect x={f.left} y={f.top} width={f.fw} height={f.fh} fill="none" stroke={COLOR.accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
      {HANDLES.map((h) => {
        const cx = f.left + h.fx * f.fw
        const cy = f.top + h.fy * f.fh
        return (
          <rect
            key={h.id}
            data-landscape-handle={h.id}
            data-landscape-id={obj.id}
            x={cx - hs / 2}
            y={cy - hs / 2}
            width={hs}
            height={hs}
            fill={COLOR.panel}
            stroke={COLOR.accent}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'all', cursor: h.cursor }}
          />
        )
      })}
    </g>
  )
}
