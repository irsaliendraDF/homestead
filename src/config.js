// All tunables live here. No magic numbers scattered through components.

export const UNITS = {
  SNAP_IN: 3, // default grid snap, 3 inches
  SNAP_OPTIONS_IN: [1, 3, 6, 12],
  MIN_ROOM_IN: 36, // 3' minimum room dimension
  ACCEPT_METRIC_INPUT: true, // parser also reads `30m`, `9.1m` (NS surveys are metric)
}

export const REGION = {
  place: 'Nova Scotia, Canada',
  // Planning references only. Confirm exact values for your municipality / site / NBC.
  hardinessZone: '5b–6b (≈6a coastal, 5b inland)',
  lastSpringFrost: 'late May',
  firstFallFrost: 'early–mid October',
  growingSeasonDays: 130, // ~120–150 by microclimate
  frostDepthIn: 48, // footings below frost line (NBC 9.12); confirm locally
  groundSnowLoad: 'Ss ≈ 1.5–4.0 kPa (site-specific, per NBC climatic data)',
  primaryHeating: 'electric / heat pump / oil / propane', // most of NS has NO natural-gas grid
  recommendSteeperRoofForSnow: true,
}

export const DEFAULTS = {
  PLOT: { widthIn: 100 * 12, depthIn: 150 * 12 },
  WALL_THICKNESS_IN: 6, // exterior; interior partitions 4"
  INTERIOR_WALL_IN: 4,
  CEILING_HEIGHT_IN: 108, // 9'
  BASEMENT_CEILING_IN: 96, // 8'
  FLOOR_ASSEMBLY_IN: 12, // joists + subfloor between levels
  FOOTING_DEPTH_IN: 48, // NS frost depth (from REGION.frostDepthIn); confirm locally
  DOOR: { widthIn: 32, heightIn: 80 },
  WINDOW: { widthIn: 36, heightIn: 48, sillHeightIn: 36 },
}

export const ROOM_TYPES = [
  'Bedroom', 'Bathroom', 'Kitchen', 'Living', 'Dining', 'Office',
  'Hall', 'Closet', 'Laundry', 'Utility', 'Garage', 'Entry', 'Storage',
]

// Electrical PLANNING references (confirm with the Canadian Electrical Code, CEC
// C22.1, the NBC, and a licensed electrician — this tool orients, never certifies).
export const ELECTRICAL = {
  // Max general receptacles per circuit before we flag it. Default is the
  // conservative US convention (8 @ 180 VA on 15 A). NOTE: CEC Rule 8-304 permits
  // up to 12 outlets on a 15 A residential circuit. Adjust to taste.
  RECEPTACLES_PER_CIRCUIT: 8,
  RECEPTACLE_KINDS: ['outlet', 'gfci_outlet'],
  // Common dedicated circuits (appliance → amps / volts) — references only.
  DEDICATED: [
    { for: 'Range / stove', amps: 40, volts: 240 },
    { for: 'Dryer', amps: 30, volts: 240 },
    { for: 'Water heater (tank)', amps: 30, volts: 240 },
    { for: 'EV charger', amps: 40, volts: 240 },
    { for: 'Dishwasher', amps: 15, volts: 120 },
    { for: 'Microwave', amps: 20, volts: 120 },
    { for: 'Furnace / heat pump air handler', amps: 15, volts: 120 },
  ],
  // Smoke alarms: interconnected, in every bedroom + on every storey (NBC 9.10.19).
  // CO alarms near sleeping areas where there's a fuel-burning appliance / attached garage.
}

export const SYSTEMS = {
  electrical: { label: 'Electrical', color: '#C9A227' },
  water: { label: 'Water supply', color: '#4E7FA8' },
  drain: { label: 'Drain / waste', color: '#6B7078' },
  hvac: { label: 'HVAC', color: '#7FA093' },
  gas: { label: 'Propane / gas', color: '#A2543F' }, // NS: usually propane, not piped gas
}

