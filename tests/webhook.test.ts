import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import config from "../src/app/config";

describe("Stripe webhook signature", () => {
  const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
  });

  it("rejects a request signed with the wrong secret", () => {
    const payload = JSON.stringify({ type: "noop", data: { object: {} } });
    const wrongSignature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_wrong",
    });

    expect(() =>
      stripe.webhooks.constructEvent(
        payload,
        wrongSignature,
        config.stripe.webhookSecret,
      ),
    ).toThrow();
  });

  it("accepts a request signed with the configured secret", () => {
    if (config.stripe.webhookSecret === "whsec_placeholder") {
      // Skip when running tests against the default placeholder secret.
      return;
    }
    const payload = JSON.stringify({ type: "noop", data: { object: {} } });
    const sig = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: config.stripe.webhookSecret,
    });
    const event = stripe.webhooks.constructEvent(
      payload,
      sig,
      config.stripe.webhookSecret,
    );
    expect(event.type).toBe("noop");
  });
});