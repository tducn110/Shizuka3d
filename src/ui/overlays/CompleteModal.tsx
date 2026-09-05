import { useEffect, useState } from "react"
import Button from "../../ui/components/Button"

interface Props {
  levelId: number
  onReplay: () => void
  onNext: () => void
}

export default function CompleteModal({ levelId, onReplay, onNext }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(40, 28, 16, 0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        fontFamily: "'Outfit', sans-serif",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      <div
        style={{
          background: "#fffdf8",
          borderRadius: 20,
          padding: "40px 44px",
          width: 300,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          border: "1.5px solid rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          alignItems: "center",
          transform: visible ? "scale(1)" : "scale(0.92)",
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 2 }}>✦</div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#2e2016",
            letterSpacing: "-0.01em",
          }}
        >
          Puzzle Complete
        </div>
        <div style={{ fontSize: 13, color: "#9a8270", marginBottom: 8 }}>
          Level {levelId} solved
        </div>

        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <Button variant="secondary" onClick={onReplay} style={{ flex: 1, fontSize: 14 }}>
            Replay
          </Button>
          <Button variant="primary" onClick={onNext} style={{ flex: 1, fontSize: 14 }}>
            Next →
          </Button>
        </div>
      </div>
    </div>
  )
}
