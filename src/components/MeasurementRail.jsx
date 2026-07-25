import { useProject } from '../store/useProject.js'
import { useViewport } from '../store/useViewport.js'
import { worldToScreen } from '../lib/viewport.js'
import { formatFeetInches } from '../lib/units.js'

// The signature element (Phase 1 form): persistent dimension strings along the
// top and left edges of the plan, in mono, showing the overall plot footprint.
// Grows in Phase 2 to live-update with the dragged room.
export default function MeasurementRail() {
  const plot = useProject((s) => s.project.plot)
  const vp = useViewport()

  const tl = worldToScreen(0, 0, vp)
  const tr = worldToScreen(plot.widthIn, 0, vp)
  const bl = worldToScreen(0, plot.depthIn, vp)

  const topCenter = (tl.x + tr.x) / 2
  const leftCenter = (tl.y + bl.y) / 2

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Top: overall width */}
      <div
        className="num absolute -translate-x-1/2 whitespace-nowrap rounded bg-canvas/80 px-1.5 py-0.5 text-[11px] tracking-tight text-muted"
        style={{ left: topCenter, top: Math.max(4, tl.y - 22) }}
      >
        {formatFeetInches(plot.widthIn)}
      </div>
      {/* Left: overall depth (rotated) */}
      <div
        className="num absolute origin-center whitespace-nowrap rounded bg-canvas/80 px-1.5 py-0.5 text-[11px] tracking-tight text-muted"
        style={{
          left: Math.max(4, tl.x - 30),
          top: leftCenter,
          transform: 'translate(-50%, -50%) rotate(-90deg)',
        }}
      >
        {formatFeetInches(plot.depthIn)}
      </div>
    </div>
  )
}
