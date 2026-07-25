import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useProject } from '../store/useProject.js'
import { useViewport } from '../store/useViewport.js'
import { useEditor } from '../store/useEditor.js'
import { useSession } from '../store/session.js'
import { fitView } from '../lib/viewport.js'
import { usePlanInteractions } from '../hooks/usePlanInteractions.js'
import { roomPolygon } from '../lib/geometry.js'
import RoomsLayer from './RoomsLayer.jsx'
import { COLOR } from '../tokens.js'

const ptsStr = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ')

// The plan canvas: SVG in world inches, pan + cursor-anchored zoom, a 1'/5'
// grid, the plot boundary, the ghost-below layer, and rooms (Phase 2).
export default function PlanCanvas() {
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const spaceRef = useRef(false)

  const plot = useProject((s) => s.project.plot)
  const levels = useProject((s) => s.project.levels)
  const view = useProject((s) => s.project.view)
  const vp = useViewport()
  const tool = useEditor((s) => s.tool)
  const fitOnLoad = useSession((s) => s.fitOnLoad)

  const { onPointerDown, onPointerMove, onPointerUp } = usePlanInteractions(svgRef, spaceRef)

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

  useEffect(() => {
    if (!fitOnLoad || size.w === 0 || size.h === 0) return
    useViewport.getState().setView(fitView(plot.widthIn, plot.depthIn, size.w, size.h))
    useSession.getState()._set({ fitOnLoad: false })
  }, [fitOnLoad, size.w, size.h, plot.widthIn, plot.depthIn])

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

  const t = `translate(${vp.panX} ${vp.panY}) scale(${vp.zoom})`
  const belowLevel = ghostLevelBelow(levels, view)
  const cursor = tool === 'room' ? 'crosshair' : 'default'

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor, display: 'block', touchAction: 'none' }}
      >
        <g transform={t}>
          <rect x={0} y={0} width={plot.widthIn} height={plot.depthIn} fill={COLOR.panel} />
          {vp.showGrid && <Grid plot={plot} zoom={vp.zoom} />}

          {/* Ghost-below layer: the level beneath, its rooms only. */}
          {view.showGhostBelow && belowLevel && (
            <g opacity={0.15} style={{ pointerEvents: 'none' }}>
              {belowLevel.rooms.map((r) => (
                <polygon key={r.id} points={ptsStr(roomPolygon(r))} fill="none" stroke={COLOR.ink} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          )}

          <RoomsLayer zoom={vp.zoom} plot={plot} />

          {/* Plot boundary on top. */}
          <rect x={0} y={0} width={plot.widthIn} height={plot.depthIn} fill="none" stroke={COLOR.lineStrong} strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
        </g>
      </svg>
    </div>
  )
}

function ghostLevelBelow(levels, view) {
  const active = levels.find((l) => l.id === view.activeLevelId)
  if (!active) return null
  const below = levels.filter((l) => l.index < active.index).sort((a, b) => b.index - a.index)[0]
  return below ?? null
}

function Grid({ plot, zoom }) {
  const foot = 12
  const fivefoot = 60
  const pxPerFoot = zoom * foot
  const fineOpacity = Math.max(0, Math.min(1, (pxPerFoot - 2.5) / 6)) * 0.55
  const coarseOpacity = Math.max(0, Math.min(1, (zoom * fivefoot - 3) / 12)) * 0.8

  const vf = []
  const vc = []
  for (let x = 0; x <= plot.widthIn; x += foot) (x % fivefoot === 0 ? vc : vf).push(x)
  const hf = []
  const hc = []
  for (let y = 0; y <= plot.depthIn; y += foot) (y % fivefoot === 0 ? hc : hf).push(y)

  return (
    <g style={{ pointerEvents: 'none' }}>
      {fineOpacity > 0.01 && (
        <g stroke={COLOR.line} strokeWidth={1} opacity={fineOpacity}>
          {vf.map((x) => (
            <line key={`vf${x}`} x1={x} y1={0} x2={x} y2={plot.depthIn} vectorEffect="non-scaling-stroke" />
          ))}
          {hf.map((y) => (
            <line key={`hf${y}`} x1={0} y1={y} x2={plot.widthIn} y2={y} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      )}
      {coarseOpacity > 0.01 && (
        <g stroke={COLOR.line} strokeWidth={1.5} opacity={coarseOpacity}>
          {vc.map((x) => (
            <line key={`vc${x}`} x1={x} y1={0} x2={x} y2={plot.depthIn} vectorEffect="non-scaling-stroke" />
          ))}
          {hc.map((y) => (
            <line key={`hc${y}`} x1={0} y1={y} x2={plot.widthIn} y2={y} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      )}
    </g>
  )
}
