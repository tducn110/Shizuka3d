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
import { audioManager } from "../audio/audioManager"

const TUTORIAL_STEPS = [
  {
    mode: "place" as const,
    clue: { row: 0, col: 0 },
    target: { row: 0, col: 0, width: 3, height: 1 },
    instructionKey: "tutorial.step1",
  },
  {
    mode: "remove" as const,
    clue: { row: 0, col: 0 },
    target: { row: 0, col: 0, width: 3, height: 1 },
    instructionKey: "tutorial.step2",
  },
  {
    mode: "place" as const,
    clue: { row: 0, col: 0 },
    target: { row: 0, col: 0, width: 3, height: 1 },
    instructionKey: "tutorial.step3",
  },
  {
    mode: "place" as const,
    clue: { row: 1, col: 0 },
    target: { row: 1, col: 0, width: 1, height: 2 },
    instructionKey: "tutorial.step4",
  },
  {
    mode: "place" as const,
    clue: { row: 1, col: 1 },
    target: { row: 1, col: 1, width: 2, height: 2 },
    instructionKey: "tutorial.step5",
  },
]

export default function GameScreen() {
  const { t } = useTranslation()
  const [levelIndex, setLevelIndex] = useState(0)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [feedback, setFeedback] = useState<{
    message: string
    type: "error" | "success" | "warning"
  } | null>(null)
  const [tutorialStage, setTutorialStage] = useState(0)
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
  let currentTutorialStep = null
  let tutorialTarget: any = null
  let tutorialMode: "place" | "remove" = "place"
  let highlightClue: { row: number; col: number } | null = null
  let currentStepNumber = 1

  if (match.level.id === 1 && match.status === "playing") {
    if (tutorialStage === 0) {
      currentTutorialStep = TUTORIAL_STEPS[0]
      tutorialTarget = currentTutorialStep.target
      highlightClue = currentTutorialStep.clue
      tutorialMode = "place"
      currentStepNumber = 1
    } else if (tutorialStage === 1) {
      currentTutorialStep = TUTORIAL_STEPS[1]
      tutorialTarget = currentTutorialStep.target
      highlightClue = currentTutorialStep.clue
      tutorialMode = "remove"
      currentStepNumber = 2
    } else if (tutorialStage >= 2 && tutorialStage < 5) {
      const hasTarget0 = playMove.regions.some(
        (r) => r.row === 0 && r.col === 0 && r.width === 3 && r.height === 1,
      )
      const hasTarget1 = playMove.regions.some(
        (r) => r.row === 1 && r.col === 0 && r.width === 1 && r.height === 2,
      )
      const hasTarget2 = playMove.regions.some(
        (r) => r.row === 1 && r.col === 1 && r.width === 2 && r.height === 2,
      )

      if (!hasTarget0) {
        currentTutorialStep = TUTORIAL_STEPS[2]
        tutorialTarget = currentTutorialStep.target
        highlightClue = currentTutorialStep.clue
        tutorialMode = "place"
        currentStepNumber = 3
      } else if (!hasTarget1) {
        currentTutorialStep = TUTORIAL_STEPS[3]
        tutorialTarget = currentTutorialStep.target
        highlightClue = currentTutorialStep.clue
        tutorialMode = "place"
        currentStepNumber = 4
      } else if (!hasTarget2) {
        currentTutorialStep = TUTORIAL_STEPS[4]
        tutorialTarget = currentTutorialStep.target
        highlightClue = currentTutorialStep.clue
        tutorialMode = "place"
        currentStepNumber = 5
      } else {
        currentTutorialStep = null
        tutorialTarget = null
        highlightClue = null
      }
    }
  }

  const handlePlaceRegion = useCallback(
    (region: any) => {
      audioManager.unlockFromGesture()
      if (!roundStartedRef.current) {
        wink.gameplayStart()
        roundStartedRef.current = true
      }
      const result = playMove.placeRegion(region)
      if (!result.success) {
        audioManager.playError()
        if (result.reason === "out of bounds") {
          setFeedback({ message: t("feedback.outOfBounds"), type: "error" })
          if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
          feedbackTimerRef.current = setTimeout(() => setFeedback(null), 2500)
        }
      } else {
        setFeedback(null)
        const r0 = Math.min(region.startRow, region.endRow)
        const r1 = Math.max(region.startRow, region.endRow)
        const c0 = Math.min(region.startCol, region.endCol)
        const c1 = Math.max(region.startCol, region.endCol)
        const area = (r1 - r0 + 1) * (c1 - c0 + 1)
        const isMatch = Boolean(result.clueValue && result.clueValue === area)
        audioManager.playPlaceRegion(isMatch)
        if (match.level.id === 1) {
          setTutorialStage((prev) => {
            if (prev === 0) return 1
            if (prev === 2) return 3
            if (prev === 3) return 4
            if (prev === 4) return 5
            return prev
          })
        }
      }
      return result
    },
    [wink, playMove, match.level.id, t],
  )

  // Check if board is 100% covered but not yet solved
  const totalCells = match.level.rows * match.level.cols
  useEffect(() => {
    if (match.status !== "playing") return
    let covered = 0
    for (const reg of playMove.regions) {
      covered += reg.width * reg.height
    }
    if (covered >= totalCells) {
      audioManager.playWarning()
      setFeedback({
        message: t("feedback.boardFullIncorrect"),
        type: "warning",
      })
    } else {
      setFeedback((prev) => (prev?.type === "warning" ? null : prev))
    }
  }, [playMove.regions, match.status, totalCells, t])

  const handleRemoveRegion = useCallback(
    (id: string) => {
      audioManager.unlockFromGesture()
      audioManager.playRemoveRegion()
      if (!roundStartedRef.current) {
        wink.gameplayStart()
        roundStartedRef.current = true
      }
      setFeedback(null)
      playMove.removeRegion(id)
      if (match.level.id === 1) {
        setTutorialStage((prev) => {
          if (prev === 1) return 2
          return prev
        })
      }
    },
    [wink, playMove, match.level.id],
  )

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
    }
  }, [match.status, match.level.id, wink])

  // React to host pause / resume
  useEffect(() => {
    audioManager.setHostPaused(wink.hostPaused)
    if (wink.hostPaused && match.status === "playing") {
      match.pause()
    } else if (!wink.hostPaused && match.status === "paused") {
      match.resume()
    }
  }, [wink.hostPaused, match.status])

  useEffect(() => {
    audioManager.setHostMuted(wink.hostMuted)
  }, [wink.hostMuted])

  // Sync behaviors on match.boardRevision change (when level is loaded or restarted)
  useEffect(() => {
    playMove.clear()
    hints.clear()
    setFeedback(null)
    setTutorialStage(0)
  }, [match.boardRevision])

  const skipTutorial = useCallback(() => {
    const next = 2 // Jump to Level 3 (id: 3)
    setLevelIndex(next)
    match.loadLevel(LEVELS[next])
    setFeedback(null)
    setTutorialStage(0)
    roundStartedRef.current = false
  }, [match])

  const replayTutorial = useCallback(() => {
    setLevelIndex(0) // Jump to Level 1
    match.loadLevel(LEVELS[0])
    setFeedback(null)
    setTutorialStage(0)
    roundStartedRef.current = false
  }, [match])

  const goNext = async () => {
    if (transitionPendingRef.current) return
    transitionPendingRef.current = true
    audioManager.playButtonClick()
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
    audioManager.playButtonClick()
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
              background:
                feedback.type === "error"
                  ? "#fef2f2"
                  : feedback.type === "warning"
                    ? "#fffbeb"
                    : "#f0fdf4",
              border: `1px solid ${
                feedback.type === "error"
                  ? "#fecaca"
                  : feedback.type === "warning"
                    ? "#fde68a"
                    : "#bbf7d0"
              }`,
              color:
                feedback.type === "error"
                  ? "#991b1b"
                  : feedback.type === "warning"
                    ? "#92400e"
                    : "#166534",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              textAlign: "center",
            }}
          >
            {feedback.type === "error" ? (
              <AlertCircle size={16} color="#dc2626" />
            ) : feedback.type === "warning" ? (
              <AlertCircle size={16} color="#d97706" />
            ) : (
              <CheckCircle size={16} color="#16a34a" />
            )}
            <span>{feedback.message}</span>
          </div>
        ) : match.level.id === 1 && currentTutorialStep ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 12,
              background: tutorialMode === "remove" ? "#fff7ed" : "#eff6ff",
              border: `1px solid ${
                tutorialMode === "remove" ? "#fed7aa" : "#bfdbfe"
              }`,
              color: tutorialMode === "remove" ? "#9a3412" : "#1e40af",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              textAlign: "center",
            }}
          >
            <span
              style={{
                background: tutorialMode === "remove" ? "#ea580c" : "#2563eb",
                color: "#fff",
                borderRadius: 8,
                padding: "1px 6px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {currentStepNumber}/5
            </span>
            <span>{t(currentTutorialStep.instructionKey)}</span>
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
        <div
          style={{
            width: "100%",
            height: "100%",
            minHeight: 0,
            position: "relative",
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
            tutorialTarget={tutorialTarget}
            tutorialMode={tutorialMode}
            tutorialPrompt={t("tutorial.tapPrompt")}
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
          onHint={() => {
            audioManager.playHint()
            hints.showHint()
          }}
          disabled={match.status !== "playing" || hints.hintCount === 0}
        />
        <UndoButton
          onUndo={() => {
            audioManager.playUndo()
            playMove.undo()
          }}
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
  const { t } = useTranslation()
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
      {t("game.hint", "Hint")}
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
  const { t } = useTranslation()
  return (
    <button
      onClick={onUndo}
      disabled={disabled}
      aria-label={t("game.undo", "Undo")}
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
