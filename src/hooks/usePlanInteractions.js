import { useRef } from 'react'
import { useProject, openingDefaults } from '../store/useProject.js'
import { useViewport } from '../store/useViewport.js'
import { useEditor } from '../store/useEditor.js'
import { screenToWorld } from '../lib/viewport.js'
import { snapCandidates, snapAxis } from '../lib/snapping.js'
import { roomPolygon, carveCorner, cleanPolygon } from '../lib/geometry.js'
import { nearestWallHost, hostSegment, clampOffset } from '../lib/openings.js'
import { orthogonalize } from '../lib/runs.js'
import { objectFootprint } from '../lib/landscape.js'
import { UNITS } from '../config.js'

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

  // Utilities mode: place fixtures, draw runs, or select/move fixtures & runs.
  const handleUtilitiesDown = (e, start) => {
    const level = activeLevel()
    const ed = useEditor.getState()
    const fixtureId = e.target.getAttribute?.('data-fixture-id')

    if (ed.pendingFixture) {
      useProject.getState().addFixture({
        system: ed.pendingFixture.system,
        kind: ed.pendingFixture.kind,
        label: ed.pendingFixture.label,
        x: start.x,
        y: start.y,
        rotation: ed.pendingRotation,
      })
      useEditor.getState().selectFixture(useProject.getState()._lastFixtureId)
      return
    }

    if (ed.runArmed) {
      if (!ed.runDraft) {
        if (fixtureId) {
          const f = level.fixtures.find((x) => x.id === fixtureId)
          useEditor.getState().startRunDraft({ system: f.system, fromFixtureId: fixtureId, points: [{ x: f.x, y: f.y }] })
        }
        return
      }
      if (fixtureId && fixtureId !== ed.runDraft.fromFixtureId) {
        const f = level.fixtures.find((x) => x.id === fixtureId)
        const pts = orthogonalize([...ed.runDraft.points, { x: f.x, y: f.y }])
        useProject.getState().addRun({ system: ed.runDraft.system, points: pts, fromFixtureId: ed.runDraft.fromFixtureId, toFixtureId: fixtureId })
        useEditor.getState().cancelRun()
        return
      }
      useEditor.getState().startRunDraft({ ...ed.runDraft, points: [...ed.runDraft.points, { x: start.x, y: start.y }] })
      return
    }

    // Not armed → select / move fixtures and runs.
    if (fixtureId) {
      const f = level.fixtures.find((x) => x.id === fixtureId)
      useEditor.getState().selectFixture(fixtureId)
      it.current = { mode: 'fixture-move', fixtureId, orig: { ...f }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    const runId = e.target.getAttribute?.('data-run-id')
    if (runId) {
      useEditor.getState().selectRun(runId)
      return
    }
    useEditor.getState().clearSelection()
  }

  // Landscape (site) mode: place / move / resize objects, zones, plants.
  const handleLandscapeDown = (e, start) => {
    const ed = useEditor.getState()
    const project = useProject.getState().project

    // Garden placement
    if (ed.pendingPreset) {
      useProject.getState().addPreset(ed.pendingPreset, start.x, start.y)
      return
    }
    if (ed.gardenTool === 'plant') {
      useProject.getState().addPlant({ plantId: ed.activeCrop, x: start.x, y: start.y, zoneId: zoneAt(project, start) })
      useEditor.getState().selectPlant(useProject.getState()._lastPlantId)
      return
    }
    if (ed.gardenTool === 'zone') {
      it.current = { mode: 'zone-draw', start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }

    // Garden hit-tests (before objects, since plants/zones sit on top)
    const plantId = e.target.getAttribute?.('data-plant-id')
    const zoneHandle = e.target.getAttribute?.('data-zone-handle')
    const zoneId = e.target.getAttribute?.('data-zone-id')
    if (plantId) {
      const pl = project.landscape.plants.find((p) => p.id === plantId)
      useEditor.getState().selectPlant(plantId)
      it.current = { mode: 'plant-move', plantId, orig: { ...pl }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (zoneHandle && zoneId) {
      const z = project.landscape.zones.find((zz) => zz.id === zoneId)
      useEditor.getState().selectZone(zoneId)
      it.current = { mode: 'zone-resize', zoneId, handle: zoneHandle, orig: { ...z }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (zoneId) {
      const z = project.landscape.zones.find((zz) => zz.id === zoneId)
      useEditor.getState().selectZone(zoneId)
      it.current = { mode: 'zone-move', zoneId, orig: { ...z }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }

    if (ed.pendingLandscape) {
      const p = ed.pendingLandscape
      useProject.getState().addLandscapeObject({ kind: p.kind, label: p.label, x: start.x, y: start.y, w: p.w, d: p.d, heightIn: p.heightIn, rotation: 0 })
      useEditor.getState().selectLandscape(useProject.getState()._lastLandscapeId)
      return
    }
    const handle = e.target.getAttribute?.('data-landscape-handle')
    const id = e.target.getAttribute?.('data-landscape-id')
    if (handle && id) {
      const obj = project.landscape.objects.find((o) => o.id === id)
      useEditor.getState().selectLandscape(id)
      it.current = { mode: 'ls-resize', id, handle, orig: { ...obj }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (id) {
      const obj = project.landscape.objects.find((o) => o.id === id)
      useEditor.getState().selectLandscape(id)
      it.current = { mode: 'ls-move', id, orig: { ...obj }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    useEditor.getState().clearSelection()
  }

  const onPointerDown = (e) => {
    if (e.button === 1 || spaceRef.current) {
      it.current = { mode: 'pan', last: { x: e.clientX, y: e.clientY } }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (e.button !== 0) return

    const start = world(e)

    if (useEditor.getState().canvasMode === 'landscape') {
      handleLandscapeDown(e, start)
      return
    }

    const tool = useEditor.getState().tool

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

    if (tool === 'utilities') {
      handleUtilitiesDown(e, start)
      return
    }

    const el = e.target
    const roomId = el.getAttribute?.('data-room-id')
    const vertex = el.getAttribute?.('data-vertex')
    const edge = el.getAttribute?.('data-edge')
    const wallId = el.getAttribute?.('data-wall-id')
    const wallEnd = el.getAttribute?.('data-wall-end')
    const openingId = el.getAttribute?.('data-opening-id')
    const fixtureId = el.getAttribute?.('data-fixture-id')
    const runId = el.getAttribute?.('data-run-id')
    const level = activeLevel()

    if (openingId) {
      const opening = level.openings.find((o) => o.id === openingId)
      useEditor.getState().selectOpening(openingId)
      it.current = { mode: 'opening', openingId, orig: { ...opening }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (fixtureId) {
      const f = level.fixtures.find((x) => x.id === fixtureId)
      useEditor.getState().selectFixture(fixtureId)
      it.current = { mode: 'fixture-move', fixtureId, orig: { ...f }, start }
      svgRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (runId) {
      useEditor.getState().selectRun(runId)
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
    // Live run cursor (run drawing is click-based, not a drag).
    const ed = useEditor.getState()
    if (ed.tool === 'utilities' && ed.runDraft) ed.setRunCursor(world(e))

    const cur = it.current
    if (!cur) return

    if (cur.mode === 'fixture-move') {
      const p = world(e)
      const g = UNITS.SNAP_IN
      const x = Math.round((cur.orig.x + (p.x - cur.start.x)) / g) * g
      const y = Math.round((cur.orig.y + (p.y - cur.start.y)) / g) * g
      useEditor.getState().setFixtureDrag({ id: cur.fixtureId, x, y })
      return
    }

    if (cur.mode === 'ls-move') {
      const p = world(e)
      const obj = { ...cur.orig, x: cur.orig.x + (p.x - cur.start.x), y: cur.orig.y + (p.y - cur.start.y) }
      const project = useProject.getState().project
      const f = objectFootprint(obj)
      const cand = landscapeCandidates(project.landscape.objects.filter((o) => o.id !== cur.id), project.plot)
      const thr = thresholdIn()
      const sx = snapAxis([f.left, f.right], cand.xs, thr)
      const sy = snapAxis([f.top, f.bottom], cand.ys, thr)
      useEditor.getState().setLandscapePreview({ id: cur.id, x: obj.x + sx.delta, y: obj.y + sy.delta, w: cur.orig.w, d: cur.orig.d, rotation: cur.orig.rotation })
      return
    }

    if (cur.mode === 'ls-resize') {
      const p = world(e)
      const f = objectFootprint(cur.orig)
      let { left, right, top, bottom } = f
      const dx = p.x - cur.start.x
      const dy = p.y - cur.start.y
      const h = cur.handle
      if (h.includes('w')) left = f.left + dx
      if (h.includes('e')) right = f.right + dx
      if (h.includes('n')) top = f.top + dy
      if (h.includes('s')) bottom = f.bottom + dy
      const MIN = 12
      if (right - left < MIN) h.includes('w') ? (left = right - MIN) : (right = left + MIN)
      if (bottom - top < MIN) h.includes('n') ? (top = bottom - MIN) : (bottom = top + MIN)
      const fw = right - left
      const fh = bottom - top
      const swap = (cur.orig.rotation || 0) % 180 !== 0
      useEditor.getState().setLandscapePreview({
        id: cur.id,
        x: (left + right) / 2,
        y: (top + bottom) / 2,
        w: swap ? fh : fw,
        d: swap ? fw : fh,
        rotation: cur.orig.rotation,
      })
      return
    }

    if (cur.mode === 'zone-draw') {
      const r = normalize(cur.start, world(e))
      useEditor.getState().setZonePreview({ x: r.x, y: r.y, w: r.w, d: r.d })
      return
    }
    if (cur.mode === 'zone-move') {
      const p = world(e)
      const g = UNITS.SNAP_IN
      const x = Math.round((cur.orig.x + (p.x - cur.start.x)) / g) * g
      const y = Math.round((cur.orig.y + (p.y - cur.start.y)) / g) * g
      useEditor.getState().setZonePreview({ id: cur.zoneId, x, y, w: cur.orig.w, d: cur.orig.d })
      return
    }
    if (cur.mode === 'zone-resize') {
      const p = world(e)
      let left = cur.orig.x
      let right = cur.orig.x + cur.orig.w
      let top = cur.orig.y
      let bottom = cur.orig.y + cur.orig.d
      const dx = p.x - cur.start.x
      const dy = p.y - cur.start.y
      const h = cur.handle
      const MIN = 12
      if (h.includes('w')) left = cur.orig.x + dx
      if (h.includes('e')) right = cur.orig.x + cur.orig.w + dx
      if (h.includes('n')) top = cur.orig.y + dy
      if (h.includes('s')) bottom = cur.orig.y + cur.orig.d + dy
      if (right - left < MIN) h.includes('w') ? (left = right - MIN) : (right = left + MIN)
      if (bottom - top < MIN) h.includes('n') ? (top = bottom - MIN) : (bottom = top + MIN)
      useEditor.getState().setZonePreview({ id: cur.zoneId, x: left, y: top, w: right - left, d: bottom - top })
      return
    }
    if (cur.mode === 'plant-move') {
      const p = world(e)
      const g = UNITS.SNAP_IN
      const x = Math.round((cur.orig.x + (p.x - cur.start.x)) / g) * g
      const y = Math.round((cur.orig.y + (p.y - cur.start.y)) / g) * g
      useEditor.getState().setPlantPreview({ id: cur.plantId, x, y })
      return
    }

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

    if (cur.mode === 'fixture-move') {
      const drag = useEditor.getState().fixtureDrag
      if (drag) useProject.getState().updateFixture(cur.fixtureId, { x: drag.x, y: drag.y })
      useEditor.getState().clearFixtureDrag()
      return
    }

    if (cur.mode === 'ls-move' || cur.mode === 'ls-resize') {
      const pv = useEditor.getState().landscapePreview
      useEditor.getState().clearLandscapePreview()
      if (pv) useProject.getState().updateLandscapeObject(cur.id, { x: pv.x, y: pv.y, w: pv.w, d: pv.d })
      return
    }

    if (cur.mode === 'zone-draw') {
      const pv = useEditor.getState().zonePreview
      useEditor.getState().clearZonePreview()
      if (pv && pv.w >= 12 && pv.d >= 12) {
        useProject.getState().addZone({ x: pv.x, y: pv.y, w: pv.w, d: pv.d, cropId: useEditor.getState().activeCrop })
        useEditor.getState().selectZone(useProject.getState()._lastZoneId)
      }
      return
    }
    if (cur.mode === 'zone-move' || cur.mode === 'zone-resize') {
      const pv = useEditor.getState().zonePreview
      useEditor.getState().clearZonePreview()
      if (pv) useProject.getState().updateZone(cur.zoneId, { x: pv.x, y: pv.y, w: pv.w, d: pv.d })
      return
    }
    if (cur.mode === 'plant-move') {
      const pv = useEditor.getState().plantPreview
      useEditor.getState().clearPlantPreview()
      if (pv) {
        const project = useProject.getState().project
        useProject.getState().updatePlant(cur.plantId, { x: pv.x, y: pv.y, zoneId: zoneAt(project, pv) })
      }
      return
    }

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

function zoneAt(project, p) {
  for (const z of project.landscape.zones) {
    if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.d) return z.id
  }
  return null
}

function landscapeCandidates(objects, plot) {
  const xs = [{ v: 0, kind: 'plot' }, { v: plot.widthIn, kind: 'plot' }]
  const ys = [{ v: 0, kind: 'plot' }, { v: plot.depthIn, kind: 'plot' }]
  for (const o of objects) {
    const f = objectFootprint(o)
    xs.push({ v: f.left, kind: 'room' }, { v: f.right, kind: 'room' })
    ys.push({ v: f.top, kind: 'room' }, { v: f.bottom, kind: 'room' })
  }
  return { xs, ys }
}
