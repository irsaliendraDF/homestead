import { useEffect, useRef, useState } from 'react'
import { formatFeetInches, parseFeetInches } from '../lib/units.js'

// A mono text field that shows a length as feet-inches and accepts feet-inches
// OR metric on entry (e.g. 12' 6", 150", 30m). Commits integer inches on
// blur/Enter; reverts on invalid or below `min`. Defined at module scope so it
// never remounts and steals focus mid-typing.
export default function DimensionInput({ label, valueIn, onCommit, min = 0, hint }) {
  const [text, setText] = useState(() => formatFeetInches(valueIn))
  const [focused, setFocused] = useState(false)
  const focusedRef = useRef(false)

  // Keep the field in sync with the store when the value changes elsewhere,
  // but never clobber what the user is actively typing.
  useEffect(() => {
    if (!focusedRef.current) setText(formatFeetInches(valueIn))
  }, [valueIn])

  const commit = () => {
    const parsed = parseFeetInches(text)
    if (!Number.isNaN(parsed) && parsed >= min) {
      onCommit(parsed)
      setText(formatFeetInches(parsed))
    } else {
      setText(formatFeetInches(valueIn)) // revert
    }
  }

  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-xs text-muted">{label}</span>}
      <input
        type="text"
        inputMode="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => {
          focusedRef.current = true
          setFocused(true)
          e.target.select()
        }}
        onBlur={() => {
          focusedRef.current = false
          setFocused(false)
          commit()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setText(formatFeetInches(valueIn))
            e.currentTarget.blur()
          }
        }}
        className={`num w-full rounded border bg-canvas px-2 py-1 text-sm text-ink ${
          focused ? 'border-accent' : 'border-line'
        }`}
      />
      {hint && <span className="text-[11px] leading-tight text-muted">{hint}</span>}
    </label>
  )
}
