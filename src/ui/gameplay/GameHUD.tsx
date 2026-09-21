import Button from "../../ui/components/Button"
import { useTranslation } from "react-i18next"
import { HelpCircle, Trophy, Volume2, VolumeX } from "lucide-react"
import { useAudioSettings } from "../../audio/useAudioSettings"

interface Props {
  levelId: number
  onPause: () => void
  onLeaderboard?: () => void
  onHowToPlay?: () => void
  onSkipTutorial?: () => void
  isTutorial?: boolean
  completedCount?: number
  totalCount?: number
}

export default function GameHUD({
  levelId,
  onPause,
  onLeaderboard,
  onHowToPlay,
  onSkipTutorial,
  isTutorial,
  completedCount,
  totalCount,
}: Props) {
  const { t } = useTranslation()
  const { soundEnabled, toggleMaster } = useAudioSettings()

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        height: 56,
        flexShrink: 0,
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        background: "#faf7f0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14.5,
            fontWeight: 700,
            color: "#5e4b3c",
            letterSpacing: "0.02em",
          }}
        >
          {isTutorial
            ? `${t("game.tutorialTitle", "Tutorial")} ${levelId}`
            : `${t("game.levelTitle", "Level")} ${levelId}`}
        </div>

        {totalCount !== undefined && totalCount > 0 && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              color: "#8c7b6c",
              background: "rgba(0,0,0,0.05)",
              padding: "2px 8px",
              borderRadius: 10,
            }}
          >
            {completedCount ?? 0}/{totalCount} {t("game.rectangles")}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isTutorial && onSkipTutorial && (
          <button
            type="button"
            onClick={onSkipTutorial}
            style={{
              padding: "5px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.85)",
              color: "#6b5744",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              cursor: "pointer",
            }}
          >
            {t("game.skipTutorial")}
          </button>
        )}

        {onHowToPlay && (
          <Button
            variant="icon"
            onClick={onHowToPlay}
            aria-label={t("game.howToPlay")}
          >
            <HelpCircle size={18} color="#6b5744" />
          </Button>
        )}

        <Button
          variant="icon"
          onClick={toggleMaster}
          aria-label={soundEnabled ? t("settings.sfx") : t("settings.sfx")}
        >
          {soundEnabled ? (
            <Volume2 size={18} color="#6b5744" />
          ) : (
            <VolumeX size={18} color="#a39281" />
          )}
        </Button>

        {onLeaderboard && (
          <Button
            variant="icon"
            onClick={onLeaderboard}
            aria-label={t("common.leaderboard", "Bảng xếp hạng")}
          >
            <Trophy size={18} color="#e27c26" />
          </Button>
        )}

        <Button variant="icon" onClick={onPause} aria-label={t("common.pause")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="3.5" height="12" rx="1.5" />
            <rect x="9.5" y="2" width="3.5" height="12" rx="1.5" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
