import { create } from 'zustand'
import { temporal } from 'zundo'
import { DEFAULTS, UNITS } from '../config.js'

// State mutates ONLY through the actions below. Components never set fields
// directly — that keeps undo/redo, autosave, and future validation honest.

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2, 10)

const nowIso = () => new Date().toISOString()

/** Build a fresh level. Basement levels (index < 0) carry a footing depth. */
export function makeLevel({ name, index }) {
  const level = {
    id: uid(),
    name,
    index,
    floorElevationIn: 0, // set by recomputeElevations
    ceilingHeightIn: index < 0 ? DEFAULTS.BASEMENT_CEILING_IN : DEFAULTS.CEILING_HEIGHT_IN,
    rooms: [],
    walls: [], // freestanding wall segments (not tied to a room)
    openings: [],
    fixtures: [],
    runs: [],
  }
  if (index < 0) level.footingDepthIn = DEFAULTS.FOOTING_DEPTH_IN
  return level
}

/**
 * Assign floorElevationIn (top of subfloor, relative to grade) to every level.
 * Cumulative stack by index, then shifted so Main (index 0) sits at 0.
 * Basements land negative, upper floors positive. FLOOR_ASSEMBLY_IN gaps between.
 */
export function recomputeElevations(levels) {
  const sorted = [...levels].sort((a, b) => a.index - b.index)
  let floor = 0
  const provisional = sorted.map((lvl, i) => {
    if (i > 0) {
      floor += sorted[i - 1].ceilingHeightIn + DEFAULTS.FLOOR_ASSEMBLY_IN
    }
    return { id: lvl.id, floor }
  })
  const main = sorted.find((l) => l.index === 0)
  const offset = main ? provisional.find((p) => p.id === main.id).floor : 0
  const byId = Object.fromEntries(provisional.map((p) => [p.id, p.floor - offset]))
  return levels.map((l) => ({ ...l, floorElevationIn: byId[l.id] }))
}

/** A fresh, empty project skeleton matching the §2 data model. */
export function makeDefaultProject() {
  const ts = nowIso()
  const main = makeLevel({ name: 'Main', index: 0 })
  const levels = recomputeElevations([main])
  return {
    id: uid(),
    name: 'Untitled homestead',
    createdAt: ts,
    updatedAt: ts,
    schemaVersion: 1,
    plot: { widthIn: DEFAULTS.PLOT.widthIn, depthIn: DEFAULTS.PLOT.depthIn },
    levels,
    roof: { style: 'gable', pitchRise: 6 },
    landscape: { objects: [], zones: [], plants: [], systems: [] },
    view: {
      activeLevelId: main.id,
      activeSystemFilters: [],
      showGhostBelow: true,
      gardenIntel: false,
    },
  }
}

const touch = (project, patch) => ({ ...project, ...patch, updatedAt: nowIso() })

/** Migrate legacy rectangle rooms ({x,y,w,d}) to polygon rooms ({points}). */
export function migrateProject(project) {
  if (!project?.levels) return project
  return {
    ...project,
    levels: project.levels.map((l) => ({
      ...l,
      rooms: (l.rooms || []).map(migrateRoom),
      walls: l.walls || [],
    })),
  }
}
function migrateRoom(r) {
  if (r.points && r.points.length >= 3) return r
  const { x = 0, y = 0, w = 0, d = 0, ...rest } = r
  return {
    ...rest,
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + d },
      { x, y: y + d },
    ],
  }
}

/** Immutably replace one level by id. */
const mapLevel = (levels, levelId, fn) => levels.map((l) => (l.id === levelId ? fn(l) : l))

