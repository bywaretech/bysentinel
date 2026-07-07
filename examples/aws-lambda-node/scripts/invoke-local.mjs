// Local end-to-end demo: starts a tiny in-process "collector" that prints the
// sanitized events (including the execution timeline), then invokes the handler
// a few times. Build first: `pnpm build`.
//
//   node ./scripts/invoke-local.mjs

import { createServer } from "node:http";

const PORT = 4599;

const server = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/v1/events") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const evt = JSON.parse(body);
      console.log(`\n📥 event ${evt.id}  (sanitized=${evt.sanitized})`);
      if (evt.error) console.log(`   error: ${evt.error.type}: ${evt.error.message}`);
      if (evt.git?.commitSha) console.log(`   git:   ${evt.git.branch}@${evt.git.commitSha}`);
      if (evt.timeline) {
        console.log(`   timeline (${evt.timeline.totalMs}ms, aborted=${evt.timeline.aborted}):`);
        for (const s of evt.timeline.steps) {
          const mark = s.status === "failed" ? "✗" : "•";
          console.log(`     ${mark} ${s.name.padEnd(20)} ${s.durationMs ?? "?"}ms  [${s.status}]`);
        }
        if (evt.timeline.bottleneck) {
          const b = evt.timeline.bottleneck;
          console.log(`   bottleneck: ${b.name} (${b.percentOfTotal}% of total)`);
        }
      }
      res.writeHead(200).end('{"ok":true}');
    });
  } else {
    res.writeHead(404).end();
  }
});

await new Promise((r) => server.listen(PORT, r));

process.env.BYSENTINEL_COLLECTOR_URL = `http://localhost:${PORT}`;
process.env.BYSENTINEL_API_KEY = "bsk_local_dev_key";
process.env.BYSENTINEL_GIT_SHA = "abc1234";
process.env.BYSENTINEL_GIT_BRANCH = "main";
process.env.BYSENTINEL_VERSION = "2.4.0";

const { handler } = await import("../dist/handler.js");

const fakeContext = {
  functionName: "payments-example",
  functionVersion: "$LATEST",
  awsRequestId: "local-" + Date.now(),
  memoryLimitInMB: "256",
  getRemainingTimeInMillis: () => 5000,
};

async function invoke(label, amount) {
  const event = {
    version: "2.0",
    requestContext: { http: { method: "POST", path: "/pay" } },
    rawPath: "/pay",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount }),
  };
  try {
    const res = await handler(event, fakeContext);
    console.log(`\n[${label}] OK ->`, res.statusCode);
  } catch (err) {
    console.log(`\n[${label}] threw (expected): ${err.message}`);
  }
}

await invoke("healthy", 100);
await invoke("provider-failure", 50_000);

await new Promise((r) => setTimeout(r, 200)); // let last POST flush
server.close();
console.log("\nDone.");
