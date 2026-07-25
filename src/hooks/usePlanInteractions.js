import { useRef } from 'react'
import { useProject, openingDefaults } from '../store/useProject.js'
import { useViewport } from '../store/useViewport.js'
import { useEditor } from '../store/useEditor.js'
import { screenToWorld } from '../lib/viewport.js'
import { snapCandidates, snapAxis } from '../lib/snapping.js'
import { roomPolygon, carveCorner, cleanPolygon } from '../lib/geometry.js'
import { nearestWallHost, hostSegment, clampOffset } from '../lib/openings.js'

// Pointer interaction for the plan canvas. Everything stays RECTILINEAR (no
// diagonal walls):
//  · draw room  — rectangle → 4-point polygon
//  · move room  — translate the whole polygon
//  · corner     — carve an L-notch (drag one corner, right angles preserved)
//  · wall (edge)— slide the whole wall perpendicular to itself
//  · draw wall  — a freestanding H/V wall segment
//  · move/trim wall — translate, or drag an endpoint along its axis
const SNAP_PX = 10
const CLICK_MIN = 12
const WALL_MIN = 12 // ignore near-zero wall draws

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
    if (tool === 'wall') {
      it.current = { mode: 'wall-draw', start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (tool === 'door' || tool === 'window') {
      // Click a wall to drop an opening on it.
      const level = activeLevel()
      const width = openingDefaults(tool).widthIn
      const host = nearestWallHost(start, level, 14 / useViewport.getState().zoom, width)
      if (host) {
        useProject.getState().addOpening({ type: tool, host: host.host, offsetIn: host.offset })
        useEditor.getState().setTool('select')
        useEditor.getState().selectOpening(useProject.getState()._lastOpeningId)
      }
      return
    }

    const el = e.target
    const roomId = el.getAttribute?.('data-room-id')
    const vertex = el.getAttribute?.('data-vertex')
    const edge = el.getAttribute?.('data-edge')
    const wallId = el.getAttribute?.('data-wall-id')
    const wallEnd = el.getAttribute?.('data-wall-end')
    const openingId = el.getAttribute?.('data-opening-id')
    const level = activeLevel()

    if (openingId) {
      const opening = level.openings.find((o) => o.id === openingId)
      useEditor.getState().selectOpening(openingId)
      it.current = { mode: 'opening', openingId, orig: { ...opening }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }

    if (wallId && wallEnd != null) {
      const wall = level.walls.find((w) => w.id === wallId)
      useEditor.getState().selectWall(wallId)
      it.current = { mode: 'wall-end', wallId, end: Number(wallEnd), orig: { ...wall }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (wallId) {
      const wall = level.walls.find((w) => w.id === wallId)
      useEditor.getState().selectWall(wallId)
      it.current = { mode: 'wall-move', wallId, orig: { ...wall }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }

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
      // Carve an L-notch: the dragged corner stays rectilinear via 2 joints.
      const o = cur.orig[cur.index]
      const nx = o.x + (p.x - cur.start.x)
      const ny = o.y + (p.y - cur.start.y)
      const sx = snapAxis([nx], cand.xs, thr)
      const sy = snapAxis([ny], cand.ys, thr)
      const D = { x: nx + sx.delta, y: ny + sy.delta }
      const points = carveCorner(cur.orig, cur.index, D)
      useEditor.getState().setPreview({ points }, guides(sx, sy), cur.roomId)
      return
    }

    if (cur.mode === 'edge') {
      // Slide the whole wall perpendicular to itself (keeps everything square).
      const i = cur.index
      const j = (i + 1) % cur.orig.length
      const A = cur.orig[i]
      const B = cur.orig[j]
      const horizontal = A.y === B.y
      let points
      let g
      if (horizontal) {
        const ny = A.y + (p.y - cur.start.y)
        const sy = snapAxis([ny], cand.ys, thr)
        const y = ny + sy.delta
        points = cur.orig.map((v, k) => (k === i || k === j ? { x: v.x, y } : v))
        g = { xs: [], ys: sy.guide != null ? [sy.guide] : [] }
      } else {
        const nx = A.x + (p.x - cur.start.x)
        const sx = snapAxis([nx], cand.xs, thr)
        const x = nx + sx.delta
        points = cur.orig.map((v, k) => (k === i || k === j ? { x, y: v.y } : v))
        g = { xs: sx.guide != null ? [sx.guide] : [], ys: [] }
      }
      useEditor.getState().setPreview({ points }, g, cur.roomId)
      return
    }

    if (cur.mode === 'wall-draw') {
      // Constrain to horizontal or vertical — whichever the drag favors.
      const sx = snapAxis([p.x], cand.xs, thr)
      const sy = snapAxis([p.y], cand.ys, thr)
      const ex = p.x + sx.delta
      const ey = p.y + sy.delta
      const horizontal = Math.abs(ex - cur.start.x) >= Math.abs(ey - cur.start.y)
      const seg = horizontal
        ? { x1: cur.start.x, y1: cur.start.y, x2: ex, y2: cur.start.y }
        : { x1: cur.start.x, y1: cur.start.y, x2: cur.start.x, y2: ey }
      useEditor.getState().setWallPreview(seg, horizontal ? guides(sx, { guide: null }) : guides({ guide: null }, sy))
      return
    }

    if (cur.mode === 'wall-move') {
      const dx = p.x - cur.start.x
      const dy = p.y - cur.start.y
      const o = cur.orig
      const seg = { x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy }
      const sx = snapAxis([seg.x1, seg.x2], cand.xs, thr)
      const sy = snapAxis([seg.y1, seg.y2], cand.ys, thr)
      useEditor.getState().setWallPreview(
        { x1: seg.x1 + sx.delta, y1: seg.y1 + sy.delta, x2: seg.x2 + sx.delta, y2: seg.y2 + sy.delta },
        guides(sx, sy)
      )
      return
    }

    if (cur.mode === 'opening') {
      // Slide the opening along its host wall; keep it centered under the cursor.
      const level = activeLevel()
      const s = hostSegment(cur.orig, level)
      if (s) {
        const param = (p.x - s.x1) * s.dx + (p.y - s.y1) * s.dy
        const offsetIn = clampOffset(param - cur.orig.widthIn / 2, cur.orig.widthIn, s.len)
        useEditor.getState().setOpeningPreview({ id: cur.openingId, offsetIn })
      }
      return
    }

    if (cur.mode === 'wall-end') {
      // Drag one endpoint along the wall's own axis (change its length).
      const o = cur.orig
      const horizontal = o.y1 === o.y2
      const seg = { ...o }
      if (horizontal) {
        const nx = (cur.end === 0 ? o.x1 : o.x2) + (p.x - cur.start.x)
        const sx = snapAxis([nx], cand.xs, thr)
        const x = nx + sx.delta
        if (cur.end === 0) seg.x1 = x
        else seg.x2 = x
        useEditor.getState().setWallPreview(seg, guides(sx, { guide: null }))
      } else {
        const ny = (cur.end === 0 ? o.y1 : o.y2) + (p.y - cur.start.y)
        const sy = snapAxis([ny], cand.ys, thr)
        const y = ny + sy.delta
        if (cur.end === 0) seg.y1 = y
        else seg.y2 = y
        useEditor.getState().setWallPreview(seg, guides({ guide: null }, sy))
      }
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
    const wallPreview = useEditor.getState().wallPreview
    const openingPreview = useEditor.getState().openingPreview
    useEditor.getState().clearPreview()
    useEditor.getState().clearWallPreview()
    useEditor.getState().clearOpeningPreview()

    if (cur.mode === 'opening') {
      if (openingPreview) useProject.getState().updateOpening(cur.openingId, { offsetIn: openingPreview.offsetIn })
      return
    }

    if (cur.mode === 'draw') {
      const bb = preview ? bounds(preview.points) : null
      const isClick = !bb || (bb.maxX - bb.minX < CLICK_MIN && bb.maxY - bb.minY < CLICK_MIN)
      if (isClick) {
        useProject.getState().addRoom({ x: cur.start.x - 72, y: cur.start.y - 72, w: 144, d: 144 })
      } else {
        useProject.getState().addRoom({ x: bb.minX, y: bb.minY, w: bb.maxX - bb.minX, d: bb.maxY - bb.minY })
      }
      useEditor.getState().setTool('select')
      useEditor.getState().select(useProject.getState()._lastRoomId)
      return
    }

    if (cur.mode === 'wall-draw') {
      if (wallPreview) {
        const len = Math.abs(wallPreview.x2 - wallPreview.x1) + Math.abs(wallPreview.y2 - wallPreview.y1)
        if (len >= WALL_MIN) {
          useProject.getState().addWall(wallPreview)
          useEditor.getState().setTool('select')
          useEditor.getState().selectWall(useProject.getState()._lastWallId)
        }
      }
      return
    }

    if ((cur.mode === 'wall-move' || cur.mode === 'wall-end') && wallPreview) {
      useProject.getState().updateWall(cur.wallId, wallPreview)
      return
    }

    if (preview && (cur.mode === 'move' || cur.mode === 'vertex' || cur.mode === 'edge')) {
      useProject.getState().updateRoom(cur.roomId, { points: cleanPolygon(preview.points) })
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
