import { create } from 'zustand'
import { temporal } from 'zundo'
import { DEFAULTS, UNITS, GARDEN_PRESETS, PLANT_CATALOG } from '../config.js'
import { systemDefaults } from '../lib/gardensystems.js'

// State mutates ONLY through the actions below. Components never set fields
// directly — that keeps undo/redo, autosave, and future validation honest.

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2, 10)

const nowIso = () => new Date().toISOString()

/** Build a fresh level. Basement levels (index < 0) carry a footing depth. */
export function makeLevel({ name, index }) {
  const level = {
    id: uid(),
    name,
    index,
    floorElevationIn: 0, // set by recomputeElevations
    ceilingHeightIn: index < 0 ? DEFAULTS.BASEMENT_CEILING_IN : DEFAULTS.CEILING_HEIGHT_IN,
    rooms: [],
    walls: [], // freestanding wall segments (not tied to a room)
    furniture: [], // appliances / cupboards / bath / stairs (inside the house)
    mergedPairs: [], // "idA|idB" pairs whose shared wall is removed (joined into an L)
    openings: [],
    fixtures: [],
    runs: [],
  }
  if (index < 0) level.footingDepthIn = DEFAULTS.FOOTING_DEPTH_IN
  return level
}

/**
 * Assign floorElevationIn (top of subfloor, relative to grade) to every level.
 * Cumulative stack by index, then shifted so Main (index 0) sits at 0.
 * Basements land negative, upper floors positive. FLOOR_ASSEMBLY_IN gaps between.
 */
export function recomputeElevations(levels) {
  const sorted = [...levels].sort((a, b) => a.index - b.index)
  let floor = 0
  const provisional = sorted.map((lvl, i) => {
    if (i > 0) {
      floor += sorted[i - 1].ceilingHeightIn + DEFAULTS.FLOOR_ASSEMBLY_IN
    }
    return { id: lvl.id, floor }
  })
  const main = sorted.find((l) => l.index === 0)
  const offset = main ? provisional.find((p) => p.id === main.id).floor : 0
  const byId = Object.fromEntries(provisional.map((p) => [p.id, p.floor - offset]))
  return levels.map((l) => ({ ...l, floorElevationIn: byId[l.id] }))
}

/** A fresh, empty project skeleton matching the §2 data model. */
export function makeDefaultProject() {
  const ts = nowIso()
  const main = makeLevel({ name: 'Main', index: 0 })
  const levels = recomputeElevations([main])
  return {
    id: uid(),
    name: 'Untitled homestead',
    createdAt: ts,
    updatedAt: ts,
    schemaVersion: 1,
    plot: { widthIn: DEFAULTS.PLOT.widthIn, depthIn: DEFAULTS.PLOT.depthIn },
    levels,
    roof: { style: 'gable', pitchRise: 8 }, // steeper default to shed NS snow
    landscape: { objects: [], zones: [], plants: [], systems: [] },
    view: {
      activeLevelId: main.id,
      activeSystemFilters: [],
      showGhostBelow: true,
      gardenIntel: false,
    },
  }
}

const touch = (project, patch) => ({ ...project, ...patch, updatedAt: nowIso() })

/** Migrate legacy rectangle rooms ({x,y,w,d}) to polygon rooms ({points}). */
export function migrateProject(project) {
  if (!project?.levels) return project
  return {
    ...project,
    landscape: {
      objects: [],
      zones: [],
      plants: [],
      systems: [],
      ...(project.landscape || {}),
    },
    levels: project.levels.map((l) => ({
      ...l,
      rooms: (l.rooms || []).map(migrateRoom),
      walls: l.walls || [],
      furniture: l.furniture || [],
      fixtures: l.fixtures || [],
      runs: l.runs || [],
      mergedPairs: l.mergedPairs || [],
      openings: (l.openings || []).map((o) => ({
        style: o.style ?? OPENING_STYLES[o.type]?.[0] ?? 'single',
        hinge: o.hinge ?? 'start',
        swing: o.swing ?? 'in',
        ...o,
      })),
    })),
  }
}

