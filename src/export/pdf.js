// The PDF builder pulls in jsPDF (heavy), so this module is dynamically imported
// only when the user actually exports — keeping it out of the main bundle.
import { jsPDF } from 'jspdf'
import { buildPlanPages } from './planPdf.js'
import { buildSpecPages } from './specSheet.js'

const safeName = (name) => (name || 'homestead').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'homestead'

/** One combined PDF: dimensioned plan pages (one per level) + the spec sheet. */
export function exportProjectPdf(project, scaleDen = 'fit') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  buildPlanPages(doc, project, scaleDen)
  buildSpecPages(doc, project)
  doc.save(`${safeName(project.name)}.pdf`)
}
