import { useProject } from '../store/useProject.js'
import { useViewport } from '../store/useViewport.js'
import { useEditor } from '../store/useEditor.js'
import { worldToScreen } from '../lib/viewport.js'
import { formatFeetInches } from '../lib/units.js'

// The signature element, live: while a room is drawn/moved/resized, show its
// W×D and its offset (gap) to the nearest wall or plot edge on each side. Mono,
// quiet, screen-space.
export default function DragDimensions() {
  const preview = useEditor((s) => s.preview)
  const previewId = useEditor((s) => s.previewId)
  const level = useProject((s) => s.project.levels.find((l) => l.id === s.project.view.activeLevelId))
  const plot = useProject((s) => s.project.plot)
  const vp = useViewport()

  if (!preview) return null
  const r = preview
  const others = level.rooms.filter((o) => o.id !== previewId)

  const left = gap('left', r, others, plot)
  const right = gap('right', r, others, plot)
  const top = gap('top', r, others, plot)
  const bottom = gap('bottom', r, others, plot)

  const wLabel = worldToScreen(r.x + r.w / 2, r.y, vp)
  const dLabel = worldToScreen(r.x, r.y + r.d / 2, vp)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <Chip x={wLabel.x} y={wLabel.y - 18} strong>{formatFeetInches(Math.round(r.w))}</Chip>
      <Chip x={dLabel.x - 26} y={dLabel.y} rotate strong>{formatFeetInches(Math.round(r.d))}</Chip>
      {left != null && <Offset a={worldToScreen(r.x - left, r.y + r.d / 2, vp)} b={worldToScreen(r.x, r.y + r.d / 2, vp)} label={formatFeetInches(left)} />}
      {right != null && <Offset a={worldToScreen(r.x + r.w, r.y + r.d / 2, vp)} b={worldToScreen(r.x + r.w + right, r.y + r.d / 2, vp)} label={formatFeetInches(right)} />}
      {top != null && <Offset a={worldToScreen(r.x + r.w / 2, r.y - top, vp)} b={worldToScreen(r.x + r.w / 2, r.y, vp)} label={formatFeetInches(top)} vertical />}
      {bottom != null && <Offset a={worldToScreen(r.x + r.w / 2, r.y + r.d, vp)} b={worldToScreen(r.x + r.w / 2, r.y + r.d + bottom, vp)} label={formatFeetInches(bottom)} vertical />}
    </div>
  )
}

function Chip({ x, y, rotate, strong, children }) {
  return (
    <div
      className={`num absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] ${
        strong ? 'bg-accent text-white' : 'bg-canvas/85 text-muted'
      }`}
      style={{ left: x, top: y, transform: `translate(-50%,-50%) ${rotate ? 'rotate(-90deg)' : ''}` }}
    >
      {children}
    </div>
  )
}

// A gap readout centered between two screen points.
function Offset({ a, b, label, vertical }) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const len = vertical ? Math.abs(b.y - a.y) : Math.abs(b.x - a.x)
  if (len < 14) return null
  return (
    <div
      className="num absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-canvas/85 px-1 py-0.5 text-[10px] text-muted"
      style={{ left: mx, top: my }}
    >
      {label}
    </div>
  )
}

// Distance from one side of the room to the nearest parallel edge (another
// room's edge that overlaps perpendicularly, or the plot boundary).
function gap(side, r, others, plot) {
  const rl = r.x
  const rr = r.x + r.w
  const rt = r.y
  const rb = r.y + r.d
  const vOverlap = (o) => Math.max(rt, o.y) < Math.min(rb, o.y + o.d)
  const hOverlap = (o) => Math.max(rl, o.x) < Math.min(rr, o.x + o.w)

  if (side === 'left') {
    let best = 0 // plot edge
    for (const o of others) if (vOverlap(o) && o.x + o.w <= rl) best = Math.max(best, o.x + o.w)
    return round(rl - best)
  }
  if (side === 'right') {
    let best = plot.widthIn
    for (const o of others) if (vOverlap(o) && o.x >= rr) best = Math.min(best, o.x)
    return round(best - rr)
  }
  if (side === 'top') {
    let best = 0
    for (const o of others) if (hOverlap(o) && o.y + o.d <= rt) best = Math.max(best, o.y + o.d)
    return round(rt - best)
  }
  // bottom
  let best = plot.depthIn
  for (const o of others) if (hOverlap(o) && o.y >= rb) best = Math.min(best, o.y)
  return round(best - rb)
}

function round(v) {
  const n = Math.round(v)
  return n <= 0 ? null : n
}
