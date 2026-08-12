import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { useCameraRotation, formatPt, project3D } from "./game/hooks/useCameraRotation"
import { Camera, RotateCcw, RotateCw, Pause, Play, RefreshCw } from "lucide-react"

// ── Grid units and scale ───────────────────────────────────────────────────
const S = 48 // pixels per grid unit

// ── Height map (7×7) ────────────────────────────────────────────────────────
const H: number[][] = [
  [1, 1, 2, 2, 2, 1, 1],
  [1, 3, 3, 4, 3, 3, 1],
  [2, 3, 5, 5, 5, 3, 2],
  [2, 4, 5, 8, 5, 4, 2],
  [2, 3, 5, 5, 5, 3, 2],
  [1, 3, 3, 4, 3, 3, 1],
  [1, 1, 2, 2, 2, 1, 1],
]

// ── Color palette per height ─────────────────────────────────────────────────
const PAL: Record<number, [string, string, string]> = {
  1: ["#dde8f4", "#b0c4da", "#88a4bc"],
  2: ["#cde8d8", "#9ec4b0", "#76a490"],
  3: ["#e8e4b8", "#c4c088", "#a0a064"],
  4: ["#ecd4a0", "#c8b074", "#a48c50"],
  5: ["#ecc4a0", "#c8a070", "#a4784c"],
  6: ["#e0ac8c", "#bc8860", "#986440"],
  7: ["#d4988c", "#b07460", "#8c5040"],
  8: ["#c88880", "#a06458", "#804840"],
}

function palFor(h: number): [string, string, string] {
  return PAL[Math.min(h, 8)] ?? PAL[8]
}

interface BoxDef {
  col: number
  row: number
  height: number
}

interface Props {
  onPlay?: () => void
}

