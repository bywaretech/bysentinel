import { loadConfig } from "./config.js";
import { assertSecureConfig } from "./security.js";
import { createBySentinelServer } from "./server.js";

const config = loadConfig();

try {
  assertSecureConfig(config);
} catch (error) {
  console.error(`\n[bysentinel] ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
}

const server = await createBySentinelServer(config);
await server.listen();

console.log(`BySentinel collector listening on http://${config.host}:${config.port}`);
