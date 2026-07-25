import { useEditor } from '../store/useEditor.js'

// Building vs Site (landscape) editing mode for the plan canvas.
export default function SiteToggle() {
  const mode = useEditor((s) => s.canvasMode)
  return (
    <div className="flex items-center rounded-md border border-line p-0.5 text-xs">
      {[
        { id: 'building', label: 'Building' },
        { id: 'landscape', label: 'Site' },
      ].map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={mode === m.id}
          onClick={() => useEditor.getState().setCanvasMode(m.id)}
          className={`rounded px-2.5 py-1 font-medium transition-colors ${mode === m.id ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
