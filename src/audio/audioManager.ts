/**
 * Standard Web Game Audio Manager for Shikaku 3D.
 *
 * Architecture:
 * - Dual-engine: HTML5 Audio for streaming BGM (memory efficient, native loop)
 *   + Web Audio API (AudioContext) for zero-latency polyphonic procedural SFX.
 * - Dynamics limiter: DynamicsCompressorNode to prevent clipping or distortion.
 * - Robust mobile/iOS Safari autoplay unlocking via first gesture chain.
 * - Lifecycle synchronization: document visibilitychange + host pause/mute (Wink).
 * - Persistent preferences: localStorage for SFX and BGM state.
 */

type AudioSubscriber = (state: {
  sfxEnabled: boolean
  musicEnabled: boolean
}) => void

const STORAGE_SFX_KEY = "09_shikaku_sfx_enabled"
const STORAGE_MUSIC_KEY = "09_shikaku_music_enabled"
const DEFAULT_BGM_VOLUME = 0.28
const DUCKED_BGM_VOLUME = 0.08

function getStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback
  try {
    const val = window.localStorage.getItem(key)
    if (val === null) return fallback
    return val === "true"
  } catch {
    return fallback
  }
}

function setStoredBoolean(key: string, val: boolean): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, String(val))
  } catch {
    // Non-fatal localStorage error
  }
}

class AudioManager {
  private ctx: AudioContext | null = null
  private sfxGain: GainNode | null = null
  private limiter: DynamicsCompressorNode | null = null
  private musicElement: HTMLAudioElement | null = null

  private sfxEnabled = true
  private musicEnabled = true
  private hostMuted = false
  private hostPaused = false
  private unlocked = false
  private isDucked = false
  private duckTimeout: ReturnType<typeof setTimeout> | null = null

  private subscribers = new Set<AudioSubscriber>()

  constructor() {
    this.sfxEnabled = getStoredBoolean(STORAGE_SFX_KEY, true)
    this.musicEnabled = getStoredBoolean(STORAGE_MUSIC_KEY, true)

    if (typeof window !== "undefined") {
      this.initUnlockListeners()
      this.initVisibilityListener()
    }
  }

  // ── Global Unlock Handling ──────────────────────────────────────────────────

  private initUnlockListeners() {
    const unlockHandler = () => {
      this.unlockFromGesture()
    }

    const events = ["pointerdown", "touchstart", "keydown"] as const
    events.forEach((evt) => {
      window.addEventListener(evt, unlockHandler, {
        once: true,
        capture: true,
        passive: true,
      })
    })
  }

