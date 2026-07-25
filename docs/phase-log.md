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

**Deploy:** merged `phase-0` → `main`, pushed. Vercel auto-built (Vite detected, `dist/`
output, same hashed bundles as local) and is **live at https://homestead-rho-lac.vercel.app/**
(JS bundle serves 200). Auto-deploy pipeline proven end to end. Repo is public (see decisions).

## Phase 1 — Plot, levels, canvas, persistence — 2026-07-25 — branch `phase-1`

**Headless acceptance PASS** (`npm run verify`): viewport fit centers+clamps; cursor-anchored
zoom holds the world point under the cursor (zoom in, out, and at the clamp); level
add/switch/remove preserve every level's rooms; elevation stacking correct (Main 0, basement
−108, upper +120). Production build clean (1607 modules).

**Three acceptance criteria are browser-interactive** — logic is verified headless, but the
real proof is clicking through the running app. To confirm on the preview/localhost:
- Refresh mid-edit → everything returns, including active level and zoom (IndexedDB autosave
  + hydration).
- Switching levels never loses other levels' data.
- Zoom stays anchored to the cursor.

**Delivered**
- Plot dimension inputs (feet-inches OR metric via `DimensionInput`), plot boundary + fill.
- SVG canvas: space/middle-drag pan, non-passive wheel zoom (10–400%) anchored to cursor,
  zoom-to-fit. Single coord transform from `lib/viewport.js`.
- Grid at 1' (fades out when zoomed away) with heavier 5' lines; own render pass, real opacity.
- Level tabs (Basement / Main / Upper), add/remove, per-level ceiling height; basement carries
  a footing-depth field defaulting to 48" (NS frost line) with a "confirm locally / NBC 9.12"
  hint. Floor elevations recomputed on every level/ceiling change.
- Ghost-below layer plumbing + toggle (renders nothing yet — no rooms until Phase 2).
- Measurement rail showing plot W (top) and D (left) in mono, tracking the viewport.
- IndexedDB autosave (debounced 800ms) via idb-keyval; multi-project index; New + Duplicate +
  switch + delete; session hydrates the last active project on load.
- Undo/redo unchanged; camera state deliberately kept OUT of the undo history.

**Notes**
- Added dependency `idb-keyval@^6` (from the §1 stack — allowed, not a new choice).
- Scope guard honored: NO rooms yet (Phase 2 gate).

**Not merged to `main`** — pending Irene's browser confirmation of the three interactive
criteria on the phase-1 preview.
