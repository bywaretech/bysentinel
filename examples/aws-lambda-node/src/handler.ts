import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda";
import {
  withBySentinel,
  captureException,
  captureMessage,
  BySentinel,
} from "@bywaretech/bysentinel-aws-lambda";

/** Pretend payment processor that fails on a specific amount. */
async function processPayment(body: unknown): Promise<{ id: string; status: string }> {
  const { amount } = (body ?? {}) as { amount?: number };
  if (typeof amount !== "number") {
    throw new TypeError("amount must be a number");
  }
  if (amount > 10_000) {
    // Simulate a downstream provider failure.
    throw new Error("payment provider rejected the charge");
  }
  return { id: "pix_" + Math.random().toString(36).slice(2), status: "confirmed" };
}

export const handler = withBySentinel(
  async (event: APIGatewayProxyEventV2, _context: Context): Promise<APIGatewayProxyResultV2> => {
    // Roadmap #1: record the execution timeline. Steps are auto-timed and, on an
    // unhandled error, the failed step is highlighted in the incident.
    const runtime = BySentinel.start();

    runtime.step("Validate Request");
    const body = event.body ? JSON.parse(event.body) : {};

    try {
      runtime.step("Create Payment");
      const payment = await processPayment(body);

      runtime.step("Persist");
      runtime.finish();
      return { statusCode: 200, body: JSON.stringify(payment) };
    } catch (error) {
      // Manual capture with extra business context, then re-throw. The active
      // timeline is attached automatically.
      await captureException(error, {
        feature: "payment-processing",
        step: "create-pix-charge",
      });
      throw error;
    }
  },
  {
    project: "payments-api",
    environment: process.env.BYSENTINEL_ENVIRONMENT ?? "production",
    collectorUrl: process.env.BYSENTINEL_COLLECTOR_URL,
    apiKey: process.env.BYSENTINEL_API_KEY,
    capture: {
      // Bodies/headers stay off by default; strictMode below would also force this.
      query: true,
      stackTrace: true,
      performance: true,
    },
    security: {
      sanitize: true,
      redactPII: true,
      redactSecrets: true,
      redactPaymentData: true,
      strictMode: true,
    },
    ai: {
      enabled: true,
      provider: "openrouter",
      model: "deepseek/deepseek-chat",
      sendBodyToAI: false,
      sendHeadersToAI: false,
    },
  },
);

/** Example of a standalone warning breadcrumb (not tied to an exception). */
export async function reportSlowProvider(): Promise<void> {
  await captureMessage("Payment provider returned a slow response", {
    severity: "warning",
    provider: "payment-api",
  });
}
