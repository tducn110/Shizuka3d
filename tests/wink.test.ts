import { resolveGlobalWink, resetGlobalWinkInit } from "../src/integrations/wink/useWinkIntegration";
import type { WinkSDK } from "../src/integrations/wink/types";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function run() {
  resetGlobalWinkInit();
  delete (globalThis as any).Wink;
  delete (globalThis as any).WinkBridge;

  // 1. Standalone mode
  const sdk = await resolveGlobalWink();
  assert(sdk === null, "Wink SDK resolves null in standalone mode");

  // 2. Connected mode
  let gameplayStartCalled = false;
  let gameplayStopCalled = false;
  let trackCalled = false;

  const mockSdk: Partial<WinkSDK> = {
    init: async () => mockSdk as WinkSDK,
    gameplayStart: () => {
      gameplayStartCalled = true;
    },
    gameplayStop: () => {
      gameplayStopCalled = true;
    },
    track: async () => {
      trackCalled = true;
    },
    can: () => true,
    status: "online",
  };

  resetGlobalWinkInit();
  (globalThis as any).window = globalThis;
  (globalThis as any).Wink = mockSdk;

  const connectedSdk = await resolveGlobalWink();
  assert(connectedSdk !== null, "Wink SDK resolves mockSdk when present");
  connectedSdk?.gameplayStart?.();
  assert(gameplayStartCalled, "gameplayStart works");

  connectedSdk?.gameplayStop?.();
  assert(gameplayStopCalled, "gameplayStop works");

  connectedSdk?.track?.("puzzle_complete", { level: 1 });
  assert(trackCalled, "track works");

  console.log("ALL WINK INTEGRATION TESTS PASSED (09_shikaku)");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
