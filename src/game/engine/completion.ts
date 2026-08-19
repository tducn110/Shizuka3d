import type { Level, Region } from "../types/shikaku.types"

export function isBoardComplete(level: Level, regions: Region[]): boolean {
  return regions.length === level.clues.length
}
