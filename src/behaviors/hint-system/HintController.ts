import { useState, useCallback, useRef, useEffect } from "react"
import type { Level, Region, RegionDef } from "../../core/types"
import { getHintRegion } from "./hints"

const INITIAL_HINTS = 3

export function useHintController(level: Level, regions: Region[]) {
  const [hintCount, setHintCount] = useState(INITIAL_HINTS)
  const [hintRegion, setHintRegion] = useState<RegionDef | null>(null)
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }
  }, [])

  const showHint = useCallback(() => {
    if (hintCount <= 0) return
    const hint = getHintRegion(level, regions)
    if (!hint) return
    setHintCount((n) => n - 1)
    setHintRegion(hint)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => {
      setHintRegion(null)
      hintTimerRef.current = null
    }, 1800)
  }, [hintCount, level, regions])

  const clear = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    hintTimerRef.current = null
    setHintCount(INITIAL_HINTS)
    setHintRegion(null)
  }, [])

  return {
    hintCount,
    hintRegion,
    showHint,
    clear,
  }
}
