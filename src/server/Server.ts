import cluster from "cluster";
import * as dotenv from "dotenv";
import { GameEnv } from "../core/configuration/Config";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { Cloudflare, TunnelConfig } from "./Cloudflare";
import { startMaster } from "./Master";
import { startWorker } from "./Worker";

const config = getServerConfigFromServer();

dotenv.config();

// Main entry point of the application
async function main() {
  if (cluster.isPrimary) {
    if (config.env() !== GameEnv.Dev) {
      await setupTunnels();
    }
    console.log("Starting master process on standard HTTP/HTTPS port...");
    await startMaster();
  } else {
    console.log("Starting worker process...");
    await startWorker();
  }
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

async function setupTunnels() {
  const cloudflare = new Cloudflare(
    config.cloudflareAccountId(),
    config.cloudflareApiToken(),
    config.cloudflareConfigPath(),
    config.cloudflareCredsPath(),
  );

  // === CUSTOM HOST/IP + PORT ===
  const host = "100.118.122.79";
  const port = 0; // Standard HTTP Port

  const domainToService = new Map<string, string>().set(
    config.subdomain(),
    `http://${host}:${port}`,
  );

  for (let i = 0; i < config.numWorkers(); i++) {
    domainToService.set(
      `w${i}-${config.subdomain()}`,
      `http://${host}:${port + i + 1}`,
    );
  }

  if (!(await cloudflare.configAlreadyExists())) {
    await cloudflare.createTunnel({
      subdomain: config.subdomain(),
      domain: config.domain(),
      subdomainToService: domainToService,
    } as TunnelConfig);
  } else {
    console.log("Config already exists, skipping tunnel creation");
  }

  await cloudflare.startCloudflared();
}
