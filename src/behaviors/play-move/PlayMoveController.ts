import { useState, useCallback, useRef } from "react"
import type { Level, Region, Selection } from "../../core/types"
import { normalizeSelection } from "../../core/geometry"
import { validateRectangle, type ValidationReason } from "./moveValidation"
import { isBoardComplete } from "../match/completion"

export const HARMONIC_REGION_COLORS = [
  "#7ba194", // sage green
  "#d4a373", // warm amber
  "#b58296", // dusty mauve
  "#7293b5", // slate blue
  "#c98169", // terracotta
  "#8ca672", // muted olive
  "#9883b5", // iris lavender
  "#6da39c", // calm teal
  "#c79275", // soft clay
  "#859bb3", // dusty sky
]

export interface PlaceMoveResult {
  success: boolean
  reason?: ValidationReason
  clueValue?: number
  area?: number
}

export function usePlayMoveController(level: Level, onComplete: () => void) {
  const [regions, setRegions] = useState<Region[]>([])
  const [history, setHistory] = useState<Region[][]>([])
  const [colorIndex, setColorIndex] = useState(0)
  const regionCounterRef = useRef(0)

  const clear = useCallback(() => {
    setRegions([])
    setHistory([])
    setColorIndex(0)
  }, [])

  const placeRegion = useCallback(
    (sel: Selection): PlaceMoveResult => {
      const { r0, c0, r1, c1, area } = normalizeSelection(sel)

      // Bounds validation
      if (r0 < 0 || c0 < 0 || r1 >= level.rows || c1 >= level.cols) {
        return {
          success: false,
          reason: "out of bounds",
          area,
        }
      }

      // Check clues inside this rectangle
      const cluesInside = level.clues.filter(
        (clue) => clue.row >= r0 && clue.row <= r1 && clue.col >= c0 && clue.col <= c1,
      )
      const clue = cluesInside.length === 1 ? cluesInside[0] : undefined

      // Overlap resolution: remove any existing regions that intersect with the new rectangle
      const nextRegions: Region[] = []
      for (const reg of regions) {
        const overlaps =
          r0 < reg.row + reg.height &&
          r1 >= reg.row &&
          c0 < reg.col + reg.width &&
          c1 >= reg.col
        if (!overlaps) {
          nextRegions.push(reg)
        }
      }

      // Save previous board state for reliable undo
      setHistory((prev) => [...prev, regions])

      const id = `region-${++regionCounterRef.current}`
      const color = HARMONIC_REGION_COLORS[colorIndex % HARMONIC_REGION_COLORS.length]

      const newRegion: Region = {
        id,
        row: r0,
        col: c0,
        width: c1 - c0 + 1,
        height: r1 - r0 + 1,
        clueRow: clue ? clue.row : -1,
        clueCol: clue ? clue.col : -1,
        clueValue: clue ? clue.value : area,
        color,
      }

      const updatedRegions = [...nextRegions, newRegion]
      setRegions(updatedRegions)
      setColorIndex((i) => i + 1)

      // Win condition: Scope 1 (fill 100% board) & Scope 2 (1 valid solution matching clues)
      if (isBoardComplete(level, updatedRegions)) {
        onComplete()
      }

      return {
        success: true,
        clueValue: clue?.value ?? area,
        area,
      }
    },
    [level, regions, colorIndex, onComplete],
  )

  const removeRegion = useCallback((id: string) => {
    setHistory((prev) => [...prev, regions])
    setRegions((r) => r.filter((reg) => reg.id !== id))
  }, [regions])

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev
      const previousState = prev[prev.length - 1]
      setRegions(previousState)
      return prev.slice(0, -1)
    })
  }, [])

  return {
    regions,
    history,
    placeRegion,
    removeRegion,
    undo,
    clear,
  }
}
