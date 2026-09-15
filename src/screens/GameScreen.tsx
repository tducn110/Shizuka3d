import { useRef, useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { LEVELS } from "../data/levels"
import { useMatchController } from "../behaviors/match/MatchController"
import { usePlayMoveController } from "../behaviors/play-move/PlayMoveController"
import { useHintController } from "../behaviors/hint-system/HintController"
import GameHUD from "../ui/gameplay/GameHUD"
import IsometricBoard from "../behaviors/board-rendering/IsometricBoard"
import PauseModal from "../ui/overlays/PauseModal"
import CompleteModal from "../ui/overlays/CompleteModal"
import LeaderboardModal from "../ui/overlays/LeaderboardModal"
import HowToPlayModal from "../ui/overlays/HowToPlayModal"
import { showInterstitial } from "../integrations/ads/googleH5Ads"
import { useWinkIntegration } from "../integrations/wink/useWinkIntegration"
import { AlertCircle, CheckCircle } from "lucide-react"

const TUTORIAL_STEPS = [
  {
    clue: { row: 0, col: 0 },
    target: { row: 0, col: 0, width: 3, height: 1 },
    instructionKey: "tutorial.step1",
    successKey: "tutorial.step1Success",
  },
  {
    clue: { row: 1, col: 0 },
    target: { row: 1, col: 0, width: 1, height: 2 },
    instructionKey: "tutorial.step2",
    successKey: "tutorial.step2Success",
  },
  {
    clue: { row: 1, col: 1 },
    target: { row: 1, col: 1, width: 2, height: 2 },
    instructionKey: "tutorial.step3",
    successKey: "tutorial.complete",
  },
]

export default function GameScreen() {
  const { t } = useTranslation()
  const [levelIndex, setLevelIndex] = useState(0)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: "error" | "success" } | null>(null)
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const transitionPendingRef = useRef(false)
  const wink = useWinkIntegration()
  
  // 1. Match Lifecycle Behavior
  const match = useMatchController(LEVELS[levelIndex])
  
  const roundStartedRef = useRef(false)
  
  // 2. Play Move Behavior
  const playMove = usePlayMoveController(match.level, match.complete)
  
  // 3. Hint System Behavior
  const hints = useHintController(match.level, playMove.regions)

  const isTutorial = match.level.id <= 2
  const tutorialStepIndex = match.level.id === 1 ? Math.min(2, playMove.regions.length) : -1
  const tutorialStep = match.level.id === 1 ? TUTORIAL_STEPS[tutorialStepIndex] : null
  const tutorialTarget = match.level.id === 1 ? tutorialStep?.target : null
  const highlightClue = match.level.id === 1 ? tutorialStep?.clue : null

  const handlePlaceRegion = useCallback((region: any) => {
    if (!roundStartedRef.current) {
      wink.gameplayStart()
      roundStartedRef.current = true
    }
    const result = playMove.placeRegion(region)
    if (!result.success) {
      if (result.reason === "out of bounds") {
        setFeedback({ message: t("feedback.outOfBounds"), type: "error" })
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = setTimeout(() => setFeedback(null), 2500)
      }
    } else {
      if (match.level.id === 1) {
        const step = TUTORIAL_STEPS[playMove.regions.length]
        if (step) {
          setFeedback({ message: t(step.successKey), type: "success" })
          if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
          feedbackTimerRef.current = setTimeout(() => setFeedback(null), 2500)
        }
      } else {
        setFeedback((prev) => (prev?.type === "error" ? null : prev))
      }
    }
    return result
  }, [wink, playMove, match.level.id, t])

  // Check if board is 100% covered but not yet solved
  const totalCells = match.level.rows * match.level.cols
  useEffect(() => {
    if (match.status !== "playing") return
    let covered = 0
    for (const reg of playMove.regions) {
      covered += reg.width * reg.height
    }
    if (covered >= totalCells) {
      setFeedback({
        message: t("feedback.boardFullIncorrect"),
        type: "warning",
      })
    } else {
      setFeedback((prev) => (prev?.type === "warning" ? null : prev))
    }
  }, [playMove.regions, match.status, totalCells, t])

  const handleRemoveRegion = useCallback((id: string) => {
    if (!roundStartedRef.current) {
      wink.gameplayStart()
      roundStartedRef.current = true
    }
    setFeedback(null)
    playMove.removeRegion(id)
  }, [wink, playMove])

  // Stop round on unmount if active
  useEffect(() => {
    return () => {
      if (roundStartedRef.current) {
        wink.gameplayStop()
        roundStartedRef.current = false
      }
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
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
    setFeedback(null)
  }, [match.boardRevision])

  const skipTutorial = useCallback(() => {
    const next = 2 // Jump to Level 3 (id: 3)
    setLevelIndex(next)
    match.loadLevel(LEVELS[next])
    setFeedback(null)
    roundStartedRef.current = false
  }, [match])

  const replayTutorial = useCallback(() => {
    setLevelIndex(0) // Jump to Level 1
    match.loadLevel(LEVELS[0])
    setFeedback(null)
    roundStartedRef.current = false
  }, [match])

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
      <GameHUD
        levelId={match.level.id}
        onPause={match.pause}
        onLeaderboard={() => setShowLeaderboard(true)}
        onHowToPlay={() => setShowHowToPlay(true)}
        onSkipTutorial={isTutorial ? skipTutorial : undefined}
        isTutorial={isTutorial}
        completedCount={playMove.regions.length}
        totalCount={match.level.clues.length}
      />

      {/* Tutorial Guidance / Feedback Banner */}
      <div
        style={{
          padding: "6px 16px 2px",
          display: "flex",
          justifyContent: "center",
          minHeight: 38,
          pointerEvents: "none",
        }}
      >
        {feedback ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 12,
              background: feedback.type === "error" ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${feedback.type === "error" ? "#fecaca" : "#bbf7d0"}`,
              color: feedback.type === "error" ? "#991b1b" : "#166534",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              textAlign: "center",
            }}
          >
            {feedback.type === "error" ? (
              <AlertCircle size={16} color="#dc2626" />
            ) : (
              <CheckCircle size={16} color="#16a34a" />
            )}
            <span>{feedback.message}</span>
          </div>
        ) : match.level.id === 1 && tutorialStep ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 12,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              textAlign: "center",
            }}
          >
            <span
              style={{
                background: "#2563eb",
                color: "#fff",
                borderRadius: 8,
                padding: "1px 6px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {tutorialStepIndex + 1}/3
            </span>
            <span>{t(tutorialStep.instructionKey)}</span>
          </div>
        ) : match.level.id === 2 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 12,
              background: "#fdfbf7",
              border: "1px solid rgba(0,0,0,0.08)",
              color: "#6b5744",
              fontSize: 12.5,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            <span>💡 {t("tutorial.level2Tip")}</span>
          </div>
        ) : null}
      </div>

      {/* Board area */}
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          padding: "4px 12px 8px",
          minHeight: 0,
          position: "relative",
        }}
      >
        <div style={{ width: "100%", height: "100%", minHeight: 0, position: "relative" }}>
          <IsometricBoard
            level={match.level}
            regions={playMove.regions}
            hintRegion={hints.hintRegion}
            boardRevision={match.boardRevision}
            gameStatus={match.status}
            onPlaceRegion={handlePlaceRegion}
            onRemoveRegion={handleRemoveRegion}
            tutorialTarget={tutorialTarget}
            highlightClue={highlightClue}
          />
        </div>
      </div>

      {/* Controls: Hint + Undo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "12px 20px 20px",
          flexShrink: 0,
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
        <PauseModal
          onResume={match.resume}
          onRestart={match.restart}
          onHowToPlay={() => setShowHowToPlay(true)}
        />
      )}
      {match.status === "completed" && (
        <CompleteModal
          levelId={match.level.id}
          onReplay={goReplay}
          onNext={goNext}
        />
      )}
      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
      )}
      {showHowToPlay && (
        <HowToPlayModal
          onClose={() => setShowHowToPlay(false)}
          onReplayTutorial={replayTutorial}
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
        padding: "10px 22px",
        borderRadius: 14,
        border: "none",
        background: disabled ? "rgba(46, 32, 22, 0.2)" : "#2e2016",
        color: disabled ? "#a39281" : "#fffdf8",
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "'Outfit', sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "transform 0.15s, box-shadow 0.15s, opacity 0.15s",
        boxShadow: disabled ? "none" : "0 4px 14px rgba(46, 32, 22, 0.22)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        style={{ color: disabled ? "#a39281" : "#f59e0b" }}
      >
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 9.5V7.5h1.5v3h-1.5Zm.75-4.25a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
      </svg>
      Hint
      <span
        style={{
          background: disabled ? "rgba(255,255,255,0.2)" : "#f59e0b",
          color: disabled ? "#a39281" : "#1a110a",
          borderRadius: 8,
          padding: "2px 8px",
          fontSize: 12,
          fontWeight: 800,
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
        border: "1.5px solid rgba(0,0,0,0.12)",
        background: disabled ? "rgba(255,255,255,0.4)" : "#fffdf8",
        color: disabled ? "#c0ad9a" : "#2e2016",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: disabled ? "none" : "0 2px 8px rgba(0,0,0,0.06)",
        transition: "background 0.15s",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9a6 6 0 1 0 1.5-4L3 3v4h4" />
      </svg>
    </button>
  )
}
