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

  useEffect(() => {
    const blockCopyAction = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener("copy", blockCopyAction, true);
    document.addEventListener("cut", blockCopyAction, true);
    document.addEventListener("selectstart", blockCopyAction, true);
    document.addEventListener("dragstart", blockCopyAction, true);
    document.addEventListener("contextmenu", blockCopyAction, true);

    return () => {
      document.removeEventListener("copy", blockCopyAction, true);
      document.removeEventListener("cut", blockCopyAction, true);
      document.removeEventListener("selectstart", blockCopyAction, true);
      document.removeEventListener("dragstart", blockCopyAction, true);
      document.removeEventListener("contextmenu", blockCopyAction, true);
    };
  }, []);

  const [view, setView] = useState<"intro" | "game">("intro")

  if (view === "game") return <GameScreen />
  return <IntroScreen onPlay={() => setView("game")} />
}