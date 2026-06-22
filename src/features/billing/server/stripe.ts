import Stripe from "stripe";

import type { SubscriptionStatus } from "@/features/billing/access";
import { serverEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors";

export const STRIPE_API_VERSION = "2026-05-27.dahlia";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!serverEnv.STRIPE_SECRET_KEY) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Stripe secret key is not configured for subscription billing.",
    );
  }

  stripeClient ??= new Stripe(serverEnv.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    appInfo: {
      name: "Maintly",
      version: "0.1.0",
    },
  });

  return stripeClient;
}

export function isStripeCheckoutConfigured() {
  return Boolean(
    serverEnv.STRIPE_SECRET_KEY &&
    serverEnv.STRIPE_WEBHOOK_SECRET &&
    serverEnv.STRIPE_STARTER_PRICE_ID &&
    serverEnv.STRIPE_SMALL_FLEET_PRICE_ID &&
    serverEnv.STRIPE_GROWING_FLEET_PRICE_ID,
  );
}

export function getAppUrl() {
  return serverEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function stripeTimestampToIso(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

export function getStripeId(
  value:
    | string
    | Stripe.Customer
    | Stripe.Subscription
    | Stripe.Price
    | Stripe.DeletedCustomer
    | null
    | undefined,
) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  if (
    status === "trialing" ||
    status === "active" ||
    status === "past_due" ||
    status === "unpaid" ||
    status === "canceled" ||
    status === "incomplete" ||
    status === "incomplete_expired" ||
    status === "paused"
  ) {
    return status;
  }

  return "incomplete";
}
