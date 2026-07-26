import { useEditor } from '../store/useEditor.js'
import { FURNITURE_CATALOG } from '../config.js'
import { FURNITURE_CATEGORIES, CATEGORY_LABEL, CATEGORY_STYLE } from '../lib/furniture.js'

// Furniture palette, grouped by category, shown while the Furniture tool is on.
export default function FurniturePanel() {
  const pending = useEditor((s) => s.pendingFurniture)
  return (
    <div className="flex flex-col">
      {FURNITURE_CATEGORIES.map((cat) => {
        const items = FURNITURE_CATALOG.filter((f) => f.category === cat)
        const st = CATEGORY_STYLE[cat]
        return (
          <section key={cat} className="flex flex-col gap-2 border-b border-line px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{CATEGORY_LABEL[cat]}</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((f) => {
                const armed = pending && pending.kind === f.kind
                return (
                  <button
                    key={f.kind}
                    type="button"
                    onClick={() => useEditor.getState().armFurniture(armed ? null : { kind: f.kind, label: f.label, category: f.category, w: f.w, d: f.d, h: f.h })}
                    className={`flex items-center gap-1.5 rounded border px-2 py-1 text-left text-[11px] ${armed ? 'border-accent bg-accentSoft text-ink' : 'border-line text-ink hover:bg-accentSoft'}`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: st.fill, outline: `1px solid ${st.stroke}` }} />
                    {f.label}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
      {pending && <p className="px-4 py-2 text-[11px] text-accent">Click in the plan to place {pending.label.toLowerCase()}. Press R to rotate, Esc to stop.</p>}
    </div>
  )
}
