import { useRef } from 'react'
import { useProject } from '../store/useProject.js'
import { useViewport } from '../store/useViewport.js'
import { useEditor } from '../store/useEditor.js'
import { screenToWorld } from '../lib/viewport.js'
import { snapCandidates, snapAxis } from '../lib/snapping.js'
import { UNITS } from '../config.js'

// All pointer interaction for the plan canvas: pan (space/middle-drag), draw a
// room, move a room, resize via handles. Snapping is applied live; integer
// rounding happens on commit (in the store actions). Single selection only.
const SNAP_PX = 10
const CLICK_MIN = 12 // a draw smaller than this in both axes = a click → default room

export function usePlanInteractions(svgRef, spaceRef) {
  const it = useRef(null)

  const world = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top, useViewport.getState())
  }
  const activeLevel = () => {
    const p = useProject.getState().project
    return p.levels.find((l) => l.id === p.view.activeLevelId)
  }
  const thresholdIn = () => SNAP_PX / useViewport.getState().zoom

  const onPointerDown = (e) => {
    // Pan takes precedence (space held or middle button).
    if (e.button === 1 || spaceRef.current) {
      it.current = { mode: 'pan', last: { x: e.clientX, y: e.clientY } }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (e.button !== 0) return

    const tool = useEditor.getState().tool
    const start = world(e)

    if (tool === 'room') {
      it.current = { mode: 'draw', start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }

    // Select tool: hit-test via data attributes on the rendered elements.
    const handle = e.target.getAttribute?.('data-handle')
    const roomId = e.target.getAttribute?.('data-room-id')
    const level = activeLevel()

    if (handle && roomId) {
      const room = level.rooms.find((r) => r.id === roomId)
      useEditor.getState().select(roomId)
      it.current = { mode: 'resize', handle, roomId, orig: { ...room }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (roomId) {
      const room = level.rooms.find((r) => r.id === roomId)
      useEditor.getState().select(roomId)
      it.current = { mode: 'move', roomId, orig: { ...room }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    // Empty space → deselect.
    useEditor.getState().clearSelection()
  }

  const onPointerMove = (e) => {
    const cur = it.current
    if (!cur) return

    if (cur.mode === 'pan') {
      const dx = e.clientX - cur.last.x
      const dy = e.clientY - cur.last.y
      cur.last = { x: e.clientX, y: e.clientY }
      useViewport.getState().panBy(dx, dy)
      return
    }

    const p = world(e)
    const project = useProject.getState().project
    const level = activeLevel()
    const thr = thresholdIn()
    const cand = snapCandidates(level.rooms, project.plot, cur.roomId)

    if (cur.mode === 'draw') {
      const sx = snapAxis([p.x], cand.xs, thr)
      const sy = snapAxis([p.y], cand.ys, thr)
      const cx = p.x + sx.delta
      const cy = p.y + sy.delta
      const rect = normalize(cur.start, { x: cx, y: cy })
      useEditor.getState().setPreview(rect, guides(sx, sy), null)
      return
    }

    if (cur.mode === 'move') {
      let nx = cur.orig.x + (p.x - cur.start.x)
      let ny = cur.orig.y + (p.y - cur.start.y)
      const sx = snapAxis([nx, nx + cur.orig.w], cand.xs, thr)
      const sy = snapAxis([ny, ny + cur.orig.d], cand.ys, thr)
      nx += sx.delta
      ny += sy.delta
      useEditor.getState().setPreview(
        { x: nx, y: ny, w: cur.orig.w, d: cur.orig.d },
        guides(sx, sy),
        cur.roomId
      )
      return
    }

    if (cur.mode === 'resize') {
      const rect = resizeRect(cur, p, cand, thr)
      useEditor.getState().setPreview(rect.rect, rect.guides, cur.roomId)
    }
  }

  const onPointerUp = (e) => {
    const cur = it.current
    it.current = null
    if (!cur) return
    try {
      svgRef.current.releasePointerCapture(e.pointerId)
    } catch {
      /* capture may already be gone */
    }
    if (cur.mode === 'pan') return

    const preview = useEditor.getState().preview
    useEditor.getState().clearPreview()

    if (cur.mode === 'draw') {
      const isClick = !preview || (preview.w < CLICK_MIN && preview.d < CLICK_MIN)
      if (isClick) {
        useProject.getState().addRoom({ x: cur.start.x - 72, y: cur.start.y - 72, w: 144, d: 144 })
      } else {
        useProject.getState().addRoom(preview)
      }
      const newId = useProject.getState()._lastRoomId
      useEditor.getState().setTool('select')
      useEditor.getState().select(newId)
      return
    }

    if ((cur.mode === 'move' || cur.mode === 'resize') && preview) {
      useProject.getState().updateRoom(cur.roomId, preview)
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp }
}

function normalize(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    d: Math.abs(b.y - a.y),
  }
}

function guides(sx, sy) {
  return {
    xs: sx.guide != null ? [sx.guide] : [],
    ys: sy.guide != null ? [sy.guide] : [],
  }
}

function resizeRect(cur, p, cand, thr) {
  const { handle, orig, start } = cur
  const MIN = UNITS.MIN_ROOM_IN
  let left = orig.x
  let right = orig.x + orig.w
  let top = orig.y
  let bottom = orig.y + orig.d
  const dx = p.x - start.x
  const dy = p.y - start.y
  const mL = handle.includes('w')
  const mR = handle.includes('e')
  const mT = handle.includes('n')
  const mB = handle.includes('s')
  if (mL) left = orig.x + dx
  if (mR) right = orig.x + orig.w + dx
  if (mT) top = orig.y + dy
  if (mB) bottom = orig.y + orig.d + dy

  const movingXs = [...(mL ? [left] : []), ...(mR ? [right] : [])]
  const movingYs = [...(mT ? [top] : []), ...(mB ? [bottom] : [])]
  const sx = movingXs.length ? snapAxis(movingXs, cand.xs, thr) : { delta: 0, guide: null }
  const sy = movingYs.length ? snapAxis(movingYs, cand.ys, thr) : { delta: 0, guide: null }
  if (mL) left += sx.delta
  if (mR) right += sx.delta
  if (mT) top += sy.delta
  if (mB) bottom += sy.delta

  // Clamp to the minimum without inverting (the fixed edge stays put).
  if (mL && left > right - MIN) left = right - MIN
  if (mR && right < left + MIN) right = left + MIN
  if (mT && top > bottom - MIN) top = bottom - MIN
  if (mB && bottom < top + MIN) bottom = top + MIN

  return {
    rect: { x: left, y: top, w: right - left, d: bottom - top },
    guides: guides(sx, sy),
  }
}
