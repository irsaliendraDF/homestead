# Homestead — Phase 2 kickoff (the gate)

Paste this when Phase 1 has passed and you're ready to start Phase 2. It locks every decision so you don't have to ask, and it **supersedes** the Phase 2 acceptance numbers in the main build doc (those were wrong — corrected below).

Build **Phase 2 only**. Stop at the acceptance tests and show me the actual numbers before you write a single line of 3D.

---

## The one model decision everything rests on: CENTERLINE

- A Room's stored `x, y, w, d` define its wall **centerline** rectangle, in integer inches.
- Walls **straddle** the centerline: each wall box is centered on its edge line, half its thickness to each side.
- Exterior walls = `DEFAULTS.WALL_THICKNESS_IN` (6"). Shared/interior walls = `DEFAULTS.INTERIOR_WALL_IN` (4").
- **Corners just overlap.** Wall boxes overlap at junctions — no mitering, no joinery, no cleanup. It reads correctly and stays simple.
- **Displayed area = interior clear area**, not centerline area:
  `interior = (w − insetLeft − insetRight) × (d − insetTop − insetBottom)`,
  each inset = half the thickness of the wall on that side (3" exterior, 2" shared).
  Report the interior number and label it "interior" — that's the honest builder figure.

Why centerline: when two rooms snap so their centerlines coincide, that shared line resolves to exactly **one** wall. Any other model produces double walls or gaps at the boundary. This is the whole reason the gate passes.

---

## Snapping — screen-space and prioritized

- Snap threshold = **10px in screen space**, converted to world inches at the current zoom. Never a fixed world distance — it must feel identical at every zoom level.
- An edge snaps to, in priority order: **(1)** a parallel edge of another room (collinear alignment), **(2)** the plot boundary, **(3)** the grid. Nearest candidate wins within a category; ties break by this priority.
- X and Y snap independently; a corner snaps when both axes find a target.
- While dragging, draw snap guides as hairlines in `COLOR.accent`.
- Preview snaps live; **commit rounds to integer inches** on drag end.

---

## Adjacency vs overlap — the distinction that must be exact

- Centerline edges that are **collinear with coincident span** = **adjacent** → they produce a shared wall. This is correct, not an error.
- Room **interiors intersecting with positive area** = **overlap** → error state: outline both rooms in `COLOR.alert`, plain-language note in the inspector ("These rooms overlap — drag one apart"). Don't prevent it; just flag it.
- Zero-area edge contact is adjacency, never overlap.

---

## `resolveWalls(rooms)` — the algorithm (this IS the gate)

In `src/lib/geometry.js`. Pure, deterministic, memoized on the rooms array.

1. For each room, emit 4 centerline edges: `{ orientation: 'H'|'V', line, span:[a,b], normal, roomId, thickness: exterior }`.
2. Bucket edges by `(orientation, line)` — only edges on the same line can interact.
3. For each edge, find **opposing** edges (opposite outward normal) on the same line whose span overlaps.
4. Split points = the edge's own endpoints + every start/end of an overlapping opposing edge, clamped into the edge's span; sort and dedupe.
5. For each consecutive sub-interval:
   - **Covered** by an opposing edge → **SHARED**: `thickness = interior`, `isExterior = false`, `roomIds = sorted[this, other]`. Emit **once** — dedupe the mirrored pair with a canonical key `orientation|line|a|b`.
   - **Not covered** → **EXTERIOR**: `thickness = exterior`, `isExterior = true`, `roomIds = [this]`.
6. **Do NOT post-merge** collinear segments. Predictable counts now; openings attach per-segment in Phase 4.
7. Output: `[{ id, x1, y1, x2, y2, thicknessIn, isExterior, roomIds:[] }]`, `roomIds` sorted.

This one routine handles aligned walls, partial offsets, and T-junctions (a wall that's part-shared, part-exterior) with **no special cases**. If you're reaching for a special case, the interval logic is wrong.

---

## Acceptance tests — CORRECTED, with derivations

> The main doc said "9 segments, not 12" for two aligned rooms. That was wrong. Aligned identical rooms give **7**. The **9** is the *offset* case. Use these.

**Test 1 — aligned pair → exactly 7 segments**
- Room A: `x0 y0 w144 d144`. Room B: `x144 y0 w144 d144` (snapped flush; shared line x=144).
- On line x=144: A's right edge (y0–144) fully overlaps B's left edge (y0–144) → **1 shared** segment.
- Every other edge has no opposing overlap → exterior: A-top, A-bottom, A-left, B-top, B-bottom, B-right = **6 exterior**.
- Total = **7**. Shared segment must be: line x=144, span y0–144, thickness 4", `isExterior:false`, `roomIds:[A,B]`. Log it and confirm.

**Test 2 — offset pair → exactly 9 segments** (proves the split)
- Room A: `x0 y0 w144 d144`. Room B: `x144 y72 w144 d144`.
- On line x=144: A-right (y0–144) vs B-left (y72–216) overlap only y72–144.
- That line resolves to **3** segments: exterior A `[0,72]`, shared `[72,144]`, exterior B `[144,216]`.
- Plus 6 other exterior edges (A-top, A-bottom, A-left, B-top, B-bottom, B-right).
- Total = **9**. Confirm the shared segment is exactly y72–144, thickness 4", roomIds `[A,B]`.

**Test 3 — closed exterior polygon**
- Take only `isExterior` segments from Test 1 and walk them endpoint-to-endpoint. They must form **one closed loop** back to the start (the 288×144 outer rectangle; top and bottom each split at x=144). The shared segment is **excluded** from the loop. Verify closure programmatically.

**Test 4 — integer inches**
- After any drag+snap, log a room's stored `x, y, w, d`. All integers, every time. No floats anywhere in stored geometry.

**Test 5 — clamp + undo**
- Resizing below `UNITS.MIN_ROOM_IN` (36") clamps; the room never inverts.
- Undo restores exact prior geometry, including after a snap.

---

## Also in this phase (restated from the doc)

- Add a room: pick the tool → drag a rectangle, or click to drop a default **144×144**.
- Select / move / resize via **4 corner + 4 edge-midpoint** handles; body-drag to move.
- **Single selection only** for the gate.
- Inspector: name (auto "Room N", editable), type dropdown from `ROOM_TYPES` (default unset, shown as "Set type"), exact **W** and **D** inputs (accept feet-inches *and* metric per `UNITS.ACCEPT_METRIC_INPUT`), computed **interior** sqft.
- Live dimension strings while dragging: overall footprint on the measurement rail, plus the dragged room's W×D and its offset to the nearest walls.

---

## Scope guards — do NOT

- No L-shaped, angled, or curved rooms. **Rectangles only** — L-shapes come from snapping rectangles together.
- No 3D, no openings, no utilities, no landscape.
- No post-merge of collinear segments.
- No multi-select, no room copy/paste.
- No furniture, ever.

---

## Working agreement for this phase

1. **Before writing `resolveWalls`**, paste back your one-paragraph understanding of the centerline model + the interval algorithm so I can confirm we're aligned.
2. Build Phase 2 only.
3. Run Tests 1–5, **print the actual outputs**, and **STOP**. Show me the numbers. Do not start Phase 3.
4. Commit on a `phase-2` branch: `feat(phase-2): rooms, snapping, wall resolution`. Do not merge to `main` until I've seen the test output pass.
5. If any locked decision here turns out to be technically wrong, say so plainly and explain why — don't quietly work around it.
