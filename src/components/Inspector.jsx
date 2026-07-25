import { FilePlus2, Copy, Trash2, Check } from 'lucide-react'
import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import {
  useSession,
  newProject,
  duplicateProject,
  switchProject,
  removeProject,
} from '../store/session.js'
import { REGION, UNITS, ROOM_TYPES } from '../config.js'
import { formatFeetInches } from '../lib/units.js'
import { roomAreaSqft, roomBounds, roomPolygon, overlappingRoomIds } from '../lib/geometry.js'
import DimensionInput from './DimensionInput.jsx'

// Right-hand inspector. Phase 1 scope: project management, plot size, and the
// active level's settings. Room properties arrive in Phase 2.
export default function Inspector() {
  const project = useProject((s) => s.project)
  const summaries = useSession((s) => s.summaries)
  const activeId = useSession((s) => s.activeId)

  const selectedId = useEditor((s) => s.selectedId)
  const selectedWallId = useEditor((s) => s.selectedWallId)
  const active = project.levels.find((l) => l.id === project.view.activeLevelId)
  const isBasement = active && active.index < 0
  const rooms = active ? active.rooms : []
  const room = rooms.find((r) => r.id === selectedId)
  const overlapping = room ? overlappingRoomIds(rooms).has(room.id) : false
  const wall = active ? (active.walls || []).find((w) => w.id === selectedWallId) : null

  return (
    <div className="flex h-full flex-col overflow-y-auto">
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
              These rooms overlap — drag one apart.
            </p>
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
