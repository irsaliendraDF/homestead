import { create } from 'zustand'
import { temporal } from 'zundo'
import { DEFAULTS } from '../config.js'

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
    }),
    {
      limit: 50, // 50-step history
      partialize: (state) => ({ project: state.project }),
    }
  )
)

// Temporal controls (undo/redo/clear) live on useProject.temporal.
export const temporalStore = useProject.temporal
