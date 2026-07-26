import { useProject } from '../store/useProject.js'
import { useEditor } from '../store/useEditor.js'

// A quiet, directional empty state — never "no data".
export default function EmptyHint() {
  const level = useProject((s) => s.project.levels.find((l) => l.id === s.project.view.activeLevelId))
  const landscape = useProject((s) => s.project.landscape)
  const mode = useEditor((s) => s.canvasMode)

  const building = mode !== 'landscape'
  const emptyBuilding = building && (level?.rooms || []).length === 0
  const emptySite = !building && (landscape.objects.length + landscape.zones.length + landscape.plants.length) === 0
  if (!emptyBuilding && !emptySite) return null

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center">
      <p className="max-w-sm font-display text-xl italic leading-relaxed text-muted">
        {emptyBuilding ? (
          <>
            Set your lot size, then place your first room.
            <span className="mt-2 block font-sans text-xs not-italic tracking-wide text-muted/70">
              Press <span className="num">R</span> and drag, or click to drop a 12′×12′ room. Press <span className="num">?</span> for all shortcuts.
            </span>
          </>
        ) : (
          <>
            The land around your home.
            <span className="mt-2 block font-sans text-xs not-italic tracking-wide text-muted/70">
              Pick a shed, tree, path, or garden bed from the palette and click to place it.
            </span>
          </>
        )}
      </p>
    </div>
  )
}
