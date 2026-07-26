import { FilePlus2, Copy, Trash2, Check } from 'lucide-react'
import { useProject, OPENING_STYLES } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import {
  useSession,
  newProject,
  duplicateProject,
  switchProject,
  removeProject,
} from '../store/session.js'
import { REGION, UNITS, ROOM_TYPES, SYSTEMS, GARDEN, PLANT_CATALOG } from '../config.js'
import { formatFeetInches } from '../lib/units.js'
import { roomAreaSqft, roomBounds, roomPolygon, overlappingRoomIds, sharedPairs } from '../lib/geometry.js'
import { runLengthIn, effectiveRunPoints } from '../lib/runs.js'
import { setbacks, distanceToHouse, houseBounds } from '../lib/landscape.js'
import { zoneCapacity, zoneOverPlanting, PLANT_BY_ID } from '../lib/companions.js'
import { computeSystem } from '../lib/gardensystems.js'
import DimensionInput from './DimensionInput.jsx'
import UtilitiesPanel from './UtilitiesPanel.jsx'
import LandscapePanel from './LandscapePanel.jsx'
import GardenPanel from './GardenPanel.jsx'
import { RotateCw } from 'lucide-react'

const k2 = (a, b) => [a, b].sort().join('|')

const STYLE_LABELS = {
  single: 'Single swing',
  double: 'Double / French',
  sliding: 'Sliding',
  pocket: 'Pocket',
  bifold: 'Bi-fold',
  picture: 'Picture (fixed)',
  casement: 'Casement',
  doublehung: 'Double-hung',
  awning: 'Awning',
  open: 'Open',
  sectional: 'Sectional',
}
const SWING_STYLES = new Set(['single', 'double', 'casement', 'awning'])
const HINGE_STYLES = new Set(['single', 'casement'])
const isHinged = (o) => SWING_STYLES.has(o.style)
const hasHinge = (o) => HINGE_STYLES.has(o.style)

function SetbackRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs text-muted">
      <span>{label}</span>
      <span className="num text-ink">{formatFeetInches(value)}</span>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs text-muted">
      <span>{label}</span>
      <span className="num text-ink">{value}</span>
    </div>
  )
}

function PlantTags({ crop }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px]">
      <span className="rounded bg-line px-1.5 py-0.5 text-muted">Sun: {crop.sun} ({GARDEN.SUN[crop.sun]})</span>
      <span className="rounded bg-line px-1.5 py-0.5 text-muted">Water: {crop.water}</span>
      <span className="rounded bg-line px-1.5 py-0.5 text-muted">Spacing: {formatFeetInches(crop.spacingIn)}</span>
    </div>
  )
}

