import { create } from 'zustand'

// Transient editor state: which tool is active, what's selected, and the live
// preview/guides shown mid-drag. NONE of this is design data — it's deliberately
// outside the undoable project store and never persisted.
export const useEditor = create((set) => ({
  tool: 'select', // 'select' | 'room'
  selectedId: null,
  preview: null, // { x, y, w, d } while drawing/moving/resizing; else null
  previewId: null, // id of the room being moved/resized (null while drawing new)
  guides: { xs: [], ys: [] }, // snap guide lines (world coords) to draw

  setTool: (tool) =>
    set({ tool, preview: null, previewId: null, guides: { xs: [], ys: [] } }),
  select: (selectedId) => set({ selectedId }),
  clearSelection: () => set({ selectedId: null }),
  setPreview: (preview, guides = { xs: [], ys: [] }, previewId = null) =>
    set({ preview, guides, previewId }),
  clearPreview: () => set({ preview: null, previewId: null, guides: { xs: [], ys: [] } }),
}))
