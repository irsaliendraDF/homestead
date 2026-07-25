// The number layer. Everything is INTEGER INCHES internally; feet/inches and
// metric are display/entry concerns only, handled here and nowhere else.
import { UNITS } from '../config.js'

const IN_PER_M = 39.3701
const IN_PER_CM = 0.393701
const IN_PER_MM = 0.0393701

/**
 * Format integer inches as feet-and-inches: 150 → `12' 6"`, 144 → `12'`,
 * 6 → `6"`, 0 → `0"`. Rounds to the nearest whole inch for display.
 * @param {number} inches
 * @returns {string}
 */
export function formatFeetInches(inches) {
  if (inches == null || Number.isNaN(inches)) return '—'
  const sign = inches < 0 ? '-' : ''
  const total = Math.round(Math.abs(inches))
  const feet = Math.floor(total / 12)
  const rem = total % 12
  if (feet > 0 && rem > 0) return `${sign}${feet}' ${rem}"`
  if (feet > 0) return `${sign}${feet}'`
  return `${sign}${rem}"`
}

/**
 * Parse a length string to integer inches. Accepts, at minimum:
 *   `12'6"`, `12' 6"`, `12.5'`, `150"`, `12 ft 6 in`
 * Also accepts a bare number (treated as inches) and, when
 * UNITS.ACCEPT_METRIC_INPUT is on, metric entry: `30m`, `9.1m`, `450cm`, `50mm`.
 * Returns NaN if nothing parseable is found.
 * @param {string} str
 * @returns {number} integer inches, or NaN
 */
export function parseFeetInches(str) {
  if (typeof str !== 'string') return NaN
  const s = str.trim().toLowerCase()
  if (s === '') return NaN

  // Metric first, so `30m` isn't misread as 30 inches by the bare-number fallback.
  if (UNITS.ACCEPT_METRIC_INPUT) {
    const m = s.match(/^(-?\d*\.?\d+)\s*(mm|cm|m)$/)
    if (m) {
      const v = parseFloat(m[1])
      const factor = m[2] === 'mm' ? IN_PER_MM : m[2] === 'cm' ? IN_PER_CM : IN_PER_M
      return Math.round(v * factor)
    }
  }

  let total = 0
  let matched = false

  // Feet: a number followed by ' or ft / feet.
  const feet = s.match(/(-?\d*\.?\d+)\s*(?:'|ft\b|feet\b)/)
  if (feet) {
    total += parseFloat(feet[1]) * 12
    matched = true
  }

  // Inches: a number followed by " or in / inch / inches. Guard against
  // re-matching the feet number by requiring the inch unit token.
  const inch = s.match(/(-?\d*\.?\d+)\s*(?:"|''|in\b|inch(?:es)?\b)/)
  if (inch) {
    total += parseFloat(inch[1])
    matched = true
  }

  // Bare number → inches.
  if (!matched) {
    const bare = s.match(/^-?\d*\.?\d+$/)
    if (bare) {
      total = parseFloat(bare[0])
      matched = true
    }
  }

  return matched ? Math.round(total) : NaN
}

// Convenience converters, kept here so no component reinvents them.
export const feetToInches = (ft) => Math.round(ft * 12)
export const inchesToFeet = (inches) => inches / 12
export const metersToInches = (m) => Math.round(m * IN_PER_M)
