import { useEffect, useState } from "react"
import { Trophy, X, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import Button from "../components/Button"
import { useWinkIntegration } from "../../integrations/wink/useWinkIntegration"

interface Props {
  onClose: () => void
}

export default function LeaderboardModal({ onClose }: Props) {
  const { t } = useTranslation()
  const wink = useWinkIntegration()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    wink.refreshLeaderboard()
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [wink])

  const entries = wink.leaderboard
  const playerName = wink.displayName || t("common.you", "Bạn")
  const personalBestScore = wink.personalBest?.score ?? 0
  const personalBestRank = wink.personalBest?.rank ? `#${wink.personalBest.rank}` : "—"

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(40, 28, 16, 0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 150,
        fontFamily: "'Outfit', sans-serif",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fffdf8",
          borderRadius: 24,
          padding: "24px 20px",
          width: "100%",
          maxWidth: 340,
          maxHeight: "85vh",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          border: "1.5px solid rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            paddingBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Trophy size={20} color="#e27c26" />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#2e2016" }}>
              {t("common.leaderboard", "BẢNG XẾP HẠNG")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close", "Đóng")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              color: "#9a8270",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minHeight: 180,
            maxHeight: 280,
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                gap: 8,
                color: "#9a8270",
              }}
            >
              <Loader2 className="animate-spin" size={24} color="#e27c26" />
              <span style={{ fontSize: 13 }}>{t("common.loading", "Đang tải...")}</span>
            </div>
          ) : entries.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                color: "#9a8270",
                fontSize: 13,
              }}
            >
              {t("common.noScores", "Chưa có điểm số nào")}
            </div>
          ) : (
            entries.map((entry, idx) => {
              const rank = entry.rank ?? idx + 1
              const medalColor =
                rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : rank === 3 ? "#d97706" : null
              return (
                <div
                  key={entry.id || `${rank}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: medalColor ? `${medalColor}15` : "#f5efe6",
                    border: medalColor ? `1px solid ${medalColor}40` : "1px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        width: 24,
                        textAlign: "center",
                        color: medalColor || "#6b5744",
                      }}
                    >
                      {rank}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#2e2016" }}>
                      {entry.displayName || t("common.anonymous", "Người chơi")}
                    </span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#e27c26" }}>
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Current player summary */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "#2e2016",
            color: "#fffdf8",
            borderRadius: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                background: "#e27c26",
                padding: "2px 8px",
                borderRadius: 8,
              }}
            >
              {personalBestRank}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{playerName}</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 800 }}>
            {personalBestScore.toLocaleString()}
          </span>
        </div>

        {/* Close button */}
        <Button variant="primary" onClick={onClose}>
          {t("common.close", "Đóng")}
        </Button>
      </div>
    </div>
  )
}
