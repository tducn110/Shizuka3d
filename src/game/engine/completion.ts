import type { Level, Region } from "../types/shikaku.types"

export function isBoardComplete(level: Level, regions: Region[]): boolean {
  if (regions.length !== level.clues.length) return false

  const totalCells = level.rows * level.cols
  const covered = new Set<string>()
  const usedClues = new Set<string>()

  for (const region of regions) {
    // A region must cover its designated clue
    const clueKey = `${region.clueRow},${region.clueCol}`
    if (usedClues.has(clueKey)) return false
    usedClues.add(clueKey)

    for (let r = region.row; r < region.row + region.height; r++) {
      for (let c = region.col; c < region.col + region.width; c++) {
        const key = `${r},${c}`
        if (covered.has(key)) return false
        covered.add(key)
      }
    }
  }

  return covered.size === totalCells && usedClues.size === level.clues.length
}
