import { create } from 'zustand'

// Transient editor state: active tool, selection, and live drag preview. None of
// this is design data — it's outside the undoable store and never persisted.
export const useEditor = create((set) => ({
  tool: 'select', // 'select' | 'room' | 'wall'
  selectedId: null, // selected room
  selectedWallId: null, // selected freestanding wall
  preview: null, // { points } while drawing/moving/editing a room
  previewId: null, // id of the room being edited (null while drawing new)
  wallPreview: null, // { x1, y1, x2, y2 } while drawing/editing a wall
  guides: { xs: [], ys: [] },

  setTool: (tool) =>
    set({ tool, preview: null, previewId: null, wallPreview: null, guides: { xs: [], ys: [] } }),

  select: (selectedId) => set({ selectedId, selectedWallId: null }),
  selectWall: (selectedWallId) => set({ selectedWallId, selectedId: null }),
  clearSelection: () => set({ selectedId: null, selectedWallId: null }),

  setPreview: (preview, guides = { xs: [], ys: [] }, previewId = null) =>
    set({ preview, guides, previewId }),
  clearPreview: () => set({ preview: null, previewId: null, guides: { xs: [], ys: [] } }),

  setWallPreview: (wallPreview, guides = { xs: [], ys: [] }) => set({ wallPreview, guides }),
  clearWallPreview: () => set({ wallPreview: null, guides: { xs: [], ys: [] } }),
}))
