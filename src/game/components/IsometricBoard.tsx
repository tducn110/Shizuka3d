import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import type {
  Level,
  Region,
  RegionDef,
  Selection,
  GameStatus,
} from "../types/shikaku.types"
import { normalizeSelection } from "../engine/rectangle"
import {
  useCameraRotation,
  formatPt,
  project3D,
} from "../hooks/useCameraRotation"
import {
  Camera,
  RotateCcw,
  RotateCw,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react"

// Screen (clientX/Y) → fractional grid (col, row) for ANY camera rotation theta
function screenToGrid3D(
  svgEl: SVGSVGElement,
  clientX: number,
  clientY: number,
  S: number,
  xc: number,
  yc: number,
  theta: number,
): { col: number row: number } | null {
  const ctm = svgEl.getScreenCTM()
  if (!ctm) return null
  const pt = svgEl.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const { x: sx, y: sy } = pt.matrixTransform(ctm.inverse())

  // Ground plane z=0 projection inverse
  const rx = sx / S
  const ry = (sy * 2) / S

  const col = xc + rx * Math.cos(theta) + ry * Math.sin(theta)
  const row = yc - rx * Math.sin(theta) + ry * Math.cos(theta)

  return { col, row }
}

// ── Color helpers ────────────────────────────────────────────────────────────

function deriveShades(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const toHex = (rv: number, gv: number, bv: number) =>
    "#" +
    [rv, gv, bv].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")
  return {
    top: toHex(
      r + (255 - r) * 0.22,
      g + (255 - g) * 0.22,
      b + (255 - b) * 0.22,
    ),
    right: hex,
    left: toHex(r * 0.68, g * 0.68, b * 0.68),
  }
}

// Visual height per region
function boxH(clueValue: number): number {
  return Math.max(0.7, clueValue * 0.28)
}

interface Props {
  level: Level
  regions: Region[]
  hintRegion: RegionDef | null
  gameStatus: GameStatus
  onPlaceRegion: (sel: Selection) => boolean
  onRemoveRegion: (id: string) => void
}

export default function IsometricBoard({
  level,
  regions,
  hintRegion,
  gameStatus,
  onPlaceRegion,
  onRemoveRegion,
}: Props) {
  const { rows, cols, clues } = level
  const xc = cols / 2
  const yc = rows / 2

  // Camera rotation hook with automatic sway ("quay qua quay lại")
  const { angle, isSwaying, toggleSway, rotateLeft, rotateRight, resetCamera } =
    useCameraRotation({
      autoSway: true,
      swaySpeed: 0.65,
      swayAmplitude: 0.35,
    })

  // Container resize → compute scale S
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [S, setS] = useState(36)

  const maxH = useMemo(() => {
    const maxClue = Math.max(...clues.map((c) => c.value), 6)
    return boxH(maxClue)
  }, [clues])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const compute = () => {
      const { width, height } = el.getBoundingClientRect()
      const byW = width / (cols + rows + 2)
      const byH = height / ((cols + rows) * 0.5 + maxH + 2)
      setS(Math.max(16, Math.min(72, Math.floor(Math.min(byW, byH) * 0.88))))
    }
    compute()
    const obs = new ResizeObserver(compute)
    obs.observe(el)
    return () => obs.disconnect()
  }, [rows, cols, maxH])

  // Smooth mouse parallax
  const targetMouse = useRef({ x: 0, y: 0 })
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  const onGlobalMove = useCallback((e: MouseEvent) => {
    targetMouse.current = {
      x: (e.clientX / window.innerWidth - 0.5) * 2,
      y: (e.clientY / window.innerHeight - 0.5) * 2,
    }
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", onGlobalMove, { passive: true })
    let raf: number
    const tick = () => {
      setMouse((prev) => ({
        x: prev.x + (targetMouse.current.x - prev.x) * 0.08,
        y: prev.y + (targetMouse.current.y - prev.y) * 0.08,
      }))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener("mousemove", onGlobalMove)
      cancelAnimationFrame(raf)
    }
  }, [onGlobalMove])

  // Region box height animation (spring on placement)
  const animH = useRef<Map<string, { curr: number target: number }>>(new Map())
  const [, bumpRender] = useState(0)

  useEffect(() => {
    const map = animH.current
    const ids = new Set(regions.map((r) => r.id))
    for (const r of regions) {
      if (!map.has(r.id)) map.set(r.id, { curr: 0, target: boxH(r.clueValue) })
      else map.get(r.id)!.target = boxH(r.clueValue)
    }
    for (const id of map.keys()) if (!ids.has(id)) map.delete(id)
  }, [regions])

  useEffect(() => {
    let raf: number
    const step = () => {
      let dirty = false
      for (const state of animH.current.values()) {
        const d = (state.target - state.curr) * 0.14
        if (Math.abs(d) > 0.001) {
          state.curr += d
          dirty = true
        }
      }
      if (dirty) bumpRender((n) => n + 1)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Pointer drag state
  const [selection, setSelection] = useState<Selection | null>(null)
  const [selState, setSelState] = useState<"dragging" | "invalid">("dragging")
  const dragging = useRef(false)
  const hasMoved = useRef(false)
  const startCell = useRef<{ row: number col: number } | null>(null)

  const clampCell = useCallback(
    (col: number, row: number) => ({
      row: Math.max(0, Math.min(rows - 1, Math.floor(row))),
      col: Math.max(0, Math.min(cols - 1, Math.floor(col))),
    }),
    [rows, cols],
  )

  const cellRegionMap = useMemo(() => {
    const map = new Map<string, Region>()
    for (const region of regions)
      for (let r = region.row; r < region.row + region.height; r++)
        for (let c = region.col; c < region.col + region.width; c++)
          map.set(`${r},${c}`, region)
    return map
  }, [regions])

  const disabled = gameStatus !== "playing"

  const getCell = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current) return null
      const raw = screenToGrid3D(
        svgRef.current,
        e.clientX,
        e.clientY,
        S,
        xc,
        yc,
        angle,
      )
      if (!raw) return null
      return clampCell(raw.col, raw.row)
    },
    [S, xc, yc, angle, clampCell],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const cell = getCell(e)
      if (!cell) return
      dragging.current = true
      hasMoved.current = false
      startCell.current = cell
      setSelection({
        startRow: cell.row,
        startCol: cell.col,
        endRow: cell.row,
        endCol: cell.col,
      })
      setSelState("dragging")
    },
    [disabled, getCell],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging.current || !startCell.current) return
      const cell = getCell(e)
      if (!cell) return
      if (
        cell.row !== startCell.current.row ||
        cell.col !== startCell.current.col
      )
        hasMoved.current = true
      setSelection({
        startRow: startCell.current.row,
        startCol: startCell.current.col,
        endRow: cell.row,
        endCol: cell.col,
      })
    },
    [getCell],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging.current || !startCell.current) {
        dragging.current = false
        return
      }
      dragging.current = false
      const cell = getCell(e)

      if (!hasMoved.current && cell) {
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
    },
    [getCell, cellRegionMap, onRemoveRegion, selection, onPlaceRegion],
  )

  const handlePointerCancel = useCallback(() => {
    dragging.current = false
    startCell.current = null
    setSelection(null)
    setSelState("dragging")
  }, [])

  // ViewBox limits
  const vbLeft = -(rows + 0.5) * S
  const vbRight = (cols + 0.5) * S
  const vbTop = -(maxH + 0.8) * S
  const vbBottom = (cols + rows + 0.5) * S * 0.5
  const vbW = vbRight - vbLeft
  const vbH = vbBottom - vbTop

  // Dynamic depth sorting for region boxes based on current camera angle theta
  const sortedRegions = useMemo(() => {
    return [...regions].sort((a, b) => {
      const centerA_x = a.col + a.width / 2
      const centerA_y = a.row + a.height / 2
      const centerB_x = b.col + b.width / 2
      const centerB_y = b.row + b.height / 2
      const depthA = project3D(centerA_x, centerA_y, 0, xc, yc, angle, S).depth
      const depthB = project3D(centerB_x, centerB_y, 0, xc, yc, angle, S).depth
      return depthA - depthB
    })
  }, [regions, angle, xc, yc, S])

  // Ground cells dynamic depth sort
  const sortedGroundCells = useMemo(() => {
    const cells: { col: number row: number }[] = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) cells.push({ col: c, row: r })

    return cells.sort((a, b) => {
      const depthA = project3D(
        a.col + 0.5,
        a.row + 0.5,
        0,
        xc,
        yc,
        angle,
        S,
      ).depth
      const depthB = project3D(
        b.col + 0.5,
        b.row + 0.5,
        0,
        xc,
        yc,
        angle,
        S,
      ).depth
      return depthA - depthB
    })
  }, [rows, cols, angle, xc, yc, S])

  const pt = (x: number, y: number, z: number) =>
    formatPt(x, y, z, xc, yc, angle, S)

  const selRect = selection ? normalizeSelection(selection) : null

  const parallax = (h: number) => ({
    dx: mouse.x * h * -4,
    dy: mouse.y * h * -5,
  })

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* ── Top Camera Rotation Controls ────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 12,
          zIndex: 15,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255, 255, 255, 0.82)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          padding: "6px 14px",
          borderRadius: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginRight: 6,
            color: "#4a3b32",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          <Camera size={14} />
          <span>Camera</span>
        </div>

        <button onClick={rotateLeft} title="Quay trái" style={btnStyle}>
          <RotateCcw size={14} />
        </button>

        <button
          onClick={toggleSway}
          title={isSwaying ? "Tắt quay qua quay lại" : "Bật quay qua quay lại"}
          style={{
            ...btnStyle,
            background: isSwaying ? "#2e2016" : "rgba(0,0,0,0.06)",
            color: isSwaying ? "#faf7f0" : "#2e2016",
          }}
        >
          {isSwaying ? <Pause size={14} /> : <Play size={14} />}
          <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 4 }}>
            {isSwaying ? "Quay qua lại ON" : "Quay qua lại OFF"}
          </span>
        </button>

        <button onClick={rotateRight} title="Quay phải" style={btnStyle}>
          <RotateCw size={14} />
        </button>

        <button onClick={resetCamera} title="Reset camera" style={btnStyle}>
          <RefreshCw size={13} />
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${vbLeft} ${vbTop} ${vbW} ${vbH}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{
          overflow: "visible",
          touchAction: "none",
          userSelect: "none",
          cursor: disabled ? "default" : "crosshair",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <defs>
          <filter id="ibShadow">
            <feDropShadow
              dx="0"
              dy={S * 0.12}
              stdDeviation={S * 0.18}
              floodColor="#00000020"
            />
          </filter>
        </defs>

        {/* ── Ground tiles ──────────────────────────────────────────── */}
        <g>
          {sortedGroundCells.map(({ col: c, row: r }) => {
            const inRegion = cellRegionMap.has(`${r},${c}`)
            return (
              <polygon
                key={`g${c}-${r}`}
                points={`${pt(c, r, 0)} ${pt(c + 1, r, 0)} ${pt(c + 1, r + 1, 0)} ${pt(c, r + 1, 0)}`}
                fill={inRegion ? "#ece4d4" : "#f5f0e6"}
                stroke="#ddd5c4"
                strokeWidth={0.8}
              />
            )
          })}
        </g>

        {/* ── Placed region boxes ───────────────────────────────────── */}
        <g filter="url(#ibShadow)">
          {sortedRegions.map((region) => {
            const h =
              animH.current.get(region.id)?.curr ?? boxH(region.clueValue)
            const { dx, dy } = parallax(h)
            const { top, right, left } = deriveShades(region.color)
            const c0 = region.col,
              r0 = region.row
            const c1 = c0 + region.width,
              r1 = r0 + region.height

            return (
              <g
                key={region.id}
                transform={`translate(${dx.toFixed(2)},${dy.toFixed(2)})`}
              >
                {/* Right face: x=c1 edge */}
                <polygon
                  points={`${pt(c1, r0, h)} ${pt(c1, r1, h)} ${pt(c1, r1, 0)} ${pt(c1, r0, 0)}`}
                  fill={right}
                  stroke={right}
                  strokeWidth={0.4}
                  strokeLinejoin="round"
                />
                {/* Left face: y=r1 edge */}
                <polygon
                  points={`${pt(c0, r1, h)} ${pt(c1, r1, h)} ${pt(c1, r1, 0)} ${pt(c0, r1, 0)}`}
                  fill={left}
                  stroke={left}
                  strokeWidth={0.4}
                  strokeLinejoin="round"
                />
                {/* Top face */}
                <polygon
                  points={`${pt(c0, r0, h)} ${pt(c1, r0, h)} ${pt(c1, r1, h)} ${pt(c0, r1, h)}`}
                  fill={top}
                  stroke={top}
                  strokeWidth={0.4}
                  strokeLinejoin="round"
                />
                {/* Top highlight edges */}
                <line
                  x1={project3D(c0, r0, h, xc, yc, angle, S).sx}
                  y1={project3D(c0, r0, h, xc, yc, angle, S).sy}
                  x2={project3D(c1, r0, h, xc, yc, angle, S).sx}
                  y2={project3D(c1, r0, h, xc, yc, angle, S).sy}
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={1.2}
                />
                <line
                  x1={project3D(c0, r0, h, xc, yc, angle, S).sx}
                  y1={project3D(c0, r0, h, xc, yc, angle, S).sy}
                  x2={project3D(c0, r1, h, xc, yc, angle, S).sx}
                  y2={project3D(c0, r1, h, xc, yc, angle, S).sy}
                  stroke="rgba(255,255,255,0.28)"
                  strokeWidth={0.8}
                />
              </g>
            )
          })}
        </g>

        {/* ── Hint highlight ────────────────────────────────────────── */}
        {hintRegion &&
          (() => {
            const h = 0.35
            const { dx, dy } = parallax(h)
            const c0 = hintRegion.col,
              r0 = hintRegion.row
            const c1 = c0 + hintRegion.width,
              r1 = r0 + hintRegion.height
            return (
              <g
                transform={`translate(${dx.toFixed(2)},${dy.toFixed(2)})`}
                style={{
                  animation: "hintGlow 0.65s ease-in-out infinite alternate",
                }}
              >
                <polygon
                  points={`${pt(c0, r0, h)} ${pt(c1, r0, h)} ${pt(c1, r1, h)} ${pt(c0, r1, h)}`}
                  fill="rgba(255,200,0,0.35)"
                  stroke="rgba(210,155,0,0.8)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              </g>
            )
          })()}

        {/* ── Selection preview ─────────────────────────────────────── */}
        {selRect &&
          (() => {
            const h = 0.28
            const { dx, dy } = parallax(h)
            const c0 = selRect.c0,
              r0 = selRect.r0,
              c1 = selRect.c1 + 1,
              r1 = selRect.r1 + 1
            const isInvalid = selState === "invalid"
            const fillColor = isInvalid
              ? "rgba(230,60,60,0.25)"
              : "rgba(90,130,240,0.22)"
            const strokeColor = isInvalid
              ? "rgba(210,50,50,0.6)"
              : "rgba(80,120,220,0.55)"
            return (
              <g
                transform={`translate(${dx.toFixed(2)},${dy.toFixed(2)})`}
                style={{
                  animation: isInvalid ? "shake 0.35s ease-in-out" : undefined,
                }}
              >
                <polygon
                  points={`${pt(c1, r0, h)} ${pt(c1, r1, h)} ${pt(c1, r1, 0)} ${pt(c1, r0, 0)}`}
                  fill={
                    isInvalid ? "rgba(210,50,50,0.18)" : "rgba(80,120,220,0.15)"
                  }
                />
                <polygon
                  points={`${pt(c0, r1, h)} ${pt(c1, r1, h)} ${pt(c1, r1, 0)} ${pt(c0, r1, 0)}`}
                  fill={
                    isInvalid ? "rgba(180,40,40,0.22)" : "rgba(70,100,200,0.18)"
                  }
                />
                <polygon
                  points={`${pt(c0, r0, h)} ${pt(c1, r0, h)} ${pt(c1, r1, h)} ${pt(c0, r1, h)}`}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                />
              </g>
            )
          })()}

        {/* ── Clue numbers ─────────────────────────────────────────── */}
        {clues.map((clue) => {
          const region = cellRegionMap.get(`${clue.row},${clue.col}`)
          const h = region
            ? (animH.current.get(region.id)?.curr ?? boxH(region.clueValue))
            : 0
          const { dx, dy } = parallax(h)
          const { sx, sy } = project3D(
            clue.col + 0.5,
            clue.row + 0.5,
            h + 0.02,
            xc,
            yc,
            angle,
            S,
          )
          const fontSize = Math.max(10, Math.min(22, S * 0.45))
          return (
            <text
              key={`clue-${clue.row}-${clue.col}`}
              x={sx + dx}
              y={sy + dy}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize,
                fontWeight: 700,
                fill: region ? "#2e1e10" : "#5a4030",
                pointerEvents: "none",
              }}
            >
              {clue.value}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "5px 8px",
  borderRadius: 10,
  border: "none",
  background: "rgba(0, 0, 0, 0.05)",
  color: "#2e2016",
  cursor: "pointer",
  transition: "all 0.15s ease",
}
