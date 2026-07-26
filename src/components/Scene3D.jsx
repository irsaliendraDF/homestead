import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Html, Line } from '@react-three/drei'
import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { resolveWalls, roomBounds } from '../lib/geometry.js'
import { openingWorldSegment, wallSpans } from '../lib/openings.js'
import { effectiveRunPoints, fixtureFootprint } from '../lib/runs.js'
import { LANDSCAPE_STYLE, houseBounds } from '../lib/landscape.js'
import { roofGeometry } from '../lib/roof.js'
import { cropColor, plantSpacing } from '../lib/companions.js'
import { SYSTEMS } from '../config.js'
import { formatFeetInches } from '../lib/units.js'

// The plan, standing up. A pure projection of the same store the 2D editor
// edits — walls from resolveWalls(), positioned per level elevation. Content is
// translated so the plot centre sits at the origin (keeps camera, lights, and
// shadows simple). 1 three-unit = 1 inch. Solid walls only (no openings yet).

const MAT = {
  wallExt: '#EAE8E2',
  wallInt: '#DED9CF',
  floor: '#F3F1EC',
  ceiling: '#E7E4DD',
}

export default function Scene3D() {
  const project = useProject((s) => s.project)
  const showAll = useEditor((s) => s.show3dAllLevels)
  const showDims = useEditor((s) => s.showDims3d)
  const showCeilings = useEditor((s) => s.showCeilings3d)
  const showRoof = useEditor((s) => s.showRoof3d)
  const hidden = useEditor((s) => s.systemsHidden)
  const ceilingDrag = useEditor((s) => s.ceilingDrag)

  const { plot, levels, view, roof } = project
  const cx = plot.widthIn / 2
  const cz = plot.depthIn / 2
  const maxDim = Math.max(plot.widthIn, plot.depthIn)

  const visible = showAll ? levels : levels.filter((l) => l.id === view.activeLevelId)
  const activeId = view.activeLevelId
  const elevationOf = (id) => levels.find((l) => l.id === id)?.floorElevationIn ?? 0
  // Live ceiling height (honors an in-progress 3D drag).
  const ceilingOf = (l) => (ceilingDrag && ceilingDrag.levelId === l.id ? ceilingDrag.value : l.ceilingHeightIn)

  // Drag a wall's top edge (in 3D) to change that level's ceiling height.
  const dragRef = useRef(null)
  const controlsRef = useRef(null)
  const beginCeilingDrag = (levelId, clientY, ceiling) => {
    dragRef.current = { levelId, startY: clientY, startCeiling: ceiling }
    if (controlsRef.current) controlsRef.current.enabled = false // don't orbit while dragging
    const k = maxDim / 900 // inches per pixel, scaled to house size
    const onMove = (ev) => {
      const d = dragRef.current
      if (!d) return
      const val = Math.max(60, Math.min(240, Math.round(d.startCeiling + (d.startY - ev.clientY) * k)))
      useEditor.getState().setCeilingDrag({ levelId: d.levelId, value: val })
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (controlsRef.current) controlsRef.current.enabled = true
      const cd = useEditor.getState().ceilingDrag
      if (cd) {
        useProject.getState().updateLevel(cd.levelId, { ceilingHeightIn: cd.value })
        useEditor.getState().clearCeilingDrag()
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // Roof sits on the top level's ceiling, over the whole-house footprint.
  const topLevel = [...levels].sort((a, b) => b.index - a.index)[0]
  const eaveY = topLevel ? topLevel.floorElevationIn + ceilingOf(topLevel) : 0
  const houseBox = houseBounds(project)

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, maxDim * 0.75, maxDim * 0.95], fov: 45, near: 10, far: 200000 }}
      style={{ background: '#FCFCFB' }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[maxDim * 0.6, maxDim * 1.4, maxDim * 0.5]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={maxDim * 4}
        shadow-camera-left={-maxDim}
        shadow-camera-right={maxDim}
        shadow-camera-top={maxDim}
        shadow-camera-bottom={-maxDim}
      />

      {/* Ground reference + shadow catcher, at grade. */}
      <Grid
        args={[maxDim * 2, maxDim * 2]}
        cellSize={12}
        cellThickness={0.5}
        cellColor="#E5E4E0"
        sectionSize={60}
        sectionThickness={1}
        sectionColor="#C4C2BC"
        fadeDistance={maxDim * 3}
        fadeStrength={1}
        infiniteGrid
        position={[0, 0, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[maxDim * 3, maxDim * 3]} />
        <shadowMaterial transparent opacity={0.12} />
      </mesh>

      {/* House content, centred at the origin. */}
      <group position={[-cx, 0, -cz]}>
        {(project.landscape?.objects || []).map((o) => (
          <LandscapeObject3D key={o.id} o={o} />
        ))}
        {/* Garden zones (flat insets) + plants (low mounds) */}
        {(project.landscape?.zones || []).map((z) => (
          <mesh key={z.id} position={[z.x + z.w / 2, 0.6, z.y + z.d / 2]} receiveShadow>
            <boxGeometry args={[z.w, 1, z.d]} />
            <meshStandardMaterial color={cropColor(z.cropId)} roughness={1} transparent opacity={0.5} />
          </mesh>
        ))}
        {(project.landscape?.plants || []).map((p) => {
          const r = Math.max(3, Math.min(plantSpacing(p.plantId) / 2, 14))
          return (
            <mesh key={p.id} position={[p.x, r, p.y]} castShadow>
              <sphereGeometry args={[r, 10, 8]} />
              <meshStandardMaterial color={cropColor(p.plantId)} roughness={1} />
            </mesh>
          )
        })}
        {(project.landscape?.systems || []).map((sy) => (
          <GardenSystem3D key={sy.id} sy={sy} />
        ))}
        {visible.map((level) => (
          <LevelMeshes
            key={level.id}
            level={level}
            height={ceilingOf(level)}
            beginCeilingDrag={beginCeilingDrag}
            dragging={ceilingDrag && ceilingDrag.levelId === level.id}
            dimmed={showAll && level.id !== activeId}
            showCeiling={showCeilings}
            showDims={showDims && level.id === activeId}
            hidden={hidden}
            elevationOf={elevationOf}
          />
        ))}

        {/* Roof massing over the whole-house footprint. */}
        {showRoof && houseBox && (roof.style === 'flat' ? (
          <mesh position={[houseBox.x + houseBox.w / 2, eaveY + 4, houseBox.y + houseBox.d / 2]} castShadow receiveShadow>
            <boxGeometry args={[houseBox.w + 8, 8, houseBox.d + 8]} />
            <meshStandardMaterial color="#D3CFC6" roughness={1} />
          </mesh>
        ) : (
          <RoofMesh style={roof.style} bbox={houseBox} pitch={roof.pitchRise} eaveY={eaveY} />
        ))}
      </group>

      <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.12} target={[0, 0, 0]} />
    </Canvas>
  )
}

