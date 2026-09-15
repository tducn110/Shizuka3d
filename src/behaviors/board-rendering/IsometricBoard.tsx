import type { GameStatus, Level, Region, RegionDef, Selection } from "../../core/types"
import Board3DViewport from "./Board3DViewport"

interface Props {
  level: Level
  regions: Region[]
  hintRegion: RegionDef | null
  boardRevision: number
  gameStatus: GameStatus
  onPlaceRegion: (selection: Selection) => any
  onRemoveRegion: (id: string) => void
  tutorialTarget?: RegionDef | null
  highlightClue?: { row: number; col: number } | null
}

// Compatibility boundary: game state and its prop contract remain unchanged;
// only the board presentation implementation is replaced.
export default function IsometricBoard(props: Props) {
  return <Board3DViewport {...props} />
}
