import type { Level, Region } from "../types/shikaku.types"

export function isBoardComplete(level: Level, regions: Region[]): boolean {
  if (regions.length !== level.clues.length) return false

  const totalCells = level.rows * level.cols
  const covered = new Set<string>()
  const usedClues = new Set<string>()

  const validClues = new Map<string, number>()
  for (const c of level.clues) {
    validClues.set(`${c.row},${c.col}`, c.value)
  }

  for (const region of regions) {
    const clueKey = `${region.clueRow},${region.clueCol}`
    if (!validClues.has(clueKey)) return false
    if (usedClues.has(clueKey)) return false
    usedClues.add(clueKey)

    const area = region.width * region.height
    if (area !== validClues.get(clueKey)) return false

    if (
      region.clueRow < region.row ||
      region.clueRow >= region.row + region.height ||
      region.clueCol < region.col ||
      region.clueCol >= region.col + region.width
    ) {
      return false
    }

    for (let r = region.row; r < region.row + region.height; r++) {
      for (let c = region.col; c < region.col + region.width; c++) {
        if (r < 0 || r >= level.rows || c < 0 || c >= level.cols) return false
        const key = `${r},${c}`
        if (covered.has(key)) return false
        covered.add(key)
      }
    }
  }

  return covered.size === totalCells && usedClues.size === level.clues.length
}
