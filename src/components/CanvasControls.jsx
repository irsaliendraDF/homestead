import { useLayoutEffect, useRef, useState } from 'react'
import { Minus, Plus, Maximize2, Grid3x3 } from 'lucide-react'
import { useProject } from '../store/useProject.js'
import { useViewport } from '../store/useViewport.js'
import { fitView, clampZoom } from '../lib/viewport.js'

// Bottom-left control cluster: zoom out / percent / zoom in, fit-to-plot, grid
// toggle. The tool rail stays reserved for actual tools (Phase 2+).
export default function CanvasControls({ containerRef }) {
  const plot = useProject((s) => s.project.plot)
  const zoom = useViewport((s) => s.zoom)
  const showGrid = useViewport((s) => s.showGrid)

  const pct = Math.round(zoom * 100)

  const zoomByFactor = (factor) => {
    const el = containerRef.current
    const cx = el ? el.clientWidth / 2 : 0
    const cy = el ? el.clientHeight / 2 : 0
    useViewport.getState().zoomAt(factor, cx, cy)
  }

  const fit = () => {
    const el = containerRef.current
    if (!el) return
    useViewport.getState().setView(fitView(plot.widthIn, plot.depthIn, el.clientWidth, el.clientHeight))
  }

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg border border-line bg-panel/95 p-1 shadow-sm backdrop-blur">
      <IconButton label="Zoom out" onClick={() => zoomByFactor(1 / 1.2)}>
        <Minus size={15} strokeWidth={1.75} />
      </IconButton>
      <span className="num w-12 text-center text-xs text-muted" aria-live="polite">
        {pct}%
      </span>
      <IconButton label="Zoom in" onClick={() => zoomByFactor(1.2)}>
        <Plus size={15} strokeWidth={1.75} />
      </IconButton>
      <span className="mx-0.5 h-4 w-px bg-line" />
      <IconButton label="Zoom to fit" onClick={fit}>
        <Maximize2 size={15} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        label={showGrid ? 'Hide grid' : 'Show grid'}
        active={showGrid}
        onClick={() => useViewport.getState().toggleGrid()}
      >
        <Grid3x3 size={15} strokeWidth={1.75} />
      </IconButton>
    </div>
  )
}

function IconButton({ label, onClick, active, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded p-1.5 transition-colors hover:bg-accentSoft ${
        active ? 'text-accent' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
