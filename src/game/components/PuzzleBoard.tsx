import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import type { Level, Region, RegionDef, Selection, GameStatus } from "../types/shikaku.types"
import { normalizeSelection } from "../engine/rectangle"

interface Props {
  level: Level
  regions: Region[]
  hintRegion: RegionDef | null
  gameStatus: GameStatus
  onPlaceRegion: (sel: Selection) => boolean
  onRemoveRegion: (id: string) => void
}

export default function PuzzleBoard({
  level, regions, hintRegion, gameStatus, onPlaceRegion, onRemoveRegion
}: Props) {
  const { rows, cols, clues } = level
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(52)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const compute = () => {
      const { width, height } = el.getBoundingClientRect()
      const cs = Math.floor(Math.min(width / cols, height / rows))
      setCellSize(Math.max(28, Math.min(88, cs)))
    }
    compute()
    const obs = new ResizeObserver(compute)
    obs.observe(el)
    return () => obs.disconnect()
  }, [rows, cols])

  const boardW = cols * cellSize
  const boardH = rows * cellSize

  // Pointer interaction state
  const [selection, setSelection] = useState<Selection | null>(null)
  const [selState, setSelState] = useState<"dragging" | "invalid">("dragging")
  const dragging = useRef(false)
  const hasMoved = useRef(false)
  const startCell = useRef<{ row: number; col: number } | null>(null)
  const cellSizeRef = useRef(cellSize)
  useEffect(() => { cellSizeRef.current = cellSize }, [cellSize])

  const cellRegionMap = useMemo(() => {
    const map = new Map<string, Region>()
    for (const region of regions) {
      for (let r = region.row; r < region.row + region.height; r++)
        for (let c = region.col; c < region.col + region.width; c++)
          map.set(`${r},${c}`, region)
    }
    return map
  }, [regions])

  const getCellFromEvent = useCallback(
    (el: HTMLDivElement, clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect()
      const cs = cellSizeRef.current
      return {
        row: Math.max(0, Math.min(rows - 1, Math.floor((clientY - rect.top) / cs))),
        col: Math.max(0, Math.min(cols - 1, Math.floor((clientX - rect.left) / cs))),
      }
    },
    [rows, cols]
  )

  const disabled = gameStatus !== "playing"

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const cell = getCellFromEvent(e.currentTarget, e.clientX, e.clientY)
    dragging.current = true
    hasMoved.current = false
    startCell.current = cell
    setSelection({ startRow: cell.row, startCol: cell.col, endRow: cell.row, endCol: cell.col })
    setSelState("dragging")
  }, [disabled, getCellFromEvent])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !startCell.current) return
    const cell = getCellFromEvent(e.currentTarget, e.clientX, e.clientY)
    if (cell.row !== startCell.current.row || cell.col !== startCell.current.col) {
      hasMoved.current = true
    }
    setSelection({
      startRow: startCell.current.row,
      startCol: startCell.current.col,
      endRow: cell.row,
      endCol: cell.col,
    })
  }, [getCellFromEvent])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !startCell.current) {
      dragging.current = false
      return
    }
    dragging.current = false
    const cell = getCellFromEvent(e.currentTarget, e.clientX, e.clientY)

    if (!hasMoved.current) {
      // Single tap: remove region if one exists at this cell
      const existing = cellRegionMap.get(`${cell.row},${cell.col}`)
      if (existing) onRemoveRegion(existing.id)
      setSelection(null)
      startCell.current = null
      return
    }

    const sel = selection
    startCell.current = null
    if (!sel) return

    const valid = onPlaceRegion(sel)
    if (!valid) {
      setSelState("invalid")
      setTimeout(() => {
        setSelection(null)
        setSelState("dragging")
      }, 380)
    } else {
      setSelection(null)
    }
  }, [getCellFromEvent, cellRegionMap, onRemoveRegion, selection, onPlaceRegion])

  const handlePointerCancel = useCallback(() => {
    dragging.current = false
    startCell.current = null
    setSelection(null)
    setSelState("dragging")
  }, [])

  const selRect = selection ? normalizeSelection(selection) : null
  const isComplete = gameStatus === "completed"

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        style={{
          position: "relative",
          width: boardW,
          height: boardH,
          touchAction: "none",
          userSelect: "none",
          cursor: disabled ? "default" : "crosshair",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 6px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
          border: "1.5px solid #d6cbb8",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Layer 1: Cell grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          }}
        >
          {Array.from({ length: rows * cols }, (_, i) => {
            const r = Math.floor(i / cols)
            const c = i % cols
            return (
              <div
                key={i}
                style={{
                  background: "#fffdf8",
                  borderRight: c < cols - 1 ? "1px solid #e4d8c4" : undefined,
                  borderBottom: r < rows - 1 ? "1px solid #e4d8c4" : undefined,
                  boxSizing: "border-box",
                }}
              />
            )
          })}
        </div>

        {/* Layer 2: Completed regions */}
        {regions.map((region, i) => (
          <div
            key={region.id}
            style={{
              position: "absolute",
              left: region.col * cellSize,
              top: region.row * cellSize,
              width: region.width * cellSize,
              height: region.height * cellSize,
              background: region.color,
              border: "2px solid rgba(0,0,0,0.09)",
              borderRadius: 5,
              boxSizing: "border-box",
              pointerEvents: "none",
              animation: isComplete
                ? `regionPulse 0.45s ease-in-out ${i * 65}ms both`
                : undefined,
            }}
          />
        ))}

        {/* Layer 3: Hint highlight */}
        {hintRegion && (
          <div
            style={{
              position: "absolute",
              left: hintRegion.col * cellSize,
              top: hintRegion.row * cellSize,
              width: hintRegion.width * cellSize,
              height: hintRegion.height * cellSize,
              background: "rgba(255, 196, 0, 0.28)",
              border: "2.5px dashed rgba(200, 148, 0, 0.75)",
              borderRadius: 5,
              boxSizing: "border-box",
              pointerEvents: "none",
              animation: "hintGlow 0.7s ease-in-out infinite alternate",
            }}
          />
        )}

        {/* Layer 4: Selection preview */}
        {selRect && (
          <div
            style={{
              position: "absolute",
              left: selRect.c0 * cellSize,
              top: selRect.r0 * cellSize,
              width: selRect.width * cellSize,
              height: selRect.height * cellSize,
              background:
                selState === "invalid"
                  ? "rgba(240, 60, 60, 0.2)"
                  : "rgba(90, 130, 240, 0.18)",
              border:
                selState === "invalid"
                  ? "2px solid rgba(210, 50, 50, 0.55)"
                  : "2px solid rgba(80, 120, 220, 0.45)",
              borderRadius: 5,
              boxSizing: "border-box",
              pointerEvents: "none",
              animation: selState === "invalid" ? "shake 0.35s ease-in-out" : undefined,
            }}
          />
        )}

        {/* Layer 5: Clue numbers (always on top) */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {clues.map(clue => (
            <div
              key={`${clue.row}-${clue.col}`}
              style={{
                position: "absolute",
                left: clue.col * cellSize,
                top: clue.row * cellSize,
                width: cellSize,
                height: cellSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: Math.max(12, Math.min(24, cellSize * 0.42)),
                fontWeight: 700,
                color: "#2e2016",
                letterSpacing: "-0.02em",
                zIndex: 10,
              }}
            >
              {clue.value}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
