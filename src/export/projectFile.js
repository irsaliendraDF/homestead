// The manual bridge between devices (and a backup): save the whole project as
// JSON, load one back. This is the ONLY way to move a design off this device —
// designs otherwise live in per-origin IndexedDB (see §0).
import { migrateProject } from '../store/useProject.js'

const safeName = (name) => (name || 'homestead').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'homestead'

/** Download the project as a .json file. */
export function downloadProject(project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName(project.name)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Read a picked file and return a migrated project (throws on bad JSON). */
export async function readProjectFile(file) {
  const text = await file.text()
  const parsed = JSON.parse(text)
  if (!parsed || !parsed.levels) throw new Error('That file is not a Homestead project.')
  return migrateProject(parsed)
}
