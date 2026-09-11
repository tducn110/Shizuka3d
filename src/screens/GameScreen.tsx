import { useRef, useState, useEffect, useCallback } from "react"
import { LEVELS } from "../data/levels"
import { useMatchController } from "../behaviors/match/MatchController"
import { usePlayMoveController } from "../behaviors/play-move/PlayMoveController"
import { useHintController } from "../behaviors/hint-system/HintController"
import GameHUD from "../ui/gameplay/GameHUD"
import IsometricBoard from "../behaviors/board-rendering/IsometricBoard"
import PauseModal from "../ui/overlays/PauseModal"
import CompleteModal from "../ui/overlays/CompleteModal"
import { showInterstitial } from "../integrations/ads/googleH5Ads"
import { useWinkIntegration } from "../integrations/wink/useWinkIntegration"

export default function GameScreen() {
  const [levelIndex, setLevelIndex] = useState(0)
  const transitionPendingRef = useRef(false)
  const wink = useWinkIntegration()
  
  // 1. Match Lifecycle Behavior
  const match = useMatchController(LEVELS[levelIndex])
  
  const roundStartedRef = useRef(false)
  
  // 2. Play Move Behavior
  const playMove = usePlayMoveController(match.level, match.complete)
  
  // 3. Hint System Behavior
  const hints = useHintController(match.level, playMove.regions)

  const handlePlaceRegion = useCallback((region: any) => {
    if (!roundStartedRef.current) {
      wink.gameplayStart()
      roundStartedRef.current = true
    }
    return playMove.placeRegion(region)
  }, [wink, playMove])

  const handleRemoveRegion = useCallback((id: string) => {
    if (!roundStartedRef.current) {
      wink.gameplayStart()
      roundStartedRef.current = true
    }
    playMove.removeRegion(id)
  }, [wink, playMove])

  // Stop round on unmount if active
  useEffect(() => {
    return () => {
      if (roundStartedRef.current) {
        wink.gameplayStop()
        roundStartedRef.current = false
      }
    }
  }, [wink])

  // Handle completion
  useEffect(() => {
    if (match.status === "completed") {
      if (roundStartedRef.current) {
        wink.gameplayStop()
        roundStartedRef.current = false
      }
      wink.submitFinalScore({ score: match.level.id * 100 })
      wink.track("puzzle_complete", { level: match.level.id })
    }
  }, [match.status, match.level.id, wink])

  // React to host pause / resume
  useEffect(() => {
    if (wink.hostPaused && match.status === "playing") {
      match.pause()
    } else if (!wink.hostPaused && match.status === "paused") {
      match.resume()
    }
  }, [wink.hostPaused, match.status])

  // Sync behaviors on match.boardRevision change (when level is loaded or restarted)
  useEffect(() => {
    playMove.clear()
    hints.clear()
  }, [match.boardRevision])

  const goNext = async () => {
    if (transitionPendingRef.current) return
    transitionPendingRef.current = true
    await showInterstitial({ type: "next", name: "next_shikaku_level" })
    const next = (levelIndex + 1) % LEVELS.length
    setLevelIndex(next)
    match.loadLevel(LEVELS[next])
    roundStartedRef.current = false
    transitionPendingRef.current = false
  }

  const goReplay = async () => {
    if (transitionPendingRef.current) return
    transitionPendingRef.current = true
    await showInterstitial({ type: "next", name: "replay_shikaku_level" })
    match.restart()
    roundStartedRef.current = false
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
      <GameHUD levelId={match.level.id} onPause={match.pause} />

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
          level={match.level}
          regions={playMove.regions}
          hintRegion={hints.hintRegion}
          boardRevision={match.boardRevision}
          gameStatus={match.status}
          onPlaceRegion={handlePlaceRegion}
          onRemoveRegion={handleRemoveRegion}
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
          count={hints.hintCount}
          onHint={hints.showHint}
          disabled={match.status !== "playing" || hints.hintCount === 0}
        />
        <UndoButton
          onUndo={playMove.undo}
          disabled={playMove.history.length === 0 || match.status !== "playing"}
        />
      </div>

      {match.status === "paused" && (
        <PauseModal onResume={match.resume} onRestart={match.restart} />
      )}
      {match.status === "completed" && (
        <CompleteModal
          levelId={match.level.id}
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
