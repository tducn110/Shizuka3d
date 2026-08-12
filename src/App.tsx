import { useState } from "react"
import IsometricScene from "./IsometricScene"
import ShikakuGame from "./game/ShikakuGame"

export default function App() {
  const [view, setView] = useState<"intro" | "game">("intro")

  if (view === "game") return <ShikakuGame />
  return <IsometricScene onPlay={() => setView("game")} />
}