/** Next "Room N" number from existing auto-names on a level. */
function nextRoomNumber(rooms) {
  let max = 0
  for (const r of rooms) {
    const m = /^Room (\d+)$/.exec(r.name || '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

// Only `project` is tracked for undo/redo. Actions and any transient UI state
// stay out of the temporal history.
export const useProject = create(
  temporal(
    (set) => ({
      project: makeDefaultProject(),

      // Replace the whole project (load, new, duplicate).
      setProject: (project) => set({ project }),
      newProject: () => set({ project: makeDefaultProject() }),

      setName: (name) => set((s) => ({ project: touch(s.project, { name }) })),

      setPlot: (patch) =>
        set((s) => ({ project: touch(s.project, { plot: { ...s.project.plot, ...patch } }) })),

      // ── Levels ──────────────────────────────────────────
      setActiveLevel: (levelId) =>
        set((s) => ({
          project: touch(s.project, { view: { ...s.project.view, activeLevelId: levelId } }),
        })),

      addLevelAbove: () =>
        set((s) => {
          const maxIndex = Math.max(...s.project.levels.map((l) => l.index))
          const level = makeLevel({ name: `Upper ${maxIndex + 1}`, index: maxIndex + 1 })
          const levels = recomputeElevations([...s.project.levels, level])
          return {
            project: touch(s.project, {
              levels,
              view: { ...s.project.view, activeLevelId: level.id },
            }),
          }
        }),

      addBasement: () =>
        set((s) => {
          if (s.project.levels.some((l) => l.index < 0)) return {} // one basement for now
          const level = makeLevel({ name: 'Basement', index: -1 })
          const levels = recomputeElevations([...s.project.levels, level])
          return {
            project: touch(s.project, {
              levels,
              view: { ...s.project.view, activeLevelId: level.id },
            }),
          }
        }),

      removeLevel: (levelId) =>
        set((s) => {
          if (s.project.levels.length <= 1) return {} // never remove the last level
          const remaining = recomputeElevations(s.project.levels.filter((l) => l.id !== levelId))
          const activeGone = s.project.view.activeLevelId === levelId
          const nextActive = activeGone
            ? [...remaining].sort((a, b) => Math.abs(a.index) - Math.abs(b.index))[0].id
            : s.project.view.activeLevelId
          return {
            project: touch(s.project, {
              levels: remaining,
              view: { ...s.project.view, activeLevelId: nextActive },
            }),
          }
        }),

      // name / ceilingHeightIn / footingDepthIn
      updateLevel: (levelId, patch) =>
        set((s) => {
          const levels = s.project.levels.map((l) => (l.id === levelId ? { ...l, ...patch } : l))
          const recomputed = 'ceilingHeightIn' in patch ? recomputeElevations(levels) : levels
          return { project: touch(s.project, { levels: recomputed }) }
        }),

      toggleGhostBelow: () =>
        set((s) => ({
          project: touch(s.project, {
            view: { ...s.project.view, showGhostBelow: !s.project.view.showGhostBelow },
          }),
        })),

      // ── Rooms (on the active level) ─────────────────────
      // Rooms are polygons: room.points = [{x,y}, …], integer inches. A new room
      // is drawn as a rectangle, then its corners can move freely. Every stored
      // coordinate is a rounded integer — no floats reach the store, so the
      // shared-wall dedupe never misses by 0.0001".
      addRoom: (rect) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const level = s.project.levels.find((l) => l.id === levelId)
          const n = nextRoomNumber(level.rooms)
          const x = Math.round(rect.x)
          const y = Math.round(rect.y)
          const w = Math.max(UNITS.MIN_ROOM_IN, Math.round(rect.w))
          const d = Math.max(UNITS.MIN_ROOM_IN, Math.round(rect.d))
          const room = {
            id: uid(),
            name: `Room ${n}`,
            type: null,
            wallThicknessIn: DEFAULTS.WALL_THICKNESS_IN,
            points: [
              { x, y },
              { x: x + w, y },
              { x: x + w, y: y + d },
              { x, y: y + d },
            ],
          }
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({ ...l, rooms: [...l.rooms, room] })),
            }),
            _lastRoomId: room.id,
          }
        }),

      // patch may include { name, type } and/or { points }. Points are rounded.
      updateRoom: (roomId, patch) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const clean = { ...patch }
          if (patch.points) {
            clean.points = patch.points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
          }
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                rooms: l.rooms.map((r) => (r.id === roomId ? { ...r, ...clean } : r)),
              })),
            }),
          }
        }),

      removeRoom: (roomId) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                rooms: l.rooms.filter((r) => r.id !== roomId),
              })),
            }),
          }
        }),

      // ── Freestanding walls (on the active level) ────────
      addWall: (seg) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const wall = {
            id: uid(),
            x1: Math.round(seg.x1),
            y1: Math.round(seg.y1),
            x2: Math.round(seg.x2),
            y2: Math.round(seg.y2),
            thicknessIn: DEFAULTS.INTERIOR_WALL_IN,
          }
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                walls: [...(l.walls || []), wall],
              })),
            }),
            _lastWallId: wall.id,
          }
        }),

      updateWall: (wallId, patch) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const clean = {}
          for (const [k, v] of Object.entries(patch)) {
            clean[k] = ['x1', 'y1', 'x2', 'y2'].includes(k) ? Math.round(v) : v
          }
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                walls: (l.walls || []).map((w) => (w.id === wallId ? { ...w, ...clean } : w)),
              })),
            }),
          }
        }),

      removeWall: (wallId) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                walls: (l.walls || []).filter((w) => w.id !== wallId),
              })),
            }),
          }
        }),
    }),
    {
      limit: 50, // 50-step history
      partialize: (state) => ({ project: state.project }),
    }
  )
)

// Temporal controls (undo/redo/clear) live on useProject.temporal.
export const temporalStore = useProject.temporal
