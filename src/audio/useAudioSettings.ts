import { useEffect, useState, useCallback } from "react"
import { audioManager } from "./audioManager"

export function useAudioSettings() {
  const [settings, setSettings] = useState(() => ({
    sfxEnabled: audioManager.getSfxEnabled(),
    musicEnabled: audioManager.getMusicEnabled(),
  }))

  useEffect(() => {
    return audioManager.subscribe((next) => {
      setSettings(next)
    })
  }, [])

  const toggleSfx = useCallback(() => {
    return audioManager.toggleSfx()
  }, [])

  const toggleMusic = useCallback(() => {
    return audioManager.toggleMusic()
  }, [])

  const toggleMaster = useCallback(() => {
    const next = !(settings.sfxEnabled || settings.musicEnabled)
    audioManager.setSfxEnabled(next)
    audioManager.setMusicEnabled(next)
    if (next) {
      audioManager.playButtonClick()
    }
    return next
  }, [settings.sfxEnabled, settings.musicEnabled])

  return {
    sfxEnabled: settings.sfxEnabled,
    musicEnabled: settings.musicEnabled,
    soundEnabled: settings.sfxEnabled || settings.musicEnabled,
    toggleSfx,
    toggleMusic,
    toggleMaster,
  }
}
