import type { Level, Region, RegionDef } from "../../core/types"

export function getHintRegion(
  level: Level,
  regions: Region[],
): RegionDef | null {
  // ponytail: only consider a clue solved if region width*height matches clue value
  const solvedKeys = new Set(
    regions
      .filter((r) => r.width * r.height === r.clueValue)
      .map((r) => `${r.clueRow},${r.clueCol}`),
  )

  for (const clue of level.clues) {
    if (solvedKeys.has(`${clue.row},${clue.col}`)) continue

    const solRect = level.solution.find(
      (rect) =>
        clue.row >= rect.row &&
        clue.row < rect.row + rect.height &&
        clue.col >= rect.col &&
        clue.col < rect.col + rect.width,
    )
    if (solRect) return solRect
  }
  return null
}
