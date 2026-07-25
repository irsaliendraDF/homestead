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

Phase 1 confirmed by Irene in-browser (all three interactive criteria pass); merged to `main`.

## Phase 2 — 🚧 GATE: rooms, snapping, wall resolution — 2026-07-25 — branch `phase-2`

Built to the corrected `docs/phase-2-kickoff.md` spec (CENTERLINE model, 7/9 counts).

**ALL 5 GATE TESTS PASS** (`npm run verify:p2`, actual outputs printed):
- Test 1 aligned pair → **7** segments, 1 shared (x=144, y0–144, t=4", [A,B]). ✓
- Test 2 offset pair → **9** segments, shared line splits ext[0,72]/shared[72,144]/ext[144,216]. ✓
- Test 3 → 6 exterior segments form ONE closed loop (walked programmatically). ✓
- Test 4 → stored geometry always integer inches (10.4→10, 143.7→144). ✓
- Test 5 → resize clamps at 36" (no inversion); undo restores exact prior w/d. ✓
- Bonus: flush rooms = adjacency (not overlap); interpenetrating = overlap. ✓

**Delivered**
- `src/lib/geometry.js`: `resolveWalls` (interval-split, dedup, no post-merge), `roomsOverlap`,
  `overlappingRoomIds`, `roomInteriorSqft` (per-side inset: 3" exterior / 2" shared).
- `src/lib/snapping.js`: screen-space (10px→world) prioritized snap — room edge > plot > grid,
  X/Y independent.
- Room tool: drag a rectangle or click to drop a default 12'×12'. Select tool: click to select,
  body-drag to move, 8 handles (4 corner + 4 edge) to resize. Single selection.
- Live snap guides (accent hairlines); commit rounds to integer inches.
- Walls rendered as poché from `resolveWalls`; overlap outlines in alert with inspector note.
- Inspector Room section: name, type dropdown (default "Set type"), W/D (feet-inches or metric),
  computed interior sqft, overlap warning, delete.
- Live dimension strings while dragging: room W×D + offsets to nearest wall/plot on each side.
- Ghost-below now renders the level-below rooms at 15%. Tool rail (Select/Room). Shortcuts:
  R room, V/Esc select+deselect, Del/Backspace delete.
- Walls recompute live off an effective-rooms set (preview applied) so drags feel connected;
  memoized on the geometry signature.

**Browser-interactive criteria for Irene to confirm** on the preview: two 12×12 rooms snapped
flush read as one shared wall (visually single); drag/resize snaps and feels right at every
zoom; overlap flags in red; undo after a snap restores geometry.

**Scope guard honored:** rectangles only; no 3D, openings, utilities, landscape; no post-merge;
no multi-select. **STOPPING before Phase 3** per the kickoff working agreement.

**Not merged to `main`** — pending Irene's review of the gate numbers + browser test.

### Phase 2 follow-up — free-form room shapes (Irene's ask, 2026-07-25)

Deviation from §0 rectangles-only, at Irene's request (see `docs/decisions.md`). Rooms are now
polygons (`points[]`); a drawn room starts as a rectangle, then **each corner drags freely**
(only that corner moves), and each wall has a midpoint handle to move the whole wall. Strong
snapping keeps right angles easy.

- `geometry.js` generalized to polygon edges; axis-aligned edges keep the exact interval
  algorithm so **the 7/9 gate still passes** (verified). Diagonal edges render exterior-only.
- New/updated: `roomPolygon/roomBounds/roomCentroid/roomAreaSqft/pointInPolygon`, polygon
  `roomsOverlap` (proper-intersection). Store: `points`-based `addRoom/updateRoom`, legacy
  `{x,y,w,d}` rooms migrated to points on load.
- Handles: corner (square) + wall-midpoint (circle). Walls render as rects (axis) or thick
  lines (diagonal). Live dimension chips label each wall length while editing. Inspector shows
  bounding box, floor area (approx, centerline), corner count.
- Gate re-run PASS incl. new Test 6: moving one corner leaves the other three untouched; undo
  restores exactly.

### Phase 2 follow-up 2 — rectilinear L-carving + Wall tool (Irene, 2026-07-25)

Corrected corner-drag to **carve L-notches** (no diagonals). Corner drag = `carveCorner`
(2 joints, right angles); wall drag = perpendicular slide; `cleanPolygon`/`isRectilinear`.
Added a **freestanding Wall tool** (draw H/V, move, trim endpoints, delete; `level.walls`).
Tests added: Test 7 (carve → rectilinear 6-corner L, no diagonals) and Test 8 (add wall).
All gate + new tests PASS; build clean. **Merged phase-2 → main per Irene ("push to main").**

### Phase 2 follow-up 3 — join rooms + overlap tolerance (Irene screenshot, 2026-07-25)

Irene's screenshot: two rooms placed as an L were both flagged red (overlap) with a doubled
divider — no way to join them. Fixes:
- **Join rooms**: inspector lists a selected room's shared-wall neighbors with "Remove wall
  (join)" / "Add wall back". Joining stores the pair in `level.mergedPairs`; `resolveWalls`
  drops that shared wall and overlap is suppressed for joined pairs → two flush rooms read as
  one L-shaped space. `sharedPairs()` finds adjacency.
- **Overlap tolerance** (`OVERLAP_TOLERANCE_IN = 1`): flush joins and sub-inch drag slop no
  longer flag red.
- Freestanding wall delete confirmed working (select + Delete / inspector).
- Tests 9 (join removes shared wall, 6 outer remain) + 10 (tolerance) PASS.
- Note: cleanest L via two rooms needs them placed FLUSH then joined; a single room can also
  be carved into an L by dragging a corner. Union of genuinely-overlapping rooms not done.

## Phase 3 — 3D extrusion — 2026-07-25 — branch `phase-3`

**Deps added** (all from §1): three@0.169, @react-three/fiber@8, @react-three/drei@9.

**Delivered**
- Plan / 3D toggle in the title bar (shortcut `3`). Only one canvas mounts at a time — the 3D
  Canvas lazy-loads (three.js split into its own 850 kB chunk) and fully unmounts on Plan, so
  OrbitControls never coexists with the SVG editor (gotcha #6/#7).
- `Scene3D`: walls extruded from `resolveWalls(rooms, merged)` + freestanding walls, per level
  at the level's ceiling height and floor elevation. Joined rooms drop their divider in 3D too.
- Floor slabs per level (thin boxes just under the floor plane); optional ceiling planes
  (toggle, off by default so you can see in). Level gaps = FLOOR_ASSEMBLY_IN → no z-fighting.
- OrbitControls with damping; content translated so plot centre sits at the origin. Soft
  lighting (ambient + one shadow-casting directional), matte off-white materials, drei Grid at
  grade + transparent shadow catcher. No HDRI, no textures.
- 3D controls (bottom-left): show all levels vs active, dimension labels (drei `<Html>`,
  exterior wall lengths), ceilings.
- Single coord convention via `coords` model (plan x,y → three x,z; elevation → y), 1 unit=1 in.

**Acceptance (headless build passes; visual to confirm on preview)**
- 2D edit → switch to 3D reflects it (Scene reads the live store).
- 3D exterior lengths come from the same `resolveWalls` as the 2D rail → match by construction.
- Three levels stack at correct elevations; floor/ceiling gap prevents z-fighting.

**Scope guard:** solid walls only — no doors/windows (Phase 4), no roof (Phase 7), no furniture.

**Not merged to `main`** — pending Irene's look at the 3D on the phase-3 preview.

Phase 3 confirmed by Irene ("looks great"); merged to `main`.

## Phase 4 — openings — 2026-07-25 — branch `phase-4`

**Delivered**
- Openings (door / window / archway / garage) hosted on a room edge OR a freestanding wall
  (`{ kind, roomId, edgeIndex | wallId, offsetIn, widthIn, heightIn, sillHeightIn, type }` in
  `level.openings`). Stored relative to the host so moving/reshaping carries them. Note: the
  §2 model's `wall:'n'|'e'|'s'|'w'` was generalized to `edgeIndex` for polygon rooms.
- Door + Window tools (keys D / W): click a wall to drop an opening; it snaps to the nearest
  hostable wall. Select + drag to slide it along the wall (clamped to the wall extent − 4").
- 2D: architectural symbols masking the wall poché — door swing arc + leaf (swings into the
  room via interior-normal test), window doubled line, archway dashed break, garage panel ticks.
- 3D: each wall is segmented into solid boxes AROUND its openings (`wallSpans`) — piers + sill
  box + header box, no CSG. Openings on a shared wall render once (they cut the single shared
  box). Correct sill/head heights.
- Inspector: type dropdown, width/height, sill (windows), delete. Del key removes openings.
  Deleting a room/wall removes its openings.
- `src/lib/openings.js` (pure) + `verify-phase4.mjs`: world segment, sill rules, clamp,
  segmentation counts (window → 2 piers + sill + header; door → no sill), host-move carries
  opening, click-to-host. All PASS.

**Acceptance:** window shows a hole in 3D with correct sill/head ✓ (segmentation test); drag
past wall end clamps ✓; moving parent room carries openings ✓. Build clean.

**Scope guard:** voids + simple reveals only — no glass materials, frames, or hardware.

**Not merged to `main`** — pending Irene's look at openings (2D symbols + 3D holes) on preview.
