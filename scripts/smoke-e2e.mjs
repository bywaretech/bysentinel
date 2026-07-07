const baseUrl = (process.env.BYSENTINEL_COLLECTOR_URL ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);
const apiKey = process.env.BYSENTINEL_API_KEY ?? "bsk_local_dev_key";
const adminToken = process.env.BYSENTINEL_ADMIN_TOKEN ?? "bs_admin_dev_token";
const incidentId = `bs_evt_smoke_${Date.now()}`;

const event = {
  id: incidentId,
  timestamp: new Date().toISOString(),
  project: "smoke-test",
  environment: "local",
  runtime: { provider: "aws", service: "lambda", language: "nodejs", version: "20.x" },
  lambda: { functionName: "smoke-payment", requestId: `req_${Date.now()}` },
  error: {
    type: "Error",
    message: "payment provider rejected the charge",
    stack:
      "Error: payment provider rejected the charge\n    at processPayment (src/handler.ts:19:11)",
  },
  timeline: {
    startedAt: new Date(Date.now() - 120).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 120,
    bottleneck: { name: "Process payment", durationMs: 92, percentOfTotal: 76.7 },
    steps: [
      {
        name: "Validate request",
        status: "ok",
        startedAt: new Date(Date.now() - 120).toISOString(),
        durationMs: 28,
      },
      {
        name: "Process payment",
        status: "failed",
        startedAt: new Date(Date.now() - 92).toISOString(),
        durationMs: 92,
      },
    ],
  },
  sanitized: true,
};

await expectOk(
  fetch(`${baseUrl}/v1/events`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(event),
  }),
  202,
  "ingest",
);

const authHeaders = await resolveAuthHeaders();

const incidents = await expectJson(
  fetch(`${baseUrl}/api/incidents`, {
    headers: authHeaders,
  }),
  200,
  "incident list",
);

const incident = incidents.find(
  (item) => item.id === incidentId || item.latestEvent?.id === incidentId,
);
if (!incident) {
  throw new Error(`smoke incident ${incidentId} was not returned by /api/incidents`);
}

if (!incident.analysis?.result?.summary) {
  throw new Error("smoke incident was stored without analysis output");
}

const aiSettings = await expectJson(
  fetch(`${baseUrl}/api/settings/ai`, {
    headers: authHeaders,
  }),
  200,
  "AI settings",
);

if ("apiKey" in aiSettings) {
  throw new Error("/api/settings/ai exposed apiKey");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      incidentId: incident.id,
      fingerprint: incident.fingerprint,
      analysisStatus: incident.analysis.status,
      aiProvider: aiSettings.provider,
      aiEnabled: aiSettings.enabled,
    },
    null,
    2,
  ),
);

async function expectOk(responsePromise, status, label) {
  const response = await responsePromise;
  const body = await response.text();
  if (response.status !== status) {
    throw new Error(`${label} returned ${response.status}: ${body}`);
  }
  return body;
}

async function expectJson(responsePromise, status, label) {
  const response = await responsePromise;
  const body = await response.text();
  if (response.status !== status) {
    throw new Error(`${label} returned ${response.status}: ${body}`);
  }
  return JSON.parse(body);
}

async function resolveAuthHeaders() {
  const bearerHeaders = { authorization: `Bearer ${adminToken}` };
  const bearerProbe = await fetch(`${baseUrl}/api/incidents`, { headers: bearerHeaders });

  if (bearerProbe.status === 200) {
    return bearerHeaders;
  }

  if (bearerProbe.status !== 401) {
    const body = await bearerProbe.text();
    throw new Error(`auth probe returned ${bearerProbe.status}: ${body}`);
  }

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: adminToken }),
  });

  const body = await login.text();
  if (login.status !== 200) {
    throw new Error(`dashboard login returned ${login.status}: ${body}`);
  }

  const cookie = cookieHeaderFromSetCookie(login.headers.get("set-cookie"));
  if (!cookie) {
    throw new Error("dashboard login did not return a session cookie");
  }

  return { cookie };
}

function cookieHeaderFromSetCookie(setCookie) {
  if (!setCookie) {
    return "";
  }

  return setCookie
    .split(/,(?=\s*bs_)/)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}
