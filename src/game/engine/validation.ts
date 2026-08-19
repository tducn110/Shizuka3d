import type { Clue, Region, Selection } from "../types/shikaku.types"
import { normalizeSelection } from "./rectangle"

export interface ValidationResult {
  valid: boolean
  reason?: string
  clue?: Clue
}

export function getCluesInsideRectangle(
  r0: number, c0: number, r1: number, c1: number,
  clues: Clue[]
): Clue[] {
  return clues.filter(clue =>
    clue.row >= r0 && clue.row <= r1 &&
    clue.col >= c0 && clue.col <= c1
  )
}

export function hasRegionOverlap(
  r0: number, c0: number, r1: number, c1: number,
  regions: Region[]
): boolean {
  for (const region of regions) {
    if (r0 < region.row + region.height && r1 >= region.row &&
        c0 < region.col + region.width && c1 >= region.col) {
      return true
    }
  }
  return false
}

export function validateRectangle(
  sel: Selection,
  clues: Clue[],
  regions: Region[],
  rows: number,
  cols: number
): ValidationResult {
  const { r0, c0, r1, c1, area } = normalizeSelection(sel)

  if (r0 < 0 || c0 < 0 || r1 >= rows || c1 >= cols)
    return { valid: false, reason: "out of bounds" }

  if (hasRegionOverlap(r0, c0, r1, c1, regions))
    return { valid: false, reason: "overlap" }

  const inside = getCluesInsideRectangle(r0, c0, r1, c1, clues)
  if (inside.length === 0) return { valid: false, reason: "no clue" }
  if (inside.length > 1) return { valid: false, reason: "multiple clues" }

  const clue = inside[0]
  if (area !== clue.value) return { valid: false, reason: "wrong area" }

  return { valid: true, clue }
}
