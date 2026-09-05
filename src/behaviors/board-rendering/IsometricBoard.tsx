import type { GameStatus, Level, Region, RegionDef, Selection } from "../../core/types"
import Board3DViewport from "./Board3DViewport"

interface Props {
  level: Level
  regions: Region[]
  hintRegion: RegionDef | null
  boardRevision: number
  gameStatus: GameStatus
  onPlaceRegion: (selection: Selection) => boolean
  onRemoveRegion: (id: string) => void
}

// Compatibility boundary: game state and its prop contract remain unchanged;
// only the board presentation implementation is replaced.
export default function IsometricBoard(props: Props) {
  return <Board3DViewport {...props} />
}
