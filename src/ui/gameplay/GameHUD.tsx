import Button from "../../ui/components/Button"
import { useTranslation } from "react-i18next"

interface Props {
  levelId: number
  onPause: () => void
}

export default function GameHUD({ levelId, onPause }: Props) {
  const { t } = useTranslation()
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

      <Button variant="icon" onClick={onPause} aria-label={t("common.pause")}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="2" width="3.5" height="12" rx="1.5" />
          <rect x="9.5" y="2" width="3.5" height="12" rx="1.5" />
        </svg>
      </Button>
    </div>
  )
}
