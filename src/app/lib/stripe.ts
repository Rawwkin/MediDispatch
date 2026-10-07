import Stripe from "stripe";
import config from "../config";

export const stripe = new Stripe(config.stripe.secretKey, {
  // Cast keeps the project building across SDK minor upgrades.
  apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
  typescript: true,
});