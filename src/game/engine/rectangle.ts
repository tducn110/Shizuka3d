import type { NormalizedRect, Selection } from "../types/shikaku.types"

export function normalizeSelection(sel: Selection): NormalizedRect {
  const r0 = Math.min(sel.startRow, sel.endRow)
  const r1 = Math.max(sel.startRow, sel.endRow)
  const c0 = Math.min(sel.startCol, sel.endCol)
  const c1 = Math.max(sel.startCol, sel.endCol)
  const width = c1 - c0 + 1
  const height = r1 - r0 + 1
  return { r0, c0, r1, c1, width, height, area: width * height }
}
