import { useProject } from '../store/useProject.js'
import { useViewport } from '../store/useViewport.js'
import { useEditor } from '../store/useEditor.js'
import { worldToScreen } from '../lib/viewport.js'
import { roomAreaSqft, roomCentroid, roomBounds } from '../lib/geometry.js'
import { effectiveRooms } from './RoomsLayer.jsx'

// HTML overlay so room names + areas stay a constant screen size. Follows the
// live preview while a room is edited.
export default function RoomLabels() {
  const level = useProject((s) => s.project.levels.find((l) => l.id === s.project.view.activeLevelId))
  const vp = useViewport()
  const preview = useEditor((s) => s.preview)
  const previewId = useEditor((s) => s.previewId)

  const rooms = effectiveRooms(level.rooms, { preview, previewId }).filter((r) => r.name)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {rooms.map((r) => {
        const c = worldToScreen(roomCentroid(r).x, roomCentroid(r).y, vp)
        const bb = roomBounds(r)
        if (bb.w * vp.zoom < 44) return null // too small to label legibly
        return (
          <div key={r.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-center leading-tight" style={{ left: c.x, top: c.y }}>
            <div className="text-xs font-medium text-ink">{r.name}</div>
            <div className="num text-[11px] text-muted">{fmtArea(roomAreaSqft(r))} sq ft</div>
          </div>
        )
      })}
    </div>
  )
}

const fmtArea = (a) => a.toFixed(a < 100 ? 1 : 0)
