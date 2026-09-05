import { useState, useCallback, useRef } from "react"
import type { Level, Region, Selection } from "../../core/types"
import { normalizeSelection } from "../../core/geometry"
import { validateRectangle } from "./moveValidation"
import { isBoardComplete } from "../match/completion"

const PASTEL_COLORS = [
  "#ffd6d6",
  "#d0e8ff",
  "#c8f5d8",
  "#fff3c8",
  "#e4d0ff",
  "#ffd0ec",
  "#c8f5ee",
  "#ffe4cc",
  "#cce8ff",
  "#ecffc8",
  "#fce0cc",
  "#ccf5e4",
  "#f5ccf0",
  "#e0f5cc",
  "#ccd4f5",
]

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
    (sel: Selection): boolean => {
      const result = validateRectangle(
        sel,
        level.clues,
        regions,
        level.rows,
        level.cols,
      )
      if (!result.valid || !result.clue) return false

      const { r0, c0, r1, c1 } = normalizeSelection(sel)
      const id = `region-${++regionCounterRef.current}`
      const color = PASTEL_COLORS[colorIndex % PASTEL_COLORS.length]

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
      return true
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
