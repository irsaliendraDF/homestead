import { useMemo } from 'react'
import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { resolveWalls, overlappingRoomIds } from '../lib/geometry.js'
import { COLOR } from '../tokens.js'

// Renders, in world inches, inside the canvas transform group:
// room bodies (hit targets) · resolved walls (poché) · selection + overlap
// outlines · resize handles · live preview + snap guides.
const PREVIEW_ID = '__preview__'

const HANDLES = [
  { id: 'nw', fx: 0, fy: 0, cursor: 'nwse-resize' },
  { id: 'n', fx: 0.5, fy: 0, cursor: 'ns-resize' },
  { id: 'ne', fx: 1, fy: 0, cursor: 'nesw-resize' },
  { id: 'e', fx: 1, fy: 0.5, cursor: 'ew-resize' },
  { id: 'se', fx: 1, fy: 1, cursor: 'nwse-resize' },
  { id: 's', fx: 0.5, fy: 1, cursor: 'ns-resize' },
  { id: 'sw', fx: 0, fy: 1, cursor: 'nesw-resize' },
  { id: 'w', fx: 0, fy: 0.5, cursor: 'ew-resize' },
]

export function effectiveRooms(rooms, editor) {
  const { preview, previewId } = editor
  if (!preview) return rooms
  if (previewId) return rooms.map((r) => (r.id === previewId ? { ...r, ...preview } : r))
  return [...rooms, { id: PREVIEW_ID, name: '', ...preview }]
}

export default function RoomsLayer({ zoom, plot }) {
  const level = useProject((s) => s.project.levels.find((l) => l.id === s.project.view.activeLevelId))
  const selectedId = useEditor((s) => s.selectedId)
  const preview = useEditor((s) => s.preview)
  const previewId = useEditor((s) => s.previewId)
  const guides = useEditor((s) => s.guides)

  const rooms = level.rooms
  const effective = effectiveRooms(rooms, { preview, previewId })

  const sig = effective.map((r) => `${r.id}:${r.x},${r.y},${r.w},${r.d}`).join('|')
  const walls = useMemo(() => resolveWalls(effective), [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  const overlaps = useMemo(() => overlappingRoomIds(effective), [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  const hs = 8 / zoom // screen-constant handle size
  const selected = effective.find((r) => r.id === selectedId)

  return (
    <g>
      {/* Room bodies — the pointer hit targets. */}
      {effective.map((r) => {
        const isPreview = r.id === PREVIEW_ID
        const isSel = r.id === selectedId
        return (
          <rect
            key={r.id}
            data-room-id={isPreview ? undefined : r.id}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.d}
            fill={isSel ? COLOR.accentSoft : 'rgba(0,0,0,0)'}
            style={{ pointerEvents: isPreview ? 'none' : 'all' }}
          />
        )
      })}

      {/* Walls (poché). Non-interactive so clicks fall through to room bodies. */}
      <g style={{ pointerEvents: 'none' }}>
        {walls.map((w) => {
          const r = wallRect(w)
          return <rect key={w.id} x={r.x} y={r.y} width={r.width} height={r.height} fill={COLOR.ink} />
        })}
      </g>

      {/* Overlap outlines. */}
      <g style={{ pointerEvents: 'none' }}>
        {effective
          .filter((r) => overlaps.has(r.id))
          .map((r) => (
            <rect
              key={`ov${r.id}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.d}
              fill="none"
              stroke={COLOR.alert}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </g>

      {/* Draw preview outline (a room not yet created). */}
      {preview && !previewId && (
        <rect
          x={preview.x}
          y={preview.y}
          width={preview.w}
          height={preview.d}
          fill="none"
          stroke={COLOR.accent}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Selection outline + handles. */}
      {selected && selected.id !== PREVIEW_ID && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={selected.x}
            y={selected.y}
            width={selected.w}
            height={selected.d}
            fill="none"
            stroke={COLOR.accent}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          {HANDLES.map((h) => {
            const cx = selected.x + h.fx * selected.w
            const cy = selected.y + h.fy * selected.d
            return (
              <rect
                key={h.id}
                data-handle={h.id}
                data-room-id={selected.id}
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
      )}

      {/* Snap guides. */}
      <g style={{ pointerEvents: 'none' }}>
        {guides.xs.map((x, i) => (
          <line key={`gx${i}`} x1={x} y1={0} x2={x} y2={plot.depthIn} stroke={COLOR.accent} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {guides.ys.map((y, i) => (
          <line key={`gy${i}`} x1={0} y1={y} x2={plot.widthIn} y2={y} stroke={COLOR.accent} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </g>
  )
}

function wallRect(w) {
  const t = w.thicknessIn
  if (w.y1 === w.y2) {
    return { x: Math.min(w.x1, w.x2), y: w.y1 - t / 2, width: Math.abs(w.x2 - w.x1), height: t }
  }
  return { x: w.x1 - t / 2, y: Math.min(w.y1, w.y2), width: t, height: Math.abs(w.y2 - w.y1) }
}
