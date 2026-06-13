import type Stripe from "stripe";

import type { Json } from "@/types/database";
import {
  getStripeClient,
  getStripeId,
  mapStripeSubscriptionStatus,
  stripeTimestampToIso,
} from "@/features/billing/server/stripe";
import { getPlanKeyFromPriceId } from "@/features/billing/server/subscription";
import { getSubscriptionPlan, isSubscriptionPlanKey } from "@/features/billing/plans";
import type { SubscriptionPlanKey } from "@/features/billing/plans";
import { hasFullSubscriptionAccess } from "@/features/billing/access";
import { createSupabaseServiceClient } from "@/server/db/supabase";
import { AppError } from "@/lib/errors";

export type StripeWebhookProcessingResult = {
  duplicate: boolean;
  processed: boolean;
};

type StripeEventIdentifiers = {
  companyId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
};

export async function processStripeWebhookEvent(
  event: Stripe.Event,
): Promise<StripeWebhookProcessingResult> {
  const serviceClient = createSupabaseServiceClient();
  const identifiers = getEventIdentifiers(event);
  const inserted = await insertStripeEvent(serviceClient, event, identifiers);

  if (!inserted) {
    return { duplicate: true, processed: false };
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncStripeSubscription(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_succeeded":
      await syncInvoicePayment(event.data.object as Stripe.Invoice, "succeeded");
      break;
    case "invoice.payment_failed":
      await syncInvoicePayment(event.data.object as Stripe.Invoice, "failed");
      break;
    default:
      break;
  }

  return { duplicate: false, processed: true };
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId = getStripeId(
    session.subscription as Stripe.Subscription | string,
  );

  if (!subscriptionId) {
    return;
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  await syncStripeSubscription(subscription);
}

async function syncStripeSubscription(subscription: Stripe.Subscription) {
  const serviceClient = createSupabaseServiceClient();
  const customerId = getStripeId(subscription.customer);
  const firstItem = subscription.items.data[0] ?? null;
  const priceId = firstItem?.price.id ?? null;
  const planKey = getAuthoritativePlanKey(priceId, subscription.metadata.planKey);
  const plan = planKey ? getSubscriptionPlan(planKey) : null;
  const assetLimit =
    plan?.assetLimit ?? getMetadataAssetLimit(subscription.metadata.assetLimit) ?? 5;
  const companyId =
    subscription.metadata.companyId ??
    (await findCompanyIdForStripeSubscription({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
    }));

  if (!companyId) {
    throw new AppError(
      "DATA_ACCESS_ERROR",
      "Stripe subscription could not be matched to an owner company.",
    );
  }

  const status = mapStripeSubscriptionStatus(subscription.status);
  const restrictedAt = hasFullSubscriptionAccess(status)
    ? null
    : new Date().toISOString();
  const payload = {
    company_id: companyId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan_key: planKey,
    status,
    current_period_start: stripeTimestampToIso(firstItem?.current_period_start),
    current_period_end: stripeTimestampToIso(firstItem?.current_period_end),
    trial_end: stripeTimestampToIso(subscription.trial_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    asset_limit: assetLimit,
    restricted_at: restrictedAt,
    updated_from_stripe_at: new Date().toISOString(),
  };

  const [subscriptionResult, companyResult] = await Promise.all([
    serviceClient
      .from("subscription_records")
      .upsert(payload, { onConflict: "company_id" }),
    serviceClient
      .from("companies")
      .update({
        subscription_status: status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
      })
      .eq("id", companyId),
  ]);

  if (subscriptionResult.error) {
    throw new AppError("DATA_ACCESS_ERROR", subscriptionResult.error.message);
  }

  if (companyResult.error) {
    throw new AppError("DATA_ACCESS_ERROR", companyResult.error.message);
  }
}

async function syncInvoicePayment(
  invoice: Stripe.Invoice,
  status: "succeeded" | "failed",
) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return;
  }

  const serviceClient = createSupabaseServiceClient();
  const { error } = await serviceClient
    .from("subscription_records")
    .update({
      last_payment_status: status,
      updated_from_stripe_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }
}

async function insertStripeEvent(
  serviceClient: ReturnType<typeof createSupabaseServiceClient>,
  event: Stripe.Event,
  identifiers: StripeEventIdentifiers,
) {
  const { error } = await serviceClient.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    api_version: event.api_version ?? null,
    livemode: event.livemode,
    company_id: identifiers.companyId,
    stripe_customer_id: identifiers.customerId,
    stripe_subscription_id: identifiers.subscriptionId,
    payload: sanitizeStripeEventPayload(event),
  });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    return false;
  }

  throw new AppError("DATA_ACCESS_ERROR", error.message);
}

function getEventIdentifiers(event: Stripe.Event): StripeEventIdentifiers {
  const object = event.data.object;

  if (event.type === "checkout.session.completed") {
    const session = object as Stripe.Checkout.Session;
    return {
      companyId: session.metadata?.companyId ?? null,
      customerId: getStripeId(
        session.customer as Stripe.Customer | Stripe.DeletedCustomer | string,
      ),
      subscriptionId: getStripeId(session.subscription as Stripe.Subscription | string),
    };
  }

  if (event.type.startsWith("customer.subscription.")) {
    const subscription = object as Stripe.Subscription;
    return {
      companyId: subscription.metadata.companyId ?? null,
      customerId: getStripeId(subscription.customer),
      subscriptionId: subscription.id,
    };
  }

  if (event.type.startsWith("invoice.payment_")) {
    const invoice = object as Stripe.Invoice;
    return {
      companyId: null,
      customerId: getStripeId(invoice.customer),
      subscriptionId: getInvoiceSubscriptionId(invoice),
    };
  }

  return { companyId: null, customerId: null, subscriptionId: null };
}

function sanitizeStripeEventPayload(event: Stripe.Event): Json {
  const identifiers = getEventIdentifiers(event);

  return {
    id: event.id,
    type: event.type,
    created: event.created,
    livemode: event.livemode,
    requestId: event.request?.id ?? null,
    companyId: identifiers.companyId,
    customerId: identifiers.customerId,
    subscriptionId: identifiers.subscriptionId,
  };
}

function getAuthoritativePlanKey(
  priceId: string | null,
  metadataPlanKey: string | null | undefined,
): SubscriptionPlanKey | null {
  return (
    getPlanKeyFromPriceId(priceId) ??
    (isSubscriptionPlanKey(metadataPlanKey) ? metadataPlanKey : null)
  );
}

function getMetadataAssetLimit(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function findCompanyIdForStripeSubscription({
  stripeCustomerId,
  stripeSubscriptionId,
}: {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}) {
  const serviceClient = createSupabaseServiceClient();
  let query = serviceClient.from("subscription_records").select("company_id").limit(1);

  if (stripeSubscriptionId) {
    query = query.eq("stripe_subscription_id", stripeSubscriptionId);
  } else if (stripeCustomerId) {
    query = query.eq("stripe_customer_id", stripeCustomerId);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data as { company_id: string } | null)?.company_id ?? null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  return getStripeId(invoice.parent?.subscription_details?.subscription);
}
