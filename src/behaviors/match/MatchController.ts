import { useState, useEffect, useCallback } from "react"
import type { Level, GameStatus } from "../../core/types"

export function useMatchController(initialLevel: Level) {
  const [level, setLevel] = useState<Level>(initialLevel)
  const [status, setStatus] = useState<GameStatus>("playing")
  const [boardRevision, setBoardRevision] = useState(0)

  // Pause when the app goes into background
  useEffect(() => {
    const onVis = () => document.hidden && setStatus("paused")
    document.addEventListener("visibilitychange", onVis)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [])

  const pause = useCallback(() => setStatus("paused"), [])
  const resume = useCallback(() => setStatus("playing"), [])
  const complete = useCallback(() => setStatus("completed"), [])
  
  const restart = useCallback(() => {
    setStatus("playing")
    setBoardRevision((r) => r + 1)
  }, [])

  const loadLevel = useCallback((newLevel: Level) => {
    setLevel(newLevel)
    setStatus("playing")
    setBoardRevision((r) => r + 1)
  }, [])

  return {
    level,
    status,
    boardRevision,
    pause,
    resume,
    complete,
    restart,
    loadLevel,
  }
}
