// Phase 8 — export. Headless checks: the PDF builds (vector, multi-page) without
// throwing and produces bytes; the project file round-trips; parsley is planted.
import { jsPDF } from 'jspdf'
import { buildPlanPages } from '../src/export/planPdf.js'
import { buildSpecPages } from '../src/export/specSheet.js'
import { readProjectFile } from '../src/export/projectFile.js'
import { useProject, makeDefaultProject } from '../src/store/useProject.js'
import { companionVerdict, PLANT_BY_ID } from '../src/lib/companions.js'

let failures = 0
function check(label, cond, extra = '') {
  if (!cond) failures++
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${cond ? '' : '  →  ' + extra}`)
}

console.log('\nparsley is in the catalog and companion-aware')
{
  check('parsley exists', !!PLANT_BY_ID['parsley'])
  check('parsley helps tomato (good)', companionVerdict('parsley', 'tomato').verdict === 'good')
}

console.log('\nPDF builds (vector, multi-page) and produces bytes')
{
  // A little three-level house with a room on each.
  useProject.getState().setProject(makeDefaultProject())
  useProject.getState().addRoom({ x: 0, y: 0, w: 144, d: 144 })
  useProject.getState().addRoom({ x: 144, y: 0, w: 120, d: 144 })
  useProject.getState().addBasement()
  const project = useProject.getState().project

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  buildPlanPages(doc, project, 'fit')
  buildSpecPages(doc, project)
  const pages = doc.internal.getNumberOfPages()
  const bytes = doc.output('arraybuffer').byteLength
  console.log(`  pages=${pages} bytes=${bytes}`)
  check('one page per level + spec pages', pages >= project.levels.length + 1)
  check('produced a non-trivial PDF', bytes > 1000)
}

console.log('\nproject file round-trips (save → open)')
{
  const project = makeDefaultProject()
  project.name = 'Round Trip'
  const json = JSON.stringify(project)
  const fakeFile = { text: async () => json }
  const loaded = await readProjectFile(fakeFile)
  check('name preserved', loaded.name === 'Round Trip')
  check('levels preserved + migrated (has landscape.systems)', Array.isArray(loaded.levels) && Array.isArray(loaded.landscape.systems))
  let threw = false
  try {
    await readProjectFile({ text: async () => '{"not":"a project"}' })
  } catch {
    threw = true
  }
  check('rejects a non-project file', threw)
}

console.log('')
if (failures > 0) {
  console.log(`✗ ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('✓ all Phase 8 checks passed')
}
