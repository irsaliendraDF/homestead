// Lightweight entry: project save/open (no heavy deps). The PDF builder lives in
// ./pdf.js and is dynamically imported at call time so jsPDF stays out of the
// main bundle.
export { downloadProject, readProjectFile } from './projectFile.js'
