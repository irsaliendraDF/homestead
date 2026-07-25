import { Plus, X } from 'lucide-react'
import { useProject } from '../store/useProject.js'

// Level tabs across the top of the canvas. Sorted low→high (Basement, Main,
// Upper…). Add a basement (one, for now) or a floor above; remove any but the
// last remaining level.
export default function LevelTabs() {
  const levels = useProject((s) => s.project.levels)
  const activeId = useProject((s) => s.project.view.activeLevelId)

  const sorted = [...levels].sort((a, b) => a.index - b.index)
  const hasBasement = levels.some((l) => l.index < 0)
  const canRemove = levels.length > 1

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line bg-panel px-2">
      {!hasBasement && (
        <button
          type="button"
          onClick={() => useProject.getState().addBasement()}
          className="mr-1 flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:bg-accentSoft hover:text-ink"
          title="Add basement"
        >
          <Plus size={13} strokeWidth={2} /> Basement
        </button>
      )}

      {sorted.map((lvl) => {
        const active = lvl.id === activeId
        return (
          <div
            key={lvl.id}
            className={`group flex items-center rounded ${
              active ? 'bg-accent text-white' : 'text-muted hover:bg-accentSoft hover:text-ink'
            }`}
          >
            <button
              type="button"
              onClick={() => useProject.getState().setActiveLevel(lvl.id)}
              className="px-2.5 py-1 text-xs font-medium"
            >
              {lvl.name}
            </button>
            {canRemove && (
              <button
                type="button"
                onClick={() => useProject.getState().removeLevel(lvl.id)}
                aria-label={`Remove ${lvl.name}`}
                title={`Remove ${lvl.name}`}
                className={`mr-1 rounded p-0.5 opacity-0 group-hover:opacity-100 ${
                  active ? 'hover:bg-white/20' : 'hover:bg-alert/10 hover:text-alert'
                }`}
              >
                <X size={12} strokeWidth={2} />
              </button>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => useProject.getState().addLevelAbove()}
        className="ml-1 flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:bg-accentSoft hover:text-ink"
        title="Add a floor above"
      >
        <Plus size={13} strokeWidth={2} /> Level
      </button>
    </div>
  )
}
