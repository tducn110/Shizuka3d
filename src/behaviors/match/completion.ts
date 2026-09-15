import type { Level, Region } from "../../core/types"

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
    // If region explicitly has claimed clue, check it exists
    if (region.clueRow >= 0 && region.clueCol >= 0) {
      const clueKey = `${region.clueRow},${region.clueCol}`
      if (!validClues.has(clueKey)) return false
    }

    // Cells must not overlap and must stay within bounds
    for (let r = region.row; r < region.row + region.height; r++) {
      for (let c = region.col; c < region.col + region.width; c++) {
        if (r < 0 || r >= level.rows || c < 0 || c >= level.cols) return false
        const key = `${r},${c}`
        if (covered.has(key)) return false
        covered.add(key)
      }
    }

    // Find actual clues inside this region
    const cluesInRegion = level.clues.filter(
      (clue) =>
        clue.row >= region.row &&
        clue.row < region.row + region.height &&
        clue.col >= region.col &&
        clue.col < region.col + region.width,
    )

    // Scope 2: Each region must contain exactly 1 clue
    if (cluesInRegion.length !== 1) return false
    const clue = cluesInRegion[0]

    // If region claimed a clue coordinate, it must match the actual clue
    if (
      region.clueRow >= 0 &&
      region.clueCol >= 0 &&
      (region.clueRow !== clue.row || region.clueCol !== clue.col)
    ) {
      return false
    }

    const clueKey = `${clue.row},${clue.col}`
    if (usedClues.has(clueKey)) return false
    usedClues.add(clueKey)

    // Scope 2: Area of rectangle must match the clue's value
    const area = region.width * region.height
    if (area !== clue.value) return false
  }

  // Scope 1: Entire board filled (100% of cells covered) and all clues used
  return covered.size === totalCells && usedClues.size === level.clues.length
}

