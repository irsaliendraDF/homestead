import { create } from 'zustand'
import { temporal } from 'zundo'
import { DEFAULTS } from '../config.js'

// State mutates ONLY through the actions below. Components never set fields
// directly — that keeps undo/redo, autosave, and future validation honest.

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2, 10)

const nowIso = () => new Date().toISOString()

/** A fresh, empty project skeleton matching the §2 data model. */
export function makeDefaultProject() {
  const levelId = uid()
  const ts = nowIso()
  return {
    id: uid(),
    name: 'Untitled homestead',
    createdAt: ts,
    updatedAt: ts,
    schemaVersion: 1,
    plot: { widthIn: DEFAULTS.PLOT.widthIn, depthIn: DEFAULTS.PLOT.depthIn },
    levels: [
      {
        id: levelId,
        name: 'Main',
        index: 0,
        floorElevationIn: 0,
        ceilingHeightIn: DEFAULTS.CEILING_HEIGHT_IN,
        rooms: [],
        openings: [],
        fixtures: [],
        runs: [],
      },
    ],
    roof: { style: 'gable', pitchRise: 6 },
    landscape: { objects: [], zones: [], plants: [], systems: [] },
    view: {
      activeLevelId: levelId,
      activeSystemFilters: [],
      showGhostBelow: true,
      gardenIntel: false,
    },
  }
}

// Only `project` is tracked for undo/redo. Actions and any transient UI state
// stay out of the temporal history.
export const useProject = create(
  temporal(
    (set) => ({
      project: makeDefaultProject(),

      // Replace the whole project (load, new, duplicate — Phase 1+).
      setProject: (project) => set({ project }),

      newProject: () => set({ project: makeDefaultProject() }),

      setName: (name) =>
        set((s) => ({ project: { ...s.project, name, updatedAt: nowIso() } })),

      setPlot: (patch) =>
        set((s) => ({
          project: { ...s.project, plot: { ...s.project.plot, ...patch }, updatedAt: nowIso() },
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