export const FIXTURE_CATALOG = [
  // system, kind, label, default footprint
  { system: 'electrical', kind: 'panel', label: 'Service panel', w: 24, d: 6 },
  { system: 'electrical', kind: 'outlet', label: 'Outlet', w: 4, d: 2 },
  { system: 'electrical', kind: 'light', label: 'Light', w: 8, d: 8 },
  { system: 'electrical', kind: 'ev_charger', label: 'EV charger (40A/240V)', w: 12, d: 8 },
  { system: 'electrical', kind: 'switch', label: 'Switch', w: 4, d: 2 },
  { system: 'electrical', kind: 'switch_3way', label: '3-way switch', w: 4, d: 2 },
  { system: 'electrical', kind: 'gfci_outlet', label: 'GFCI outlet', w: 4, d: 2 },
  { system: 'electrical', kind: 'range_receptacle', label: 'Range plug (40A/240V)', w: 6, d: 3 },
  { system: 'electrical', kind: 'dryer_receptacle', label: 'Dryer plug (30A/240V)', w: 6, d: 3 },
  { system: 'electrical', kind: 'smoke_detector', label: 'Smoke alarm (interconnected)', w: 6, d: 6 },
  { system: 'electrical', kind: 'co_detector', label: 'CO alarm', w: 6, d: 6 },
  { system: 'electrical', kind: 'subpanel', label: 'Sub-panel', w: 16, d: 5 },
  { system: 'water', kind: 'main_shutoff', label: 'Main shutoff', w: 6, d: 6 },
  { system: 'water', kind: 'water_heater', label: 'Water heater', w: 24, d: 24 },
  { system: 'water', kind: 'well', label: 'Well head', w: 24, d: 24 },
  { system: 'water', kind: 'sink', label: 'Sink', w: 30, d: 22 },
  { system: 'water', kind: 'shower', label: 'Shower', w: 36, d: 36 },
  { system: 'drain', kind: 'toilet', label: 'Toilet', w: 20, d: 28 },
  { system: 'drain', kind: 'floor_drain', label: 'Floor drain', w: 6, d: 6 },
  { system: 'drain', kind: 'septic', label: 'Septic tank', w: 96, d: 60 },
  { system: 'drain', kind: 'stack', label: 'Waste stack', w: 6, d: 6 },
  { system: 'hvac', kind: 'furnace', label: 'Furnace / AHU', w: 30, d: 30 },
  { system: 'hvac', kind: 'register', label: 'Register', w: 12, d: 6 },
  { system: 'hvac', kind: 'heat_pump', label: 'Heat pump', w: 36, d: 36 },
  { system: 'gas', kind: 'propane_tank', label: 'Propane tank', w: 48, d: 24 },
  { system: 'gas', kind: 'gas_meter', label: 'Gas meter', w: 18, d: 12 }, // rare in NS
  { system: 'gas', kind: 'range', label: 'Range', w: 30, d: 25 },
]

export const LANDSCAPE_CATALOG = [
  { kind: 'shed', label: 'Shed', w: 10 * 12, d: 12 * 12, h: 8 * 12 },
  { kind: 'garage', label: 'Detached garage', w: 24 * 12, d: 24 * 12, h: 11 * 12 },
  { kind: 'greenhouse', label: 'Greenhouse', w: 8 * 12, d: 12 * 12, h: 8 * 12 },
  { kind: 'garden_bed', label: 'Garden bed', w: 4 * 12, d: 8 * 12, h: 18 },
  { kind: 'tree', label: 'Tree', w: 15 * 12, d: 15 * 12, h: 25 * 12 },
  { kind: 'shrub', label: 'Shrub', w: 4 * 12, d: 4 * 12, h: 4 * 12 },
  { kind: 'path', label: 'Path', w: 3 * 12, d: 20 * 12, h: 2 },
  { kind: 'driveway', label: 'Driveway', w: 12 * 12, d: 40 * 12, h: 2 },
  { kind: 'patio', label: 'Patio', w: 16 * 12, d: 12 * 12, h: 4 },
  { kind: 'deck', label: 'Deck', w: 16 * 12, d: 12 * 12, h: 24 },
  { kind: 'fence', label: 'Fence run', w: 40 * 12, d: 4, h: 6 * 12 },
  { kind: 'pond', label: 'Pond', w: 10 * 12, d: 8 * 12, h: 0 },
  { kind: 'firepit', label: 'Fire pit', w: 4 * 12, d: 4 * 12, h: 18 },
  { kind: 'coop', label: 'Chicken coop', w: 6 * 12, d: 8 * 12, h: 6 * 12 },
  { kind: 'stairs', label: 'Exterior stairs', w: 4 * 12, d: 6 * 12, h: 4 * 12 },
]

