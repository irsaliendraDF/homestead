import { useViewport } from '../store/useViewport.js'
import { useEditor } from '../store/useEditor.js'
import { worldToScreen } from '../lib/viewport.js'
import { formatFeetInches } from '../lib/units.js'

// The signature element, live: while a room is drawn/moved/edited, label each
// wall with its length at the wall's midpoint. Mono, quiet, screen-space.
export default function DragDimensions() {
  const preview = useEditor((s) => s.preview)
  const vp = useViewport()
  if (!preview?.points) return null

  const pts = preview.points
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pts.map((p, i) => {
        const q = pts[(i + 1) % pts.length]
        const lenIn = Math.hypot(q.x - p.x, q.y - p.y)
        if (lenIn * vp.zoom < 26) return null // too short to label
        const mid = worldToScreen((p.x + q.x) / 2, (p.y + q.y) / 2, vp)
        return (
          <div
            key={i}
            className="num absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-accent px-1.5 py-0.5 text-[11px] text-white"
            style={{ left: mid.x, top: mid.y }}
          >
            {formatFeetInches(Math.round(lenIn))}
          </div>
        )
      })}
    </div>
  )
}