export default function IsometricScene({ onPlay }: Props) {
  // Camera rotation hook with automatic sway ("quay qua quay lại")
  const {
    angle,
    isSwaying,
    toggleSway,
    rotateLeft,
    rotateRight,
    resetCamera,
  } = useCameraRotation({
    autoSway: true,
    swaySpeed: 0.85,
    swayAmplitude: 0.42,
  })

  // Center of 7x7 grid
  const xc = 3.5
  const yc = 3.5

  // Smooth mouse tracking for subtle tilt/parallax
  const targetRef = useRef({ x: 0, y: 0 })
  const [smooth, setSmooth] = useState({ x: 0, y: 0 })

  const onMove = useCallback((e: MouseEvent) => {
    targetRef.current = {
      x: (e.clientX / window.innerWidth - 0.5) * 2,
      y: (e.clientY / window.innerHeight - 0.5) * 2,
    }
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", onMove, { passive: true })
    let raf: number
    const tick = () => {
      setSmooth(prev => ({
        x: prev.x + (targetRef.current.x - prev.x) * 0.07,
        y: prev.y + (targetRef.current.y - prev.y) * 0.07,
      }))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener("mousemove", onMove)
      cancelAnimationFrame(raf)
    }
  }, [onMove])

  // Build box list and dynamically sort back-to-front depending on camera angle
  const sortedBoxes = useMemo((): BoxDef[] => {
    const list: BoxDef[] = []
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        list.push({ col, row, height: H[row][col] })
      }
    }
    // Dynamic painter's algorithm: sort by projected depth along viewing ray
    list.sort((a, b) => {
      const depthA = project3D(a.col + 0.5, a.row + 0.5, 0, xc, yc, angle, S).depth
      const depthB = project3D(b.col + 0.5, b.row + 0.5, 0, xc, yc, angle, S).depth
      return depthA - depthB
    })
    return list
  }, [angle, xc, yc])

  // Helper function to format 3D point to projected SVG coords
  const p = (x: number, y: number, z: number) =>
    formatPt(x, y, z, xc, yc, angle, S)

  const VW = 860, VH = 680
  const ox = VW / 2
  const oy = VH / 2 - 30

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        background: "radial-gradient(ellipse 120% 100% at 50% 60%, #f8f4ec 0%, #ece6d8 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: "'Outfit', sans-serif",
        userSelect: "none",
        position: "relative",
      }}
    >
      {/* ── Camera Rotation Control Toolbar ────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 24,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "8px 16px",
          borderRadius: 24,
          border: "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 8, color: "#4a3b32", fontWeight: 600, fontSize: 13 }}>
          <Camera size={16} />
          <span>Camera Control</span>
        </div>

        <button
          onClick={rotateLeft}
          title="Quay trái (Rotate Left)"
          style={btnStyle}
        >
          <RotateCcw size={15} />
        </button>

        <button
          onClick={toggleSway}
          title={isSwaying ? "Tắt quay qua quay lại" : "Bật quay qua quay lại (Auto Sway)"}
          style={{
            ...btnStyle,
            background: isSwaying ? "#2e2016" : "rgba(0,0,0,0.05)",
            color: isSwaying ? "#faf7f0" : "#2e2016",
          }}
        >
          {isSwaying ? <Pause size={15} /> : <Play size={15} />}
          <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 4 }}>
            {isSwaying ? "Quay qua lại ON" : "Quay qua lại OFF"}
          </span>
        </button>

        <button
          onClick={rotateRight}
          title="Quay phải (Rotate Right)"
          style={btnStyle}
        >
          <RotateCw size={15} />
        </button>

        <button
          onClick={resetCamera}
          title="Đặt lại camera (Reset Camera)"
          style={btnStyle}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Isometric SVG scene ─────────────────────────────────────── */}
      <div style={{ position: "relative", width: "100%", flex: 1, minHeight: 0 }}>
        <svg
          viewBox={`${-ox} ${-oy} ${VW} ${VH}`}
          style={{
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#00000018" />
            </filter>
            <radialGradient id="groundGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d8cfc0" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Ground ellipse */}
          <ellipse
            cx={0}
            cy={S * 0.5}
            rx={S * 6.5}
            ry={S * 3.4}
            fill="url(#groundGrad)"
            opacity={0.55}
          />

          {/* 3D Boxes dynamically depth sorted */}
          <g filter="url(#shadow)">
            {sortedBoxes.map(({ col, row, height: h }) => {
              const [cTop, cRight, cLeft] = palFor(h)

              // Parallax mouse tilt
              const px = smooth.x * h * -4
              const py = smooth.y * h * -5

              const c = col, r = row

              // Top face 4 corners
              const tA = p(c,   r,   h)
              const tB = p(c+1, r,   h)
              const tC = p(c+1, r+1, h)
              const tD = p(c,   r+1, h)

              // Bottom face 4 corners
              const rC = p(c+1, r+1, 0)
              const rD = p(c+1, r,   0)
              const lC = p(c+1, r+1, 0)
              const lD = p(c,   r+1, 0)

              return (
                <g
                  key={`${col}-${row}`}
                  transform={`translate(${px.toFixed(2)}, ${py.toFixed(2)})`}
                >
                  {/* Right face */}
                  <polygon
                    points={`${tB} ${tC} ${rC} ${rD}`}
                    fill={cRight}
                    stroke={cRight}
                    strokeWidth="0.5"
                    strokeLinejoin="round"
                  />
                  {/* Left face */}
                  <polygon
                    points={`${tD} ${tC} ${lC} ${lD}`}
                    fill={cLeft}
                    stroke={cLeft}
                    strokeWidth="0.5"
                    strokeLinejoin="round"
                  />
                  {/* Top face */}
                  <polygon
                    points={`${tA} ${tB} ${tC} ${tD}`}
                    fill={cTop}
                    stroke={cTop}
                    strokeWidth="0.5"
                    strokeLinejoin="round"
                  />
                  {/* Top face highlights */}
                  <line
                    x1={p(c, r, h).split(",")[0]}   y1={p(c, r, h).split(",")[1]}
                    x2={p(c+1, r, h).split(",")[0]} y2={p(c+1, r, h).split(",")[1]}
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="1"
                  />
                  <line
                    x1={p(c, r, h).split(",")[0]}   y1={p(c, r, h).split(",")[1]}
                    x2={p(c, r+1, h).split(",")[0]} y2={p(c, r+1, h).split(",")[1]}
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="0.8"
                  />
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* ── UI overlay ──────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          paddingBottom: 48,
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#9a8878",
            fontWeight: 600,
          }}
        >
          Isometric 3D Camera • Shikaku
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(36px, 7vw, 68px)",
            fontWeight: 700,
            color: "#2e2016",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          Shikaku 3D
        </h1>
        {onPlay && (
          <button
            onClick={onPlay}
            style={{
              marginTop: 8,
              padding: "14px 40px",
              borderRadius: 16,
              border: "none",
              background: "#2e2016",
              color: "#faf7f0",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "0.01em",
              cursor: "pointer",
              pointerEvents: "all",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)"
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.22)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = ""
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)"
            }}
          >
            Play Game →
          </button>
        )}
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 10px",
  borderRadius: 12,
  border: "none",
  background: "rgba(0, 0, 0, 0.05)",
  color: "#2e2016",
  cursor: "pointer",
  transition: "all 0.15s ease",
}
