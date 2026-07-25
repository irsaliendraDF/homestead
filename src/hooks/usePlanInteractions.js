import { useRef } from 'react'
import { useProject } from '../store/useProject.js'
import { useViewport } from '../store/useViewport.js'
import { useEditor } from '../store/useEditor.js'
import { screenToWorld } from '../lib/viewport.js'
import { snapCandidates, snapAxis } from '../lib/snapping.js'
import { roomPolygon } from '../lib/geometry.js'

// Pointer interaction for the plan canvas: pan (space/middle-drag), draw a room
// (rectangle → 4-point polygon), move a room, move a single corner (vertex), or
// move a whole wall (edge). Snapping is applied live; integer rounding on commit.
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

    const roomId = e.target.getAttribute?.('data-room-id')
    const vertex = e.target.getAttribute?.('data-vertex')
    const edge = e.target.getAttribute?.('data-edge')
    const level = activeLevel()
    const room = roomId ? level.rooms.find((r) => r.id === roomId) : null

    if (room && vertex != null) {
      useEditor.getState().select(roomId)
      it.current = { mode: 'vertex', roomId, index: Number(vertex), orig: roomPolygon(room), start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (room && edge != null) {
      useEditor.getState().select(roomId)
      it.current = { mode: 'edge', roomId, index: Number(edge), orig: roomPolygon(room), start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (room) {
      useEditor.getState().select(roomId)
      it.current = { mode: 'move', roomId, orig: roomPolygon(room), start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
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
      const rect = normalize(cur.start, { x: p.x + sx.delta, y: p.y + sy.delta })
      useEditor.getState().setPreview({ points: rectPoints(rect) }, guides(sx, sy), null)
      return
    }

    if (cur.mode === 'move') {
      const dx = p.x - cur.start.x
      const dy = p.y - cur.start.y
      const moved = cur.orig.map((v) => ({ x: v.x + dx, y: v.y + dy }))
      const bb = bounds(moved)
      const sx = snapAxis([bb.minX, bb.maxX], cand.xs, thr)
      const sy = snapAxis([bb.minY, bb.maxY], cand.ys, thr)
      const points = moved.map((v) => ({ x: v.x + sx.delta, y: v.y + sy.delta }))
      useEditor.getState().setPreview({ points }, guides(sx, sy), cur.roomId)
      return
    }

    if (cur.mode === 'vertex') {
      const o = cur.orig[cur.index]
      const nx = o.x + (p.x - cur.start.x)
      const ny = o.y + (p.y - cur.start.y)
      const sx = snapAxis([nx], cand.xs, thr)
      const sy = snapAxis([ny], cand.ys, thr)
      const points = cur.orig.map((v, i) =>
        i === cur.index ? { x: nx + sx.delta, y: ny + sy.delta } : v
      )
      useEditor.getState().setPreview({ points }, guides(sx, sy), cur.roomId)
      return
    }

    if (cur.mode === 'edge') {
      const i = cur.index
      const j = (i + 1) % cur.orig.length
      const dx = p.x - cur.start.x
      const dy = p.y - cur.start.y
      const a = { x: cur.orig[i].x + dx, y: cur.orig[i].y + dy }
      const b = { x: cur.orig[j].x + dx, y: cur.orig[j].y + dy }
      const sx = snapAxis([a.x, b.x], cand.xs, thr)
      const sy = snapAxis([a.y, b.y], cand.ys, thr)
      const points = cur.orig.map((v, k) => {
        if (k === i) return { x: a.x + sx.delta, y: a.y + sy.delta }
        if (k === j) return { x: b.x + sx.delta, y: b.y + sy.delta }
        return v
      })
      useEditor.getState().setPreview({ points }, guides(sx, sy), cur.roomId)
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
      const bb = preview ? bounds(preview.points) : null
      const isClick = !bb || (bb.maxX - bb.minX < CLICK_MIN && bb.maxY - bb.minY < CLICK_MIN)
      if (isClick) {
        useProject.getState().addRoom({ x: cur.start.x - 72, y: cur.start.y - 72, w: 144, d: 144 })
      } else {
        useProject.getState().addRoom({ x: bb.minX, y: bb.minY, w: bb.maxX - bb.minX, d: bb.maxY - bb.minY })
      }
      const newId = useProject.getState()._lastRoomId
      useEditor.getState().setTool('select')
      useEditor.getState().select(newId)
      return
    }

    if (preview && (cur.mode === 'move' || cur.mode === 'vertex' || cur.mode === 'edge')) {
      useProject.getState().updateRoom(cur.roomId, { points: preview.points })
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp }
}

function normalize(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), d: Math.abs(b.y - a.y) }
}
function rectPoints({ x, y, w, d }) {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + d },
    { x, y: y + d },
  ]
}
function bounds(points) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}
function guides(sx, sy) {
  return { xs: sx.guide != null ? [sx.guide] : [], ys: sy.guide != null ? [sy.guide] : [] }
}
