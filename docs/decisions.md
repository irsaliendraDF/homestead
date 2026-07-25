# Decisions log

Any decision that deviates from the locked decisions in §0 of `homestead_prompt_doc.md`,
recorded here with reasoning. The §0 table is settled and not re-litigated; this file is
only for genuine, justified deviations and for resolving flagged unknowns.

## 2026-07-25 — Setup

- **Environment: Windows, not macOS.** The build doc's setup commands assume macOS
  (`~/Desktop`, `brew`, Terminal). Adapted to Windows 11 / PowerShell. Project root is
  `C:\Users\irsal\Desktop\homestead`. No functional deviation — same repo, same structure.
- No deviations from §0 locked decisions.

## 2026-07-25 — Deploy wiring

- **Vercel project pre-existed** (created by Irene): `homestead` under team
  `irsaliendradf-projects`, Git-connected to the GitHub `main` branch. Production URL:
  https://homestead-rho-lac.vercel.app/ . No `vercel link` / CLI login was needed on my
  side — the GitHub → Vercel integration drives deploys.
- Framework preset shows `null` in project settings, but Vercel **auto-detects Vite** from
  `package.json` on each build (confirmed in build logs: `vite build` → `dist/`). Working as
  the doc intends; no manual preset needed. If a future build ever fails to detect, set
  preset = Vite / output = dist in the dashboard.
- **Repo is PUBLIC**, not private as the doc's `gh repo create --private` suggested (it's
  Irene's existing repo). Not a blocker: no secrets are committed and `.env*` is gitignored.
  IMPORTANT for Phase 6.3 — the Anthropic key must live ONLY in Vercel env vars, never
  committed, which matters more given the repo is public. Flagged, not changed.
- Fonts: confirmed staying on Google Fonts per Irene (2026-07-25). No @fontsource dep.

## 2026-07-25 — DEVIATION from §0: free-form room shapes (Irene's explicit ask)

§0 locked "Drawing model: place rectangles, snap them together" and Phase 2 guarded
"rectangles only." **Irene asked to move a single corner freely and keep the rest of the
walls in place** ("if a corner is overlapping I just want to move that one corner"). That is
only possible if rooms are editable polygons, not rigid rectangles — so we're deviating,
at her direction.

- **Room model:** `Room.points = [{x,y}, …]` (integer inches, ordered). A new room is still
  drawn as a rectangle (4 points). Corners = draggable vertices; edges have midpoint handles
  to move a whole wall; body-drag still moves the whole room.
- **Consequence:** L-shapes and angled walls are now possible. Strong snapping (vertex → other
  vertices/edges, plot, grid) keeps right angles easy. Hold-to-constrain can be added later.
- **Wall resolution:** `resolveWalls` generalized to polygon edges. Axis-aligned edges keep the
  exact centerline interval algorithm (the 7/9 gate still holds for rectangles). Non-axis
  (diagonal) edges render as exterior walls and don't participate in shared-wall dedup yet —
  a known limitation, fine for now since diagonal *shared* walls are rare.
- **Area:** shown as centerline polygon area (shoelace), labeled "floor area (approx)". The
  precise per-side wall inset from the kickoff doc applies cleanly to rectangles only; for
  arbitrary polygons it's an approximation. Flagged, not hidden.
- Backward-compatible: old rooms stored as x/y/w/d are migrated to points on load.

### Correction (same day): RECTILINEAR only, no diagonals

Irene clarified: dragging a corner should carve a proper L (add two joints, keep right
angles), never bend a wall diagonally. And she wants no diagonal walls at all. So:
- **Corner drag = L-notch carve** (`carveCorner`): the dragged vertex is replaced by two
  joints + the inner corner, keeping every wall horizontal/vertical. `cleanPolygon` collapses
  joints that end up collinear (e.g. a drag straight along a wall). `isRectilinear` guards it.
- **Wall (edge) drag = perpendicular slide** — a whole wall moves square, never skews.
- Diagonal-wall support in `resolveWalls` is now effectively dead code (kept, harmless).
- **Freestanding Wall tool added** (Irene's ask): draw an H/V wall segment (`level.walls`),
  move it, drag an endpoint to trim, delete. Thickness = interior (4"). Shared walls between
  rooms are fine and already handled by the centerline model.
