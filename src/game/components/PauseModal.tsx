interface Props {
  onResume: () => void
  onRestart: () => void
}

export default function PauseModal({ onResume, onRestart }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(40, 28, 16, 0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div
        style={{
          background: "#fffdf8",
          borderRadius: 20,
          padding: "36px 40px",
          width: 280,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          border: "1.5px solid rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#2e2016",
            textAlign: "center",
            marginBottom: 4,
            letterSpacing: "-0.01em",
          }}
        >
          Paused
        </div>

        <Btn label="Resume" onClick={onResume} primary />
        <Btn label="Restart" onClick={onRestart} />
      </div>
    </div>
  )
}

function Btn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 0",
        borderRadius: 12,
        border: primary ? "none" : "1.5px solid rgba(0,0,0,0.12)",
        background: primary ? "#2e2016" : "transparent",
        color: primary ? "#fffdf8" : "#6b5744",
        fontSize: 15,
        fontWeight: 600,
        fontFamily: "'Outfit', sans-serif",
        cursor: "pointer",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
    >
      {label}
    </button>
  )
}
