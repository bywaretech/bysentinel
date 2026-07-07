// Mini "collector" que roda no HOST (fora do LocalStack) só para você VER os
// eventos sanitizados que a Lambda envia. Rode: `node receiver.mjs`.
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 4599);

createServer((req, res) => {
  if (req.method === "POST" && req.url === "/v1/events") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const evt = JSON.parse(body);
      console.log(`\n📥 ${evt.id}  sanitized=${evt.sanitized}  ${evt.project}/${evt.environment}`);
      if (evt.error) console.log(`   error: ${evt.error.type}: ${evt.error.message}`);
      if (evt.git?.commitSha) console.log(`   git:   ${evt.git.branch}@${evt.git.commitSha} v${evt.git.version ?? "?"}`);
      if (evt.lambda) console.log(`   lambda: cold=${evt.lambda.coldStart} reqId=${evt.lambda.requestId}`);
      if (evt.request?.body) console.log(`   body (redacted): ${JSON.stringify(evt.request.body)}`);
      if (evt.timeline) {
        console.log(`   timeline ${evt.timeline.totalMs}ms aborted=${evt.timeline.aborted}:`);
        for (const s of evt.timeline.steps) {
          console.log(`     ${s.status === "failed" ? "✗" : "•"} ${s.name.padEnd(18)} ${s.durationMs ?? "?"}ms [${s.status}]`);
        }
        if (evt.timeline.bottleneck) console.log(`   bottleneck: ${evt.timeline.bottleneck.name} (${evt.timeline.bottleneck.percentOfTotal}%)`);
      }
      res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
    });
  } else {
    res.writeHead(404).end();
  }
}).listen(PORT, () => console.log(`receiver ouvindo em http://localhost:${PORT}  (POST /v1/events)`));
