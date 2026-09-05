export interface Clue {
  row: number
  col: number
  value: number
}

export interface RegionDef {
  row: number
  col: number
  width: number
  height: number
}

export interface Level {
  id: number
  rows: number
  cols: number
  clues: Clue[]
  solution: RegionDef[]
}

export interface Region {
  id: string
  row: number
  col: number
  width: number
  height: number
  clueRow: number
  clueCol: number
  clueValue: number
  color: string
}

export interface NormalizedRect {
  r0: number
  c0: number
  r1: number
  c1: number
  width: number
  height: number
  area: number
}

export type GameStatus = "playing" | "paused" | "completed"

export interface Selection {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}
