/** @type {import('tailwindcss').Config} */
// Palette + fonts mirror src/tokens.js. Keep the two in sync by hand — tokens.js
// is the JS source of truth, this file is the Tailwind-utility mirror.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FCFCFB',
        panel: '#FFFFFF',
        line: '#E5E4E0',
        lineStrong: '#C4C2BC',
        ink: '#17181A',
        muted: '#7C7F84',
        accent: '#3D5A6C',
        accentSoft: '#3D5A6C14',
        alert: '#A2543F',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