function LevelMeshes({ level, height, beginCeilingDrag, dragging, dimmed, showCeiling, showDims, hidden = [], elevationOf }) {
  const floorY = level.floorElevationIn
  const runY = floorY - 6 // schematic runs sit in the floor-assembly gap
  const onWallDown = (e) => {
    e.stopPropagation()
    beginCeilingDrag(level.id, e.nativeEvent?.clientY ?? e.clientY, height)
  }

  const walls = useMemo(() => {
    const merged = new Set(level.mergedPairs || [])
    const roomWalls = resolveWalls(level.rooms, merged)
    const freeWalls = (level.walls || []).map((w) => ({ ...w, isExterior: true }))
    return [...roomWalls, ...freeWalls]
  }, [level.rooms, level.walls, level.mergedPairs])

  const openingSegs = useMemo(
    () => (level.openings || []).map((o) => openingWorldSegment(o, level)).filter(Boolean),
    [level.openings, level.rooms, level.walls]
  )

  const bbox = useMemo(() => {
    if (!level.rooms.length) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const r of level.rooms) {
      const b = roomBounds(r)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w)
      maxY = Math.max(maxY, b.y + b.d)
    }
    return { minX, minY, maxX, maxY }
  }, [level.rooms])

  const opacity = dimmed ? 0.28 : 1
  const transparent = dimmed

  return (
    <group>
      {walls.map((w) => (
        <WallWithOpenings key={w.id} w={w} floorY={floorY} height={height} openingSegs={openingSegs} opacity={opacity} transparent={transparent} onWallDown={onWallDown} />
      ))}

      {bbox && (
        <FloorSlab bbox={bbox} y={floorY} color={MAT.floor} opacity={opacity} transparent={transparent} thickness={2} below />
      )}
      {bbox && showCeiling && (
        <FloorSlab bbox={bbox} y={floorY + height} color={MAT.ceiling} opacity={opacity} transparent={transparent} thickness={2} />
      )}

      {showDims &&
        walls
          .filter((w) => w.isExterior)
          .map((w) => <DimLabel key={`d${w.id}`} w={w} y={floorY + height} />)}

      {dragging && bbox && (
        <Html position={[(bbox.minX + bbox.maxX) / 2, floorY + height + 12, (bbox.minY + bbox.maxY) / 2]} center distanceFactor={900} style={{ pointerEvents: 'none' }}>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: '#fff', background: '#3D5A6C', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>
            {formatFeetInches(height)}
          </div>
        </Html>
      )}

      {/* Utility fixtures */}
      {(level.fixtures || [])
        .filter((f) => !hidden.includes(f.system))
        .map((f) => {
          const { w, d } = fixtureFootprint(f.kind)
          return (
            <mesh key={f.id} position={[f.x, floorY + 5, f.y]} rotation={[0, (-(f.rotation || 0) * Math.PI) / 180, 0]} castShadow>
              <boxGeometry args={[w, 10, d]} />
              <meshStandardMaterial color={SYSTEMS[f.system].color} roughness={1} transparent={dimmed} opacity={dimmed ? 0.3 : 1} />
            </mesh>
          )
        })}

      {/* Utility runs (in the floor gap) + risers */}
      {(level.runs || [])
        .filter((r) => !hidden.includes(r.system))
        .map((r) => {
          const pts = effectiveRunPoints(r, level.fixtures || []).map((p) => [p.x, runY, p.y])
          const last = pts[pts.length - 1]
          const targetY = r.risesToLevelId ? elevationOf(r.risesToLevelId) - 6 : null
          return (
            <group key={r.id}>
              {pts.length >= 2 && <Line points={pts} color={SYSTEMS[r.system].color} lineWidth={2} transparent opacity={dimmed ? 0.3 : 1} />}
              {targetY != null && last && (
                <Line points={[last, [last[0], targetY, last[2]]]} color={SYSTEMS[r.system].color} lineWidth={2} dashed dashSize={8} gapSize={6} transparent opacity={dimmed ? 0.3 : 1} />
              )}
            </group>
          )
        })}
    </group>
  )
}

