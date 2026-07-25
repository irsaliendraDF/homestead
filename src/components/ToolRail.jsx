import { MousePointer2, SquarePlus, Minus, DoorOpen, AppWindow } from 'lucide-react'
import { useEditor } from '../store/useEditor.js'

// Left tool rail. Grows each phase.
const TOOLS = [
  { id: 'select', label: 'Select', hint: 'V or Esc', Icon: MousePointer2 },
  { id: 'room', label: 'Room', hint: 'R', Icon: SquarePlus },
  { id: 'wall', label: 'Wall', hint: 'drag H or V', Icon: Minus },
  { id: 'door', label: 'Door', hint: 'D · click a wall', Icon: DoorOpen },
  { id: 'window', label: 'Window', hint: 'W · click a wall', Icon: AppWindow },
]

export default function ToolRail() {
  const tool = useEditor((s) => s.tool)
  return (
    <nav aria-label="Tools" className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-2">
      {TOOLS.map(({ id, label, hint, Icon }) => {
        const active = tool === id
        return (
          <button
            key={id}
            type="button"
            aria-label={`${label} tool (${hint})`}
            aria-pressed={active}
            title={`${label} — ${hint}`}
            onClick={() => useEditor.getState().setTool(id)}
            className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
              active ? 'bg-accent text-white' : 'text-muted hover:bg-accentSoft hover:text-ink'
            }`}
          >
            <Icon size={18} strokeWidth={1.75} />
          </button>
        )
      })}
    </nav>
  )
}
