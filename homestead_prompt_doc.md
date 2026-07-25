# Homestead — Build Prompt Doc

A browser-based home and land design tool. Draw rooms in 2D, see them in 3D with real measurements, route the utilities, plan the garden — companion planting, aquaponics, curing and drying — place the sheds and paths, walk through it, then export a dimensioned plan.

Paste this whole document into Claude Code as the opening message. Build **one phase at a time**. Do not start a phase until the previous phase's acceptance criteria pass.

---

## Setup — do this first

### What I do before starting Claude Code

1. Make the project folder on my desktop:
   ```
   ~/Desktop/homestead
   ```
2. Save this document inside it as `homestead_prompt_doc.md`.
3. Confirm the GitHub CLI is installed and signed in:
   ```
   gh auth status
   ```
   If it isn't: `brew install gh` then `gh auth login`.
4. Open Terminal, then:
   ```
   cd ~/Desktop/homestead
   claude
   ```
5. Paste this whole document as the first message.

### What Claude Code does first, before any Phase 0 code

Set up the repository and the folder structure, then stop and confirm:

```bash
# in ~/Desktop/homestead
git init
gh repo create homestead --private --source=. --remote=origin
```

Create this structure:

```
homestead/
├── homestead_prompt_doc.md    ← this file, keep it in the repo
├── docs/
│   ├── decisions.md            ← log any decision that deviates from §0, with reasoning
│   └── phase-log.md            ← one entry per phase: what passed, what didn't, what's deferred
├── reference/                  ← my sketches, inspiration, anything I drop in
├── src/
└── README.md                   ← what this is, how to run it, current phase
```

Write a `.gitignore` covering `node_modules/`, `dist/`, `.DS_Store`, `.env*`, and editor folders. Then make the initial commit and push:

```bash
git add -A
git commit -m "chore: project setup and build plan"
git push -u origin main
```

**Report back with the repo URL and wait for me before starting Phase 0.**

### Git rhythm for the rest of the build

- Commit at the end of every phase, message prefixed with the phase: `feat(phase-2): room snapping and wall resolution`
- Push after every phase commit. I want the work on GitHub, not just on this machine.
- Commit mid-phase too whenever something meaningful starts working — small commits over one giant one.
- Append a `docs/phase-log.md` entry before each phase commit: acceptance criteria passed, criteria failed, anything deferred.
- Never commit `node_modules/` or build output.

### Auto-deploy to live

Every push to `main` ships to production. Set this up once, right after Phase 0 runs locally.

**One-time wiring** (Claude Code does this, then stops before DNS):

```bash
npm i -g vercel
vercel link          # create the project, scope it to my account
vercel git connect   # connect the GitHub repo so pushes auto-build
```

Vercel project settings — framework preset **Vite**, build command `npm run build`, output directory `dist`, install command `npm install`.

**Branch strategy, so half-built phases never become the live site:**

- Phase work happens on a `phase-N` branch. Every push there gets its own Vercel preview URL — that's where I test.
- Merge to `main` only once the phase's acceptance criteria pass. That's the production deploy.
- Never commit directly to `main` after the initial setup commit.

**DNS: stop and wait.** When it's time to point a domain at it, target `home.shipit.fun`. Give me the exact CNAME or A record values Vercel wants and **do not make any DNS changes yourself.** I'll do that part in my registrar.

⚠️ **Know what deploying does and doesn't do.** Designs live in the browser's IndexedDB, which is scoped per origin and per device. A house designed on `localhost:5173` will not appear on the live site, and one designed on my laptop will not appear on my phone. Deploying gets me a URL I can open anywhere; it does not sync my projects. If I want that later, it means adding Supabase and revisiting the storage decision in §0 — a real change, not a tweak.

Mitigation for now, build it into Phase 8: a **"Download project file"** button that saves the project JSON, and an **"Open project file"** button that loads one back. That's the manual bridge between devices, and it doubles as a backup. Add it to the Phase 8 deliverables.

---

## 0. Locked decisions

These are settled. Do not re-litigate them or propose alternatives.

| Decision | Locked value |
|---|---|
| Purpose | Accurate enough to hand to a builder, fun enough to play with |
| Drawing model | Room-by-room: place rectangles, snap them together |
| Land | Generic rectangular plot, user-entered dimensions |
| Utilities depth | Schematic runs — lines from source to each fixture |
| Levels | Multi-story + basement/foundation layer |
| Landscaping | Drop objects from a library (shed, tree, bed, path) **plus** a garden layer: planting zones, individual plants, companion-planting checks, aquaponics + curing/drying stations |
| Garden intelligence | Two layers: (1) **baked-in** plant data and companion rules — offline, deterministic, always-on warnings; (2) an **optional** Claude assist for open-ended "what should I plant here?" — the one network feature, opt-in, proxied server-side |
| 3D view | Editable in 3D (wall heights, roof pitch) **and** first-person walkthrough |
| Storage | **Designs** are browser-local only — no accounts, no cloud, no design data ever leaves the device. The only network call in the whole app is the optional garden assist (Claude API), and it persists nothing |
| Exports | Dimensioned floorplan PDF + utilities/materials spec sheet + garden plan (planting schedule, companion report, systems parts list) |
| Units | Feet + inches, displayed as `12' 6"` |
| Aesthetic | Clean Scandinavian — white, thin lines, muted, precise |
| Location | **Nova Scotia, Canada.** Regionally sensible defaults (frost depth, snow load, heating, hardiness) baked in as *planning references*, not code compliance |

---

## 0.5 Regional context — Nova Scotia

The build site is in Nova Scotia, so a few defaults are set for that climate. **All of these are planning references to confirm with your municipality and the National Building Code of Canada (NBC) — the tool orients, it doesn't certify.** They live in `REGION` in config.js so there's one source of truth.

