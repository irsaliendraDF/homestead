import { Layers, Ruler, SquareDashedBottom, Triangle } from 'lucide-react'
import { useEditor } from '../store/useEditor.js'

// Bottom-left cluster for the 3D view: show all levels vs the active one,
// dimension labels, and ceiling planes.
export default function Controls3D() {
  const showAll = useEditor((s) => s.show3dAllLevels)
  const showDims = useEditor((s) => s.showDims3d)
  const showCeilings = useEditor((s) => s.showCeilings3d)
  const showRoof = useEditor((s) => s.showRoof3d)

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg border border-line bg-panel/95 p-1 shadow-sm backdrop-blur">
      <Toggle label={showAll ? 'Showing all levels' : 'Showing active level'} active={showAll} onClick={() => useEditor.getState().toggle3dAllLevels()}>
        <Layers size={15} strokeWidth={1.75} />
      </Toggle>
      <Toggle label={showDims ? 'Hide dimensions' : 'Show dimensions'} active={showDims} onClick={() => useEditor.getState().toggleDims3d()}>
        <Ruler size={15} strokeWidth={1.75} />
      </Toggle>
      <Toggle label={showCeilings ? 'Hide ceilings' : 'Show ceilings'} active={showCeilings} onClick={() => useEditor.getState().toggleCeilings3d()}>
        <SquareDashedBottom size={15} strokeWidth={1.75} />
      </Toggle>
      <Toggle label={showRoof ? 'Hide roof' : 'Show roof'} active={showRoof} onClick={() => useEditor.getState().toggleRoof3d()}>
        <Triangle size={15} strokeWidth={1.75} />
      </Toggle>
    </div>
  )
}

function Toggle({ label, active, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded p-1.5 transition-colors hover:bg-accentSoft ${active ? 'text-accent' : 'text-muted hover:text-ink'}`}
    >
      {children}
    </button>
  )
}
