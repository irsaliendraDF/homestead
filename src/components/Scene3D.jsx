import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Html } from '@react-three/drei'
import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { resolveWalls, roomBounds } from '../lib/geometry.js'
import { openingWorldSegment, wallSpans } from '../lib/openings.js'
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

  const { plot, levels, view } = project
  const cx = plot.widthIn / 2
  const cz = plot.depthIn / 2
  const maxDim = Math.max(plot.widthIn, plot.depthIn)

  const visible = showAll ? levels : levels.filter((l) => l.id === view.activeLevelId)
  const activeId = view.activeLevelId

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
        {visible.map((level) => (
          <LevelMeshes
            key={level.id}
            level={level}
            dimmed={showAll && level.id !== activeId}
            showCeiling={showCeilings}
            showDims={showDims && level.id === activeId}
          />
        ))}
      </group>

      <OrbitControls makeDefault enableDamping dampingFactor={0.12} target={[0, 0, 0]} />
    </Canvas>
  )
}

function LevelMeshes({ level, dimmed, showCeiling, showDims }) {
  const height = level.ceilingHeightIn
  const floorY = level.floorElevationIn

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
        <WallWithOpenings key={w.id} w={w} floorY={floorY} height={height} openingSegs={openingSegs} opacity={opacity} transparent={transparent} />
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
    </group>
  )
}

// A wall, split into solid boxes around any openings on it (no CSG).
function WallWithOpenings({ w, floorY, height, openingSegs, opacity, transparent }) {
  const t = w.thicknessIn
  const color = w.isExterior ? MAT.wallExt : MAT.wallInt
  const horizontal = Math.abs(w.y1 - w.y2) < 0.5
  const vertical = Math.abs(w.x1 - w.x2) < 0.5

  // Diagonal fallback: single solid box (rectilinear rooms never hit this).
  if (!horizontal && !vertical) {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1)
    return (
      <mesh position={[(w.x1 + w.x2) / 2, floorY + height / 2, (w.y1 + w.y2) / 2]} rotation={[0, -Math.atan2(w.y2 - w.y1, w.x2 - w.x1), 0]} castShadow receiveShadow>
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
          <mesh key={i} position={position} castShadow receiveShadow>
            <boxGeometry args={args} />
            <meshStandardMaterial color={color} roughness={1} metalness={0} transparent={transparent} opacity={opacity} />
          </mesh>
        )
      })}
    </group>
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
