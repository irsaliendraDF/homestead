// Pure viewport math for the plan canvas. No React, no DOM — so it's testable
// and the same transform is used everywhere (screen<->world, zoom, fit).
//
// A viewport is { zoom, panX, panY } where:
//   zoom  = pixels per inch (1.0 == "100%")
//   panX  = screen-x (px) of world origin (inch 0)
//   panY  = screen-y (px) of world origin (inch 0)
// So: screen = pan + world * zoom.

export const ZOOM_MIN = 0.1 // 10%
export const ZOOM_MAX = 4.0 // 400%
export const FIT_PADDING = 0.9 // leave a 10% margin around the plot when fitting

export const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

export function worldToScreen(wx, wy, vp) {
  return { x: vp.panX + wx * vp.zoom, y: vp.panY + wy * vp.zoom }
}

export function screenToWorld(sx, sy, vp) {
  return { x: (sx - vp.panX) / vp.zoom, y: (sy - vp.panY) / vp.zoom }
}

/**
 * Zoom by `factor` about a fixed screen point (the cursor). The world point
 * under the cursor stays under the cursor — this is what makes wheel-zoom feel
 * anchored. Respects zoom clamps (so the pan only shifts by the zoom that
 * actually happened).
 */
export function zoomAtPoint(vp, factor, cursorX, cursorY) {
  const newZoom = clampZoom(vp.zoom * factor)
  const applied = newZoom / vp.zoom
  return {
    zoom: newZoom,
    panX: cursorX - (cursorX - vp.panX) * applied,
    panY: cursorY - (cursorY - vp.panY) * applied,
  }
}

/** Fit a plot (world inches) centered in a container (screen px). */
export function fitView(plotWidthIn, plotDepthIn, containerW, containerH, padding = FIT_PADDING) {
  if (plotWidthIn <= 0 || plotDepthIn <= 0 || containerW <= 0 || containerH <= 0) {
    return { zoom: 1, panX: 0, panY: 0 }
  }
  const zoom = clampZoom(Math.min(containerW / plotWidthIn, containerH / plotDepthIn) * padding)
  return {
    zoom,
    panX: (containerW - plotWidthIn * zoom) / 2,
    panY: (containerH - plotDepthIn * zoom) / 2,
  }
}