// A wall, split into solid boxes around any openings on it (no CSG).
function WallWithOpenings({ w, floorY, height, openingSegs, opacity, transparent, onWallDown }) {
  const t = w.thicknessIn
  const color = w.isExterior ? MAT.wallExt : MAT.wallInt
  const horizontal = Math.abs(w.y1 - w.y2) < 0.5
  const vertical = Math.abs(w.x1 - w.x2) < 0.5

  // Diagonal fallback: single solid box (rectilinear rooms never hit this).
  if (!horizontal && !vertical) {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1)
    return (
      <mesh position={[(w.x1 + w.x2) / 2, floorY + height / 2, (w.y1 + w.y2) / 2]} rotation={[0, -Math.atan2(w.y2 - w.y1, w.x2 - w.x1), 0]} castShadow receiveShadow onPointerDown={onWallDown}>
        <boxGeometry args={[len, height, t]} />
        <meshStandardMaterial color={color} roughness={1} metalness={0} transparent={transparent} opacity={opacity} />
      </mesh>
    )
  }

  const line = horizontal ? w.y1 : w.x1
  const ws = horizontal ? Math.min(w.x1, w.x2) : Math.min(w.y1, w.y2)
  const we = horizontal ? Math.max(w.x1, w.x2) : Math.max(w.y1, w.y2)
  const len = we - ws
  const ori = horizontal ? 'H' : 'V'

  const matched = openingSegs
    .filter((os) => os.orientation === ori && Math.abs(os.line - line) < 1 && os.b > ws && os.a < we)
    .map((os) => ({
      a: Math.max(0, os.a - ws),
      b: Math.min(len, os.b - ws),
      sill: os.sillHeightIn,
      head: Math.min(height, os.sillHeightIn + os.heightIn),
    }))

  const pieces = wallSpans(len, matched, height)

  return (
    <group>
      {pieces.map((p, i) => {
        const pLen = p.b - p.a
        const pH = p.y1 - p.y0
        if (pLen <= 0 || pH <= 0) return null
        const along = ws + (p.a + p.b) / 2
        const cy = floorY + (p.y0 + p.y1) / 2
        const position = horizontal ? [along, cy, line] : [line, cy, along]
        const args = horizontal ? [pLen, pH, t] : [t, pH, pLen]
        return (
          <mesh key={i} position={position} castShadow receiveShadow onPointerDown={onWallDown}>
            <boxGeometry args={args} />
            <meshStandardMaterial color={color} roughness={1} metalness={0} transparent={transparent} opacity={opacity} />
          </mesh>
        )
      })}
    </group>
  )
}

function RoofMesh({ style, bbox, pitch, eaveY }) {
  const geom = useMemo(() => roofGeometry(style, bbox, pitch, eaveY), [style, bbox.x, bbox.y, bbox.w, bbox.d, pitch, eaveY])
  if (!geom) return null
  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <meshStandardMaterial color="#C9B7A0" roughness={1} side={THREE.DoubleSide} />
    </mesh>
  )
}

