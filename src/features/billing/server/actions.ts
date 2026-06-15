"use server";

import { redirect } from "next/navigation";

import { isSubscriptionPlanKey, getSubscriptionPlan } from "@/features/billing/plans";
import { getSubscriptionSnapshot } from "@/features/billing/server/subscription";
import { getAppUrl, getStripeClient } from "@/features/billing/server/stripe";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { createSupabaseServiceClient } from "@/server/db/supabase";
import { AppError } from "@/lib/errors";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";

type CompanyBillingProfile = {
  company_name: string;
  owner_name: string;
  email: string;
  phone: string | null;
  stripe_customer_id: string | null;
};

export async function startStripeCheckoutAction(formData: FormData) {
  const planKey = String(formData.get("planKey") ?? "");

  if (!isSubscriptionPlanKey(planKey)) {
    throw new AppError("VALIDATION_ERROR", "Choose a valid subscription plan.");
  }

  const plan = getSubscriptionPlan(planKey);

  if (!plan?.stripePriceId) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Stripe price IDs are not configured for this plan.",
    );
  }

  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("authenticatedApi", context);

  const stripe = getStripeClient();
  const customerId = await getOrCreateStripeCustomer(context.companyId, context.ownerId);
  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: context.companyId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    metadata: {
      companyId: context.companyId,
      ownerId: context.ownerId,
      planKey: plan.key,
      assetLimit: String(plan.assetLimit),
    },
    subscription_data: {
      metadata: {
        companyId: context.companyId,
        ownerId: context.ownerId,
        planKey: plan.key,
        assetLimit: String(plan.assetLimit),
      },
    },
    success_url: `${appUrl}/settings?checkout=success`,
    cancel_url: `${appUrl}/settings?checkout=canceled`,
  });

  if (!session.url) {
    throw new AppError("EXTERNAL_SERVICE_ERROR", "Stripe did not return a checkout URL.");
  }

  redirect(session.url);
}

export async function openStripeBillingPortalAction() {
  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("authenticatedApi", context);

  const snapshot = await getSubscriptionSnapshot(context);
  const customerId = snapshot.record?.stripe_customer_id;

  if (!customerId) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "No Stripe customer exists for this owner workspace yet.",
    );
  }

  const stripe = getStripeClient();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppUrl()}/settings`,
  });

  redirect(portalSession.url);
}

async function getOrCreateStripeCustomer(companyId: string, ownerId: string) {
  const context = await requireOwnerDatabaseContext();
  const { data: company, error } = await context.supabase
    .from("companies")
    .select("company_name,owner_name,email,phone,stripe_customer_id")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  if (!company) {
    throw new AppError("DATA_ACCESS_ERROR", "Owner company was not found.");
  }

  const billingProfile = company as CompanyBillingProfile;
  const snapshot = await getSubscriptionSnapshot(context);
  const existingCustomerId =
    snapshot.record?.stripe_customer_id ?? billingProfile.stripe_customer_id;

  if (existingCustomerId) {
    return existingCustomerId;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: billingProfile.email,
    name: billingProfile.company_name,
    ...(billingProfile.phone ? { phone: billingProfile.phone } : {}),
    metadata: {
      companyId,
      ownerId,
      ownerName: billingProfile.owner_name,
    },
  });

  const serviceClient = createSupabaseServiceClient();
  const [companyUpdate, subscriptionUpsert] = await Promise.all([
    serviceClient
      .from("companies")
      .update({ stripe_customer_id: customer.id })
      .eq("id", companyId),
    serviceClient.from("subscription_records").upsert(
      {
        company_id: companyId,
        stripe_customer_id: customer.id,
      },
      { onConflict: "company_id" },
    ),
  ]);

  if (companyUpdate.error) {
    throw new AppError("DATA_ACCESS_ERROR", companyUpdate.error.message);
  }

  if (subscriptionUpsert.error) {
    throw new AppError("DATA_ACCESS_ERROR", subscriptionUpsert.error.message);
  }

  return customer.id;
}
