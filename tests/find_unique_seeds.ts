import { LEVELS } from "../src/data/levels"
// We'll write a quick script to find seeds
import fs from "fs"

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

function partition(
  rows: number,
  cols: number,
  maxArea: number,
  stopProb: number,
  rng: () => number,
): any[] {
  const minArea = 2
  function split(r0: number, c0: number, r1: number, c1: number): any[] {
    const h = r1 - r0 + 1
    const w = c1 - c0 + 1
    const area = h * w
    const rect = { row: r0, col: c0, height: h, width: w }
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

function solveLevel(rows: number, cols: number, clues: any[]): number {
  const board = Array.from({ length: rows }, () => new Array(cols).fill(-1))
  let solutionsFound = 0
  function backtrack(clueIdx: number) {
    if (solutionsFound >= 2) return
    if (clueIdx === clues.length) {
      solutionsFound++
      return
    }
    const clue = clues[clueIdx]
    for (let h = 1; h <= clue.value; h++) {
      if (clue.value % h !== 0) continue
      const w = clue.value / h
      for (
        let r0 = Math.max(0, clue.row - h + 1);
        r0 <= clue.row && r0 + h - 1 < rows;
        r0++
      ) {
        for (
          let c0 = Math.max(0, clue.col - w + 1);
          c0 <= clue.col && c0 + w - 1 < cols;
          c0++
        ) {
          let canPlace = true
          for (let r = r0; r < r0 + h; r++) {
            for (let c = c0; c < c0 + w; c++) {
              if (board[r][c] !== -1) {
                canPlace = false
                break
              }
            }
            if (!canPlace) break
          }
          if (canPlace) {
            for (let r = r0; r < r0 + h; r++) {
              for (let c = c0; c < c0 + w; c++) board[r][c] = clueIdx
            }
            backtrack(clueIdx + 1)
            for (let r = r0; r < r0 + h; r++) {
              for (let c = c0; c < c0 + w; c++) board[r][c] = -1
            }
          }
        }
      }
    }
  }
  backtrack(0)
  return solutionsFound
}

function specFor(i: number) {
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

const uniqueSeeds: number[] = []

for (let i = 0; i < 100; i++) {
  const { rows, cols, maxArea, stopProb } = specFor(i)
  let attempt = 0
  while (true) {
    const seed = (0xdeadbeef + i * 0x9e3779b9 + attempt * 0x1234567) >>> 0
    const rng = makeLcg(seed)
    const solution = partition(rows, cols, maxArea, stopProb, rng)
    const clues = solution.map((rect) => ({
      row: rect.row + Math.floor(rng() * rect.height),
      col: rect.col + Math.floor(rng() * rect.width),
      value: rect.height * rect.width,
    }))

    if (solveLevel(rows, cols, clues) === 1) {
      uniqueSeeds.push(seed)
      break
    }
    attempt++
  }
}

console.log(JSON.stringify(uniqueSeeds))