function FloorSlab({ bbox, y, color, opacity, transparent, thickness, below }) {
  const w = bbox.maxX - bbox.minX
  const d = bbox.maxY - bbox.minY
  const cx = (bbox.minX + bbox.maxX) / 2
  const cz = (bbox.minY + bbox.maxY) / 2
  const cy = below ? y - thickness / 2 : y + thickness / 2
  return (
    <mesh position={[cx, cy, cz]} receiveShadow>
      <boxGeometry args={[w, thickness, d]} />
      <meshStandardMaterial color={color} roughness={1} metalness={0} transparent={transparent} opacity={opacity} />
    </mesh>
  )
}

// Garden systems: aquaponics = tank box + raised bed + faint water plane;
// drying/curing = a simple translucent frame.
function GardenSystem3D({ sy }) {
  const rot = [0, (-(sy.rotation || 0) * Math.PI) / 180, 0]
  if (sy.kind === 'aquaponics') {
    const tankH = 24
    const bedH = 12
    return (
      <group position={[sy.x, 0, sy.y]} rotation={rot}>
        <mesh position={[0, tankH / 2, sy.d / 4]} castShadow receiveShadow>
          <boxGeometry args={[sy.w, tankH, sy.d / 2]} />
          <meshStandardMaterial color="#5B8494" roughness={1} />
        </mesh>
        <mesh position={[0, tankH - 1, sy.d / 4]}>
          <boxGeometry args={[sy.w - 4, 1, sy.d / 2 - 4]} />
          <meshStandardMaterial color="#8FB6C4" roughness={0.4} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0, tankH + bedH / 2, -sy.d / 4]} castShadow receiveShadow>
          <boxGeometry args={[sy.w, bedH, sy.d / 2]} />
          <meshStandardMaterial color="#8A6F52" roughness={1} />
        </mesh>
      </group>
    )
  }
  const h = Math.max(48, sy.rotation != null ? 72 : 72)
  const color = sy.kind === 'curing' ? '#8A7B9F' : '#B08A5E'
  return (
    <mesh position={[sy.x, h / 2, sy.y]} rotation={rot} castShadow>
      <boxGeometry args={[sy.w, h, sy.d]} />
      <meshStandardMaterial color={color} roughness={1} transparent opacity={0.4} />
    </mesh>
  )
}

// Simple massing for a landscape object at grade (flat terrain).
function LandscapeObject3D({ o }) {
  const st = LANDSCAPE_STYLE[o.kind] || { fill: '#D8D3C8', prim: 'box' }
  const rot = [0, (-(o.rotation || 0) * Math.PI) / 180, 0]
  const mat = <meshStandardMaterial color={st.fill} roughness={1} metalness={0} />

  if (st.prim === 'tree') {
    const canopy = Math.min(o.w, o.d) / 2
    const trunkH = Math.max(24, o.heightIn * 0.35)
    return (
      <group position={[o.x, 0, o.y]}>
        <mesh position={[0, trunkH / 2, 0]} castShadow>
          <cylinderGeometry args={[Math.max(3, o.w * 0.04), Math.max(4, o.w * 0.05), trunkH, 8]} />
          <meshStandardMaterial color="#8a6f52" roughness={1} />
        </mesh>
        <mesh position={[0, trunkH + canopy * 0.7, 0]} castShadow>
          <sphereGeometry args={[canopy, 16, 12]} />
          {mat}
        </mesh>
      </group>
    )
  }
  if (st.prim === 'shrub') {
    const r = Math.min(o.w, o.d) / 2
    return (
      <mesh position={[o.x, r * 0.8, o.y]} castShadow>
        <sphereGeometry args={[r, 12, 10]} />
        {mat}
      </mesh>
    )
  }
  if (st.prim === 'cylinder') {
    return (
      <mesh position={[o.x, o.heightIn / 2, o.y]} rotation={rot} castShadow>
        <cylinderGeometry args={[o.w / 2, o.w / 2, Math.max(6, o.heightIn), 16]} />
        {mat}
      </mesh>
    )
  }
  if (st.prim === 'flat' || st.prim === 'water') {
    const y = st.prim === 'water' ? -1 : 1
    return (
      <mesh position={[o.x, y, o.y]} rotation={rot} receiveShadow>
        <boxGeometry args={[o.w, 2, o.d]} />
        {mat}
      </mesh>
    )
  }
  // box / bed (structures, beds, decks, fences)
  const h = Math.max(6, o.heightIn)
  return (
    <mesh position={[o.x, h / 2, o.y]} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={[o.w, h, o.d]} />
      {mat}
    </mesh>
  )
}

function DimLabel({ w, y }) {
  const cx = (w.x1 + w.x2) / 2
  const cz = (w.y1 + w.y2) / 2
  const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1)
  return (
    <Html position={[cx, y + 6, cz]} center distanceFactor={900} occlude={false} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
          color: '#17181A',
          background: 'rgba(252,252,251,0.85)',
          padding: '1px 5px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
        }}
      >
        {formatFeetInches(Math.round(len))}
      </div>
    </Html>
  )
}
