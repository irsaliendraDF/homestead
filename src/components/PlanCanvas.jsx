import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useProject } from '../store/useProject.js'
import { useViewport } from '../store/useViewport.js'
import { useSession } from '../store/session.js'
import { fitView } from '../lib/viewport.js'
import { COLOR } from '../tokens.js'

// The plan canvas: SVG in world inches, pan + cursor-anchored zoom, a 1'/5'
// grid, the plot boundary, and the ghost-below layer. No rooms yet (Phase 2).

export default function PlanCanvas() {
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const panRef = useRef(null)
  const spaceRef = useRef(false)

  const plot = useProject((s) => s.project.plot)
  const levels = useProject((s) => s.project.levels)
  const view = useProject((s) => s.project.view)
  const vp = useViewport()
  const fitOnLoad = useSession((s) => s.fitOnLoad)

  // Measure the container.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // First-load fit (only when the session says so — never on a restored view).
  useEffect(() => {
    if (!fitOnLoad || size.w === 0 || size.h === 0) return
    useViewport.getState().setView(fitView(plot.widthIn, plot.depthIn, size.w, size.h))
    useSession.getState()._set({ fitOnLoad: false })
  }, [fitOnLoad, size.w, size.h, plot.widthIn, plot.depthIn])

  // Track space for space-drag panning.
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'Space') spaceRef.current = true
    }
    const up = (e) => {
      if (e.code === 'Space') spaceRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // Non-passive wheel so we can preventDefault and zoom to the cursor.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const factor = Math.pow(1.0015, -e.deltaY)
      useViewport.getState().zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e) => {
    const middle = e.button === 1
    if (!(middle || spaceRef.current)) return
    e.preventDefault()
    panRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!panRef.current) return
    const dx = e.clientX - panRef.current.x
    const dy = e.clientY - panRef.current.y
    panRef.current = { x: e.clientX, y: e.clientY }
    useViewport.getState().panBy(dx, dy)
  }
  const endPan = (e) => {
    if (panRef.current && e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    panRef.current = null
  }

  const t = `translate(${vp.panX} ${vp.panY}) scale(${vp.zoom})`
  const belowLevel = ghostLevelBelow(levels, view)

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        style={{ cursor: panRef.current ? 'grabbing' : 'default', display: 'block' }}
      >
        <g transform={t}>
          {/* Plot fill */}
          <rect
            x={0}
            y={0}
            width={plot.widthIn}
            height={plot.depthIn}
            fill={COLOR.panel}
            stroke="none"
          />
          {vp.showGrid && <Grid plot={plot} zoom={vp.zoom} />}
          {/* Ghost-below layer (empty until rooms exist in Phase 2) */}
          {view.showGhostBelow && belowLevel && (
            <g opacity={0.15}>{/* below-level rooms render here in Phase 2 */}</g>
          )}
          {/* Plot boundary */}
          <rect
            x={0}
            y={0}
            width={plot.widthIn}
            height={plot.depthIn}
            fill="none"
            stroke={COLOR.lineStrong}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  )
}

// The level directly beneath the active one, for the ghost layer.
function ghostLevelBelow(levels, view) {
  const active = levels.find((l) => l.id === view.activeLevelId)
  if (!active) return null
  const below = levels
    .filter((l) => l.index < active.index)
    .sort((a, b) => b.index - a.index)[0]
  return below ?? null
}

// Grid drawn in its own pass. 1' lines fade out as you zoom away; 5' lines are
// stronger. Opacity is a real render-pass attribute, not compounded CSS.
function Grid({ plot, zoom }) {
  const foot = 12
  const fivefoot = 60
  const pxPerFoot = zoom * foot
  // Below ~3px/ft the fine grid is noise — fade it out.
  const fineOpacity = Math.max(0, Math.min(1, (pxPerFoot - 2.5) / 6)) * 0.55
  const coarseOpacity = Math.max(0, Math.min(1, (zoom * fivefoot - 3) / 12)) * 0.8

  const verticalsFine = []
  const verticalsCoarse = []
  for (let x = 0; x <= plot.widthIn; x += foot) {
    ;(x % fivefoot === 0 ? verticalsCoarse : verticalsFine).push(x)
  }
  const horizontalsFine = []
  const horizontalsCoarse = []
  for (let y = 0; y <= plot.depthIn; y += foot) {
    ;(y % fivefoot === 0 ? horizontalsCoarse : horizontalsFine).push(y)
  }

  return (
    <>
      {fineOpacity > 0.01 && (
        <g stroke={COLOR.line} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={fineOpacity}>
          {verticalsFine.map((x) => (
            <line key={`vf${x}`} x1={x} y1={0} x2={x} y2={plot.depthIn} vectorEffect="non-scaling-stroke" />
          ))}
          {horizontalsFine.map((y) => (
            <line key={`hf${y}`} x1={0} y1={y} x2={plot.widthIn} y2={y} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      )}
      {coarseOpacity > 0.01 && (
        <g stroke={COLOR.line} strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={coarseOpacity}>
          {verticalsCoarse.map((x) => (
            <line key={`vc${x}`} x1={x} y1={0} x2={x} y2={plot.depthIn} vectorEffect="non-scaling-stroke" />
          ))}
          {horizontalsCoarse.map((y) => (
            <line key={`hc${y}`} x1={0} y1={y} x2={plot.widthIn} y2={y} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      )}
    </>
  )
}
