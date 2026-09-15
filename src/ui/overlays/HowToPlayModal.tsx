import Button from "../components/Button"
import { useTranslation } from "react-i18next"
import { Check, HelpCircle, LayoutGrid, Square, X } from "lucide-react"

interface Props {
  onClose: () => void
  onReplayTutorial?: () => void
}

export default function HowToPlayModal({ onClose, onReplayTutorial }: Props) {
  const { t } = useTranslation()

  const rules = [
    {
      num: 1,
      icon: <Square size={18} color="#2563eb" />,
      title: t("rulesModal.rule1Title"),
      desc: t("rulesModal.rule1Desc"),
    },
    {
      num: 2,
      icon: <Check size={18} color="#16a34a" />,
      title: t("rulesModal.rule2Title"),
      desc: t("rulesModal.rule2Desc"),
    },
    {
      num: 3,
      icon: <X size={18} color="#dc2626" />,
      title: t("rulesModal.rule3Title"),
      desc: t("rulesModal.rule3Desc"),
    },
    {
      num: 4,
      icon: <LayoutGrid size={18} color="#d97706" />,
      title: t("rulesModal.rule4Title"),
      desc: t("rulesModal.rule4Desc"),
    },
  ]

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(35, 24, 15, 0.5)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 110,
        fontFamily: "'Outfit', sans-serif",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fffdfa",
          borderRadius: 22,
          padding: "26px 24px",
          width: "100%",
          maxWidth: 360,
          boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
          border: "1.5px solid rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <HelpCircle size={22} color="#2e2016" />
            <h2
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#2e2016",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {t("rulesModal.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "#8c7b6c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rules.map((rule) => (
            <div
              key={rule.num}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                background: "rgba(0,0,0,0.025)",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {rule.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#2e2016",
                    marginBottom: 2,
                  }}
                >
                  {rule.title}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "#6b5744",
                    lineHeight: 1.35,
                  }}
                >
                  {rule.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          {onReplayTutorial && (
            <Button
              variant="secondary"
              onClick={() => {
                onClose()
                onReplayTutorial()
              }}
            >
              {t("rulesModal.replayTutorial")}
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            {t("rulesModal.gotIt")}
          </Button>
        </div>
      </div>
    </div>
  )
}
