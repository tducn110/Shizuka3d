import { useState } from "react"
import IntroScreen from "./screens/IntroScreen"
import GameScreen from "./screens/GameScreen"

export default function App() {
  const [view, setView] = useState<"intro" | "game">("intro")

  if (view === "game") return <GameScreen />
  return <IntroScreen onPlay={() => setView("game")} />
}