// Furniture / fixtures placed INSIDE the house (per level). category drives
// grouping + color; w/d/h in inches.
export const FURNITURE_CATALOG = [
  // Appliances
  { kind: 'fridge', label: 'Refrigerator', category: 'appliance', w: 36, d: 30, h: 70 },
  { kind: 'range', label: 'Range / stove', category: 'appliance', w: 30, d: 26, h: 36 },
  { kind: 'wall_oven', label: 'Wall oven', category: 'appliance', w: 30, d: 24, h: 48 },
  { kind: 'dishwasher', label: 'Dishwasher', category: 'appliance', w: 24, d: 24, h: 34 },
  { kind: 'microwave', label: 'Microwave', category: 'appliance', w: 24, d: 15, h: 14 },
  { kind: 'range_hood', label: 'Range hood', category: 'appliance', w: 30, d: 20, h: 10 },
  { kind: 'washer', label: 'Washer', category: 'appliance', w: 27, d: 27, h: 38 },
  { kind: 'dryer', label: 'Dryer', category: 'appliance', w: 27, d: 27, h: 38 },
  // Cupboards / cabinets
  { kind: 'base_cabinet', label: 'Base cabinet', category: 'cabinet', w: 36, d: 24, h: 36 },
  { kind: 'wall_cabinet', label: 'Wall cabinet', category: 'cabinet', w: 36, d: 13, h: 30 },
  { kind: 'island', label: 'Island', category: 'cabinet', w: 60, d: 36, h: 36 },
  { kind: 'pantry', label: 'Pantry', category: 'cabinet', w: 24, d: 24, h: 84 },
  { kind: 'counter', label: 'Countertop run', category: 'cabinet', w: 96, d: 25, h: 36 },
  // Bathroom
  { kind: 'bathtub', label: 'Bathtub', category: 'bath', w: 60, d: 32, h: 22 },
  { kind: 'shower', label: 'Shower', category: 'bath', w: 36, d: 36, h: 80 },
  { kind: 'vanity', label: 'Vanity', category: 'bath', w: 36, d: 21, h: 32 },
  { kind: 'toilet', label: 'Toilet', category: 'bath', w: 20, d: 28, h: 30 },
  // Stairs (interior)
  { kind: 'stairs', label: 'Stairs', category: 'stairs', w: 40, d: 10 * 12, h: 108 },
]

// ── Garden ────────────────────────────────────────────────
export const GARDEN = {
  ADJACENCY_IN: 18, // two plants are "neighbors" within this distance
  DEFAULT_SPACING_IN: 12, // fallback if a plant has no spacing
  SUN: { full: '6+ hrs', part: '3–6 hrs', shade: '<3 hrs' },
}

// Companion data is embedded in each plant: `friends` help, `foes` hurt.
// Relationships are one entry per plant; the checker treats them as symmetric
// unless a foe is listed only one way (still flag it).
// This is a STARTER corpus — accurate for common cases, meant to be extended.
// Spacing is in inches (in-row). This is planning guidance, not a horticultural
// authority: local climate and variety win.
export const PLANT_CATALOG = [
  { id: 'tomato', label: 'Tomato', spacingIn: 24, sun: 'full', water: 'med',
    friends: ['basil', 'marigold', 'carrot', 'onion', 'nasturtium'], foes: ['brassica', 'corn', 'potato', 'fennel'] },
  { id: 'basil', label: 'Basil', spacingIn: 10, sun: 'full', water: 'med',
    friends: ['tomato', 'pepper'], foes: ['rue'] },
  { id: 'parsley', label: 'Parsley', spacingIn: 6, sun: 'part', water: 'med',
    friends: ['tomato', 'carrot', 'pepper', 'corn'], foes: [] },
  { id: 'carrot', label: 'Carrot', spacingIn: 3, sun: 'full', water: 'med',
    friends: ['tomato', 'onion', 'lettuce', 'pea'], foes: ['dill', 'fennel'] },
  { id: 'onion', label: 'Onion', spacingIn: 4, sun: 'full', water: 'low',
    friends: ['carrot', 'tomato', 'lettuce', 'brassica'], foes: ['bean', 'pea'] },
  { id: 'bean', label: 'Bush bean', spacingIn: 6, sun: 'full', water: 'med',
    friends: ['corn', 'squash', 'carrot', 'cucumber'], foes: ['onion', 'garlic', 'fennel'] },
  { id: 'corn', label: 'Corn', spacingIn: 12, sun: 'full', water: 'med',
    friends: ['bean', 'squash', 'cucumber'], foes: ['tomato'] },
  { id: 'squash', label: 'Squash', spacingIn: 36, sun: 'full', water: 'high',
    friends: ['corn', 'bean', 'nasturtium'], foes: ['potato'] },
  { id: 'cucumber', label: 'Cucumber', spacingIn: 18, sun: 'full', water: 'high',
    friends: ['bean', 'corn', 'pea', 'nasturtium'], foes: ['potato', 'sage'] },
  { id: 'lettuce', label: 'Lettuce', spacingIn: 8, sun: 'part', water: 'med',
    friends: ['carrot', 'onion', 'cucumber', 'strawberry'], foes: [] },
  { id: 'pea', label: 'Pea', spacingIn: 3, sun: 'full', water: 'med',
    friends: ['carrot', 'cucumber', 'bean', 'corn'], foes: ['onion', 'garlic'] },
  { id: 'pepper', label: 'Pepper', spacingIn: 18, sun: 'full', water: 'med',
    friends: ['basil', 'tomato', 'carrot'], foes: ['fennel', 'brassica'] },
  { id: 'potato', label: 'Potato', spacingIn: 12, sun: 'full', water: 'med',
    friends: ['bean', 'corn', 'marigold'], foes: ['tomato', 'squash', 'cucumber'] },
  { id: 'brassica', label: 'Brassica (cabbage/kale/broccoli)', spacingIn: 18, sun: 'full', water: 'high',
    friends: ['onion', 'beet', 'marigold', 'nasturtium'], foes: ['tomato', 'pepper', 'strawberry'] },
  { id: 'strawberry', label: 'Strawberry', spacingIn: 12, sun: 'full', water: 'med',
    friends: ['lettuce', 'bean', 'spinach'], foes: ['brassica'] },
  { id: 'garlic', label: 'Garlic', spacingIn: 4, sun: 'full', water: 'low',
    friends: ['tomato', 'carrot', 'brassica'], foes: ['bean', 'pea'] },
  { id: 'marigold', label: 'Marigold', spacingIn: 8, sun: 'full', water: 'low',
    friends: ['tomato', 'brassica', 'potato', 'squash'], foes: [] }, // pest deterrent, universal friend
  { id: 'nasturtium', label: 'Nasturtium', spacingIn: 10, sun: 'full', water: 'low',
    friends: ['cucumber', 'squash', 'tomato', 'brassica'], foes: [] }, // trap crop
  { id: 'herb_leafy', label: 'Leafy herb (aquaponics)', spacingIn: 7, sun: 'part', water: 'high',
    friends: [], foes: [] }, // generic fast leafy green for aquaponic grow beds
]