- **Foundation frost depth ≈ 48".** Footings go below the frost line (NBC 9.12). The basement/foundation layer defaults its footing depth from this. Confirm for your exact site.
- **Snow load is real and site-specific** (roughly Ss ≈ 1.5–4.0 kPa across NS, higher inland and in Cape Breton). The roof tool nudges toward a steeper pitch to shed snow and shows a "confirm Ss from NBC climatic data" note. It does not size structure.
- **Most of NS has no natural-gas distribution.** Heating is usually electric, heat pump, oil, or propane. The utilities layer treats the "gas" system as **propane** by default and includes a propane tank fixture. Heat pumps are emphasized (they're the common NS retrofit).
- **Rural sites are commonly well + septic** — both already in the fixture catalog.
- **Growing season is short:** roughly zone 6a on the coast, 5b inland; last frost ~late May, first frost ~early-to-mid October, ~130 growing days. The garden layer surfaces this so planting plans are grounded in the real window.
- **Units note:** feet-and-inches is correct for Canadian framing (lumber is nominal imperial), so your choice stands. But NS property surveys are **metric** — so the dimension parser also accepts metric entry (`30m`, `9.1m`) and converts, so you can type lot dimensions straight off a survey.

---

## 1. Stack

Chosen for the least painful path through a stateful editor with a live 3D twin.

```
Vite + React 18
Tailwind CSS v3        ← PIN v3. Not v4. Non-negotiable.
zustand + zundo        ← global store with undo/redo built in
@react-three/fiber     ← 3D scene
@react-three/drei      ← OrbitControls, PointerLockControls, Grid, Html labels
three
jspdf                  ← vector PDF export
idb-keyval             ← IndexedDB persistence, tiny
lucide-react           ← icons
```

**Why r3f over vanilla Three:** the 3D scene is a pure projection of the same store the 2D editor edits. Declarative rendering means a room resize in 2D updates the 3D walls with zero manual scene-graph bookkeeping. Vanilla would mean hand-writing a diffing layer.

**2D editor is SVG, not canvas.** Room counts are in the dozens, not thousands. SVG gives free hit-testing, real DOM focus for accessibility, and it's debuggable in devtools. No Konva, no Fabric.

No CSS-in-JS. Tailwind utilities plus inline `style` for computed values only.

**Garden assist proxy (only relevant to Phase 6.3):** the Claude call goes through one Vercel serverless function at `api/garden-assist.js`, not from the browser directly. The Anthropic key lives in a Vercel env var and in `.env.local` for dev — it must **never** be bundled into client code or committed. This is what lets the assist work on the live site without leaking the key. Everything else in the app is static and client-side. No other backend.

---

## 2. Data model

Everything lives in one serializable object. **All lengths are integer inches.** Never store floats. Never store feet. Format at the display layer only.

```js
project = {
  id, name, createdAt, updatedAt,
  schemaVersion: 1,

  plot: { widthIn, depthIn },          // the rectangular lot

  levels: [
    {
      id,
      name,                             // "Basement", "Main", "Upper"
      index,                            // -1 basement, 0 main, 1+ upper
      floorElevationIn,                 // top of subfloor, relative to grade
      ceilingHeightIn,
      rooms: [Room],
      openings: [Opening],
      fixtures: [Fixture],
      runs: [Run],
    }
  ],

  roof: { style: 'gable' | 'hip' | 'flat', pitchRise: 6 },  // rise per 12 run

  landscape: {
    objects: [LandscapeObject],
    zones: [PlantingZone],       // painted beds/blocks with a crop assigned
    plants: [PlacedPlant],       // individual plant instances
    systems: [GardenSystem],     // aquaponics, drying, curing
  },

  view: {
    activeLevelId, activeSystemFilters: [], showGhostBelow: true,
    gardenIntel: false,          // the companion/spacing overlay — OFF by default (see below)
  },
}

Room = { id, x, y, w, d, name, type, wallThicknessIn }
// x,y = top-left corner in plot coordinates, inches. w = width (x axis), d = depth (y axis).

Opening = { id, type: 'door'|'window'|'archway'|'garage',
            roomId, wall: 'n'|'e'|'s'|'w',
            offsetIn,        // from that wall's start corner, to opening's near edge
            widthIn, heightIn, sillHeightIn }

Fixture = { id, system, kind, x, y, rotation, label }
// system: 'electrical'|'water'|'drain'|'hvac'|'gas'
// kind: from FIXTURE_CATALOG in config.js

Run = { id, system, points: [{x, y}], fromFixtureId, toFixtureId,
        risesToLevelId }   // null unless it's a vertical riser

LandscapeObject = { id, kind, x, y, w, d, heightIn, rotation, label }

// --- Garden layer ---

PlantingZone = { id, x, y, w, d, rotation, name, cropId, notes }
// A bed or block. cropId → PLANT_CATALOG. Capacity is COMPUTED, never stored:
//   capacity = floor(w / spacingIn) * floor(d / spacingIn), spacing from the crop.

PlacedPlant = { id, plantId, x, y, zoneId }
// One plant at a point. zoneId is optional — a plant can stand free of any zone.
// plantId → PLANT_CATALOG.

GardenSystem = { id, kind, x, y, w, d, rotation, label, config }
// kind: 'aquaponics' | 'drying' | 'curing'
// config is kind-specific SIZING INPUT (see AQUAPONICS / STATIONS in config.js).
// All derived numbers (fish load, bed capacity, parts list) are COMPUTED from config,
// never stored — so they can't drift out of sync with the inputs.
```

**Companion relationships are never stored in the project.** They live in `PLANT_CATALOG` and are computed on the fly. The project only records *what* is planted *where*; the good/bad-neighbor logic is derived. This keeps saved files small and lets the rule set improve without migrating old projects.

**Coordinate convention, written once and obeyed everywhere:**
- Plan space is 2D: `x` runs left→right, `y` runs top→bottom (screen-natural).
- Three.js space is Y-up: plan `(x, y)` maps to three `(x, ?, y)`, and elevation maps to three `y`.
- Put this conversion in `src/lib/coords.js` and import it. **No ad-hoc axis swapping anywhere else in the codebase.** This is the single most common source of "why is my house sideways" bugs.

---

## 3. `src/config.js`

All tunables in one file. No magic numbers scattered through components.

```js
export const UNITS = {
  SNAP_IN: 3,                    // default grid snap, 3 inches
  SNAP_OPTIONS_IN: [1, 3, 6, 12],
  MIN_ROOM_IN: 36,               // 3' minimum room dimension
  ACCEPT_METRIC_INPUT: true,     // parser also reads `30m`, `9.1m` (NS surveys are metric)
};

export const REGION = {
  place: 'Nova Scotia, Canada',
  // Planning references only. Confirm exact values for your municipality / site / NBC.
  hardinessZone: '5b–6b (≈6a coastal, 5b inland)',
  lastSpringFrost: 'late May',
  firstFallFrost: 'early–mid October',
  growingSeasonDays: 130,                       // ~120–150 by microclimate
  frostDepthIn: 48,                             // footings below frost line (NBC 9.12); confirm locally
  groundSnowLoad: 'Ss ≈ 1.5–4.0 kPa (site-specific, per NBC climatic data)',
  primaryHeating: 'electric / heat pump / oil / propane',  // most of NS has NO natural-gas grid
  recommendSteeperRoofForSnow: true,
};

export const DEFAULTS = {
  PLOT: { widthIn: 100 * 12, depthIn: 150 * 12 },
  WALL_THICKNESS_IN: 6,          // exterior; interior partitions 4"
  INTERIOR_WALL_IN: 4,
  CEILING_HEIGHT_IN: 108,        // 9'
  BASEMENT_CEILING_IN: 96,       // 8'
  FLOOR_ASSEMBLY_IN: 12,         // joists + subfloor between levels
  FOOTING_DEPTH_IN: 48,          // NS frost depth (from REGION.frostDepthIn); confirm locally
  DOOR: { widthIn: 32, heightIn: 80 },
  WINDOW: { widthIn: 36, heightIn: 48, sillHeightIn: 36 },
};

export const ROOM_TYPES = [
  'Bedroom','Bathroom','Kitchen','Living','Dining','Office',
  'Hall','Closet','Laundry','Utility','Garage','Entry','Storage',
];

export const SYSTEMS = {
  electrical: { label: 'Electrical', color: '#C9A227' },
  water:      { label: 'Water supply', color: '#4E7FA8' },
  drain:      { label: 'Drain / waste', color: '#6B7078' },
  hvac:       { label: 'HVAC', color: '#7FA093' },
  gas:        { label: 'Propane / gas', color: '#A2543F' },  // NS: usually propane, not piped gas
};

export const FIXTURE_CATALOG = [
  // system, kind, label, default footprint
  { system: 'electrical', kind: 'panel',        label: 'Service panel',  w: 24, d: 6 },
  { system: 'electrical', kind: 'outlet',       label: 'Outlet',         w: 4,  d: 2 },
  { system: 'electrical', kind: 'light',        label: 'Light',          w: 8,  d: 8 },
  { system: 'electrical', kind: 'ev_charger',   label: 'EV charger',     w: 12, d: 8 },
  { system: 'water',      kind: 'main_shutoff', label: 'Main shutoff',   w: 6,  d: 6 },
  { system: 'water',      kind: 'water_heater', label: 'Water heater',   w: 24, d: 24 },
  { system: 'water',      kind: 'well',         label: 'Well head',      w: 24, d: 24 },
  { system: 'water',      kind: 'sink',         label: 'Sink',           w: 30, d: 22 },
  { system: 'water',      kind: 'shower',       label: 'Shower',         w: 36, d: 36 },
  { system: 'drain',      kind: 'toilet',       label: 'Toilet',         w: 20, d: 28 },
  { system: 'drain',      kind: 'floor_drain',  label: 'Floor drain',    w: 6,  d: 6 },
  { system: 'drain',      kind: 'septic',       label: 'Septic tank',    w: 96, d: 60 },
  { system: 'drain',      kind: 'stack',        label: 'Waste stack',    w: 6,  d: 6 },
  { system: 'hvac',       kind: 'furnace',      label: 'Furnace / AHU',  w: 30, d: 30 },
  { system: 'hvac',       kind: 'register',     label: 'Register',       w: 12, d: 6 },
  { system: 'hvac',       kind: 'heat_pump',    label: 'Heat pump',      w: 36, d: 36 },
  { system: 'gas',        kind: 'propane_tank', label: 'Propane tank',   w: 48, d: 24 },
  { system: 'gas',        kind: 'gas_meter',    label: 'Gas meter',      w: 18, d: 12 },  // rare in NS
  { system: 'gas',        kind: 'range',        label: 'Range',          w: 30, d: 25 },
];

export const LANDSCAPE_CATALOG = [
  { kind: 'shed',        label: 'Shed',        w: 10*12, d: 12*12, h: 8*12 },
  { kind: 'garage',      label: 'Detached garage', w: 24*12, d: 24*12, h: 11*12 },
  { kind: 'greenhouse',  label: 'Greenhouse',  w: 8*12,  d: 12*12, h: 8*12 },
  { kind: 'garden_bed',  label: 'Garden bed',  w: 4*12,  d: 8*12,  h: 18 },
  { kind: 'tree',        label: 'Tree',        w: 15*12, d: 15*12, h: 25*12 },
  { kind: 'shrub',       label: 'Shrub',       w: 4*12,  d: 4*12,  h: 4*12 },
  { kind: 'path',        label: 'Path',        w: 3*12,  d: 20*12, h: 2 },
  { kind: 'driveway',    label: 'Driveway',    w: 12*12, d: 40*12, h: 2 },
  { kind: 'patio',       label: 'Patio',       w: 16*12, d: 12*12, h: 4 },
  { kind: 'deck',        label: 'Deck',        w: 16*12, d: 12*12, h: 24 },
  { kind: 'fence',       label: 'Fence run',   w: 40*12, d: 4,     h: 6*12 },
  { kind: 'pond',        label: 'Pond',        w: 10*12, d: 8*12,  h: 0 },
  { kind: 'firepit',     label: 'Fire pit',    w: 4*12,  d: 4*12,  h: 18 },
  { kind: 'coop',        label: 'Chicken coop',w: 6*12,  d: 8*12,  h: 6*12 },
];

// ── Garden ────────────────────────────────────────────────
export const GARDEN = {
  ADJACENCY_IN: 18,        // two plants are "neighbors" within this distance
  DEFAULT_SPACING_IN: 12,  // fallback if a plant has no spacing
  SUN: { full: '6+ hrs', part: '3–6 hrs', shade: '<3 hrs' },
};

// Companion data is embedded in each plant: `friends` help, `foes` hurt.
// Relationships are one entry per plant; the checker treats them as symmetric
// unless a foe is listed only one way (still flag it).
// This is a STARTER corpus — accurate for common cases, meant to be extended.
// Spacing is in inches (in-row). Flag in a comment that this is planning
// guidance, not a horticultural authority: local climate and variety win.
export const PLANT_CATALOG = [
  { id: 'tomato',   label: 'Tomato',    spacingIn: 24, sun: 'full', water: 'med',
    friends: ['basil','marigold','carrot','onion','nasturtium'], foes: ['brassica','corn','potato','fennel'] },
  { id: 'basil',    label: 'Basil',     spacingIn: 10, sun: 'full', water: 'med',
    friends: ['tomato','pepper'], foes: ['rue'] },
  { id: 'carrot',   label: 'Carrot',    spacingIn: 3,  sun: 'full', water: 'med',
    friends: ['tomato','onion','lettuce','pea'], foes: ['dill','fennel'] },
  { id: 'onion',    label: 'Onion',     spacingIn: 4,  sun: 'full', water: 'low',
    friends: ['carrot','tomato','lettuce','brassica'], foes: ['bean','pea'] },
  { id: 'bean',     label: 'Bush bean', spacingIn: 6,  sun: 'full', water: 'med',
    friends: ['corn','squash','carrot','cucumber'], foes: ['onion','garlic','fennel'] },
  { id: 'corn',     label: 'Corn',      spacingIn: 12, sun: 'full', water: 'med',
    friends: ['bean','squash','cucumber'], foes: ['tomato'] },
  { id: 'squash',   label: 'Squash',    spacingIn: 36, sun: 'full', water: 'high',
    friends: ['corn','bean','nasturtium'], foes: ['potato'] },
  { id: 'cucumber', label: 'Cucumber',  spacingIn: 18, sun: 'full', water: 'high',
    friends: ['bean','corn','pea','nasturtium'], foes: ['potato','sage'] },
  { id: 'lettuce',  label: 'Lettuce',   spacingIn: 8,  sun: 'part', water: 'med',
    friends: ['carrot','onion','cucumber','strawberry'], foes: [] },
  { id: 'pea',      label: 'Pea',       spacingIn: 3,  sun: 'full', water: 'med',
    friends: ['carrot','cucumber','bean','corn'], foes: ['onion','garlic'] },
  { id: 'pepper',   label: 'Pepper',    spacingIn: 18, sun: 'full', water: 'med',
    friends: ['basil','tomato','carrot'], foes: ['fennel','brassica'] },
  { id: 'potato',   label: 'Potato',    spacingIn: 12, sun: 'full', water: 'med',
    friends: ['bean','corn','marigold'], foes: ['tomato','squash','cucumber'] },
  { id: 'brassica', label: 'Brassica (cabbage/kale/broccoli)', spacingIn: 18, sun: 'full', water: 'high',
    friends: ['onion','beet','marigold','nasturtium'], foes: ['tomato','pepper','strawberry'] },
  { id: 'strawberry', label: 'Strawberry', spacingIn: 12, sun: 'full', water: 'med',
    friends: ['lettuce','bean','spinach'], foes: ['brassica'] },
  { id: 'garlic',   label: 'Garlic',    spacingIn: 4,  sun: 'full', water: 'low',
    friends: ['tomato','carrot','brassica'], foes: ['bean','pea'] },
  { id: 'marigold', label: 'Marigold',  spacingIn: 8,  sun: 'full', water: 'low',
    friends: ['tomato','brassica','potato','squash'], foes: [] },        // pest deterrent, universal friend
  { id: 'nasturtium', label: 'Nasturtium', spacingIn: 10, sun: 'full', water: 'low',
    friends: ['cucumber','squash','tomato','brassica'], foes: [] },      // trap crop
  { id: 'herb_leafy', label: 'Leafy herb (aquaponics)', spacingIn: 7, sun: 'part', water: 'high',
    friends: [], foes: [] },  // generic fast leafy green for aquaponic grow beds
];

// A named guild — the classic Three Sisters — offered as a one-click preset.
export const GARDEN_PRESETS = [
  { id: 'three_sisters', label: 'Three Sisters', plants: ['corn','bean','squash'],
    note: 'Corn as trellis, beans fix nitrogen, squash shades the soil.' },
  { id: 'salad_bed', label: 'Salad bed', plants: ['lettuce','carrot','onion'], note: '' },
  { id: 'pest_border', label: 'Pest-deterrent border', plants: ['marigold','nasturtium'], note: '' },
];

// ── Garden systems: sizing constants ──────────────────────
// EVERY number here is a PLANNING ESTIMATE, not engineering. Surface that in the
// UI. Real aquaponics/aquaculture design needs local validation (species, climate,
// water testing, code). The tool helps you think; it doesn't sign off.
export const AQUAPONICS = {
  GROWBED_TO_TANK_RATIO: 1.0,      // grow-bed volume : fish-tank volume, 1:1 start (range ~1:1–2:1)
  GROWBED_DEPTH_IN: 12,            // standard media bed
  FISH_GAL_PER_LB: 7,             // ~1 lb of fish per 7 gal of tank water (conservative middle)
  SUMP_FRACTION_OF_TANK: 0.33,     // optional sump ~1/3 tank volume
  GAL_PER_CUBIC_FT: 7.48,
  // Parts list template — quantities computed from footprint + ratios.
  PARTS: ['Fish tank','Media grow bed(s)','Sump (optional)','Water pump','Air pump + stones',
          'Bell siphon or timer','Grow media','Plumbing (bulkheads, uniseals, pipe)','Test kit','Heater (climate-dependent)'],
};
export const STATIONS = {
  drying: { HANG_SPACING_IN: 6, TARGET: '~60°F / 60% RH, dark, gentle airflow',
    PARTS: ['Rack or lines','Fan(s)','Hygrometer','Light-blocking cover'] },
  curing: { JAR_FOOTPRINT_IN: 6, TARGET: '~62% RH in sealed containers, burp daily early on',
    PARTS: ['Sealed containers','Humidity packs','Hygrometer','Shelving'] },
};
export const GARDEN_SYSTEM_CATALOG = [
  { kind: 'aquaponics', label: 'Aquaponics system', w: 8*12, d: 12*12, h: 4*12 },
  { kind: 'drying',     label: 'Drying station',    w: 4*12, d: 6*12,  h: 7*12 },
  { kind: 'curing',     label: 'Curing station',    w: 3*12, d: 4*12,  h: 6*12 },
];

export const CAMERA = {
  ORBIT_START: { position: [0, 900, 1200], target: [0, 0, 0] },
  WALK_EYE_HEIGHT_IN: 66,
  WALK_SPEED_IN_PER_S: 100,
  WALK_COLLISION_RADIUS_IN: 12,
};

export const PDF = {
  PAGE: 'letter',
  ORIENTATION: 'landscape',
  MARGIN_PT: 36,
  SCALE_OPTIONS: ['1/4"=1\'', '1/8"=1\'', 'fit'],
};
```

---

## 4. Design tokens

Clean Scandinavian. Precision is the aesthetic — this direction lives or dies on spacing discipline and hairline consistency, not on decoration.

```js
// src/tokens.js  (also mirror into tailwind.config.js theme.extend)
export const COLOR = {
  canvas:     '#FCFCFB',   // app background
  panel:      '#FFFFFF',   // sidebars, cards
  line:       '#E5E4E0',   // hairlines, grid
  lineStrong: '#C4C2BC',   // borders, wall outlines
  ink:        '#17181A',   // primary text, walls in plan
  muted:      '#7C7F84',   // secondary text, labels
  accent:     '#3D5A6C',   // slate blue — selection, active tool, focus ring
  accentSoft: '#3D5A6C14',
  alert:      '#A2543F',   // errors, overlap warnings
};
```

**Type:**
- UI + body: **DM Sans** (400/500/700)
- Dimensions, coordinates, all numbers: **JetBrains Mono** (400/500) — every measurement in the app is mono. This is what makes it read as an instrument rather than a website.
- Display, used *sparingly*: **Instrument Serif italic** — project name in the title bar and empty-state lines only. Nowhere else.

**Signature element — the measurement rail.** Persistent dimension strings run along the top and left edges of the plan canvas, in mono, showing the overall footprint. While a room is being dragged or resized, the rail live-updates and additional dimension strings snap in showing that room's size and its offset from the nearest walls. It's the one thing that should feel special. Everything else stays quiet.

**Quality floor, no announcement needed:** visible keyboard focus rings using `accent`, `prefers-reduced-motion` respected, all controls reachable by keyboard, layout usable down to tablet width. (Full phone support is out of scope — this is a desktop tool.)

**Copy rules:** sentence case, active voice, plain verbs. Buttons name what happens: "Add room," not "Submit." An empty plot says what to do first, not "No data."

---

## 5. Build phases

### Phase 0 — Scaffold and the number layer

**Goal:** the project runs, and inches-to-display conversion is bulletproof before anything depends on it.

**Deliverables**
- Vite + React + Tailwind v3 (`tailwindcss@^3` explicitly in package.json), zustand + zundo store, fonts loaded.
- `src/config.js` and `src/tokens.js` exactly as specified above.
- `src/lib/units.js`: `formatFeetInches(inches)` → `12' 6"`, `parseFeetInches(str)` → inches, accepting `12'6"`, `12.5'`, `150"`, `12 ft 6 in`.
- `src/lib/coords.js`: plan↔three conversion, both directions.
- `src/store/useProject.js`: zustand store with zundo temporal middleware, 50-step history. Actions are the *only* way state mutates.
- App shell: title bar, left tool rail, right inspector panel, center canvas area. All empty.

**Acceptance**
- `formatFeetInches(150)` → `12' 6"`. `formatFeetInches(144)` → `12'`. `formatFeetInches(6)` → `6"`. `formatFeetInches(0)` → `0"`.
- `parseFeetInches` round-trips all four input formats above.
- Ctrl+Z / Ctrl+Shift+Z work against a dummy store action.

**Scope guard:** no rooms, no 3D, no drawing. This phase is plumbing only.

---

### Phase 1 — Plot, levels, canvas, persistence

**Goal:** a pannable, zoomable plan canvas with a plot boundary and working level tabs, and nothing is ever lost.

**Deliverables**
- Plot dimension inputs (accepts `100'` or `1200"`), rendered as a boundary rectangle.
- SVG canvas: pan (space-drag or middle-drag), zoom (scroll, 10%–400%), zoom-to-fit button.
- Grid at 1' with a heavier line at 5'. Grid opacity drops as you zoom out.
- Level tabs: Basement / Main / Upper, add and remove levels, per-level ceiling height.
- Foundation/basement level carries a **footing depth** field, defaulting to `DEFAULTS.FOOTING_DEPTH_IN` (48", NS frost line) with a "confirm locally" hint. Shown in the inspector; used later for the foundation depth in 3D.
- Ghost layer: the level below renders at 15% opacity beneath the active level. Toggleable.
- The measurement rail (from §4) showing plot dimensions.
- IndexedDB autosave, debounced 800ms. Project list on load. "New project" and "Duplicate."

**Acceptance**
- Refresh the browser mid-edit; everything returns exactly as it was, including active level and zoom.
- Switching levels never loses the other levels' data.
- Zoom stays anchored to the cursor position.

**Scope guard:** no rooms yet. Resist the urge.

---

### Phase 2 — 🚧 GATE: rooms, snapping, and wall resolution

**This is the make-or-break phase. Everything downstream — 3D, openings, utilities, PDF — reads the geometry this phase produces. If it's wrong, all of it is wrong. Do not proceed past this phase until every acceptance criterion passes. Show me the results before moving on.**

**Goal:** rooms that snap together and resolve into a correct, non-duplicated wall set.

**Deliverables**
- Add a room: click a tool, drag a rectangle, or click to drop a default 12'×12'.
- Select, move, and resize rooms via corner and edge handles.
- Snapping: room edges snap to other room edges, to the plot boundary, and to the grid, within a 6" screen-scaled threshold. Snap guides render as accent hairlines while dragging.
- **Shared-wall resolution.** When two rooms are adjacent, the boundary is *one* wall of `INTERIOR_WALL_IN` thickness, not two stacked walls. Walls exposed to the outside are `WALL_THICKNESS_IN`.
- `src/lib/geometry.js` exports `resolveWalls(rooms)` → array of `{ id, x1, y1, x2, y2, thicknessIn, isExterior, roomIds: [] }`, deduplicated and merged where collinear.
- Overlap detection: fully overlapping rooms outline in `alert` with a plain-language warning in the inspector.
- Inspector panel: room name, type dropdown, exact W and D inputs, computed square footage.
- Live dimension strings while dragging, per the signature element spec.

**Acceptance**
- Two 12'×12' rooms snapped side by side produce exactly **9 wall segments**, not 12 — the shared boundary is one wall.
- `resolveWalls` output forms a closed exterior polygon for any set of contiguous rooms. Verify by walking the exterior segments end-to-end back to the start.
- A room dragged and released always lands on integer inches. Log the room's stored coordinates and confirm no floats.
- Resizing a room below `MIN_ROOM_IN` clamps rather than inverting.
- Undo restores exact prior geometry, including after a snap.

**Scope guard:** rectangles only. No L-shaped rooms, no angled walls, no curves. Rectangles that snap together *make* the L-shapes.

---

### Phase 3 — 3D extrusion

**Goal:** the plan, standing up.

**Deliverables**
- `/3d` view (tab, not a route — but unmount it fully when inactive).
- Walls extruded from `resolveWalls()` output at the level's ceiling height, positioned at the correct floor elevation per level.
- Floor slabs and ceiling planes per level. Basement floor at its own elevation with `FLOOR_ASSEMBLY_IN` gaps between levels.
- OrbitControls with sensible damping. Ground plane at grade.
- Level visibility toggles: show all, show one, roof on/off.
- Dimension labels in 3D via drei `<Html>`, toggleable, showing exterior wall lengths.
- Soft neutral lighting — one directional with shadows, low-intensity ambient, no HDRI. Materials are flat matte, off-white walls, no textures.

**Acceptance**
- Move a room in 2D, switch to 3D, the wall moved. No refresh required.
- Exterior footprint measured in 3D matches the 2D dimension rail exactly.
- Three levels render at correct relative elevations with no z-fighting between floor and ceiling planes.

**Scope guard:** no doors or windows yet — solid walls. No furniture, ever. No roof yet.

---

### Phase 4 — Openings

**Goal:** doors, windows, archways, garage doors.

**Deliverables**
- Place openings by clicking a wall; they snap along it and can be dragged along the wall.
- Types from `DEFAULTS`, with editable width, height, and sill height.
- 2D rendering: standard architectural symbols — door with swing arc, window as a doubled line, archway as a dashed break.
- **3D rendering: build each wall as segmented boxes around its openings. No CSG library.** A wall with one window becomes five boxes (below, above, left, right, and the header run). This is faster, more robust, and produces cleaner geometry than boolean subtraction.
- Openings on a shared wall belong to both rooms and render once.

**Acceptance**
- A window in a wall shows a hole in 3D with correct sill and head heights.
- Dragging an opening past the end of its wall clamps at the wall extent minus 4".
- Moving the parent room carries its openings.

**Scope guard:** no glass materials, no frames, no hardware. Voids and simple reveals only.

---

### Phase 5 — Utilities

**Goal:** schematic runs from source to fixture, per system, per level.

**Deliverables**
- Fixture palette from `FIXTURE_CATALOG`, filtered by system. Drag to place; rotate with `R`.
- Run drawing tool: click a source fixture, click waypoints, click a destination fixture. Runs route **orthogonally** — every segment is horizontal or vertical, auto-inserting the corner point.
- System layer toggles. Non-active systems dim to 20%.
- Vertical risers: a run can jump levels. Mark the riser point on both levels with a circled arrow symbol showing target level.
- Per-system run length totals in the inspector, in feet.
- 3D: runs render as thin tubes in their system color, only when that layer is on. Below-floor runs render inside the floor assembly gap.

**Acceptance**
- A water run from the heater in the basement to an upstairs sink renders correctly on both levels and connects at the riser.
- Turning off "Electrical" hides its runs and fixtures in both 2D and 3D.
- Run lengths total correctly and update live when a fixture moves.

**Scope guard:** schematic only. No pipe diameters, no wire gauges, no circuit loads, no code compliance checking. Lines that show intent — a plumber will redraw this anyway, and pretending otherwise would be worse than useless.

---

### Phase 6 — Landscape (base)

**Goal:** the land around the house — structures, paths, hardscape. The garden layer builds on this in 6.1–6.3.

**Deliverables**
- Landscape mode: the plot with the house footprint shown as a locked outline, everything else placeable.
- Object palette from `LANDSCAPE_CATALOG`. Drag to place, resize, rotate.
- Setback readout: when an object is selected, show its distance to the nearest plot edge and to the house, in the measurement rail.
- 3D: simple massing — boxes for structures, low cylinders plus a sphere for trees, flat inset planes for paths and patios. Muted natural tones, still matte, no textures.
- Objects snap to plot edges and to each other.

**Acceptance**
- A shed placed 10' from the rear property line reads `10' 0"` in the setback display.
- Landscape objects appear in the 3D view at correct positions and heights relative to the house.

**Scope guard:** flat terrain. No slopes, no contours, no elevation modeling. That's a whole other product.

---

### Phase 6.1 — Garden: planting zones, plants, and companion checking

**Goal:** plan what grows where, with the companion intelligence as a *quiet, toggleable overlay* — never forced. This is the always-on, offline layer.

**The aesthetic-control principle (your explicit ask):** with the garden-intel overlay **off** (the default), the garden reads clean — just your zones and plants in muted tones, laid out however you like. Turning it **on** reveals the working layer: adjacency lines, spacing rings, capacity readouts, and warnings. You decide how it looks; the intelligence is available on demand, not imposed.

**Deliverables**
- Two placement tools:
  - **Zone** — draw a rectangle, assign a crop from `PLANT_CATALOG`. The zone shows computed capacity ("holds ~18 carrots") from area ÷ spacing. This is the "block planting" path.
  - **Plant** — drop an individual plant at a point, optionally inside a zone. This is the "detail bed" path.
- `GARDEN_PRESETS` as one-click drops — Three Sisters, salad bed, pest border. (You asked for sister planting by name; the classic guild is built in.)
- `src/lib/companions.js` → `checkGarden(plants, zones)` returning, for each pair within `GARDEN.ADJACENCY_IN`: `good`, `bad`, or `neutral`, plus a plain-language reason ("basil helps tomatoes," "onions stunt beans").
- **Garden-intel overlay** (toggle, off by default):
  - green hairline between friends, `alert`-colored hairline between foes
  - faint spacing ring per plant at its `spacingIn`
  - per-zone capacity and over-planting flag ("bed holds ~12, you've placed 16")
  - inspector list of all conflicts in plain language
- Sun/water tags shown on selection.
- A quiet **growing-window strip** in garden mode from `REGION`: hardiness zone, last/first frost, ~growing days — so plans stay grounded in the real NS season. Reference only, not a per-plant calendar.
- 3D: plants as simple muted massing (low sphere/cone by size class), zones as flat colored insets. Still matte, still quiet.

**Acceptance**
- Place a tomato and a basil within 18" → overlay shows a green link and "basil helps tomato." Place a tomato and a brassica → red link with the reason.
- A 4'×8' bed assigned to carrots reports a sensible capacity from spacing, and flags over-planting when exceeded.
- Overlay **off** by default; the garden looks clean until you ask for the intel.
- Dropping the Three Sisters preset places corn, beans, and squash with no mutual foes flagged.

**Scope guard:** companion logic from the baked-in catalog only — no live AI here (that's 6.3). No growth simulation, no yield prediction, no season/frost calendar. Adjacency and spacing, done well.

---

### Phase 6.2 — Garden systems: aquaponics, drying, curing

**Goal:** place the working systems and size them, with a real parts list you could source from.

**Deliverables**
- Place systems from `GARDEN_SYSTEM_CATALOG`. Each opens a sizing panel in the inspector.
- **Aquaponics** — from the footprint and `AQUAPONICS` constants, compute and display: fish-tank volume (gal), grow-bed volume at the set ratio, recommended max fish load (lb, from `FISH_GAL_PER_LB`), grow-bed area, and how many `herb_leafy` plants that area holds. Ratio and depth are adjustable inputs; everything else recomputes live.
- **Drying / curing** — from footprint and `STATIONS`: hang or jar capacity, plus the environmental target string (temp/RH). 
- **Parts list** per system, quantities scaled to size, from the `PARTS` templates.
- A visible **"planning estimate — validate before building"** note on every computed panel. These numbers orient; they don't certify.
- **Cold-climate flag for aquaponics:** because the site is Nova Scotia, an outdoor system is seasonal — the panel notes that year-round operation implies a greenhouse or indoor/basement placement and fish-tank heating (already in the parts list), and that siting it inside a heated structure changes the plan. Reality check, not a redesign.
- 3D: aquaponics as a low tank box + raised bed box (with a faint water plane); drying/curing as simple frames. Muted, matte.

**Acceptance**
- Resize an aquaponics system and the fish load, bed volume, and plant capacity all update live and stay internally consistent (bed:tank ratio holds).
- Each system produces a parts list scaled to its size.
- The estimate disclaimer is present and unmissable on every sizing panel.

**Scope guard:** steady-state sizing heuristics only. No water-chemistry modeling, no nitrogen-cycle simulation, no species database, no cost totals. A sourcing checklist and capacity math, not an engineering sign-off.

---

### Phase 6.3 — Garden assist (Claude, cuttable)

**Goal:** open-ended "what should I plant in this bed?" — the one place live Claude helps. Nothing else depends on this; **cut it if the project runs long.** The baked-in layer (6.1) already carries all always-on intelligence.

**Deliverables**
- `api/garden-assist.js` — a Vercel serverless function. Takes the current garden context (zones, plants, their sun/water tags, the plot, and the NS region data from `REGION` — hardiness zone and frost window) plus my question. Calls the Anthropic API server-side. Returns text. **Persists nothing.** Passing the region means suggestions are grounded in the real Nova Scotia season, not a generic climate.
- The Anthropic key is read from `process.env` on the server only. Never in client code, never committed. `.env.local` for dev; Vercel env var for prod.
- Model: a current Sonnet-tier string (e.g. `claude-sonnet-4-5` — confirm the latest at docs.claude.com before shipping). Sonnet, not Opus — this is suggestion-weight work.
- An assist panel in garden mode: a prompt box, my question, the answer rendered as readable prose. Suggested prompts seeded ("What pairs well with what I've planted?", "Fill this empty bed for part shade").
- **Graceful absence:** with no key configured (e.g. a fresh local clone), the panel says so calmly and the rest of the app is unaffected. The assist is additive; its failure never blocks design work.
- A quiet line noting suggestions are AI-generated and worth sanity-checking against the baked-in companion flags.

**Acceptance**
- With the key set, ask "what complements my tomatoes?" and get a relevant, grounded answer.
- View the built client bundle and confirm the API key does **not** appear anywhere in it.
- With no key, the panel degrades gracefully and nothing else breaks.

**Scope guard:** a text assistant only. It does not place plants, edit the project, or take actions — it advises; I decide and place. No chat history persistence, no multi-turn memory beyond the current context sent.

---

### Phase 7 — Editing in 3D

**Goal:** direct manipulation for the things that are easier to feel than to type.

**Deliverables**
- Click a wall in 3D to select it; drag its top edge to change that level's ceiling height. Snaps to 1" with a live mono readout.
- Roof: style selector (gable, hip, flat) and a pitch slider (2:12 to 12:12) with live 3D preview and a numeric readout. Roof is generated from the exterior footprint bounding box — simple, not per-plane accurate. Given the NS site, the pitch defaults toward the steeper end to shed snow, with a quiet "confirm ground snow load (Ss) from NBC climatic data — this tool doesn't size structure" note. A flat roof selection shows a gentle snow-load caution.
- Drag a whole room in 3D along the ground plane. Same snapping rules as 2D.
- Every 3D edit writes back to the same store, so 2D updates instantly.

**Acceptance**
- Change ceiling height in 3D, switch to 2D, the inspector shows the new value.
- Undo works identically for 3D edits and 2D edits.

**Scope guard:** these three interactions only. Not a full 3D modeler.

---

### Phase 8 — Export

**Goal:** paper a human can read.

**Deliverables**
- `src/export/planPdf.js` — jsPDF, **drawn with vector primitives from the model.** Not a canvas screenshot. Not `html2canvas`.
  - One page per level. Title block: project name, level, scale, date.
  - Walls as filled poché, rooms labeled with name and square footage, openings as symbols.
  - Dimension strings on all exterior walls and major interior runs, with proper extension lines and tick marks.
  - Scale selector: `1/4"=1'`, `1/8"=1'`, or fit-to-page.
- `src/export/specSheet.js` — additional pages:
  - Room schedule: name, type, dimensions, area. Total conditioned square footage.
  - Opening schedule: type, size, count, which room.
  - Utilities schedule: fixture counts by system, run length totals by system.
  - Landscape schedule: object, size, count.
  - **Planting schedule:** zones and plants — crop, count/capacity, spacing, sun/water.
  - **Companion report:** every flagged conflict in plain language, plus the confirmed good pairings. This is the garden plan you'd actually carry outside.
  - **Garden systems + parts list:** each aquaponics/drying/curing system with its computed sizing and its scaled parts checklist. Carry the "planning estimate — validate before building" note onto the page.
- One "Export PDF" button producing a single combined file.
- **"Download project file"** — saves the project as `.json`. **"Open project file"** — loads one back, with a confirm step if it would overwrite unsaved work. This is the only way to move a design between devices, and it's the backup story.

**Acceptance**
- A 24' wall measures 24' when checked against the printed scale with a ruler on paper.
- Text is selectable in the output PDF — proof that it's vector, not raster.
- A three-level house with landscape produces a complete document with no clipped content.

**Scope guard:** no DWG, no IFC, no SVG export, no 3D model export. PDF only.

---

### Phase 9 — Walkthrough (cuttable)

**Goal:** stand inside it.

**Deliverables**
- PointerLockControls first-person mode. WASD plus mouse-look. Eye height from `CAMERA.WALK_EYE_HEIGHT_IN`.
- Collision against wall segments using a simple circle-vs-segment test at `WALK_COLLISION_RADIUS_IN`. Openings are passable when the opening is a door or archway and the walker's height clears the sill.
- Level switching via a key: walk up means teleport to the next level at the same plan position.
- Escape exits back to orbit.

**Acceptance**
- You cannot walk through a solid wall. You can walk through a doorway.
- Exiting walkthrough restores the previous orbit camera position.

**Scope guard:** no stairs geometry, no gravity, no jumping, no head bob. Walking on a flat plane per level.

**If the project is running long, cut this phase.** Nothing else depends on it.

---

### Phase 10 — Polish

**Goal:** it feels like an instrument.

**Deliverables**
- Keyboard shortcuts, with a `?` overlay listing them: `R` room, `D` door, `W` window, `U` utility run, `L` landscape, `Esc` deselect, `Del` delete, `[` `]` change level, `Space` pan, `F` zoom to fit, `G` toggle grid, `3` toggle 3D.
- Empty states with real direction: an empty plot says "Set your lot size, then place your first room."
- Overlap and disconnection warnings surfaced in a quiet inspector strip, never a modal.
- Duplicate a level, including all rooms and openings — the fastest way to build a second floor.
- A short onboarding tooltip sequence, dismissible and never shown again.

**Acceptance**
- Every core action has a shortcut and every shortcut is in the `?` overlay.
- No console errors or warnings during a full build-a-house session.

---

## 6. Risks and gotchas

**Hard-won, don't rediscover these:**

1. **Tailwind v3, pinned.** v4 changes config format and will waste a session.
2. **Never define React components inside another component.** Screens and panels go at module scope or inline as JSX. Defining them inside causes remounts on every keystroke — inputs lose focus mid-typing.
3. **Integer inches, always.** Floats accumulate drift across snap-drag-snap cycles and the shared-wall dedupe will start missing matches by 0.0001". Round on every store write.
4. **One coordinate conversion module.** `coords.js` or bust. Ad-hoc `(x, 0, y)` sprinkled through components is how the house ends up sideways in exactly one view.
5. **Don't put Three.js objects in React state.** Refs plus `useFrame`. State goes in zustand; the scene reads it.
6. **Unmount the 3D canvas when the 2D tab is active.** Keeping both alive means every 2D drag re-renders the scene and the editor feels sluggish.
7. **OrbitControls and PointerLockControls conflict.** Only one mounted at a time. Unmount, don't just disable.
8. **Wall segmentation, not CSG.** Boolean subtraction on wall meshes is slow, fragile, and produces degenerate geometry at opening edges. Build the wall as boxes around the holes.
9. **Debounce IndexedDB writes to 800ms.** Writing on every drag frame will jank the editor.
10. **jsPDF vector primitives for the plan.** A rasterized screenshot at print scale is blurry and unmeasurable, which defeats the point of the whole tool.
11. **Ghost-below layer needs its own render pass at low opacity, not CSS opacity on a group** — nested SVG opacity compounds and the ghost disappears.
12. **`resolveWalls` runs on every render if you let it.** Memoize on the rooms array.
13. **The Anthropic API key never touches the client.** It lives only in the Vercel serverless env and `.env.local`. If it ends up in the bundle, it's public the moment you deploy to `home.shipit.fun`. Grep the built `dist/` for the key before any push to `main` that includes 6.3. `.env*` is already gitignored — keep it that way.
14. **Garden numbers are estimates, and the UI must say so.** Companion rules and aquaponics ratios are planning heuristics, not authorities. Never render a computed fish load or a companion verdict without the "validate before building" framing. Quietly implying certainty here would be the one genuinely harmful failure mode in this tool.
15. **Companion checking is O(n²) over plants.** Fine at garden scale (dozens), but only run `checkGarden` when the intel overlay is on, and memoize it on the plants+zones arrays. Don't compute conflicts nobody's looking at.
16. **Garden-intel overlay is off by default.** Respect the aesthetic-control decision — the working layer appears only when asked for. Don't "helpfully" default it on.
17. **The NS regional defaults are planning references, not code.** Frost depth, snow load, hardiness zone — every one carries a "confirm locally / per NBC" note. Never present a footing depth or a roof pitch as code-compliant. Same principle as the garden estimates: orient, don't certify.

---

## 7. MVP checklist

The tool is genuinely usable when all of these are true:

- [ ] Set a lot size and see it to scale
- [ ] Place rooms that snap together into a coherent floorplan
- [ ] Shared walls resolve to single walls
- [ ] Three levels including a basement, each with its own height
- [ ] Doors and windows, visible as holes in 3D
- [ ] Orbit the house in 3D and read real dimensions off it
- [ ] Place a service panel, water heater, and septic tank, and route runs to fixtures
- [ ] Toggle each utility system independently
- [ ] Drop a shed, a driveway, garden beds, and trees on the lot
- [ ] Plant zones and individual plants, and drop the Three Sisters preset
- [ ] Toggle the garden-intel overlay and see companion + spacing warnings (off by default)
- [ ] Place an aquaponics system and get live fish-load / bed-capacity math with a parts list
- [ ] (If built) ask the garden assist a question and get a grounded answer, with the key never in the client bundle
- [ ] Adjust ceiling height and roof pitch directly in 3D
- [ ] Export a dimensioned PDF that measures correctly against its stated scale
- [ ] Export a spec sheet with room, opening, utility, planting, and garden-systems schedules
- [ ] Close the browser, reopen, everything is there
- [ ] Undo any action

---

## 8. Working agreement

- **One phase at a time.** Stop at the end of each phase, state which acceptance criteria pass and which don't, and wait.
- **Phase 2 is a hard gate.** Show me the wall-count and closed-polygon results before touching 3D.
- **Surgical edits over rewrites.** When something needs changing, change that thing. Don't regenerate whole files.
- **Ask before adding a dependency** that isn't in §1.
- **Ask before changing a locked decision** in §0. If a locked decision turns out to be technically wrong, say so plainly and explain why rather than quietly working around it.
- **No placeholder content.** No lorem ipsum, no "Feature coming soon," no stub buttons that do nothing.
- **Say when something is uncertain.** A flagged unknown is cheaper than a confident wrong turn.
- Commit at the end of each phase with the phase number in the message.
