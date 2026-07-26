import { useMemo } from 'react'
import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { checkGarden, zoneCapacity, zoneOverPlanting, plantSpacing, PLANT_BY_ID, cropColor } from '../lib/companions.js'
import { COLOR } from '../tokens.js'

// Garden zones + plants on the site, with the OPTIONAL companion/spacing overlay
// (off by default). The overlay's O(n²) check only runs when it's on.
const GOOD = '#4C9A5A'

const HANDLES = [
  { id: 'nw', fx: 0, fy: 0, cursor: 'nwse-resize' },
  { id: 'ne', fx: 1, fy: 0, cursor: 'nesw-resize' },
  { id: 'se', fx: 1, fy: 1, cursor: 'nwse-resize' },
  { id: 'sw', fx: 0, fy: 1, cursor: 'nesw-resize' },
  { id: 'n', fx: 0.5, fy: 0, cursor: 'ns-resize' },
  { id: 'e', fx: 1, fy: 0.5, cursor: 'ew-resize' },
  { id: 's', fx: 0.5, fy: 1, cursor: 'ns-resize' },
  { id: 'w', fx: 0, fy: 0.5, cursor: 'ew-resize' },
]

export default function GardenLayer({ zoom }) {
  const landscape = useProject((s) => s.project.landscape)
  const intel = useProject((s) => s.project.view.gardenIntel)
  const selectedZoneId = useEditor((s) => s.selectedZoneId)
  const selectedPlantId = useEditor((s) => s.selectedPlantId)
  const zonePreview = useEditor((s) => s.zonePreview)
  const plantPreview = useEditor((s) => s.plantPreview)
  const activeCrop = useEditor((s) => s.activeCrop)

  const zones = landscape.zones.map((z) => (zonePreview && zonePreview.id === z.id ? { ...z, ...zonePreview } : z))
  const plants = landscape.plants.map((p) => (plantPreview && plantPreview.id === p.id ? { ...p, ...plantPreview } : p))

  const conflicts = useMemo(() => (intel ? checkGarden(plants, zones) : []), [intel, sig(plants), sig(zones)]) // eslint-disable-line react-hooks/exhaustive-deps

  const fs = (px) => px / zoom // constant screen-size text
  const drawZone = zonePreview && !zonePreview.id ? zonePreview : null

  return (
    <g>
      {/* Zones */}
      {zones.map((z) => {
        const color = cropColor(z.cropId)
        const sel = z.id === selectedZoneId
        return (
          <g key={z.id}>
            <rect data-zone-id={z.id} x={z.x} y={z.y} width={z.w} height={z.d} fill={color + '26'} stroke={sel ? COLOR.accent : color} strokeWidth={sel ? 2 : 1.25} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'all', cursor: 'move' }} />
            <text x={z.x + z.w / 2} y={z.y + 2} textAnchor="middle" dominantBaseline="hanging" fontSize={fs(11)} fill={COLOR.muted} style={{ pointerEvents: 'none', fontFamily: 'DM Sans, sans-serif' }}>
              {PLANT_BY_ID[z.cropId]?.label || 'Crop'}
            </text>
            {intel && <ZoneCapacity zone={z} plants={plants} fs={fs} />}
            {sel && <Handles rect={z} hs={8 / zoom} kind="zone" id={z.id} />}
          </g>
        )
      })}

      {/* Zone draw preview */}
      {drawZone && <rect x={drawZone.x} y={drawZone.y} width={drawZone.w} height={drawZone.d} fill={cropColor(activeCrop) + '20'} stroke={COLOR.accent} strokeWidth={1.5} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />}

      {/* Companion + spacing overlay */}
      {intel && (
        <g style={{ pointerEvents: 'none' }}>
          {plants.map((p) => {
            const s = plantSpacing(p.plantId) / 2
            return <circle key={`ring${p.id}`} cx={p.x} cy={p.y} r={s} fill="none" stroke={cropColor(p.plantId)} strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          })}
          {conflicts.map((c, i) => (
            <line key={`c${i}`} x1={cx(c.a)} y1={cy(c.a)} x2={cx(c.b)} y2={cy(c.b)} stroke={c.verdict === 'bad' ? COLOR.alert : GOOD} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      )}

      {/* Plants */}
      {plants.map((p) => {
        const sel = p.id === selectedPlantId
        return (
          <g key={p.id}>
            {sel && <circle cx={p.x} cy={p.y} r={7 / zoom} fill="none" stroke={COLOR.accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />}
            <circle data-plant-id={p.id} cx={p.x} cy={p.y} r={4 / zoom} fill={cropColor(p.plantId)} stroke={COLOR.panel} strokeWidth={1} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'all', cursor: 'move' }} />
          </g>
        )
      })}
    </g>
  )
}

function ZoneCapacity({ zone, plants, fs }) {
  const { capacity, count, over } = zoneOverPlanting(zone, plants)
  return (
    <text x={zone.x + zone.w / 2} y={zone.y + zone.d - 2} textAnchor="middle" fontSize={fs(11)} fill={over ? COLOR.alert : COLOR.muted} style={{ pointerEvents: 'none', fontFamily: 'JetBrains Mono, monospace' }}>
      {over ? `holds ~${capacity}, placed ${count}` : `holds ~${capacity}`}
    </text>
  )
}

function Handles({ rect, hs, id }) {
  return (
    <g>
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.d} fill="none" stroke={COLOR.accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
      {HANDLES.map((h) => (
        <rect
          key={h.id}
          data-zone-handle={h.id}
          data-zone-id={id}
          x={rect.x + h.fx * rect.w - hs / 2}
          y={rect.y + h.fy * rect.d - hs / 2}
          width={hs}
          height={hs}
          fill={COLOR.panel}
          stroke={COLOR.accent}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'all', cursor: h.cursor }}
        />
      ))}
    </g>
  )
}

const cx = (e) => (e.kind === 'zone' ? e.x + e.w / 2 : e.x)
const cy = (e) => (e.kind === 'zone' ? e.y + e.d / 2 : e.y)
const sig = (arr) => arr.map((a) => `${a.id}:${a.x},${a.y},${a.w || 0},${a.d || 0},${a.cropId || a.plantId}`).join('|')