// Available styles per opening type (modern set). First entry is the default.
export const OPENING_STYLES = {
  door: ['single', 'double', 'sliding', 'pocket', 'bifold', 'barn', 'dutch'],
  window: ['picture', 'casement', 'doublehung', 'sliding', 'awning', 'bay', 'hopper'],
  archway: ['open'],
  garage: ['sectional'],
}

// Quick size presets per type (inches). Selecting one sets width + height.
export const OPENING_SIZES = {
  door: [
    { label: `28" × 6'8" (bath)`, w: 28, h: 80 },
    { label: `30" × 6'8"`, w: 30, h: 80 },
    { label: `32" × 6'8" (interior)`, w: 32, h: 80 },
    { label: `36" × 6'8" (entry)`, w: 36, h: 80 },
    { label: `6' × 6'8" (double)`, w: 72, h: 80 },
    { label: `8' × 6'8" (patio)`, w: 96, h: 80 },
  ],
  window: [
    { label: `2' × 3'`, w: 24, h: 36 },
    { label: `3' × 4'`, w: 36, h: 48 },
    { label: `3' × 5'`, w: 36, h: 60 },
    { label: `4' × 4'`, w: 48, h: 48 },
    { label: `5' × 4' (picture)`, w: 60, h: 48 },
    { label: `6' × 5' (picture)`, w: 72, h: 60 },
  ],
  garage: [
    { label: `9' × 7' (single)`, w: 108, h: 84 },
    { label: `16' × 7' (double)`, w: 192, h: 84 },
  ],
  archway: [
    { label: `4' × 7'`, w: 48, h: 84 },
    { label: `5' × 7'`, w: 60, h: 84 },
    { label: `6' × 7'`, w: 72, h: 84 },
  ],
}

// Default size (inches) + style per opening type.
export function openingDefaults(type) {
  const style = OPENING_STYLES[type][0]
  if (type === 'window') return { ...DEFAULTS.WINDOW, style }
  if (type === 'garage') return { widthIn: 9 * 12, heightIn: 7 * 12, sillHeightIn: 0, style }
  if (type === 'archway') return { widthIn: 48, heightIn: 84, sillHeightIn: 0, style }
  return { ...DEFAULTS.DOOR, sillHeightIn: 0, style } // door
}

const mergeKey = (a, b) => [a, b].sort().join('|')
function migrateRoom(r) {
  if (r.points && r.points.length >= 3) return r
  const { x = 0, y = 0, w = 0, d = 0, ...rest } = r
  return {
    ...rest,
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + d },
      { x, y: y + d },
    ],
  }
}

/** Immutably replace one level by id. */
const mapLevel = (levels, levelId, fn) => levels.map((l) => (l.id === levelId ? fn(l) : l))

