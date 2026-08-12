import type { Level, Region, RegionDef } from "../types/shikaku.types"

export function getHintRegion(level: Level, regions: Region[]): RegionDef | null {
  const solvedKeys = new Set(regions.map(r => `${r.clueRow},${r.clueCol}`))

  for (const clue of level.clues) {
    if (solvedKeys.has(`${clue.row},${clue.col}`)) continue

    const solRect = level.solution.find(rect =>
      clue.row >= rect.row &&
      clue.row < rect.row + rect.height &&
      clue.col >= rect.col &&
      clue.col < rect.col + rect.width
    )
    if (solRect) return solRect
  }
  return null
}
