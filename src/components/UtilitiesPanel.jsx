import { Eye, EyeOff, Cable } from 'lucide-react'
import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { SYSTEMS, FIXTURE_CATALOG } from '../config.js'
import { systemRunTotalsFt } from '../lib/runs.js'
import { electricalChecks } from '../lib/electrical.js'
import { formatFeetInches } from '../lib/units.js'

// Shown in the inspector while the Utilities tool is active: system layers,
// the fixture palette for the active system, the run tool, and run totals.
export default function UtilitiesPanel() {
  const project = useProject((s) => s.project)
  const level = project.levels.find((l) => l.id === project.view.activeLevelId)
  const activeSystem = useEditor((s) => s.activeSystem)
  const hidden = useEditor((s) => s.systemsHidden)
  const pendingFixture = useEditor((s) => s.pendingFixture)
  const runArmed = useEditor((s) => s.runArmed)
  const runDraft = useEditor((s) => s.runDraft)
  const fixtureDrag = useEditor((s) => s.fixtureDrag)

  const totals = systemRunTotalsFt(level.runs || [], level.fixtures || [], fixtureDrag)
  const palette = FIXTURE_CATALOG.filter((f) => f.system === activeSystem)

  return (
    <div className="flex flex-col">
      <Section title="Systems">
        {Object.entries(SYSTEMS).map(([key, s]) => {
          const isHidden = hidden.includes(key)
          const active = key === activeSystem
          return (
            <div key={key} className={`flex items-center gap-2 rounded px-1.5 py-1 ${active ? 'bg-accentSoft' : ''}`}>
              <button type="button" onClick={() => useEditor.getState().setActiveSystem(key)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
                <span className={`truncate ${active ? 'font-medium text-ink' : 'text-muted'}`}>{s.label}</span>
                {totals[key] > 0 && <span className="num shrink-0 text-[10px] text-muted">{Math.round(totals[key])}′</span>}
              </button>
              <button type="button" aria-label={isHidden ? 'Show' : 'Hide'} onClick={() => useEditor.getState().toggleSystemHidden(key)} className="shrink-0 rounded p-0.5 text-muted hover:text-ink">
                {isHidden ? <EyeOff size={14} strokeWidth={1.75} /> : <Eye size={14} strokeWidth={1.75} />}
              </button>
            </div>
          )
        })}
      </Section>

      <Section title={`Place ${SYSTEMS[activeSystem].label}`}>
        <div className="grid grid-cols-2 gap-1.5">
          {palette.map((f) => {
            const armed = pendingFixture && pendingFixture.kind === f.kind
            return (
              <button
                key={f.kind}
                type="button"
                onClick={() => useEditor.getState().armFixture({ system: f.system, kind: f.kind, label: f.label })}
                className={`rounded border px-2 py-1 text-left text-[11px] ${armed ? 'border-accent bg-accentSoft text-ink' : 'border-line text-ink hover:bg-accentSoft'}`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
        {pendingFixture && <p className="mt-1.5 text-[11px] text-accent">Click on the plan to place. Press R to rotate. Esc to stop.</p>}
      </Section>

      {activeSystem === 'electrical' && <CodeChecks project={project} />}

      <Section title="Runs">
        <button
          type="button"
          onClick={() => useEditor.getState().armRun()}
          className={`flex items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-xs ${runArmed ? 'border-accent bg-accentSoft text-ink' : 'border-line text-ink hover:bg-accentSoft'}`}
        >
          <Cable size={14} strokeWidth={1.75} /> Draw run
        </button>
        {runArmed && (
          <p className="text-[11px] leading-tight text-muted">
            {runDraft ? 'Click waypoints, then the destination fixture. Esc cancels.' : 'Click a source fixture to start.'}
          </p>
        )}
      </Section>
    </div>
  )
}

function CodeChecks({ project }) {
  const checks = electricalChecks(project)
  return (
    <Section title="Code checks · planning references">
      {checks.length === 0 ? (
        <p className="text-[11px] text-muted">Nothing flagged. These are planning references — confirm with the CEC/NBC and a licensed electrician.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {checks.map((c, i) => (
            <p key={i} className={`text-[11px] leading-tight ${c.severity === 'warn' ? 'text-alert' : 'text-muted'}`}>
              {c.severity === 'warn' ? '⚠ ' : 'ℹ '}
              {c.message}
            </p>
          ))}
          <p className="pt-1 text-[10px] leading-tight text-muted">Planning references only — not code certification.</p>
        </div>
      )}
    </Section>
  )
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-2 border-b border-line px-4 py-3.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  )
}
