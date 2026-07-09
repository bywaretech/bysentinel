import type { RuntimeInfo } from "@bywaretech/bysentinel-core";

/**
 * Build the runtime descriptor for a Node event. `service` names the framework
 * or entry point (e.g. "express", "fastify", "worker"); it defaults to "node".
 */
export function nodeRuntime(service = "node"): RuntimeInfo {
  return { provider: "node", service, language: "nodejs", version: process.version };
}
