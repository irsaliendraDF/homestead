import { useEditor } from '../store/useEditor.js'

// The ? keyboard-shortcut reference. Every core action is listed here.
const GROUPS = [
  {
    title: 'Tools',
    items: [
      ['V', 'Select'],
      ['R', 'Room'],
      ['D', 'Door'],
      ['W', 'Window'],
      ['U', 'Utilities'],
      ['L', 'Building ⇄ Site'],
    ],
  },
  {
    title: 'View',
    items: [
      ['3', 'Toggle 3D'],
      ['F', 'Zoom to fit'],
      ['G', 'Toggle grid'],
      ['Space-drag', 'Pan'],
      ['Scroll', 'Zoom'],
      ['[ / ]', 'Change level'],
    ],
  },
  {
    title: 'Edit',
    items: [
      ['Del', 'Delete selection'],
      ['Esc', 'Deselect / cancel'],
      ['Ctrl+Z', 'Undo'],
      ['Ctrl+Shift+Z', 'Redo'],
      ['R', 'Rotate selected fixture/furniture'],
    ],
  },
  {
    title: 'Walkthrough (3D)',
    items: [
      ['WASD', 'Move'],
      ['Mouse', 'Look'],
      ['Q / E', 'Level down / up'],
      ['Esc', 'Exit walk'],
    ],
  },
]

export default function ShortcutsOverlay() {
  const open = useEditor((s) => s.showShortcuts)
  if (!open) return null
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/30 p-6" onClick={() => useEditor.getState().toggleShortcuts()}>
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-panel p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl italic text-ink">Keyboard shortcuts</h2>
          <button type="button" onClick={() => useEditor.getState().toggleShortcuts()} className="text-xs text-muted hover:text-ink">
            Esc to close
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{g.title}</h3>
              <dl className="flex flex-col gap-1">
                {g.items.map(([k, label]) => (
                  <div key={k + label} className="flex items-center justify-between gap-2 text-xs">
                    <dt className="text-ink">{label}</dt>
                    <dd className="num rounded border border-line bg-canvas px-1.5 py-0.5 text-[11px] text-muted">{k}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