// A named guild — the classic Three Sisters — offered as a one-click preset.
export const GARDEN_PRESETS = [
  { id: 'three_sisters', label: 'Three Sisters', plants: ['corn', 'bean', 'squash'],
    note: 'Corn as trellis, beans fix nitrogen, squash shades the soil.' },
  { id: 'salad_bed', label: 'Salad bed', plants: ['lettuce', 'carrot', 'onion'], note: '' },
  { id: 'pest_border', label: 'Pest-deterrent border', plants: ['marigold', 'nasturtium'], note: '' },
]

// ── Garden systems: sizing constants ──────────────────────
// EVERY number here is a PLANNING ESTIMATE, not engineering. Surface that in the
// UI. Real aquaponics/aquaculture design needs local validation (species, climate,
// water testing, code). The tool helps you think; it doesn't sign off.
export const AQUAPONICS = {
  GROWBED_TO_TANK_RATIO: 1.0, // grow-bed volume : fish-tank volume, 1:1 start (range ~1:1–2:1)
  GROWBED_DEPTH_IN: 12, // standard media bed
  FISH_GAL_PER_LB: 7, // ~1 lb of fish per 7 gal of tank water (conservative middle)
  SUMP_FRACTION_OF_TANK: 0.33, // optional sump ~1/3 tank volume
  GAL_PER_CUBIC_FT: 7.48,
  // Parts list template — quantities computed from footprint + ratios.
  PARTS: ['Fish tank', 'Media grow bed(s)', 'Sump (optional)', 'Water pump', 'Air pump + stones',
    'Bell siphon or timer', 'Grow media', 'Plumbing (bulkheads, uniseals, pipe)', 'Test kit', 'Heater (climate-dependent)'],
}

export const STATIONS = {
  drying: { HANG_SPACING_IN: 6, TARGET: '~60°F / 60% RH, dark, gentle airflow',
    PARTS: ['Rack or lines', 'Fan(s)', 'Hygrometer', 'Light-blocking cover'] },
  curing: { JAR_FOOTPRINT_IN: 6, TARGET: '~62% RH in sealed containers, burp daily early on',
    PARTS: ['Sealed containers', 'Humidity packs', 'Hygrometer', 'Shelving'] },
}

export const GARDEN_SYSTEM_CATALOG = [
  { kind: 'aquaponics', label: 'Aquaponics system', w: 8 * 12, d: 12 * 12, h: 4 * 12 },
  { kind: 'drying', label: 'Drying station', w: 4 * 12, d: 6 * 12, h: 7 * 12 },
  { kind: 'curing', label: 'Curing station', w: 3 * 12, d: 4 * 12, h: 6 * 12 },
]

export const CAMERA = {
  ORBIT_START: { position: [0, 900, 1200], target: [0, 0, 0] },
  WALK_EYE_HEIGHT_IN: 66,
  WALK_SPEED_IN_PER_S: 100,
  WALK_COLLISION_RADIUS_IN: 12,
}

export const PDF = {
  PAGE: 'letter',
  ORIENTATION: 'landscape',
  MARGIN_PT: 36,
  SCALE_OPTIONS: ['1/4"=1\'', '1/8"=1\'', 'fit'],
}
