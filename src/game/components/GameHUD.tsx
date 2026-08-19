interface Props {
  levelId: number
  onPause: () => void
}

export default function GameHUD({ levelId, onPause }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: 56,
        flexShrink: 0,
        borderBottom: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <div
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 15,
          fontWeight: 600,
          color: "#6b5744",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Level {levelId}
      </div>

      <button
        onClick={onPause}
        aria-label="Pause"
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          border: "1.5px solid rgba(0,0,0,0.1)",
          background: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s",
          color: "#6b5744",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.95)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.7)")
        }
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="2" width="3.5" height="12" rx="1.5" />
          <rect x="9.5" y="2" width="3.5" height="12" rx="1.5" />
        </svg>
      </button>
    </div>
  )
}
