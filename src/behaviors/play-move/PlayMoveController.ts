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
  const [history, setHistory] = useState<string[]>([])
  const [colorIndex, setColorIndex] = useState(0)
  const regionCounterRef = useRef(0)

  const clear = useCallback(() => {
    setRegions([])
    setHistory([])
    setColorIndex(0)
  }, [])

  const placeRegion = useCallback(
    (sel: Selection): PlaceMoveResult => {
      const result = validateRectangle(
        sel,
        level.clues,
        regions,
        level.rows,
        level.cols,
      )

      if (!result.valid || !result.clue) {
        return {
          success: false,
          reason: result.reason,
          clueValue: result.clueValue,
          area: result.area,
        }
      }

      const { r0, c0, r1, c1 } = normalizeSelection(sel)
      const id = `region-${++regionCounterRef.current}`
      const color = HARMONIC_REGION_COLORS[colorIndex % HARMONIC_REGION_COLORS.length]

      const newRegion: Region = {
        id,
        row: r0,
        col: c0,
        width: c1 - c0 + 1,
        height: r1 - r0 + 1,
        clueRow: result.clue.row,
        clueCol: result.clue.col,
        clueValue: result.clue.value,
        color,
      }

      const newRegions = [...regions, newRegion]
      setRegions(newRegions)
      setHistory((h) => [...h, id])
      setColorIndex((i) => i + 1)

      if (isBoardComplete(level, newRegions)) {
        onComplete()
      }
      return {
        success: true,
        clueValue: result.clue.value,
        area: result.area,
      }
    },
    [level, regions, colorIndex, onComplete],
  )

  const removeRegion = useCallback((id: string) => {
    setRegions((r) => r.filter((reg) => reg.id !== id))
    setHistory((h) => h.filter((hid) => hid !== id))
  }, [])

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      return h.slice(0, -1)
    })
    setRegions((r) => {
      if (r.length === 0) return r
      return r.slice(0, -1)
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
