import type { Level, Clue, RegionDef } from "../types/shikaku.types"

// Seeded LCG — deterministic, reproducible per seed
function makeLcg(seed: number) {
  let s = seed >>> 0
  return (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Recursively partition the board into rectangles.
// minArea=2 prevents 1×1 clue cells (which can't be drawn by dragging).
function partition(
  rows: number,
  cols: number,
  maxArea: number,
  stopProb: number,
  rng: () => number,
): RegionDef[] {
  const minArea = 2

  function split(r0: number, c0: number, r1: number, c1: number): RegionDef[] {
    const h = r1 - r0 + 1
    const w = c1 - c0 + 1
    const area = h * w
    const rect: RegionDef = { row: r0, col: c0, height: h, width: w }

    if (area <= minArea) return [rect]
    if (area <= maxArea && rng() < stopProb) return [rect]

    for (const horiz of shuffle([true, false], rng)) {
      if (horiz && h >= 2) {
        const minH = Math.ceil(minArea / w)
        if (2 * minH > h) continue
        const lo = minH
        const hi = h - minH
        const sp = lo + Math.floor(rng() * (hi - lo + 1))
        return [
          ...split(r0, c0, r0 + sp - 1, c1),
          ...split(r0 + sp, c0, r1, c1),
        ]
      }
      if (!horiz && w >= 2) {
        const minW = Math.ceil(minArea / h)
        if (2 * minW > w) continue
        const lo = minW
        const hi = w - minW
        const sp = lo + Math.floor(rng() * (hi - lo + 1))
        return [
          ...split(r0, c0, r1, c0 + sp - 1),
          ...split(r0, c0 + sp, r1, c1),
        ]
      }
    }

    return [rect]
  }

  return split(0, 0, rows - 1, cols - 1)
}

function placeClues(solution: RegionDef[], rng: () => number): Clue[] {
  return solution.map((rect) => ({
    row: rect.row + Math.floor(rng() * rect.height),
    col: rect.col + Math.floor(rng() * rect.width),
    value: rect.height * rect.width,
  }))
}

interface Spec {
  rows: number
  cols: number
  maxArea: number
  stopProb: number
}

function specFor(i: number): Spec {
  if (i < 10) return { rows: 5, cols: 5, maxArea: 6, stopProb: 0.55 }
  if (i < 20) return { rows: 5, cols: 6, maxArea: 7, stopProb: 0.5 }
  if (i < 30) return { rows: 6, cols: 6, maxArea: 8, stopProb: 0.47 }
  if (i < 40) return { rows: 6, cols: 7, maxArea: 9, stopProb: 0.44 }
  if (i < 50) return { rows: 7, cols: 7, maxArea: 9, stopProb: 0.41 }
  if (i < 60) return { rows: 7, cols: 8, maxArea: 10, stopProb: 0.38 }
  if (i < 70) return { rows: 8, cols: 8, maxArea: 12, stopProb: 0.36 }
  if (i < 80) return { rows: 8, cols: 9, maxArea: 12, stopProb: 0.33 }
  if (i < 90) return { rows: 9, cols: 9, maxArea: 14, stopProb: 0.31 }
  return { rows: 9, cols: 10, maxArea: 15, stopProb: 0.29 }
}

function makeLevel(id: number): Level {
  const i = id - 1
  const { rows, cols, maxArea, stopProb } = specFor(i)
  // Spread seeds across the 32-bit space using Knuth multiplicative hashing
  const seed = (0xdeadbeef + i * 0x9e3779b9) >>> 0
  const rng = makeLcg(seed)
  const solution = partition(rows, cols, maxArea, stopProb, rng)
  const clues = placeClues(solution, rng)
  return { id, rows, cols, clues, solution }
}

export const LEVELS: Level[] = Array.from({ length: 100 }, (_, i) =>
  makeLevel(i + 1),
)
