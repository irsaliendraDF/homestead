import { useMemo } from 'react'
import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { resolveWalls, overlappingRoomIds, roomPolygon } from '../lib/geometry.js'
import { COLOR } from '../tokens.js'

// Renders, in world inches, inside the canvas transform group:
// room bodies (hit targets) · resolved walls (poché) · selection + overlap
// outlines · corner (vertex) + wall (edge) handles · preview + snap guides.
const PREVIEW_ID = '__preview__'

export function effectiveRooms(rooms, { preview, previewId }) {
  if (!preview) return rooms
  if (previewId) return rooms.map((r) => (r.id === previewId ? { ...r, points: preview.points } : r))
  return [...rooms, { id: PREVIEW_ID, name: '', points: preview.points }]
}

const ptsStr = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ')

export default function RoomsLayer({ zoom, plot }) {
  const level = useProject((s) => s.project.levels.find((l) => l.id === s.project.view.activeLevelId))
  const selectedId = useEditor((s) => s.selectedId)
  const preview = useEditor((s) => s.preview)
  const previewId = useEditor((s) => s.previewId)
  const guides = useEditor((s) => s.guides)

  const effective = effectiveRooms(level.rooms, { preview, previewId })

  const sig = effective.map((r) => `${r.id}:${ptsStr(roomPolygon(r))}`).join('|')
  const walls = useMemo(() => resolveWalls(effective), [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  const overlaps = useMemo(() => overlappingRoomIds(effective), [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  const hs = 8 / zoom // corner handle size (screen-constant)
  const er = 6 / zoom // edge handle radius
  const selected = effective.find((r) => r.id === selectedId)
  const selPts = selected && selected.id !== PREVIEW_ID ? roomPolygon(selected) : null

  return (
    <g>
      {/* Room bodies — pointer hit targets. */}
      {effective.map((r) => {
        const isPreview = r.id === PREVIEW_ID
        const isSel = r.id === selectedId
        return (
          <polygon
            key={r.id}
            data-room-id={isPreview ? undefined : r.id}
            points={ptsStr(roomPolygon(r))}
            fill={isSel ? COLOR.accentSoft : 'rgba(0,0,0,0)'}
            style={{ pointerEvents: isPreview ? 'none' : 'all' }}
          />
        )
      })}

      {/* Walls (poché). Non-interactive so clicks fall through to bodies. */}
      <g style={{ pointerEvents: 'none' }}>
        {walls.map((w) => {
          const axis = w.x1 === w.x2 || w.y1 === w.y2
          if (axis) {
            const r = wallRect(w)
            return <rect key={w.id} x={r.x} y={r.y} width={r.width} height={r.height} fill={COLOR.ink} />
          }
          return (
            <line
              key={w.id}
              x1={w.x1}
              y1={w.y1}
              x2={w.x2}
              y2={w.y2}
              stroke={COLOR.ink}
              strokeWidth={w.thicknessIn}
              strokeLinecap="square"
            />
          )
        })}
      </g>

      {/* Overlap outlines. */}
      <g style={{ pointerEvents: 'none' }}>
        {effective
          .filter((r) => overlaps.has(r.id))
          .map((r) => (
            <polygon key={`ov${r.id}`} points={ptsStr(roomPolygon(r))} fill="none" stroke={COLOR.alert} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
          ))}
      </g>

      {/* Draw preview outline (not yet created). */}
      {preview && !previewId && (
        <polygon points={ptsStr(preview.points)} fill="none" stroke={COLOR.accent} strokeWidth={1.5} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
      )}

      {/* Selection outline + handles. */}
      {selPts && (
        <>
          <polygon points={ptsStr(selPts)} fill="none" stroke={COLOR.accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
          {/* Edge (wall) handles — midpoints. */}
          {selPts.map((p, i) => {
            const q = selPts[(i + 1) % selPts.length]
            const mx = (p.x + q.x) / 2
            const my = (p.y + q.y) / 2
            return (
              <circle
                key={`e${i}`}
                data-edge={i}
                data-room-id={selected.id}
                cx={mx}
                cy={my}
                r={er}
                fill={COLOR.panel}
                stroke={COLOR.accent}
                strokeWidth={1.25}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: 'all', cursor: 'move' }}
              />
            )
          })}
          {/* Corner (vertex) handles — drag one corner freely. */}
          {selPts.map((p, i) => (
            <rect
              key={`v${i}`}
              data-vertex={i}
              data-room-id={selected.id}
              x={p.x - hs / 2}
              y={p.y - hs / 2}
              width={hs}
              height={hs}
              fill={COLOR.accent}
              stroke={COLOR.panel}
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'all', cursor: 'grab' }}
            />
          ))}
        </>
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
