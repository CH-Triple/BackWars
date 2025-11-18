import { GameEnv } from "./Config";
import { DefaultServerConfig } from "./DefaultConfig";

export const prodConfig = new (class extends DefaultServerConfig {
  numWorkers(): number {
    // Reduce workers on Render or if NUM_WORKERS env var is set
    if (process.env.RENDER || process.env.NUM_WORKERS) {
      const numWorkers = process.env.NUM_WORKERS 
        ? parseInt(process.env.NUM_WORKERS, 10) 
        : 2; // Default to 2 workers on Render
      return Math.max(1, Math.min(numWorkers, 20)); // Clamp between 1 and 20
    }
    return 20;
  }
  env(): GameEnv {
    return GameEnv.Prod;
  }
  jwtAudience(): string {
    return "openfront.io";
  }
})();
