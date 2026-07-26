import { Grid2x2, Sprout, Sparkles } from 'lucide-react'
import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { PLANT_CATALOG, GARDEN_PRESETS, REGION, GARDEN } from '../config.js'
import { checkGarden } from '../lib/companions.js'

// Garden controls in the Site inspector: crop + Zone/Plant tools, presets, the
// companion overlay toggle (off by default), the NS growing window, and — when
// the overlay is on — the plain-language conflict list.
export default function GardenPanel() {
  const landscape = useProject((s) => s.project.landscape)
  const intel = useProject((s) => s.project.view.gardenIntel)
  const gardenTool = useEditor((s) => s.gardenTool)
  const activeCrop = useEditor((s) => s.activeCrop)
  const pendingPreset = useEditor((s) => s.pendingPreset)

  const conflicts = intel ? checkGarden(landscape.plants, landscape.zones) : []
  const bad = conflicts.filter((c) => c.verdict === 'bad')
  const good = conflicts.filter((c) => c.verdict === 'good')

  return (
    <div className="flex flex-col">
      <Section title="Garden">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Crop</span>
          <select
            value={activeCrop}
            onChange={(e) => useEditor.getState().setActiveCrop(e.target.value)}
            className="w-full rounded border border-line bg-canvas px-2 py-1 text-sm text-ink"
          >
            {PLANT_CATALOG.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <ToolBtn active={gardenTool === 'zone'} onClick={() => useEditor.getState().setGardenTool(gardenTool === 'zone' ? null : 'zone')} Icon={Grid2x2}>
            Zone
          </ToolBtn>
          <ToolBtn active={gardenTool === 'plant'} onClick={() => useEditor.getState().setGardenTool(gardenTool === 'plant' ? null : 'plant')} Icon={Sprout}>
            Plant
          </ToolBtn>
        </div>
        {gardenTool === 'zone' && <p className="text-[11px] text-accent">Drag a rectangle to make a bed of {label(activeCrop)}.</p>}
        {gardenTool === 'plant' && <p className="text-[11px] text-accent">Click to drop {label(activeCrop)}. Esc to stop.</p>}
      </Section>

      <Section title="Presets">
        <div className="flex flex-col gap-1.5">
          {GARDEN_PRESETS.map((pr) => (
            <button
              key={pr.id}
              type="button"
              onClick={() => useEditor.getState().armPreset(pendingPreset === pr.id ? null : pr.id)}
              className={`flex items-center gap-1.5 rounded border px-2 py-1 text-left text-[11px] ${pendingPreset === pr.id ? 'border-accent bg-accentSoft text-ink' : 'border-line text-ink hover:bg-accentSoft'}`}
            >
              <Sparkles size={13} strokeWidth={1.75} /> {pr.label}
            </button>
          ))}
          {pendingPreset && <p className="text-[11px] text-accent">Click on the site to drop the guild.</p>}
        </div>
      </Section>

      <Section title="Companion overlay">
        <label className="flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" checked={intel} onChange={() => useProject.getState().toggleGardenIntel()} className="accent-accent" />
          Show companion + spacing overlay
        </label>
        {intel && (
          <div className="flex flex-col gap-1 pt-1">
            {bad.length === 0 && good.length === 0 && <p className="text-[11px] text-muted">No neighbors close enough to flag yet.</p>}
            {bad.map((c, i) => (
              <p key={`b${i}`} className="text-[11px] leading-tight text-alert">⚠ {c.reason}</p>
            ))}
            {good.map((c, i) => (
              <p key={`g${i}`} className="text-[11px] leading-tight text-muted">✓ {c.reason}</p>
            ))}
          </div>
        )}
      </Section>

      <Section title="Growing window · Nova Scotia">
        <Row label="Hardiness" value={REGION.hardinessZone} />
        <Row label="Last frost" value={REGION.lastSpringFrost} />
        <Row label="First frost" value={REGION.firstFallFrost} />
        <Row label="Season" value={`~${REGION.growingSeasonDays} days`} />
        <p className="text-[11px] leading-tight text-muted">Planning reference — confirm for your microclimate. Companion tips are guidance, not a rule book.</p>
      </Section>
    </div>
  )
}

const label = (id) => PLANT_CATALOG.find((p) => p.id === id)?.label.toLowerCase() || 'crop'

function ToolBtn({ active, onClick, Icon, children }) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-1 items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-xs ${active ? 'border-accent bg-accentSoft text-ink' : 'border-line text-ink hover:bg-accentSoft'}`}>
      <Icon size={14} strokeWidth={1.75} /> {children}
    </button>
  )
}
function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs text-muted">
      <span>{label}</span>
      <span className="text-ink">{value}</span>
    </div>
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
