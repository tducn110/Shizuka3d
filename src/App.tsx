import { useEffect, useState } from "react"
import IntroScreen from "./screens/IntroScreen"
import GameScreen from "./screens/GameScreen"
import { preloadCriticalResources, preloadNonCriticalResources } from "./utils/game-loader";
import { completeGameLoading, onGameLoadingDismiss, setGameLoadingProgress } from "./utils/loading-controller";


import { resolveGlobalWink } from "./integrations/wink/useWinkIntegration";

export default function App() {
  // Unified PapaStudio loading screen lifecycle barrier
  useEffect(() => {
    setGameLoadingProgress(25);
    const criticalPromise = preloadCriticalResources((pct) => {
      setGameLoadingProgress(Math.min(95, pct));
    });
    const winkPromise = resolveGlobalWink();
    void Promise.allSettled([criticalPromise, winkPromise]).then(() => {
      completeGameLoading();
    });
    const unbind = onGameLoadingDismiss(() => {
      preloadNonCriticalResources();
    });
    return unbind;
  }, []);

  const [view, setView] = useState<"intro" | "game">("intro")

  if (view === "game") return <GameScreen />
  return <IntroScreen onPlay={() => setView("game")} />
}