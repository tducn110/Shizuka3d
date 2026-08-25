import { useRef, useState } from "react"
import { LEVELS } from "./data/levels"
import { useShikakuGame } from "./hooks/useShikakuGame"
import GameHUD from "./components/GameHUD"
import IsometricBoard from "./components/IsometricBoard"
import PauseModal from "./components/PauseModal"
import CompleteModal from "./components/CompleteModal"
import { showInterstitial } from "../integrations/ads/googleH5Ads"

export default function ShikakuGame() {
  const [levelIndex, setLevelIndex] = useState(0)
  const transitionPendingRef = useRef(false)
  const game = useShikakuGame(LEVELS[levelIndex])

  const goNext = async () => {
    if (transitionPendingRef.current) return
    transitionPendingRef.current = true
    await showInterstitial({ type: "next", name: "next_shikaku_level" })
    const next = (levelIndex + 1) % LEVELS.length
    setLevelIndex(next)
    game.loadLevel(LEVELS[next])
    transitionPendingRef.current = false
  }

  const goReplay = async () => {
    if (transitionPendingRef.current) return
    transitionPendingRef.current = true
    await showInterstitial({ type: "next", name: "replay_shikaku_level" })
    game.restart()
    transitionPendingRef.current = false
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#faf7f0",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        overscrollBehavior: "none",
        fontFamily: "'Outfit', sans-serif",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <GameHUD levelId={game.level.id} onPause={game.pause} />

      {/* Board area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 20px",
          minHeight: 0,
        }}
      >
        <IsometricBoard
          level={game.level}
          regions={game.regions}
          hintRegion={game.hintRegion}
          boardRevision={game.boardRevision}
          gameStatus={game.gameStatus}
          onPlaceRegion={game.placeRegion}
          onRemoveRegion={game.removeRegion}
        />
      </div>

      {/* Bottom controls */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 24px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <HintButton
          count={game.hintCount}
          onHint={game.showHint}
          disabled={game.gameStatus !== "playing" || game.hintCount === 0}
        />
        <UndoButton
          onUndo={game.undo}
          disabled={game.history.length === 0 || game.gameStatus !== "playing"}
        />
      </div>

      {game.gameStatus === "paused" && (
        <PauseModal onResume={game.resume} onRestart={game.restart} />
      )}
      {game.gameStatus === "completed" && (
        <CompleteModal
          levelId={game.level.id}
          onReplay={goReplay}
          onNext={goNext}
        />
      )}
    </div>
  )
}

function HintButton({
  count,
  onHint,
  disabled,
}: {
  count: number
  onHint: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onHint}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 20px",
        borderRadius: 14,
        border: "1.5px solid rgba(0,0,0,0.1)",
        background: disabled
          ? "rgba(255,255,255,0.4)"
          : "rgba(255,255,255,0.85)",
        color: disabled ? "#c0ad9a" : "#6b5744",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "'Outfit', sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s, opacity 0.15s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 9.5V7.5h1.5v3h-1.5Zm.75-4.25a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
      </svg>
      Hint
      <span
        style={{
          background: disabled ? "#e8ddd2" : "#2e2016",
          color: disabled ? "#b0a090" : "#fffdf8",
          borderRadius: 8,
          padding: "1px 7px",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {count}
      </span>
    </button>
  )
}

function UndoButton({
  onUndo,
  disabled,
}: {
  onUndo: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onUndo}
      disabled={disabled}
      aria-label="Undo"
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        border: "1.5px solid rgba(0,0,0,0.1)",
        background: disabled
          ? "rgba(255,255,255,0.4)"
          : "rgba(255,255,255,0.85)",
        color: disabled ? "#c0ad9a" : "#6b5744",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        transition: "background 0.15s",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9a6 6 0 1 0 1.5-4L3 3v4h4" />
      </svg>
    </button>
  )
}
