import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Html } from '@react-three/drei'
import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'
import { resolveWalls, roomBounds } from '../lib/geometry.js'
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
        <WallMesh key={w.id} w={w} floorY={floorY} height={height} opacity={opacity} transparent={transparent} />
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

function WallMesh({ w, floorY, height, opacity, transparent }) {
  const t = w.thicknessIn
  const cx = (w.x1 + w.x2) / 2
  const cz = (w.y1 + w.y2) / 2
  const cy = floorY + height / 2
  const horizontal = w.y1 === w.y2
  const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1)
  const color = w.isExterior ? MAT.wallExt : MAT.wallInt

  let args
  let rotation = [0, 0, 0]
  if (horizontal) {
    args = [len, height, t]
  } else if (w.x1 === w.x2) {
    args = [t, height, len]
  } else {
    // Diagonal fallback (shouldn't occur with rectilinear rooms).
    args = [len, height, t]
    rotation = [0, -Math.atan2(w.y2 - w.y1, w.x2 - w.x1), 0]
  }

  return (
    <mesh position={[cx, cy, cz]} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={1} metalness={0} transparent={transparent} opacity={opacity} />
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
