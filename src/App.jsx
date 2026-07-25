import { useEffect } from 'react'
import { useStore } from 'zustand'
import { Undo2, Redo2 } from 'lucide-react'
import { useProject } from './store/useProject.js'
import { REGION } from './config.js'

// Undo/redo are wired to zundo's temporal store. They are the only interactive
// controls in this scaffold — everything else is intentionally empty until Phase 1.
export default function App() {
  const name = useProject((s) => s.project.name)
  const canUndo = useStore(useProject.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useProject.temporal, (s) => s.futureStates.length > 0)

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
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
      </header>

      {/* Body: tool rail · canvas · inspector */}
      <div className="flex min-h-0 flex-1">
        {/* Left tool rail (empty until Phase 1) */}
        <nav
          aria-label="Tools"
          className="w-14 shrink-0 border-r border-line bg-panel"
        />

        {/* Center canvas */}
        <main className="relative min-w-0 flex-1 overflow-hidden bg-canvas">
          <div className="flex h-full items-center justify-center px-8 text-center">
            <p className="max-w-sm font-display text-xl italic leading-relaxed text-muted">
              A place to draw a home and the land around it.
              <span className="mt-2 block font-sans text-xs not-italic tracking-wide text-muted/70">
                {REGION.place} · setup complete
              </span>
            </p>
          </div>
        </main>

        {/* Right inspector (empty until Phase 1) */}
        <aside
          aria-label="Inspector"
          className="w-72 shrink-0 border-l border-line bg-panel"
        />
      </div>
    </div>
  )
}
