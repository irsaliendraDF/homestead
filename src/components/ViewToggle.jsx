import { useEditor } from '../store/useEditor.js'

// Plan / 3D segmented switch. Only one canvas mounts at a time (the other tab
// unmounts fully — see App), so OrbitControls and the SVG editor never coexist.
export default function ViewToggle() {
  const viewMode = useEditor((s) => s.viewMode)
  return (
    <div className="flex items-center rounded-md border border-line p-0.5 text-xs">
      {[
        { id: 'plan', label: 'Plan' },
        { id: '3d', label: '3D' },
      ].map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={viewMode === m.id}
          onClick={() => useEditor.getState().setViewMode(m.id)}
          className={`rounded px-2.5 py-1 font-medium transition-colors ${
            viewMode === m.id ? 'bg-accent text-white' : 'text-muted hover:text-ink'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
