import { withBySentinel, BySentinel } from "@bysentinel/aws-lambda";

/** Processador de pagamento fake: falha acima de 10.000. */
async function processPayment(body) {
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount)) throw new TypeError("amount must be a number");
  if (amount > 10_000) throw new Error("payment provider rejected the charge");
  return { id: "pix_" + Math.random().toString(36).slice(2), status: "confirmed" };
}

export const handler = withBySentinel(
  async (event) => {
    const rt = BySentinel.start();

    rt.step("Validate Request");
    const body = event?.body ? JSON.parse(event.body) : {};

    rt.step("Create Payment");
    const payment = await processPayment(body);

    rt.step("Persist");
    rt.finish();
    return { statusCode: 200, body: JSON.stringify(payment) };
  },
  {
    project: "localstack-test",
    environment: "sandbox",
    collectorUrl: process.env.BYSENTINEL_COLLECTOR_URL,
    apiKey: process.env.BYSENTINEL_API_KEY,
    // Ligado só pra você VER a redação acontecendo no receiver.
    capture: { requestBody: true, headers: true },
    security: { sanitize: true, redactPII: true, redactSecrets: true, redactPaymentData: true },
    // Em Lambda, aguardamos a entrega (limitada) antes de retornar.
    delivery: { mode: "blocking", timeoutMs: 3000 },
  },
);
