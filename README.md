# Homestead

A browser-based home and land design tool. Draw rooms in 2D, see them in 3D with real
measurements, route the utilities, plan the garden (companion planting, aquaponics,
curing/drying), place sheds and paths, walk through it, then export a dimensioned plan.

Built for a **Nova Scotia, Canada** site — regional defaults (frost depth, snow load,
hardiness zone, propane-not-piped-gas, short growing season) are baked in as *planning
references*, not code compliance.

## Status

**Current phase:** setup complete, awaiting go-ahead for Phase 0.

Build is phased (see `homestead_prompt_doc.md`). One phase at a time; Phase 2 (rooms /
wall resolution) is a hard gate everything downstream depends on.

## Stack

Vite + React 18, Tailwind CSS **v3** (pinned), zustand + zundo (undo/redo),
@react-three/fiber + drei + three (3D), jspdf (vector PDF export), idb-keyval
(IndexedDB persistence), lucide-react.

Storage is browser-local only. The single network call in the whole app is the optional,
opt-in garden assist (Claude API), proxied through one Vercel serverless function so the
API key never reaches the client.

## Run

```
npm install
npm run dev
```

(Scaffold lands in Phase 0.)

## Deploy

Pushes to `main` auto-build on Vercel. Phase work happens on `phase-N` branches (preview
URLs); merge to `main` only when a phase's acceptance criteria pass. Production target:
`home.shipit.fun`.

## Repo layout

```
homestead/
├── homestead_prompt_doc.md   the full build plan
├── docs/
│   ├── decisions.md          deviations from the locked decisions, with reasoning
│   └── phase-log.md          one entry per phase: passed / failed / deferred
├── reference/                sketches, inspiration
└── src/
```
