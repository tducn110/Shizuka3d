import { useEffect, useRef, useState, useMemo, useCallback } from "react"

// ── Isometric projection ────────────────────────────────────────────────────
const S = 40 // pixels per grid unit

function iso(x: number, y: number, z: number) {
  return { sx: (x - y) * S, sy: (x + y) * S * 0.5 - z * S }
}
function p(x: number, y: number, z: number) {
  const { sx, sy } = iso(x, y, z)
  return `${sx.toFixed(1)},${sy.toFixed(1)}`
}

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

// ── Component ────────────────────────────────────────────────────────────────
interface Props {
  onPlay?: () => void
}

export default function IsometricScene({ onPlay }: Props) {
  // Smooth mouse tracking via raf lerp
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

  // ── Touch parallax ──────────────────────────────────────────────────────
  const onTouch = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    targetRef.current = {
      x: (t.clientX / window.innerWidth - 0.5) * 2,
      y: (t.clientY / window.innerHeight - 0.5) * 2,
    }
  }, [])

  // ── Build sorted box list ───────────────────────────────────────────────
  const boxes = useMemo((): BoxDef[] => {
    const list: BoxDef[] = []
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 7; col++)
        list.push({ col, row, height: H[row][col] })
    // Painter's algorithm: back→front = ascending (col+row), then ascending col
    list.sort((a, b) => {
      const s = (a.col + a.row) - (b.col + b.row)
      return s !== 0 ? s : a.col - b.col
    })
    return list
  }, [])

  // ── SVG viewBox origin ──────────────────────────────────────────────────
  // Isometric center of the 7×7 grid at z=0 is at iso(3.5, 3.5, 0)
  // sx=0, sy=3.5*S = 140 → shift view so (0, 140) maps to viewport center
  const VW = 860, VH = 680
  const ox = VW / 2         // horizontal center = 0 in iso coords → ok
  const oy = VH / 2 - 30    // push scene up slightly so text below has room

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
      }}
      onTouchMove={onTouch}
    >
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
          {/* ── Drop shadows (rendered below boxes) ─────────────────── */}
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#00000018" />
            </filter>
            <radialGradient id="groundGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d8cfc0" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* ── Ground ellipse ───────────────────────────────────────── */}
          <ellipse
            cx={0}
            cy={S * 3.5}
            rx={S * 7.2}
            ry={S * 3.6}
            fill="url(#groundGrad)"
            opacity={0.55}
          />

          {/* ── Boxes ───────────────────────────────────────────────── */}
          <g filter="url(#shadow)">
            {boxes.map(({ col, row, height: h }) => {
              const [cTop, cRight, cLeft] = palFor(h)

              // Parallax: taller boxes shift more — creates "standing up" effect
              const px = smooth.x * h * -5
              const py = smooth.y * h * -7

              const c = col, r = row

              // 8 corners of the unit cube [col, row, 0..h]
              // Top face
              const tA = p(c,   r,   h)
              const tB = p(c+1, r,   h)
              const tC = p(c+1, r+1, h)
              const tD = p(c,   r+1, h)
              // Right face (x = c+1)
              const rC = p(c+1, r+1, 0)
              const rD = p(c+1, r,   0)
              // Left face (y = r+1)
              const lC = p(c+1, r+1, 0)
              const lD = p(c,   r+1, 0)

              // Stroke is same as face but slightly darker
              const strokeR = cRight
              const strokeL = cLeft

              return (
                <g
                  key={`${col}-${row}`}
                  transform={`translate(${px.toFixed(2)}, ${py.toFixed(2)})`}
                >
                  {/* Right face */}
                  <polygon
                    points={`${tB} ${tC} ${rC} ${rD}`}
                    fill={cRight}
                    stroke={strokeR}
                    strokeWidth="0.5"
                    strokeLinejoin="round"
                  />
                  {/* Left face */}
                  <polygon
                    points={`${tD} ${tC} ${lC} ${lD}`}
                    fill={cLeft}
                    stroke={strokeL}
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
                  {/* Top face highlight edge */}
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
          Puzzle Game
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
          Shikaku
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
            Play →
          </button>
        )}
      </div>
    </div>
  )
}