/** Next "Room N" number from existing auto-names on a level. */
function nextRoomNumber(rooms) {
  let max = 0
  for (const r of rooms) {
    const m = /^Room (\d+)$/.exec(r.name || '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

// Only `project` is tracked for undo/redo. Actions and any transient UI state
// stay out of the temporal history.
export const useProject = create(
  temporal(
    (set) => ({
      project: makeDefaultProject(),

      // Replace the whole project (load, new, duplicate).
      setProject: (project) => set({ project }),
      newProject: () => set({ project: makeDefaultProject() }),

      setName: (name) => set((s) => ({ project: touch(s.project, { name }) })),

      setPlot: (patch) =>
        set((s) => ({ project: touch(s.project, { plot: { ...s.project.plot, ...patch } }) })),

      // ── Levels ──────────────────────────────────────────
      setActiveLevel: (levelId) =>
        set((s) => ({
          project: touch(s.project, { view: { ...s.project.view, activeLevelId: levelId } }),
        })),

      addLevelAbove: () =>
        set((s) => {
          const maxIndex = Math.max(...s.project.levels.map((l) => l.index))
          const level = makeLevel({ name: `Upper ${maxIndex + 1}`, index: maxIndex + 1 })
          const levels = recomputeElevations([...s.project.levels, level])
          return {
            project: touch(s.project, {
              levels,
              view: { ...s.project.view, activeLevelId: level.id },
            }),
          }
        }),

      addBasement: () =>
        set((s) => {
          if (s.project.levels.some((l) => l.index < 0)) return {} // one basement for now
          const level = makeLevel({ name: 'Basement', index: -1 })
          const levels = recomputeElevations([...s.project.levels, level])
          return {
            project: touch(s.project, {
              levels,
              view: { ...s.project.view, activeLevelId: level.id },
            }),
          }
        }),

      removeLevel: (levelId) =>
        set((s) => {
          if (s.project.levels.length <= 1) return {} // never remove the last level
          const remaining = recomputeElevations(s.project.levels.filter((l) => l.id !== levelId))
          const activeGone = s.project.view.activeLevelId === levelId
          const nextActive = activeGone
            ? [...remaining].sort((a, b) => Math.abs(a.index) - Math.abs(b.index))[0].id
            : s.project.view.activeLevelId
          return {
            project: touch(s.project, {
              levels: remaining,
              view: { ...s.project.view, activeLevelId: nextActive },
            }),
          }
        }),

      setRoof: (patch) => set((s) => ({ project: touch(s.project, { roof: { ...s.project.roof, ...patch } }) })),

      // name / ceilingHeightIn / footingDepthIn
      updateLevel: (levelId, patch) =>
        set((s) => {
          const levels = s.project.levels.map((l) => (l.id === levelId ? { ...l, ...patch } : l))
          const recomputed = 'ceilingHeightIn' in patch ? recomputeElevations(levels) : levels
          return { project: touch(s.project, { levels: recomputed }) }
        }),

      toggleGhostBelow: () =>
        set((s) => ({
          project: touch(s.project, {
            view: { ...s.project.view, showGhostBelow: !s.project.view.showGhostBelow },
          }),
        })),

      // ── Landscape objects (site-level, shared across levels) ──
      addLandscapeObject: (obj) =>
        set((s) => {
          const o = {
            id: uid(),
            kind: obj.kind,
            label: obj.label,
            x: Math.round(obj.x),
            y: Math.round(obj.y),
            w: Math.round(obj.w),
            d: Math.round(obj.d),
            heightIn: Math.round(obj.heightIn ?? 96),
            rotation: obj.rotation ?? 0,
          }
          return {
            project: touch(s.project, {
              landscape: { ...s.project.landscape, objects: [...s.project.landscape.objects, o] },
            }),
            _lastLandscapeId: o.id,
          }
        }),

      updateLandscapeObject: (id, patch) =>
        set((s) => {
          const clean = {}
          for (const [k, v] of Object.entries(patch)) clean[k] = ['x', 'y', 'w', 'd', 'heightIn', 'rotation'].includes(k) ? Math.round(v) : v
          if ('w' in clean) clean.w = Math.max(6, clean.w)
          if ('d' in clean) clean.d = Math.max(6, clean.d)
          return {
            project: touch(s.project, {
              landscape: {
                ...s.project.landscape,
                objects: s.project.landscape.objects.map((o) => (o.id === id ? { ...o, ...clean } : o)),
              },
            }),
          }
        }),

      removeLandscapeObject: (id) =>
        set((s) => ({
          project: touch(s.project, {
            landscape: { ...s.project.landscape, objects: s.project.landscape.objects.filter((o) => o.id !== id) },
          }),
        })),

      // ── Garden: planting zones + individual plants ──────
      toggleGardenIntel: () =>
        set((s) => ({ project: touch(s.project, { view: { ...s.project.view, gardenIntel: !s.project.view.gardenIntel } }) })),

      addZone: ({ x, y, w, d, cropId, name }) =>
        set((s) => {
          const crop = PLANT_CATALOG.find((p) => p.id === cropId)
          const zone = {
            id: uid(),
            x: Math.round(x),
            y: Math.round(y),
            w: Math.max(6, Math.round(w)),
            d: Math.max(6, Math.round(d)),
            rotation: 0,
            cropId,
            name: name || `${crop ? crop.label : 'Crop'} bed`,
            notes: '',
          }
          return {
            project: touch(s.project, { landscape: { ...s.project.landscape, zones: [...s.project.landscape.zones, zone] } }),
            _lastZoneId: zone.id,
          }
        }),

      updateZone: (id, patch) =>
        set((s) => {
          const clean = {}
          for (const [k, v] of Object.entries(patch)) clean[k] = ['x', 'y', 'w', 'd', 'rotation'].includes(k) ? Math.round(v) : v
          if ('w' in clean) clean.w = Math.max(6, clean.w)
          if ('d' in clean) clean.d = Math.max(6, clean.d)
          return {
            project: touch(s.project, {
              landscape: { ...s.project.landscape, zones: s.project.landscape.zones.map((z) => (z.id === id ? { ...z, ...clean } : z)) },
            }),
          }
        }),

      removeZone: (id) =>
        set((s) => ({
          project: touch(s.project, {
            landscape: {
              ...s.project.landscape,
              zones: s.project.landscape.zones.filter((z) => z.id !== id),
              plants: s.project.landscape.plants.map((p) => (p.zoneId === id ? { ...p, zoneId: null } : p)),
            },
          }),
        })),

      addPlant: ({ plantId, x, y, zoneId = null }) =>
        set((s) => {
          const plant = { id: uid(), plantId, x: Math.round(x), y: Math.round(y), zoneId }
          return {
            project: touch(s.project, { landscape: { ...s.project.landscape, plants: [...s.project.landscape.plants, plant] } }),
            _lastPlantId: plant.id,
          }
        }),

      updatePlant: (id, patch) =>
        set((s) => {
          const clean = {}
          for (const [k, v] of Object.entries(patch)) clean[k] = ['x', 'y'].includes(k) ? Math.round(v) : v
          return {
            project: touch(s.project, {
              landscape: { ...s.project.landscape, plants: s.project.landscape.plants.map((p) => (p.id === id ? { ...p, ...clean } : p)) },
            }),
          }
        }),

      removePlant: (id) =>
        set((s) => ({
          project: touch(s.project, {
            landscape: { ...s.project.landscape, plants: s.project.landscape.plants.filter((p) => p.id !== id) },
          }),
        })),

      // ── Garden systems (aquaponics / drying / curing) ──
      addGardenSystem: ({ kind, label, x, y, w, d }) =>
        set((s) => {
          const sys = {
            id: uid(),
            kind,
            label,
            x: Math.round(x),
            y: Math.round(y),
            w: Math.round(w),
            d: Math.round(d),
            rotation: 0,
            config: systemDefaults(kind),
          }
          return {
            project: touch(s.project, { landscape: { ...s.project.landscape, systems: [...s.project.landscape.systems, sys] } }),
            _lastSystemId: sys.id,
          }
        }),

      updateGardenSystem: (id, patch) =>
        set((s) => {
          const clean = {}
          for (const [k, v] of Object.entries(patch)) clean[k] = ['x', 'y', 'w', 'd', 'rotation'].includes(k) ? Math.round(v) : v
          if ('w' in clean) clean.w = Math.max(12, clean.w)
          if ('d' in clean) clean.d = Math.max(12, clean.d)
          return {
            project: touch(s.project, {
              landscape: { ...s.project.landscape, systems: s.project.landscape.systems.map((sy) => (sy.id === id ? { ...sy, ...clean } : sy)) },
            }),
          }
        }),

      removeGardenSystem: (id) =>
        set((s) => ({
          project: touch(s.project, {
            landscape: { ...s.project.landscape, systems: s.project.landscape.systems.filter((sy) => sy.id !== id) },
          }),
        })),

      // Drop a preset guild (Three Sisters, etc.) as a row of plants at a point.
      addPreset: (presetId, x, y) =>
        set((s) => {
          const preset = GARDEN_PRESETS.find((p) => p.id === presetId)
          if (!preset) return {}
          const newPlants = preset.plants.map((plantId, i) => ({
            id: uid(),
            plantId,
            x: Math.round(x + i * 24),
            y: Math.round(y),
            zoneId: null,
          }))
          return {
            project: touch(s.project, { landscape: { ...s.project.landscape, plants: [...s.project.landscape.plants, ...newPlants] } }),
          }
        }),

      // ── Rooms (on the active level) ─────────────────────
      // Rooms are polygons: room.points = [{x,y}, …], integer inches. A new room
      // is drawn as a rectangle, then its corners can move freely. Every stored
      // coordinate is a rounded integer — no floats reach the store, so the
      // shared-wall dedupe never misses by 0.0001".
      addRoom: (rect) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const level = s.project.levels.find((l) => l.id === levelId)
          const n = nextRoomNumber(level.rooms)
          const x = Math.round(rect.x)
          const y = Math.round(rect.y)
          const w = Math.max(UNITS.MIN_ROOM_IN, Math.round(rect.w))
          const d = Math.max(UNITS.MIN_ROOM_IN, Math.round(rect.d))
          const room = {
            id: uid(),
            name: `Room ${n}`,
            type: null,
            wallThicknessIn: DEFAULTS.WALL_THICKNESS_IN,
            points: [
              { x, y },
              { x: x + w, y },
              { x: x + w, y: y + d },
              { x, y: y + d },
            ],
          }
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({ ...l, rooms: [...l.rooms, room] })),
            }),
            _lastRoomId: room.id,
          }
        }),

      // patch may include { name, type } and/or { points }. Points are rounded.
      updateRoom: (roomId, patch) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const clean = { ...patch }
          if (patch.points) {
            clean.points = patch.points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
          }
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                rooms: l.rooms.map((r) => (r.id === roomId ? { ...r, ...clean } : r)),
              })),
            }),
          }
        }),

      removeRoom: (roomId) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                rooms: l.rooms.filter((r) => r.id !== roomId),
                // drop any join that referenced the deleted room
                mergedPairs: (l.mergedPairs || []).filter((k) => !k.split('|').includes(roomId)),
                // drop openings hosted on the deleted room
                openings: (l.openings || []).filter((o) => o.roomId !== roomId),
              })),
            }),
          }
        }),

      // ── Openings (doors / windows / archways / garage) ──
      addOpening: ({ type, host, offsetIn, ...size }) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const d = openingDefaults(type)
          const opening = {
            id: uid(),
            type,
            style: size.style ?? d.style,
            hinge: size.hinge ?? 'start', // which end the hinge is on: 'start' | 'end'
            swing: size.swing ?? 'in', // which way it opens: 'in' (into room) | 'out'
            kind: host.kind,
            roomId: host.roomId,
            edgeIndex: host.edgeIndex,
            wallId: host.wallId,
            offsetIn: Math.round(offsetIn),
            widthIn: Math.round(size.widthIn ?? d.widthIn),
            heightIn: Math.round(size.heightIn ?? d.heightIn),
            sillHeightIn: Math.round(size.sillHeightIn ?? d.sillHeightIn),
          }
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                openings: [...(l.openings || []), opening],
              })),
            }),
            _lastOpeningId: opening.id,
          }
        }),

      updateOpening: (openingId, patch) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const clean = {}
          for (const [k, v] of Object.entries(patch)) {
            clean[k] = ['offsetIn', 'widthIn', 'heightIn', 'sillHeightIn'].includes(k) ? Math.round(v) : v
          }
          // Switching type resets size unless explicit sizes are provided.
          if (patch.type && !('widthIn' in patch)) Object.assign(clean, openingDefaults(patch.type))
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                openings: (l.openings || []).map((o) => (o.id === openingId ? { ...o, ...clean } : o)),
              })),
            }),
          }
        }),

      removeOpening: (openingId) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                openings: (l.openings || []).filter((o) => o.id !== openingId),
              })),
            }),
          }
        }),

      // ── Utilities: fixtures + runs (on the active level) ──
      addFixture: ({ system, kind, x, y, label, rotation = 0 }) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const fixture = { id: uid(), system, kind, x: Math.round(x), y: Math.round(y), rotation, label }
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({ ...l, fixtures: [...(l.fixtures || []), fixture] })),
            }),
            _lastFixtureId: fixture.id,
          }
        }),

      updateFixture: (fixtureId, patch) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const clean = {}
          for (const [k, v] of Object.entries(patch)) clean[k] = ['x', 'y', 'rotation'].includes(k) ? Math.round(v) : v
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                fixtures: (l.fixtures || []).map((f) => (f.id === fixtureId ? { ...f, ...clean } : f)),
              })),
            }),
          }
        }),

      removeFixture: (fixtureId) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                fixtures: (l.fixtures || []).filter((f) => f.id !== fixtureId),
                runs: (l.runs || []).filter((r) => r.fromFixtureId !== fixtureId && r.toFixtureId !== fixtureId),
              })),
            }),
          }
        }),

      addRun: ({ system, points, fromFixtureId, toFixtureId, risesToLevelId = null }) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const run = {
            id: uid(),
            system,
            points: points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
            fromFixtureId,
            toFixtureId,
            risesToLevelId,
          }
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({ ...l, runs: [...(l.runs || []), run] })),
            }),
            _lastRunId: run.id,
          }
        }),

      updateRun: (runId, patch) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                runs: (l.runs || []).map((r) => (r.id === runId ? { ...r, ...patch } : r)),
              })),
            }),
          }
        }),

      removeRun: (runId) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({ ...l, runs: (l.runs || []).filter((r) => r.id !== runId) })),
            }),
          }
        }),

      // Join two rooms (remove the wall between them → one L-shaped space).
      mergeRooms: (aId, bId) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const key = mergeKey(aId, bId)
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                mergedPairs: (l.mergedPairs || []).includes(key)
                  ? l.mergedPairs
                  : [...(l.mergedPairs || []), key],
              })),
            }),
          }
        }),

      // Separate two rooms (put the shared wall back).
      unmergeRooms: (aId, bId) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const key = mergeKey(aId, bId)
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                mergedPairs: (l.mergedPairs || []).filter((k) => k !== key),
              })),
            }),
          }
        }),

      // ── Furniture (inside, on the active level) ─────────
      addFurniture: ({ kind, label, category, x, y, w, d, h, rotation = 0 }) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const item = { id: uid(), kind, label, category, x: Math.round(x), y: Math.round(y), w: Math.round(w), d: Math.round(d), heightIn: Math.round(h ?? 36), rotation }
          return {
            project: touch(s.project, { levels: mapLevel(s.project.levels, levelId, (l) => ({ ...l, furniture: [...(l.furniture || []), item] })) }),
            _lastFurnitureId: item.id,
          }
        }),

      updateFurniture: (id, patch) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const clean = {}
          for (const [k, v] of Object.entries(patch)) clean[k] = ['x', 'y', 'w', 'd', 'heightIn', 'rotation'].includes(k) ? Math.round(v) : v
          if ('w' in clean) clean.w = Math.max(4, clean.w)
          if ('d' in clean) clean.d = Math.max(4, clean.d)
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({ ...l, furniture: (l.furniture || []).map((f) => (f.id === id ? { ...f, ...clean } : f)) })),
            }),
          }
        }),

      removeFurniture: (id) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          return {
            project: touch(s.project, { levels: mapLevel(s.project.levels, levelId, (l) => ({ ...l, furniture: (l.furniture || []).filter((f) => f.id !== id) })) }),
          }
        }),

      // ── Freestanding walls (on the active level) ────────
      addWall: (seg) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const wall = {
            id: uid(),
            x1: Math.round(seg.x1),
            y1: Math.round(seg.y1),
            x2: Math.round(seg.x2),
            y2: Math.round(seg.y2),
            thicknessIn: DEFAULTS.INTERIOR_WALL_IN,
          }
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                walls: [...(l.walls || []), wall],
              })),
            }),
            _lastWallId: wall.id,
          }
        }),

      updateWall: (wallId, patch) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          const clean = {}
          for (const [k, v] of Object.entries(patch)) {
            clean[k] = ['x1', 'y1', 'x2', 'y2'].includes(k) ? Math.round(v) : v
          }
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                walls: (l.walls || []).map((w) => (w.id === wallId ? { ...w, ...clean } : w)),
              })),
            }),
          }
        }),

      removeWall: (wallId) =>
        set((s) => {
          const levelId = s.project.view.activeLevelId
          return {
            project: touch(s.project, {
              levels: mapLevel(s.project.levels, levelId, (l) => ({
                ...l,
                walls: (l.walls || []).filter((w) => w.id !== wallId),
                openings: (l.openings || []).filter((o) => o.wallId !== wallId),
              })),
            }),
          }
        }),
    }),
    {
      limit: 50, // 50-step history
      partialize: (state) => ({ project: state.project }),
    }
  )
)

// Temporal controls (undo/redo/clear) live on useProject.temporal.
export const temporalStore = useProject.temporal
