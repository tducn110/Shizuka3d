import { audioManager } from "../src/audio/audioManager"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg)
}

async function run() {
  // 1. Check audio asset files in public/assets/audio
  const audioDir = path.resolve(__dirname, "../public/assets/audio")
  assert(
    fs.existsSync(path.join(audioDir, "bgm.mp3")),
    "bgm.mp3 exists in public/assets/audio",
  )
  assert(
    fs.existsSync(path.join(audioDir, "jazzMusic.mp3")),
    "jazzMusic.mp3 exists in public/assets/audio",
  )
  assert(
    fs.existsSync(path.join(audioDir, "soft.mp3")),
    "soft.mp3 exists in public/assets/audio",
  )

  const bgmStats = fs.statSync(path.join(audioDir, "bgm.mp3"))
  assert(bgmStats.size > 100000, "bgm.mp3 has valid audio content size")

  // 2. Test settings getters and toggles
  audioManager.setSfxEnabled(true)
  audioManager.setMusicEnabled(true)
  assert(audioManager.getSfxEnabled() === true, "SFX is initially enabled")
  assert(audioManager.getMusicEnabled() === true, "Music is initially enabled")

  let notifiedSfx = false
  let notifiedMusic = false
  const unsubscribe = audioManager.subscribe((state) => {
    notifiedSfx = state.sfxEnabled
    notifiedMusic = state.musicEnabled
  })

  audioManager.setSfxEnabled(false)
  assert(audioManager.getSfxEnabled() === false, "SFX disabled successfully")
  assert(notifiedSfx === false, "Subscriber received SFX disable update")

  audioManager.setMusicEnabled(false)
  assert(
    audioManager.getMusicEnabled() === false,
    "Music disabled successfully",
  )
  assert(notifiedMusic === false, "Subscriber received Music disable update")

  audioManager.toggleSfx()
  assert(
    audioManager.getSfxEnabled() === true,
    "toggleSfx toggles back to true",
  )

  audioManager.toggleMusic()
  assert(
    audioManager.getMusicEnabled() === true,
    "toggleMusic toggles back to true",
  )

  unsubscribe()

  // 3. Host mute and pause state synchronization
  audioManager.setHostMuted(true)
  audioManager.setHostMuted(false)
  audioManager.setHostPaused(true)
  audioManager.setHostPaused(false)

  // 4. Test safe procedural sound triggers (should never throw in any runtime)
  audioManager.unlockFromGesture()
  audioManager.playCellTick()
  audioManager.playPlaceRegion(false)
  audioManager.playPlaceRegion(true)
  audioManager.playRemoveRegion()
  audioManager.playUndo()
  audioManager.playHint()
  audioManager.playError()
  audioManager.playWarning()
  audioManager.playButtonClick()
  audioManager.playWin()

  console.log("ALL AUDIO SYSTEM TESTS PASSED (09_shikaku)")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
