import { create } from 'zustand'

// Clearing selection resets every selectable kind at once.
const CLEAR = {
  selectedId: null,
  selectedWallId: null,
  selectedOpeningId: null,
  selectedFixtureId: null,
  selectedRunId: null,
  selectedLandscapeId: null,
}

// Transient editor state: active tool, selection, and live drag preview. None of
// this is design data — it's outside the undoable store and never persisted.
export const useEditor = create((set) => ({
  tool: 'select', // 'select' | 'room' | 'wall' | 'door' | 'window'
  viewMode: 'plan', // 'plan' | '3d' — only one canvas mounts at a time
  show3dAllLevels: true, // show every level stacked, vs the active one only
  showDims3d: false, // 3D exterior dimension labels
  showCeilings3d: false, // ceiling planes (off by default so you can see in)
  selectedId: null, // selected room
  selectedWallId: null, // selected freestanding wall
  selectedOpeningId: null, // selected opening
  selectedFixtureId: null, // selected utility fixture
  selectedRunId: null, // selected utility run
  selectedLandscapeId: null, // selected landscape object

  // Site / landscape
  canvasMode: 'building', // 'building' | 'landscape'
  pendingLandscape: null, // { kind, label, w, d, heightIn } armed for placement
  landscapePreview: null, // { id, x, y, w, d } while moving/resizing

  // Utilities
  activeSystem: 'electrical',
  systemsHidden: [], // system keys hidden from view
  pendingFixture: null, // { system, kind, label } armed for placement
  pendingRotation: 0, // rotation for the next placed fixture
  runArmed: false, // run tool armed
  runDraft: null, // { system, fromFixtureId, points: [{x,y}] } in progress
  runCursor: null, // live cursor point while drawing a run
  fixtureDrag: null, // { id, x, y } transient while dragging a fixture
  preview: null, // { points } while drawing/moving/editing a room
  previewId: null, // id of the room being edited (null while drawing new)
  wallPreview: null, // { x1, y1, x2, y2 } while drawing/editing a wall
  openingPreview: null, // { id, offsetIn } while sliding an opening along its wall
  guides: { xs: [], ys: [] },

  setTool: (tool) =>
    set({ tool, preview: null, previewId: null, wallPreview: null, openingPreview: null, pendingFixture: null, runArmed: false, runDraft: null, runCursor: null, guides: { xs: [], ys: [] } }),

  setOpeningPreview: (openingPreview) => set({ openingPreview }),
  clearOpeningPreview: () => set({ openingPreview: null }),

  setViewMode: (viewMode) => set({ viewMode }),
  toggle3dAllLevels: () => set((s) => ({ show3dAllLevels: !s.show3dAllLevels })),
  toggleDims3d: () => set((s) => ({ showDims3d: !s.showDims3d })),
  toggleCeilings3d: () => set((s) => ({ showCeilings3d: !s.showCeilings3d })),

  select: (selectedId) => set({ ...CLEAR, selectedId }),
  selectWall: (selectedWallId) => set({ ...CLEAR, selectedWallId }),
  selectOpening: (selectedOpeningId) => set({ ...CLEAR, selectedOpeningId }),
  selectFixture: (selectedFixtureId) => set({ ...CLEAR, selectedFixtureId }),
  selectRun: (selectedRunId) => set({ ...CLEAR, selectedRunId }),
  selectLandscape: (selectedLandscapeId) => set({ ...CLEAR, selectedLandscapeId }),
  clearSelection: () => set({ ...CLEAR }),

  // Site / landscape actions
  setCanvasMode: (canvasMode) => set({ ...CLEAR, canvasMode, tool: 'select', pendingLandscape: null, landscapePreview: null }),
  armLandscape: (pendingLandscape) => set({ ...CLEAR, pendingLandscape }),
  disarmLandscape: () => set({ pendingLandscape: null }),
  setLandscapePreview: (landscapePreview) => set({ landscapePreview }),
  clearLandscapePreview: () => set({ landscapePreview: null }),

  // Utilities
  setActiveSystem: (activeSystem) => set({ activeSystem }),
  toggleSystemHidden: (sys) =>
    set((s) => ({ systemsHidden: s.systemsHidden.includes(sys) ? s.systemsHidden.filter((x) => x !== sys) : [...s.systemsHidden, sys] })),
  armFixture: (pendingFixture) => set({ pendingFixture, runArmed: false, runDraft: null, tool: 'utilities' }),
  disarmFixture: () => set({ pendingFixture: null }),
  armRun: () => set({ runArmed: true, pendingFixture: null, runDraft: null, tool: 'utilities' }),
  startRunDraft: (runDraft) => set({ runDraft }),
  setRunCursor: (runCursor) => set({ runCursor }),
  cancelRun: () => set({ runDraft: null, runCursor: null }),
  rotatePending: () => set((s) => ({ pendingRotation: (s.pendingRotation + 90) % 360 })),
  setFixtureDrag: (fixtureDrag) => set({ fixtureDrag }),
  clearFixtureDrag: () => set({ fixtureDrag: null }),

  setPreview: (preview, guides = { xs: [], ys: [] }, previewId = null) =>
    set({ preview, guides, previewId }),
  clearPreview: () => set({ preview: null, previewId: null, guides: { xs: [], ys: [] } }),

  setWallPreview: (wallPreview, guides = { xs: [], ys: [] }) => set({ wallPreview, guides }),
  clearWallPreview: () => set({ wallPreview: null, guides: { xs: [], ys: [] } }),
}))
