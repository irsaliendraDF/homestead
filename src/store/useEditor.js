import { create } from 'zustand'

// Transient editor state: active tool, selection, and live drag preview. None of
// this is design data — it's outside the undoable store and never persisted.
export const useEditor = create((set) => ({
  tool: 'select', // 'select' | 'room' | 'wall'
  viewMode: 'plan', // 'plan' | '3d' — only one canvas mounts at a time
  show3dAllLevels: true, // show every level stacked, vs the active one only
  showDims3d: false, // 3D exterior dimension labels
  showCeilings3d: false, // ceiling planes (off by default so you can see in)
  selectedId: null, // selected room
  selectedWallId: null, // selected freestanding wall
  preview: null, // { points } while drawing/moving/editing a room
  previewId: null, // id of the room being edited (null while drawing new)
  wallPreview: null, // { x1, y1, x2, y2 } while drawing/editing a wall
  guides: { xs: [], ys: [] },

  setTool: (tool) =>
    set({ tool, preview: null, previewId: null, wallPreview: null, guides: { xs: [], ys: [] } }),

  setViewMode: (viewMode) => set({ viewMode }),
  toggle3dAllLevels: () => set((s) => ({ show3dAllLevels: !s.show3dAllLevels })),
  toggleDims3d: () => set((s) => ({ showDims3d: !s.showDims3d })),
  toggleCeilings3d: () => set((s) => ({ showCeilings3d: !s.showCeilings3d })),

  select: (selectedId) => set({ selectedId, selectedWallId: null }),
  selectWall: (selectedWallId) => set({ selectedWallId, selectedId: null }),
  clearSelection: () => set({ selectedId: null, selectedWallId: null }),

  setPreview: (preview, guides = { xs: [], ys: [] }, previewId = null) =>
    set({ preview, guides, previewId }),
  clearPreview: () => set({ preview: null, previewId: null, guides: { xs: [], ys: [] } }),

  setWallPreview: (wallPreview, guides = { xs: [], ys: [] }) => set({ wallPreview, guides }),
  clearWallPreview: () => set({ wallPreview: null, guides: { xs: [], ys: [] } }),
}))
