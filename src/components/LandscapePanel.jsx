import { useEditor } from '../store/useEditor.js'
import { LANDSCAPE_CATALOG } from '../config.js'
import { LANDSCAPE_STYLE } from '../lib/landscape.js'

// The landscape object palette, shown in the inspector while in Site mode.
export default function LandscapePanel() {
  const pending = useEditor((s) => s.pendingLandscape)
  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-2 border-b border-line px-4 py-3.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Place on the site</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {LANDSCAPE_CATALOG.map((o) => {
            const armed = pending && pending.kind === o.kind
            const st = LANDSCAPE_STYLE[o.kind]
            return (
              <button
                key={o.kind}
                type="button"
                onClick={() => useEditor.getState().armLandscape({ kind: o.kind, label: o.label, w: o.w, d: o.d, heightIn: o.h })}
                className={`flex items-center gap-1.5 rounded border px-2 py-1 text-left text-[11px] ${armed ? 'border-accent bg-accentSoft text-ink' : 'border-line text-ink hover:bg-accentSoft'}`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: st?.fill, outline: `1px solid ${st?.stroke}` }} />
                {o.label}
              </button>
            )
          })}
        </div>
        {pending && <p className="mt-1 text-[11px] text-accent">Click on the site to place {pending.label.toLowerCase()}. Esc to stop.</p>}
        <p className="text-[11px] leading-tight text-muted">The house footprint is locked here — switch to Building to edit rooms.</p>
      </section>
    </div>
  )
}
