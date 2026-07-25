// IndexedDB persistence via idb-keyval. Designs live browser-local only — this
// is the entire storage layer. Nothing here ever calls the network.
//
// Layout:
//   homestead:index            → { activeId, summaries: [{ id, name, updatedAt }] }
//   homestead:project:<id>     → { project, viewport }   (the full saved blob)
import { get, set, del, keys } from 'idb-keyval'

const INDEX_KEY = 'homestead:index'
const projectKey = (id) => `homestead:project:${id}`

export async function loadIndex() {
  return (await get(INDEX_KEY)) ?? { activeId: null, summaries: [] }
}

export async function saveIndex(index) {
  await set(INDEX_KEY, index)
}

/** Upsert a project's summary row and (optionally) set it active. */
export async function upsertSummary({ id, name, updatedAt }, makeActive = false) {
  const index = await loadIndex()
  const summaries = index.summaries.filter((s) => s.id !== id)
  summaries.push({ id, name, updatedAt })
  summaries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  const next = { activeId: makeActive ? id : index.activeId, summaries }
  await saveIndex(next)
  return next
}

export async function setActiveId(id) {
  const index = await loadIndex()
  await saveIndex({ ...index, activeId: id })
}

export async function saveProjectBlob(id, blob) {
  await set(projectKey(id), blob)
}

export async function loadProjectBlob(id) {
  return get(projectKey(id))
}

export async function deleteProject(id) {
  await del(projectKey(id))
  const index = await loadIndex()
  const summaries = index.summaries.filter((s) => s.id !== id)
  const activeId = index.activeId === id ? (summaries[0]?.id ?? null) : index.activeId
  await saveIndex({ activeId, summaries })
  return { activeId, summaries }
}

/** Debug helper: every persisted project key. */
export async function allProjectKeys() {
  return (await keys()).filter((k) => typeof k === 'string' && k.startsWith('homestead:project:'))
}
