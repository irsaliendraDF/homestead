# Phase log

One entry per phase: acceptance criteria passed, criteria failed, anything deferred.
Appended before each phase commit.

## Setup — 2026-07-25

- Repo initialized, folder structure created, `.gitignore` / `README.md` / docs in place.
- Build doc saved to repo as `homestead_prompt_doc.md`.
- Blocked on GitHub push: `gh` CLI not yet authenticated (interactive login required from
  the user). Local commit made; remote create + push pending auth.
- Vercel CLI not yet installed — deferred to the post-Phase-0 wiring step per the doc.

## Phase 0 — Scaffold and the number layer — 2026-07-25 — branch `phase-0`

**All acceptance criteria PASS** (verified via `npm run verify`, output captured below):

- `formatFeetInches`: 150 → `12' 6"`, 144 → `12'`, 6 → `6"`, 0 → `0"` — all pass.
- `parseFeetInches` round-trips all four documented formats (`12'6"`, `12.5'`, `150"`,
  `12 ft 6 in`) to 150, plus metric entry (`30m` → 1181, `9.1m` → 358) and bare numbers.
- Undo/redo against a store action (setName): two edits → undo → undo → redo all restore
  the expected value. zundo temporal, 50-step limit, tracks `project` only via partialize.

**Delivered**
- Vite 5 + React 18 + Tailwind **v3.4.19** (pinned, purge confirmed: 7.6 kB CSS).
- `src/config.js` and `src/tokens.js` exactly per spec; tokens mirrored into
  `tailwind.config.js`.
- `src/lib/units.js` (format/parse + convenience converters), `src/lib/coords.js`
  (single plan↔three conversion, both directions).
- `src/store/useProject.js` — zustand + zundo, default project skeleton per §2 data model,
  actions are the only mutation path.
- App shell: title bar (project name in Instrument Serif italic + working undo/redo),
  empty left tool rail, empty right inspector, empty center canvas with an empty-state line.
  Google Fonts loaded (DM Sans / JetBrains Mono / Instrument Serif).
- Global Ctrl+Z / Ctrl+Shift+Z (and Ctrl+Y) wired to temporal undo/redo.
- Production build passes clean (1594 modules, no errors/warnings).

**Notes / deferred**
- Fonts load from Google Fonts (no npm dep added). If we want the app fully offline —
  consistent with the "no data leaves the device" ethos — we'd self-host via @fontsource,
  which is a dependency addition to raise with Irene. Not blocking; flagged for later.
- 2 npm-audit findings (esbuild/Vite dev-server advisory, dev-only). The only fix
  force-upgrades to Vite 8 (breaking); declined for a local tool. Not shipped to prod.
- three / r3f / drei / jspdf / idb-keyval intentionally NOT installed yet — added in the
  phases that first use them, to keep the tree lean.
- **Scope guard honored:** no rooms, no 3D, no drawing. Plumbing only.

**Not started:** Phase 1 (awaiting go-ahead).
