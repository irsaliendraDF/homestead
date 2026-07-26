import { create } from 'zustand'
import { useProject, makeDefaultProject, uid, migrateProject } from './useProject.js'
import { useViewport } from './useViewport.js'
import * as db from './persistence.js'

// Orchestrates the three concerns — design (useProject), camera (useViewport),
// and multi-project persistence — so components don't have to. Also owns the
// debounced autosave.

export const useSession = create((set) => ({
  ready: false,
  activeId: null,
  summaries: [],
  fitOnLoad: false, // true → the canvas should fit the plot on first measure
  _set: set,
}))

const viewportData = () => {
  const { zoom, panX, panY, showGrid } = useViewport.getState()
  return { zoom, panX, panY, showGrid }
}

function currentBlob() {
  return { project: useProject.getState().project, viewport: viewportData() }
}

function summaryOf(project) {
  return { id: project.id, name: project.name, updatedAt: project.updatedAt }
}

// ── Autosave (debounced 800ms) ────────────────────────────
let saveTimer = null
let subscribed = false

async function flushSave() {
  const project = useProject.getState().project
  await db.saveProjectBlob(project.id, currentBlob())
  const index = await db.upsertSummary(summaryOf(project))
  useSession.getState()._set({ summaries: index.summaries })
}

function scheduleSave() {
  if (!useSession.getState().ready) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    flushSave()
  }, 800)
}

function startAutosave() {
  if (subscribed) return
  subscribed = true
  useProject.subscribe(scheduleSave)
  useViewport.subscribe(scheduleSave)
}

// ── Public actions ────────────────────────────────────────

let initialized = false

export async function initSession() {
  if (initialized) return
  initialized = true

  const index = await db.loadIndex()
  const activeId = index.activeId

  if (activeId) {
    const blob = await db.loadProjectBlob(activeId)
    if (blob?.project) {
      useProject.getState().setProject(migrateProject(blob.project))
      if (blob.viewport) useViewport.getState().setView(blob.viewport)
      useProject.temporal.getState().clear()
      useSession.getState()._set({
        ready: true,
        activeId,
        summaries: index.summaries,
        fitOnLoad: false, // restore the saved view, don't override it
      })
      startAutosave()
      return
    }
  }

  // Nothing stored yet — persist the current default project as the first one.
  const project = useProject.getState().project
  await db.saveProjectBlob(project.id, currentBlob())
  const next = await db.upsertSummary(summaryOf(project), true)
  useProject.temporal.getState().clear()
  useSession.getState()._set({
    ready: true,
    activeId: project.id,
    summaries: next.summaries,
    fitOnLoad: true, // brand-new project → fit the plot to the canvas
  })
  startAutosave()
}

export async function newProject() {
  const project = makeDefaultProject()
  useProject.getState().setProject(project)
  useViewport.getState().reset()
  useProject.temporal.getState().clear()
  await db.saveProjectBlob(project.id, currentBlob())
  const index = await db.upsertSummary(summaryOf(project), true)
  useSession.getState()._set({ activeId: project.id, summaries: index.summaries, fitOnLoad: true })
}

export async function duplicateProject() {
  const src = useProject.getState().project
  const copy = {
    ...structuredClone(src),
    id: uid(),
    name: `${src.name} copy`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  useProject.getState().setProject(copy)
  useProject.temporal.getState().clear()
  await db.saveProjectBlob(copy.id, currentBlob())
  const index = await db.upsertSummary(summaryOf(copy), true)
  useSession.getState()._set({ activeId: copy.id, summaries: index.summaries })
}

export async function switchProject(id) {
  if (id === useSession.getState().activeId) return
  const blob = await db.loadProjectBlob(id)
  if (!blob?.project) return
  useProject.getState().setProject(migrateProject(blob.project))
  useViewport.getState().setView(blob.viewport ?? {})
  useProject.temporal.getState().clear()
  await db.setActiveId(id)
  useSession.getState()._set({ activeId: id, fitOnLoad: false })
}

/** Load a project from an opened file as a NEW project (never overwrites). */
export async function importProject(project) {
  const copy = { ...project, id: uid(), name: project.name || 'Imported homestead', updatedAt: new Date().toISOString() }
  useProject.getState().setProject(migrateProject(copy))
  useViewport.getState().reset()
  useProject.temporal.getState().clear()
  await db.saveProjectBlob(copy.id, currentBlob())
  const index = await db.upsertSummary(summaryOf(copy), true)
  useSession.getState()._set({ activeId: copy.id, summaries: index.summaries, fitOnLoad: true })
}

export async function removeProject(id) {
  const { summaries } = await db.deleteProject(id)
  useSession.getState()._set({ summaries })
  // If we deleted the active one, switch to the newest remaining (or a fresh one).
  if (useSession.getState().activeId === id) {
    if (summaries[0]) await switchProject(summaries[0].id)
    else await newProject()
  }
}
