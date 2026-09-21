import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import Button from "../../ui/components/Button"
import { audioManager } from "../../audio/audioManager"

interface Props {
  levelId: number
  onReplay: () => void
  onNext: () => void
}

export default function CompleteModal({ levelId, onReplay, onNext }: Props) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    audioManager.playWin()
    const timer = setTimeout(() => setVisible(true), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleReplay = () => {
    audioManager.playButtonClick()
    onReplay()
  }

  const handleNext = () => {
    audioManager.playButtonClick()
    onNext()
  }

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
          {t("completeModal.title", "Puzzle Complete")}
        </div>
        <div style={{ fontSize: 13, color: "#9a8270", marginBottom: 8 }}>
          {t("completeModal.solved", {
            levelId,
            defaultValue: `Level ${levelId} solved`,
          })}
        </div>

        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <Button
            variant="secondary"
            onClick={handleReplay}
            style={{ flex: 1, fontSize: 14 }}
          >
            {t("common.retry", "Replay")}
          </Button>
          <Button
            variant="primary"
            onClick={handleNext}
            style={{ flex: 1, fontSize: 14 }}
          >
            {t("common.next", "Next →")}
          </Button>
        </div>
      </div>
    </div>
  )
}
