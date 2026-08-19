import { useState, useCallback } from "react"
import type {
  Level,
  Region,
  Selection,
  GameStatus,
  RegionDef,
} from "../types/shikaku.types"
import { normalizeSelection } from "../engine/rectangle"
import { validateRectangle } from "../engine/validation"
import { isBoardComplete } from "../engine/completion"
import { getHintRegion } from "../engine/hints"

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

const INITIAL_HINTS = 3
let regionCounter = 0

export function useShikakuGame(initialLevel: Level) {
  const [level, setLevel] = useState<Level>(initialLevel)
  const [regions, setRegions] = useState<Region[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [hintCount, setHintCount] = useState(INITIAL_HINTS)
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing")
  const [hintRegion, setHintRegion] = useState<RegionDef | null>(null)
  const [colorIndex, setColorIndex] = useState(0)

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
      const id = `region-${++regionCounter}`
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
        setGameStatus("completed")
      }
      return true
    },
    [level, regions, colorIndex],
  )

  const removeRegion = useCallback((id: string) => {
    setRegions((r) => r.filter((reg) => reg.id !== id))
    setHistory((h) => h.filter((hid) => hid !== id))
  }, [])

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      const lastId = h[h.length - 1]
      setRegions((r) => r.filter((reg) => reg.id !== lastId))
      return h.slice(0, -1)
    })
  }, [])

  const showHint = useCallback(() => {
    if (hintCount <= 0) return
    const hint = getHintRegion(level, regions)
    if (!hint) return
    setHintCount((n) => n - 1)
    setHintRegion(hint)
    setTimeout(() => setHintRegion(null), 1800)
  }, [hintCount, level, regions])

  const restart = useCallback(() => {
    setRegions([])
    setHistory([])
    setHintCount(INITIAL_HINTS)
    setGameStatus("playing")
    setHintRegion(null)
    setColorIndex(0)
  }, [])

  const loadLevel = useCallback((newLevel: Level) => {
    setLevel(newLevel)
    setRegions([])
    setHistory([])
    setHintCount(INITIAL_HINTS)
    setGameStatus("playing")
    setHintRegion(null)
    setColorIndex(0)
  }, [])

  const pause = useCallback(() => setGameStatus("paused"), [])
  const resume = useCallback(() => setGameStatus("playing"), [])

  return {
    level,
    regions,
    history,
    hintCount,
    gameStatus,
    hintRegion,
    placeRegion,
    removeRegion,
    undo,
    showHint,
    restart,
    loadLevel,
    pause,
    resume,
  }
}