  /**
   * Called synchronously from any valid user gesture.
   * Ensures AudioContext is running and starts BGM on iOS Safari / Chrome.
   */
  unlockFromGesture(): void {
    if (this.unlocked && this.ctx?.state === "running") return
    this.unlocked = true

    const ctx = this.ensureContext()
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {})
    }

    // Play a silent pulse to wake up iOS hardware audio pipeline
    if (ctx) {
      try {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        g.gain.value = 0.0001
        osc.connect(g)
        g.connect(ctx.destination)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.01)
      } catch {
        // Ignore
      }
    }

    // Start BGM if enabled and not already playing
    if (this.canPlayMusic()) {
      this.startBgm()
    }
  }

  // ── Page Visibility ─────────────────────────────────────────────────────────

  private initVisibilityListener() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (this.musicElement && !this.musicElement.paused) {
          this.musicElement.pause()
        }
        if (this.ctx && this.ctx.state === "running") {
          this.ctx.suspend().catch(() => {})
        }
      } else {
        if (this.canPlayMusic()) {
          this.startBgm()
        }
        if (this.unlocked && this.ctx && this.ctx.state === "suspended") {
          this.ctx.resume().catch(() => {})
        }
      }
    })
  }

  // ── Web Audio Context & Graph ───────────────────────────────────────────────

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AudioCtx) return null

      try {
        this.ctx = new AudioCtx()

        // Dynamics Compressor (master limiter to prevent clipping)
        this.limiter = this.ctx.createDynamicsCompressor()
        this.limiter.threshold.setValueAtTime(-12, this.ctx.currentTime)
        this.limiter.knee.setValueAtTime(10, this.ctx.currentTime)
        this.limiter.ratio.setValueAtTime(12, this.ctx.currentTime)
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime)
        this.limiter.release.setValueAtTime(0.12, this.ctx.currentTime)
        this.limiter.connect(this.ctx.destination)

        // SFX Gain bus
        this.sfxGain = this.ctx.createGain()
        this.sfxGain.gain.setValueAtTime(
          this.sfxEnabled && !this.hostMuted ? 0.75 : 0,
          this.ctx.currentTime,
        )
        this.sfxGain.connect(this.limiter)
      } catch {
        return null
      }
    }

    if (
      this.ctx.state === "suspended" &&
      this.unlocked &&
      typeof document !== "undefined" &&
      !document.hidden
    ) {
      this.ctx.resume().catch(() => {})
    }

    return this.ctx
  }

  // ── BGM Element & Control ───────────────────────────────────────────────────

  private ensureMusicElement(): HTMLAudioElement | null {
    if (typeof window === "undefined") return null
    if (!this.musicElement) {
      try {
        const baseUrl =
          (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) ||
          "/"
        const cleanBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
        const audio = new Audio()
        audio.src = `${cleanBase}assets/audio/bgm.mp3`
        audio.loop = true
        audio.preload = "auto"
        audio.volume =
          this.hostMuted || !this.musicEnabled ? 0 : DEFAULT_BGM_VOLUME
        this.musicElement = audio
      } catch {
        return null
      }
    }
    return this.musicElement
  }

  private startBgm(): void {
    const audio = this.ensureMusicElement()
    if (!audio) return
    audio.volume =
      this.hostMuted || !this.musicEnabled
        ? 0
        : this.isDucked
          ? DUCKED_BGM_VOLUME
          : DEFAULT_BGM_VOLUME
    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay may be deferred until the next user gesture
      })
    }
  }

  private stopBgm(): void {
    if (this.musicElement) {
      this.musicElement.pause()
    }
  }

  private canPlaySfx(): boolean {
    return this.sfxEnabled && !this.hostMuted
  }

  private canPlayMusic(): boolean {
    return (
      this.musicEnabled &&
      !this.hostMuted &&
      !this.hostPaused &&
      typeof document !== "undefined" &&
      !document.hidden
    )
  }

  // ── Public Settings Controls ────────────────────────────────────────────────

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled
    setStoredBoolean(STORAGE_SFX_KEY, enabled)
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(
        this.canPlaySfx() ? 0.75 : 0,
        this.ctx.currentTime,
      )
    }
    this.notifySubscribers()
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled
    setStoredBoolean(STORAGE_MUSIC_KEY, enabled)
    if (this.musicElement) {
      if (enabled && this.canPlayMusic()) {
        this.startBgm()
      } else {
        this.stopBgm()
      }
    } else if (enabled) {
      this.startBgm()
    }
    this.notifySubscribers()
  }

  toggleSfx(): boolean {
    this.setSfxEnabled(!this.sfxEnabled)
    if (this.sfxEnabled) {
      this.playButtonClick()
    }
    return this.sfxEnabled
  }

  toggleMusic(): boolean {
    this.setMusicEnabled(!this.musicEnabled)
    return this.musicEnabled
  }

  setHostMuted(muted: boolean): void {
    this.hostMuted = muted
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(
        this.canPlaySfx() ? 0.75 : 0,
        this.ctx.currentTime,
      )
    }
    if (this.musicElement) {
      if (muted) {
        this.musicElement.volume = 0
      } else {
        this.musicElement.volume = this.musicEnabled
          ? this.isDucked
            ? DUCKED_BGM_VOLUME
            : DEFAULT_BGM_VOLUME
          : 0
        if (this.canPlayMusic()) {
          this.startBgm()
        }
      }
    }
  }

  setHostPaused(paused: boolean): void {
    this.hostPaused = paused
    if (paused) {
      this.stopBgm()
    } else if (this.canPlayMusic()) {
      this.startBgm()
    }
  }

  getSfxEnabled(): boolean {
    return this.sfxEnabled
  }

  getMusicEnabled(): boolean {
    return this.musicEnabled
  }

  subscribe(callback: AudioSubscriber): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  private notifySubscribers(): void {
    const state = {
      sfxEnabled: this.sfxEnabled,
      musicEnabled: this.musicEnabled,
    }
    this.subscribers.forEach((cb) => cb(state))
  }

  // ── BGM Ducking ─────────────────────────────────────────────────────────────

  private duckBgm(durationMs = 2500): void {
    if (!this.musicElement || !this.musicEnabled || this.hostMuted) return
    this.isDucked = true
    this.musicElement.volume = DUCKED_BGM_VOLUME

    if (this.duckTimeout) clearTimeout(this.duckTimeout)
    this.duckTimeout = setTimeout(() => {
      this.isDucked = false
      if (this.musicElement && this.musicEnabled && !this.hostMuted) {
        this.musicElement.volume = DEFAULT_BGM_VOLUME
      }
    }, durationMs)
  }

  // ── Procedural Web Audio Sound Effects ──────────────────────────────────────

  /**
   * Subtle wooden / water droplet tick when player drags across grid cells.
   */
  playCellTick(): void {
    if (!this.canPlaySfx()) return
    const ctx = this.ensureContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(680, now)
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.035)

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038)

    osc.connect(gain)
    gain.connect(this.sfxGain ?? ctx.destination)

    osc.start(now)
    osc.stop(now + 0.04)
  }

  /**
   * Tactile wooden block placement sound.
   * If isClueMatch is true, blends in an uplifting harmonic bell chime.
   */
  playPlaceRegion(isClueMatch = false): void {
    if (!this.canPlaySfx()) return
    const ctx = this.ensureContext()
    if (!ctx) return

    const now = ctx.currentTime

    // 1. Tactile wooden snap/thud
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "triangle"
    osc.frequency.setValueAtTime(290, now)
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.09)

    gain.gain.setValueAtTime(0.24, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11)

    osc.connect(gain)
    gain.connect(this.sfxGain ?? ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)

    // 2. Clue match chime (harmonic two-tone chord: E5 + B5)
    if (isClueMatch) {
      const frequencies = [659.25, 987.77] // E5, B5
      frequencies.forEach((freq, i) => {
        const toneOsc = ctx.createOscillator()
        const toneGain = ctx.createGain()
        const start = now + i * 0.03

        toneOsc.type = "sine"
        toneOsc.frequency.setValueAtTime(freq, start)

        toneGain.gain.setValueAtTime(0.16, start)
        toneGain.gain.exponentialRampToValueAtTime(0.001, start + 0.22)

        toneOsc.connect(toneGain)
        toneGain.connect(this.sfxGain ?? ctx.destination)

        toneOsc.start(start)
        toneOsc.stop(start + 0.24)
      })
    }
  }

  /**
   * Descending gentle whoosh/pop when tapping a block to remove it.
   */
  playRemoveRegion(): void {
    if (!this.canPlaySfx()) return
    const ctx = this.ensureContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(460, now)
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.08)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)

    osc.connect(gain)
    gain.connect(this.sfxGain ?? ctx.destination)

    osc.start(now)
    osc.stop(now + 0.1)
  }

  /**
   * Reverse swoosh / rewind tone when player taps Undo.
   */
  playUndo(): void {
    if (!this.canPlaySfx()) return
    const ctx = this.ensureContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.07)

    gain.gain.setValueAtTime(0.16, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(gain)
    gain.connect(this.sfxGain ?? ctx.destination)

    osc.start(now)
    osc.stop(now + 0.09)
  }

  /**
   * Magical sparkle arpeggio (C5 -> E5 -> G5 -> C6) when player taps Hint.
   */
  playHint(): void {
    if (!this.canPlaySfx()) return
    const ctx = this.ensureContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.045
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.14, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22)

      osc.connect(gain)
      gain.connect(this.sfxGain ?? ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.24)
    })
  }

  /**
   * Soft dull wooden knock for error / out of bounds / clash.
   */
  playError(): void {
    if (!this.canPlaySfx()) return
    const ctx = this.ensureContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "triangle"
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.1)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11)

    osc.connect(gain)
    gain.connect(this.sfxGain ?? ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)
  }

  /**
   * Gentle two-tone warning when board is full but incorrect.
   */
  playWarning(): void {
    if (!this.canPlaySfx()) return
    const ctx = this.ensureContext()
    if (!ctx) return

    const now = ctx.currentTime
    const tones = [440, 349.23] // A4, F4

    tones.forEach((freq, i) => {
      const startTime = now + i * 0.11
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.16, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18)

      osc.connect(gain)
      gain.connect(this.sfxGain ?? ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.2)
    })
  }

  /**
   * Crisp tactile mechanical click for UI button taps.
   */
  playButtonClick(): void {
    if (!this.canPlaySfx()) return
    const ctx = this.ensureContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(1100, now)
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.022)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025)

    osc.connect(gain)
    gain.connect(this.sfxGain ?? ctx.destination)

    osc.start(now)
    osc.stop(now + 0.03)
  }

  /**
   * Celebratory victory fanfare chord progression when a puzzle is solved.
   * Automatically ducks BGM volume so the victory fanfare shines.
   */
  playWin(): void {
    if (!this.canPlaySfx()) return
    const ctx = this.ensureContext()
    if (!ctx) return

    this.duckBgm(2800)

    const now = ctx.currentTime
    // Uplifting chord progression: G4 -> C5 -> E5 -> G5 -> C6
    const notes = [
      { freq: 392.0, time: 0, dur: 0.35, gain: 0.18 },
      { freq: 523.25, time: 0.09, dur: 0.45, gain: 0.2 },
      { freq: 659.25, time: 0.18, dur: 0.55, gain: 0.22 },
      { freq: 783.99, time: 0.27, dur: 0.7, gain: 0.24 },
      { freq: 1046.5, time: 0.38, dur: 1.1, gain: 0.26 },
    ]

    notes.forEach((note) => {
      const startTime = now + note.time
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(note.freq, startTime)

      gain.gain.setValueAtTime(note.gain, startTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + note.dur)

      osc.connect(gain)
      gain.connect(this.sfxGain ?? ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + note.dur + 0.02)
    })
  }
}

export const audioManager = new AudioManager()
export default audioManager
