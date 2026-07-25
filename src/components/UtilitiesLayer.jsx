import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { SYSTEMS } from '../config.js'
import { fixtureFootprint, fixturePos, effectiveRunPoints, orthogonalize } from '../lib/runs.js'
import { COLOR } from '../tokens.js'

// Schematic utilities in 2D: runs (orthogonal polylines) + fixtures (footprints)
// per system, with riser markers and the live run-draft preview.
export default function UtilitiesLayer() {
  const project = useProject((s) => s.project)
  const level = project.levels.find((l) => l.id === project.view.activeLevelId)
  const tool = useEditor((s) => s.tool)
  const activeSystem = useEditor((s) => s.activeSystem)
  const hidden = useEditor((s) => s.systemsHidden)
  const selectedFixtureId = useEditor((s) => s.selectedFixtureId)
  const selectedRunId = useEditor((s) => s.selectedRunId)
  const fixtureDrag = useEditor((s) => s.fixtureDrag)
  const runDraft = useEditor((s) => s.runDraft)
  const runCursor = useEditor((s) => s.runCursor)

  const fixtures = level.fixtures || []
  const runs = level.runs || []
  const inUtil = tool === 'utilities'
  const sysOpacity = (system) => (inUtil && system !== activeSystem ? 0.25 : 1)
  const shown = (system) => !hidden.includes(system)

  const ptsStr = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ')

  // Risers pointing INTO this level from other levels.
  const incoming = []
  project.levels.forEach((lv) => {
    if (lv.id === level.id) return
    ;(lv.runs || []).forEach((r) => {
      if (r.risesToLevelId === level.id && r.points.length) {
        incoming.push({ system: r.system, at: r.points[r.points.length - 1], up: lv.index < level.index })
      }
    })
  })

  return (
    <g>
      {/* Runs */}
      {runs.filter((r) => shown(r.system)).map((r) => {
        const pts = effectiveRunPoints(r, fixtures, fixtureDrag)
        const color = SYSTEMS[r.system].color
        const sel = r.id === selectedRunId
        return (
          <g key={r.id} opacity={sysOpacity(r.system)}>
            <polyline data-run-id={r.id} points={ptsStr(pts)} fill="none" stroke="rgba(0,0,0,0)" strokeWidth={10} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />
            <polyline points={ptsStr(pts)} fill="none" stroke={sel ? COLOR.accent : color} strokeWidth={sel ? 3 : 2} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
            {r.risesToLevelId && <Riser at={pts[pts.length - 1]} color={color} up={risesUp(project, level, r.risesToLevelId)} />}
          </g>
        )
      })}

      {/* Incoming risers from other levels */}
      {incoming.filter((r) => shown(r.system)).map((r, i) => (
        <g key={`in${i}`} opacity={sysOpacity(r.system)}>
          <Riser at={r.at} color={SYSTEMS[r.system].color} up={r.up} incoming />
        </g>
      ))}

      {/* Fixtures */}
      {fixtures.filter((f) => shown(f.system)).map((f) => {
        const pos = fixturePos(f, fixtureDrag)
        const { w, d } = fixtureFootprint(f.kind)
        const color = SYSTEMS[f.system].color
        const sel = f.id === selectedFixtureId
        return (
          <g key={f.id} transform={`translate(${pos.x} ${pos.y}) rotate(${f.rotation || 0})`} opacity={sysOpacity(f.system)}>
            <rect
              data-fixture-id={f.id}
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              fill={color + '22'}
              stroke={sel ? COLOR.accent : color}
              strokeWidth={sel ? 2 : 1.5}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'all', cursor: 'move' }}
            />
            <circle cx={0} cy={0} r={2.5} fill={color} style={{ pointerEvents: 'none' }} />
          </g>
        )
      })}

      {/* Live run draft */}
      {runDraft && (
        <polyline
          points={ptsStr(orthogonalize([...runDraft.points, ...(runCursor ? [runCursor] : [])]))}
          fill="none"
          stroke={SYSTEMS[runDraft.system].color}
          strokeWidth={2}
          strokeDasharray="6 5"
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  )
}

function risesUp(project, level, targetId) {
  const target = project.levels.find((l) => l.id === targetId)
  return target ? target.index > level.index : true
}

// A circled arrow marking a vertical riser.
function Riser({ at, color, up, incoming }) {
  const r = 7
  const dir = up ? -1 : 1
  return (
    <g transform={`translate(${at.x} ${at.y})`} style={{ pointerEvents: 'none' }}>
      <circle cx={0} cy={0} r={r} fill={COLOR.panel} stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={incoming ? 0.9 : 1} />
      <path d={`M 0 ${dir * 4} L 0 ${-dir * 4} M ${-2.5} ${-dir * 1.5} L 0 ${-dir * 4} L 2.5 ${-dir * 1.5}`} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </g>
  )
}
