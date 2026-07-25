import { useEffect, useRef, lazy, Suspense } from 'react'
import { useStore } from 'zustand'
import { Undo2, Redo2 } from 'lucide-react'
import { useProject } from './store/useProject.js'
import { useEditor } from './store/useEditor.js'
import { useSession, initSession } from './store/session.js'
import { REGION } from './config.js'
import PlanCanvas from './components/PlanCanvas.jsx'
import MeasurementRail from './components/MeasurementRail.jsx'
import CanvasControls from './components/CanvasControls.jsx'
import LevelTabs from './components/LevelTabs.jsx'
import Inspector from './components/Inspector.jsx'
import ToolRail from './components/ToolRail.jsx'
import RoomLabels from './components/RoomLabels.jsx'
import DragDimensions from './components/DragDimensions.jsx'
import ViewToggle from './components/ViewToggle.jsx'
import SiteToggle from './components/SiteToggle.jsx'
import Controls3D from './components/Controls3D.jsx'

// Lazy so three.js only loads when you actually enter the 3D view.
const Scene3D = lazy(() => import('./components/Scene3D.jsx'))

export default function App() {
  const name = useProject((s) => s.project.name)
  const ready = useSession((s) => s.ready)
  const viewMode = useEditor((s) => s.viewMode)
  const canUndo = useStore(useProject.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useProject.temporal, (s) => s.futureStates.length > 0)
  const canvasAreaRef = useRef(null)

  // Load persisted session (or seed the first project) once on mount.
  useEffect(() => {
    initSession()
  }, [])

  // Keyboard: undo/redo, tool switches, delete/deselect. Skip while typing.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      const mod = e.ctrlKey || e.metaKey
      if (mod) {
        const key = e.key.toLowerCase()
        if (key === 'z') {
          e.preventDefault()
          const t = useProject.temporal.getState()
          if (e.shiftKey) t.redo()
          else t.undo()
        } else if (key === 'y') {
          e.preventDefault()
          useProject.temporal.getState().redo()
        }
        return
      }
      // View + tool + selection shortcuts (no modifier).
      if (e.key === '3') {
        const m = useEditor.getState().viewMode
        useEditor.getState().setViewMode(m === '3d' ? 'plan' : '3d')
      } else if (e.key === 'r' || e.key === 'R') {
        const ed = useEditor.getState()
        if (ed.selectedLandscapeId) {
          const o = useProject.getState().project.landscape.objects.find((x) => x.id === ed.selectedLandscapeId)
          if (o) useProject.getState().updateLandscapeObject(o.id, { rotation: ((o.rotation || 0) + 90) % 360 })
        } else if (ed.selectedFixtureId) {
          const p = useProject.getState().project
          const lvl = p.levels.find((l) => l.id === p.view.activeLevelId)
          const f = (lvl.fixtures || []).find((x) => x.id === ed.selectedFixtureId)
          if (f) useProject.getState().updateFixture(f.id, { rotation: ((f.rotation || 0) + 90) % 360 })
        } else if (ed.pendingFixture) ed.rotatePending()
        else if (ed.canvasMode !== 'landscape') ed.setTool('room')
      } else if (e.key === 'd' || e.key === 'D') useEditor.getState().setTool('door')
      else if (e.key === 'w' || e.key === 'W') useEditor.getState().setTool('window')
      else if (e.key === 'u' || e.key === 'U') useEditor.getState().setTool('utilities')
      else if (e.key === 'v' || e.key === 'V') useEditor.getState().setTool('select')
      else if (e.key === 'Escape') {
        const ed = useEditor.getState()
        if (ed.runDraft) ed.cancelRun()
        else if (ed.pendingFixture) ed.disarmFixture()
        else if (ed.pendingLandscape) ed.disarmLandscape()
        else {
          if (ed.canvasMode !== 'landscape') ed.setTool('select')
          ed.clearSelection()
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedId, selectedWallId, selectedOpeningId, selectedFixtureId, selectedRunId, selectedLandscapeId } = useEditor.getState()
        if (selectedId || selectedWallId || selectedOpeningId || selectedFixtureId || selectedRunId || selectedLandscapeId) {
          e.preventDefault()
          if (selectedId) useProject.getState().removeRoom(selectedId)
          if (selectedWallId) useProject.getState().removeWall(selectedWallId)
          if (selectedOpeningId) useProject.getState().removeOpening(selectedOpeningId)
          if (selectedFixtureId) useProject.getState().removeFixture(selectedFixtureId)
          if (selectedRunId) useProject.getState().removeRun(selectedRunId)
          if (selectedLandscapeId) useProject.getState().removeLandscapeObject(selectedLandscapeId)
          useEditor.getState().clearSelection()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      {/* Title bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-panel px-4">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-medium tracking-tight text-muted">Homestead</span>
          <span className="font-display text-lg italic leading-none">{name}</span>
        </div>
        <div className="flex items-center gap-3">
          {ready && viewMode === 'plan' && <SiteToggle />}
          {ready && <ViewToggle />}
          <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={() => useProject.temporal.getState().undo()}
            className="rounded p-1.5 text-muted hover:bg-accentSoft hover:text-ink disabled:pointer-events-none disabled:opacity-30"
          >
            <Undo2 size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            disabled={!canRedo}
            onClick={() => useProject.temporal.getState().redo()}
            className="rounded p-1.5 text-muted hover:bg-accentSoft hover:text-ink disabled:pointer-events-none disabled:opacity-30"
          >
            <Redo2 size={16} strokeWidth={1.75} />
          </button>
          </div>
        </div>
      </header>

      {/* Body: tool rail · canvas column · inspector */}
      <div className="flex min-h-0 flex-1">
        {ready ? <ToolRail /> : <nav aria-label="Tools" className="w-14 shrink-0 border-r border-line bg-panel" />}

        <div className="flex min-w-0 flex-1 flex-col">
          {ready ? (
            <>
              <LevelTabs />
              <div ref={canvasAreaRef} className="relative min-h-0 flex-1 overflow-hidden bg-canvas">
                {viewMode === '3d' ? (
                  <>
                    <Suspense
                      fallback={
                        <div className="flex h-full items-center justify-center font-display text-lg italic text-muted">
                          Building the model…
                        </div>
                      }
                    >
                      <Scene3D />
                    </Suspense>
                    <Controls3D />
                  </>
                ) : (
                  <>
                    <PlanCanvas />
                    <RoomLabels />
                    <DragDimensions />
                    <MeasurementRail />
                    <CanvasControls containerRef={canvasAreaRef} />
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="font-display text-lg italic text-muted">Loading {REGION.place}…</p>
            </div>
          )}
        </div>

        <aside aria-label="Inspector" className="w-72 shrink-0 border-l border-line bg-panel">
          {ready && <Inspector />}
        </aside>
      </div>
    </div>
  )
}
