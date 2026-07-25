// Design tokens. Clean Scandinavian: precision over decoration.
// Mirrored into tailwind.config.js theme.extend — keep the two in sync.
export const COLOR = {
  canvas: '#FCFCFB', // app background
  panel: '#FFFFFF', // sidebars, cards
  line: '#E5E4E0', // hairlines, grid
  lineStrong: '#C4C2BC', // borders, wall outlines
  ink: '#17181A', // primary text, walls in plan
  muted: '#7C7F84', // secondary text, labels
  accent: '#3D5A6C', // slate blue — selection, active tool, focus ring
  accentSoft: '#3D5A6C14',
  alert: '#A2543F', // errors, overlap warnings
}

// Type roles. UI/body = DM Sans; every measurement = JetBrains Mono;
// display (project name, empty states only) = Instrument Serif italic.
export const FONT = {
  sans: '"DM Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  display: '"Instrument Serif", Georgia, serif',
}