// Right-hand inspector. Phase 1 scope: project management, plot size, and the
// active level's settings. Room properties arrive in Phase 2.
export default function Inspector() {
  const project = useProject((s) => s.project)
  const summaries = useSession((s) => s.summaries)
  const activeId = useSession((s) => s.activeId)

  const selectedId = useEditor((s) => s.selectedId)
  const selectedWallId = useEditor((s) => s.selectedWallId)
  const selectedOpeningId = useEditor((s) => s.selectedOpeningId)
  const active = project.levels.find((l) => l.id === project.view.activeLevelId)
  const isBasement = active && active.index < 0
  const rooms = active ? active.rooms : []
  const room = rooms.find((r) => r.id === selectedId)
  const mergedList = active ? active.mergedPairs || [] : []
  const mergedSet = new Set(mergedList)
  const overlapping = room ? overlappingRoomIds(rooms, mergedSet).has(room.id) : false
  const wall = active ? (active.walls || []).find((w) => w.id === selectedWallId) : null
  const opening = active ? (active.openings || []).find((o) => o.id === selectedOpeningId) : null
  const selectedFixtureId = useEditor((s) => s.selectedFixtureId)
  const selectedRunId = useEditor((s) => s.selectedRunId)
  const tool = useEditor((s) => s.tool)
  const fixture = active ? (active.fixtures || []).find((f) => f.id === selectedFixtureId) : null
  const run = active ? (active.runs || []).find((r) => r.id === selectedRunId) : null
  const otherLevels = project.levels.filter((l) => l.id !== project.view.activeLevelId)
  const canvasMode = useEditor((s) => s.canvasMode)
  const selectedLandscapeId = useEditor((s) => s.selectedLandscapeId)
  const selectedZoneId = useEditor((s) => s.selectedZoneId)
  const selectedPlantId = useEditor((s) => s.selectedPlantId)
  const selectedSystemId = useEditor((s) => s.selectedSystemId)
  const lobj = project.landscape.objects.find((o) => o.id === selectedLandscapeId)
  const zone = project.landscape.zones.find((z) => z.id === selectedZoneId)
  const plant = project.landscape.plants.find((p) => p.id === selectedPlantId)
  const gsys = (project.landscape.systems || []).find((s) => s.id === selectedSystemId)

  // Rooms that share a wall with the selected room, and whether they're joined.
  const neighbors = room
    ? [...sharedPairs(rooms)]
        .filter((k) => k.split('|').includes(room.id))
        .map((k) => k.split('|').find((id) => id !== room.id))
        .filter((id, i, a) => a.indexOf(id) === i)
        .map((id) => ({ room: rooms.find((r) => r.id === id), joined: mergedSet.has(k2(room.id, id)) }))
        .filter((n) => n.room)
    : []

  const OPENING_TYPES = ['door', 'window', 'archway', 'garage']

  // Landscape (Site) mode takes over the inspector.
  if (canvasMode === 'landscape') {
    if (gsys) {
      const c = computeSystem(gsys)
      const setCfg = (patch) => useProject.getState().updateGardenSystem(gsys.id, { config: { ...gsys.config, ...patch } })
      return (
        <div className="flex h-full flex-col overflow-y-auto">
          <Section title={gsys.label}>
            <div className="grid grid-cols-2 gap-2">
              <DimensionInput label="Width" valueIn={gsys.w} min={12} onCommit={(v) => useProject.getState().updateGardenSystem(gsys.id, { w: v })} />
              <DimensionInput label="Depth" valueIn={gsys.d} min={12} onCommit={(v) => useProject.getState().updateGardenSystem(gsys.id, { d: v })} />
            </div>

            {gsys.kind === 'aquaponics' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted">Bed : tank ratio</span>
                    <input type="number" step="0.1" min="0.5" value={c.ratio} onChange={(e) => setCfg({ growbedToTankRatio: Number(e.target.value) || 1 })} className="num w-full rounded border border-line bg-canvas px-2 py-1 text-sm text-ink" />
                  </label>
                  <DimensionInput label="Bed depth" valueIn={c.depthIn} min={4} onCommit={(v) => setCfg({ growbedDepthIn: v })} />
                </div>
                <Metric label="Fish-tank volume" value={`${c.tankVolumeGal} gal`} />
                <Metric label="Grow-bed volume" value={`${c.growBedVolumeGal} gal`} />
                <Metric label="Max fish load" value={`~${c.fishLoadLb} lb`} />
                <Metric label="Grow-bed area" value={`${c.growBedAreaSqFt} sq ft`} />
                <Metric label="Leafy greens" value={`~${c.herbCapacity} plants`} />
                <Metric label="Optional sump" value={`~${c.sumpGal} gal`} />
                <p className="rounded bg-accentSoft px-2 py-1.5 text-[11px] leading-tight text-ink">
                  Cold climate: outdoors this is seasonal. Year-round in Nova Scotia means a greenhouse or heated indoor/basement spot plus a tank heater. Siting it inside changes the plan.
                </p>
              </>
            )}

            {(gsys.kind === 'drying' || gsys.kind === 'curing') && (
              <>
                <Metric label="Capacity" value={c.capacityLabel} />
                <Metric label="Target" value={c.target} />
              </>
            )}
          </Section>

          <Section title="Parts list">
            {c.parts.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-ink">{p.item}</span>
                {p.qty > 1 && <span className="num text-muted">×{p.qty}</span>}
              </div>
            ))}
          </Section>

          <Section title="">
            <p className="rounded border border-alert/40 bg-alert/10 px-2 py-1.5 text-[11px] font-medium leading-tight text-alert">
              Planning estimate — validate before building. Real aquaponics/aquaculture design needs local checks (species, water testing, code).
            </p>
            <button type="button" onClick={() => { useProject.getState().removeGardenSystem(gsys.id); useEditor.getState().clearSelection() }} className="flex items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-alert hover:bg-alert/10">
              <Trash2 size={14} strokeWidth={1.75} /> Delete system
            </button>
          </Section>
        </div>
      )
    }
    if (zone) {
      const cap = zoneCapacity(zone)
      const { count, over } = zoneOverPlanting(zone, project.landscape.plants)
      const crop = PLANT_BY_ID[zone.cropId]
      return (
        <div className="flex h-full flex-col overflow-y-auto">
          <Section title={zone.name}>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Crop</span>
              <select value={zone.cropId} onChange={(e) => useProject.getState().updateZone(zone.id, { cropId: e.target.value })} className="w-full rounded border border-line bg-canvas px-2 py-1 text-sm text-ink">
                {PLANT_CATALOG.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <DimensionInput label="Width" valueIn={zone.w} min={6} onCommit={(v) => useProject.getState().updateZone(zone.id, { w: v })} />
              <DimensionInput label="Depth" valueIn={zone.d} min={6} onCommit={(v) => useProject.getState().updateZone(zone.id, { d: v })} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Capacity</span>
              <span className="num text-ink">holds ~{cap}</span>
            </div>
            {over && <p className="rounded bg-alert/10 px-2 py-1.5 text-[11px] text-alert">Over-planted — {count} placed in a bed that holds ~{cap}.</p>}
            {crop && <PlantTags crop={crop} />}
            <button type="button" onClick={() => { useProject.getState().removeZone(zone.id); useEditor.getState().clearSelection() }} className="flex items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-alert hover:bg-alert/10">
              <Trash2 size={14} strokeWidth={1.75} /> Delete bed
            </button>
          </Section>
        </div>
      )
    }
    if (plant) {
      const p = PLANT_BY_ID[plant.plantId]
      return (
        <div className="flex h-full flex-col overflow-y-auto">
          <Section title={p?.label || 'Plant'}>
            {p && <PlantTags crop={p} />}
            <div className="text-xs text-muted">{plant.zoneId ? 'Planted in a bed' : 'Free-standing'}</div>
            <button type="button" onClick={() => { useProject.getState().removePlant(plant.id); useEditor.getState().clearSelection() }} className="flex items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-alert hover:bg-alert/10">
              <Trash2 size={14} strokeWidth={1.75} /> Remove plant
            </button>
          </Section>
        </div>
      )
    }
    if (!lobj) return <div className="flex h-full flex-col overflow-y-auto"><LandscapePanel /><GardenPanel /></div>
    const sb = setbacks(lobj, project.plot)
    const toHouse = distanceToHouse(lobj, houseBounds(project))
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <Section title={lobj.label}>
          <div className="grid grid-cols-2 gap-2">
            <DimensionInput label="Width" valueIn={lobj.w} min={6} onCommit={(v) => useProject.getState().updateLandscapeObject(lobj.id, { w: v })} />
            <DimensionInput label="Depth" valueIn={lobj.d} min={6} onCommit={(v) => useProject.getState().updateLandscapeObject(lobj.id, { d: v })} />
          </div>
          <DimensionInput label="Height" valueIn={lobj.heightIn} min={0} onCommit={(v) => useProject.getState().updateLandscapeObject(lobj.id, { heightIn: v })} />
          <button
            type="button"
            onClick={() => useProject.getState().updateLandscapeObject(lobj.id, { rotation: ((lobj.rotation || 0) + 90) % 360 })}
            className="flex items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-ink hover:bg-accentSoft"
          >
            <RotateCw size={14} strokeWidth={1.75} /> Rotate 90°
          </button>
        </Section>

        <Section title="Setbacks">
          <SetbackRow label="Front (top)" value={sb.front} />
          <SetbackRow label="Rear (bottom)" value={sb.rear} />
          <SetbackRow label="Left" value={sb.left} />
          <SetbackRow label="Right" value={sb.right} />
          {toHouse != null && <SetbackRow label="To house" value={toHouse} />}
          <p className="text-[11px] leading-tight text-muted">Distance to each property line and to the house.</p>
        </Section>

        <Section title="">
          <button
            type="button"
            onClick={() => {
              useProject.getState().removeLandscapeObject(lobj.id)
              useEditor.getState().clearSelection()
            }}
            className="flex items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-alert hover:bg-alert/10"
          >
            <Trash2 size={14} strokeWidth={1.75} /> Delete {lobj.label.toLowerCase()}
          </button>
        </Section>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Selected fixture */}
      {fixture && (
        <Section title="Fixture">
          <div className="flex items-center gap-2 text-sm text-ink">
            <span className="h-3 w-3 rounded-sm" style={{ background: SYSTEMS[fixture.system].color }} />
            {fixture.label}
          </div>
          <div className="text-xs text-muted">{SYSTEMS[fixture.system].label}</div>
          <button
            type="button"
            onClick={() => useProject.getState().updateFixture(fixture.id, { rotation: ((fixture.rotation || 0) + 90) % 360 })}
            className="flex items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-ink hover:bg-accentSoft"
          >
            <RotateCw size={14} strokeWidth={1.75} /> Rotate 90°
          </button>
          <button
            type="button"
            onClick={() => {
              useProject.getState().removeFixture(fixture.id)
              useEditor.getState().clearSelection()
            }}
            className="flex items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-alert hover:bg-alert/10"
          >
            <Trash2 size={14} strokeWidth={1.75} /> Delete fixture
          </button>
        </Section>
      )}

      {/* Selected run */}
      {run && (
        <Section title="Run">
          <div className="flex items-center gap-2 text-sm text-ink">
            <span className="h-3 w-3 rounded-sm" style={{ background: SYSTEMS[run.system].color }} />
            {SYSTEMS[run.system].label}
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Length</span>
            <span className="num text-ink">{formatFeetInches(runLengthIn(effectiveRunPoints(run, active.fixtures || [])))}</span>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Riser to level</span>
            <select
              value={run.risesToLevelId || ''}
              onChange={(e) => useProject.getState().updateRun(run.id, { risesToLevelId: e.target.value || null })}
              className="w-full rounded border border-line bg-canvas px-2 py-1 text-sm text-ink"
            >
              <option value="">None (same level)</option>
              {otherLevels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              useProject.getState().removeRun(run.id)
              useEditor.getState().clearSelection()
            }}
            className="flex items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-alert hover:bg-alert/10"
          >
            <Trash2 size={14} strokeWidth={1.75} /> Delete run
          </button>
        </Section>
      )}

      {/* Utilities palette (when the tool is active and nothing is selected) */}
      {tool === 'utilities' && !fixture && !run && <UtilitiesPanel />}

      {/* Selected opening */}
      {opening && (
        <Section title="Opening">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Type</span>
            <select
              value={opening.type}
              onChange={(e) => useProject.getState().updateOpening(opening.id, { type: e.target.value })}
              className="w-full rounded border border-line bg-canvas px-2 py-1 text-sm capitalize text-ink"
            >
              {OPENING_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </select>
          </label>

          {OPENING_STYLES[opening.type].length > 1 && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Style</span>
              <select
                value={opening.style}
                onChange={(e) => useProject.getState().updateOpening(opening.id, { style: e.target.value })}
                className="w-full rounded border border-line bg-canvas px-2 py-1 text-sm capitalize text-ink"
              >
                {OPENING_STYLES[opening.type].map((st) => (
                  <option key={st} value={st} className="capitalize">
                    {STYLE_LABELS[st] || st}
                  </option>
                ))}
              </select>
            </label>
          )}

          {isHinged(opening) && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Swing</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    useProject.getState().updateOpening(opening.id, { swing: opening.swing === 'in' ? 'out' : 'in' })
                  }
                  className="flex-1 rounded border border-line px-2 py-1 text-[11px] text-ink hover:bg-accentSoft"
                >
                  {opening.swing === 'in' ? 'Opens in ↩' : 'Opens out ↪'}
                </button>
                {hasHinge(opening) && (
                  <button
                    type="button"
                    onClick={() =>
                      useProject
                        .getState()
                        .updateOpening(opening.id, { hinge: opening.hinge === 'start' ? 'end' : 'start' })
                    }
                    className="flex-1 rounded border border-line px-2 py-1 text-[11px] text-ink hover:bg-accentSoft"
                  >
                    Hinge {opening.hinge === 'start' ? 'left' : 'right'} ⇄
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <DimensionInput label="Width" valueIn={opening.widthIn} min={6} onCommit={(v) => useProject.getState().updateOpening(opening.id, { widthIn: v })} />
            <DimensionInput label="Height" valueIn={opening.heightIn} min={6} onCommit={(v) => useProject.getState().updateOpening(opening.id, { heightIn: v })} />
          </div>

          {opening.type === 'window' && (
            <DimensionInput label="Sill height" valueIn={opening.sillHeightIn} min={0} onCommit={(v) => useProject.getState().updateOpening(opening.id, { sillHeightIn: v })} />
          )}

          <p className="text-[11px] leading-tight text-muted">Drag along the wall to reposition.</p>

          <button
            type="button"
            onClick={() => {
              useProject.getState().removeOpening(opening.id)
              useEditor.getState().clearSelection()
            }}
            className="flex items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-alert hover:bg-alert/10"
          >
            <Trash2 size={14} strokeWidth={1.75} /> Delete opening
          </button>
        </Section>
      )}

      {/* Selected freestanding wall */}
      {wall && (
        <Section title="Wall">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Length</span>
            <span className="num text-ink">
              {formatFeetInches(Math.abs(wall.x2 - wall.x1) + Math.abs(wall.y2 - wall.y1))}
            </span>
          </div>
          <p className="text-[11px] leading-tight text-muted">
            Drag the wall to move it; drag an endpoint to change its length.
          </p>
          <button
            type="button"
            onClick={() => {
              useProject.getState().removeWall(wall.id)
              useEditor.getState().clearSelection()
            }}
            className="flex items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-alert hover:bg-alert/10"
          >
            <Trash2 size={14} strokeWidth={1.75} /> Delete wall
          </button>
        </Section>
      )}

      {/* Selected room */}
      {room && (
        <Section title="Room">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Name</span>
            <input
              type="text"
              value={room.name}
              onChange={(e) => useProject.getState().updateRoom(room.id, { name: e.target.value })}
              className="w-full rounded border border-line bg-canvas px-2 py-1 text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Type</span>
            <select
              value={room.type ?? ''}
              onChange={(e) =>
                useProject.getState().updateRoom(room.id, { type: e.target.value || null })
              }
              className="w-full rounded border border-line bg-canvas px-2 py-1 text-sm text-ink"
            >
              <option value="">Set type</option>
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-between text-xs text-muted">
            <span>Size (bounding box)</span>
            <span className="num text-ink">
              {formatFeetInches(roomBounds(room).w)} × {formatFeetInches(roomBounds(room).d)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-muted">
            <span>Floor area (approx)</span>
            <span className="num text-ink">{roomAreaSqft(room).toFixed(1)} sq ft</span>
          </div>

          <div className="flex items-center justify-between text-xs text-muted">
            <span>Corners</span>
            <span className="num text-ink">{roomPolygon(room).length}</span>
          </div>

          <p className="text-[11px] leading-tight text-muted">
            Drag a corner to move just that corner; drag a wall's dot to move the whole wall.
          </p>

          {overlapping && (
            <p className="rounded bg-alert/10 px-2 py-1.5 text-[11px] leading-tight text-alert">
              These rooms overlap — drag one apart, or join them below to make one L-shaped space.
            </p>
          )}

          {neighbors.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Shared walls</span>
              {neighbors.map((n) => (
                <div key={n.room.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-ink">{n.room.name}</span>
                  {n.joined ? (
                    <button
                      type="button"
                      onClick={() => useProject.getState().unmergeRooms(room.id, n.room.id)}
                      className="shrink-0 rounded border border-line px-2 py-0.5 text-[11px] text-ink hover:bg-accentSoft"
                    >
                      Add wall back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => useProject.getState().mergeRooms(room.id, n.room.id)}
                      className="shrink-0 rounded border border-accent px-2 py-0.5 text-[11px] text-accent hover:bg-accentSoft"
                    >
                      Remove wall (join)
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              useProject.getState().removeRoom(room.id)
              useEditor.getState().clearSelection()
            }}
            className="flex items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-alert hover:bg-alert/10"
          >
            <Trash2 size={14} strokeWidth={1.75} /> Delete room
          </button>
        </Section>
      )}

      {/* Project */}
      <Section title="Project">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Name</span>
          <input
            type="text"
            value={project.name}
            onChange={(e) => useProject.getState().setName(e.target.value)}
            className="w-full rounded border border-line bg-canvas px-2 py-1 text-sm text-ink"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => newProject()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-ink hover:bg-accentSoft"
          >
            <FilePlus2 size={14} strokeWidth={1.75} /> New
          </button>
          <button
            type="button"
            onClick={() => duplicateProject()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-line px-2 py-1.5 text-xs text-ink hover:bg-accentSoft"
          >
            <Copy size={14} strokeWidth={1.75} /> Duplicate
          </button>
        </div>

        {summaries.length > 1 && (
          <div className="flex flex-col gap-0.5">
            <span className="mb-0.5 text-xs text-muted">All projects</span>
            {summaries.map((s) => {
              const isActive = s.id === activeId
              return (
                <div
                  key={s.id}
                  className={`group flex items-center gap-1 rounded px-2 py-1 text-xs ${
                    isActive ? 'bg-accentSoft text-ink' : 'text-muted hover:bg-accentSoft hover:text-ink'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => switchProject(s.id)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  >
                    <span className="w-3.5 shrink-0">
                      {isActive && <Check size={13} strokeWidth={2.25} className="text-accent" />}
                    </span>
                    <span className="truncate">{s.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProject(s.id)}
                    aria-label={`Delete ${s.name}`}
                    title={`Delete ${s.name}`}
                    className="rounded p-0.5 text-muted opacity-0 hover:bg-alert/10 hover:text-alert group-hover:opacity-100"
                  >
                    <Trash2 size={12} strokeWidth={1.75} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Plot */}
      <Section title="Plot">
        <div className="grid grid-cols-2 gap-2">
          <DimensionInput
            label="Width"
            valueIn={project.plot.widthIn}
            min={12}
            onCommit={(v) => useProject.getState().setPlot({ widthIn: v })}
          />
          <DimensionInput
            label="Depth"
            valueIn={project.plot.depthIn}
            min={12}
            onCommit={(v) => useProject.getState().setPlot({ depthIn: v })}
          />
        </div>
        {UNITS.ACCEPT_METRIC_INPUT && (
          <p className="text-[11px] leading-tight text-muted">
            Accepts feet-inches or metric — type <span className="num">30m</span> off a survey.
          </p>
        )}
      </Section>

      {/* Active level */}
      {active && (
        <Section title="Level">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Name</span>
            <input
              type="text"
              value={active.name}
              onChange={(e) => useProject.getState().updateLevel(active.id, { name: e.target.value })}
              className="w-full rounded border border-line bg-canvas px-2 py-1 text-sm text-ink"
            />
          </label>

          <DimensionInput
            label="Ceiling height"
            valueIn={active.ceilingHeightIn}
            min={UNITS.MIN_ROOM_IN}
            onCommit={(v) => useProject.getState().updateLevel(active.id, { ceilingHeightIn: v })}
          />

          {isBasement && (
            <DimensionInput
              label="Footing depth"
              valueIn={active.footingDepthIn ?? REGION.frostDepthIn}
              min={12}
              hint={`Defaults to ${formatFeetInches(REGION.frostDepthIn)} (NS frost line, NBC 9.12). Confirm locally.`}
              onCommit={(v) => useProject.getState().updateLevel(active.id, { footingDepthIn: v })}
            />
          )}

          <div className="flex items-center justify-between text-xs text-muted">
            <span>Floor elevation</span>
            <span className="num text-ink">{formatFeetInches(active.floorElevationIn)}</span>
          </div>

          <label className="flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={project.view.showGhostBelow}
              onChange={() => useProject.getState().toggleGhostBelow()}
              className="accent-accent"
            />
            Show level below as ghost
          </label>
        </Section>
      )}
    </div>
  )
}

// Module-scope so it never remounts children.
function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-2.5 border-b border-line px-4 py-3.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  )
}
