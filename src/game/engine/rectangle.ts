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

export function getRectangleCells(r0: number, c0: number, r1: number, c1: number): [number, number][] {
  const cells: [number, number][] = []
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++)
      cells.push([r, c])
  return cells
}

export function getRectangleArea(width: number, height: number): number {
  return width * height
}

export function getPossibleRectanglesForClue(
  clueRow: number,
  clueCol: number,
  clueValue: number,
  rows: number,
  cols: number
): Array<{ r0: number; c0: number; r1: number; c1: number }> {
  const rects: Array<{ r0: number; c0: number; r1: number; c1: number }> = []
  for (let h = 1; h <= clueValue; h++) {
    if (clueValue % h !== 0) continue
    const w = clueValue / h
    // all placements where clue is inside rect
    for (let r0 = Math.max(0, clueRow - h + 1); r0 <= clueRow && r0 + h - 1 < rows; r0++) {
      for (let c0 = Math.max(0, clueCol - w + 1); c0 <= clueCol && c0 + w - 1 < cols; c0++) {
        rects.push({ r0, c0, r1: r0 + h - 1, c1: c0 + w - 1 })
      }
    }
  }
  return rects
}
