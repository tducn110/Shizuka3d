import Button from "../../ui/components/Button"
import { useTranslation } from "react-i18next"
import { useAudioSettings } from "../../audio/useAudioSettings"

interface Props {
  onResume: () => void
  onRestart: () => void
  onHowToPlay?: () => void
}

export default function PauseModal({
  onResume,
  onRestart,
  onHowToPlay,
}: Props) {
  const { t, i18n } = useTranslation()
  const { sfxEnabled, musicEnabled, toggleSfx, toggleMusic } =
    useAudioSettings()
  const currentLanguage = i18n.resolvedLanguage?.startsWith("en") ? "en" : "vi"
  const nextLanguage = currentLanguage === "vi" ? "en" : "vi"

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
          padding: "32px 36px",
          width: 300,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          border: "1.5px solid rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
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
          {t("common.pause")}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="secondary"
            onClick={toggleMusic}
            style={{ flex: 1, fontSize: 13, padding: "10px 0" }}
          >
            🎵 {musicEnabled ? t("settings.on") : t("settings.off")}
          </Button>
          <Button
            variant="secondary"
            onClick={toggleSfx}
            style={{ flex: 1, fontSize: 13, padding: "10px 0" }}
          >
            🔊 {sfxEnabled ? t("settings.on") : t("settings.off")}
          </Button>
        </div>

        <Button
          variant="secondary"
          onClick={() => void i18n.changeLanguage(nextLanguage)}
        >
          {t("settings.language")}: {nextLanguage.toUpperCase()}
        </Button>
        {onHowToPlay && (
          <Button variant="secondary" onClick={onHowToPlay}>
            {t("game.howToPlay")}
          </Button>
        )}
        <Button variant="primary" onClick={onResume}>
          {t("common.resume")}
        </Button>
        <Button variant="secondary" onClick={onRestart}>
          {t("common.retry")}
        </Button>
      </div>
    </div>
  )
}
