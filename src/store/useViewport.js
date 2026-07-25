import { create } from 'zustand'
import { clampZoom, zoomAtPoint } from '../lib/viewport.js'

// Camera state for the plan canvas. Deliberately NOT in the undoable store —
// panning and zooming should never land in the undo stack. It IS persisted, so
// a refresh restores the exact view (a Phase 1 acceptance criterion).

const DEFAULT = { zoom: 0.4, panX: 40, panY: 40, showGrid: true }

export const useViewport = create((set) => ({
  ...DEFAULT,

  setView: (vp) => set((s) => ({ ...s, ...vp })),

  // Wheel zoom anchored to the cursor.
  zoomAt: (factor, cursorX, cursorY) =>
    set((s) => zoomAtPoint(s, factor, cursorX, cursorY)),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  panBy: (dx, dy) => set((s) => ({ panX: s.panX + dx, panY: s.panY + dy })),

  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

  reset: () => set(DEFAULT),
}))
