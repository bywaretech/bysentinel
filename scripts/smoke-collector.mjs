const baseUrl = process.env.BYSENTINEL_COLLECTOR_URL ?? "http://localhost:4000";
const apiKey = process.env.BYSENTINEL_API_KEY ?? "bsk_local_dev_key";

const event = {
  id: `evt_smoke_${Date.now()}`,
  timestamp: new Date().toISOString(),
  project: "smoke-test",
  environment: "local",
  runtime: { provider: "aws", service: "lambda", language: "nodejs", version: "20.x" },
  lambda: { functionName: "smoke", requestId: "req_smoke" },
  error: { type: "Error", message: "smoke failure" },
  sanitized: true,
};

const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/events`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-api-key": apiKey },
  body: JSON.stringify(event),
});

const body = await res.text();
console.log(res.status, body);
process.exit(res.ok ? 0 : 1);
