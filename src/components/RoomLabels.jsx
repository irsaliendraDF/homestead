import { useProject } from '../store/useProject.js'
import { useViewport } from '../store/useViewport.js'
import { useEditor } from '../store/useEditor.js'
import { worldToScreen } from '../lib/viewport.js'
import { roomInteriorSqft } from '../lib/geometry.js'
import { effectiveRooms } from './RoomsLayer.jsx'

// HTML overlay so room names + interior areas stay a constant screen size
// (SVG <text> inside the zoom group would scale with zoom). Labels follow the
// live preview while a room is dragged.
export default function RoomLabels() {
  const level = useProject((s) => s.project.levels.find((l) => l.id === s.project.view.activeLevelId))
  const vp = useViewport()
  const preview = useEditor((s) => s.preview)
  const previewId = useEditor((s) => s.previewId)

  const rooms = effectiveRooms(level.rooms, { preview, previewId }).filter((r) => r.name)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {rooms.map((r) => {
        const c = worldToScreen(r.x + r.w / 2, r.y + r.d / 2, vp)
        const sqft = roomInteriorSqft(r, rooms)
        const wPx = r.w * vp.zoom
        if (wPx < 44) return null // too small to label legibly
        return (
          <div
            key={r.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center leading-tight"
            style={{ left: c.x, top: c.y }}
          >
            <div className="text-xs font-medium text-ink">{r.name}</div>
            <div className="num text-[11px] text-muted">{sqft.toFixed(sqft < 100 ? 1 : 0)} sq ft</div>
          </div>
        )
      })}
    </div>
  )
}
