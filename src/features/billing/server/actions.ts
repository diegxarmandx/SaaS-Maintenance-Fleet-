"use server";

import { redirect } from "next/navigation";

import { isSubscriptionPlanKey, getSubscriptionPlan } from "@/features/billing/plans";
import { getSubscriptionSnapshot } from "@/features/billing/server/subscription";
import { getAppUrl, getStripeClient } from "@/features/billing/server/stripe";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { createSupabaseServiceClient } from "@/server/db/supabase";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";
import {
  expectedActionError,
  toSafeActionException,
} from "@/server/actions/safe-error";

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
    throw expectedActionError("VALIDATION_ERROR", "Choose a valid subscription plan.");
  }

  const plan = getSubscriptionPlan(planKey);

  if (!plan?.stripePriceId) {
    throw expectedActionError(
      "VALIDATION_ERROR",
      "Stripe price IDs are not configured for this plan.",
    );
  }

  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("authenticatedApi", context);

  const stripe = getStripeClient();
  const customerId = await getOrCreateStripeCustomer(context.companyId, context.ownerId);
  const appUrl = getAppUrl();
  let sessionUrl: string | null = null;

  try {
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

    sessionUrl = session.url;
  } catch (error) {
    throw toSafeActionException(error, {
      action: "billing.startCheckout.createSession",
    });
  }

  if (!sessionUrl) {
    throw toSafeActionException(new Error("Stripe did not return a checkout URL."), {
      action: "billing.startCheckout.createSession",
    });
  }

  redirect(sessionUrl);
}

export async function openStripeBillingPortalAction() {
  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("authenticatedApi", context);

  const snapshot = await getSubscriptionSnapshot(context);
  const customerId = snapshot.record?.stripe_customer_id;

  if (!customerId) {
    throw expectedActionError(
      "VALIDATION_ERROR",
      "No Stripe customer exists for this owner workspace yet.",
    );
  }

  const stripe = getStripeClient();
  let portalUrl: string;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppUrl()}/settings`,
    });
    portalUrl = portalSession.url;
  } catch (error) {
    throw toSafeActionException(error, {
      action: "billing.openPortal.createSession",
    });
  }

  redirect(portalUrl);
}

async function getOrCreateStripeCustomer(companyId: string, ownerId: string) {
  const context = await requireOwnerDatabaseContext();
  const { data: company, error } = await context.supabase
    .from("companies")
    .select("company_name,owner_name,email,phone,stripe_customer_id")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw toSafeActionException(error, { action: "billing.getOrCreateCustomer.lookup" });
  }

  if (!company) {
    throw expectedActionError("NOT_FOUND", "Owner company was not found.");
  }

  const billingProfile = company as CompanyBillingProfile;
  const snapshot = await getSubscriptionSnapshot(context);
  const existingCustomerId =
    snapshot.record?.stripe_customer_id ?? billingProfile.stripe_customer_id;

  if (existingCustomerId) {
    return existingCustomerId;
  }

  const stripe = getStripeClient();
  let customerId: string;

  try {
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
    customerId = customer.id;
  } catch (error) {
    throw toSafeActionException(error, {
      action: "billing.getOrCreateCustomer.createStripeCustomer",
    });
  }

  const serviceClient = createSupabaseServiceClient();
  const [companyUpdate, subscriptionUpsert] = await Promise.all([
    serviceClient
      .from("companies")
      .update({ stripe_customer_id: customerId })
      .eq("id", companyId),
    serviceClient.from("subscription_records").upsert(
      {
        company_id: companyId,
        stripe_customer_id: customerId,
      },
      { onConflict: "company_id" },
    ),
  ]);

  if (companyUpdate.error) {
    throw toSafeActionException(companyUpdate.error, {
      action: "billing.getOrCreateCustomer.updateCompany",
    });
  }

  if (subscriptionUpsert.error) {
    throw toSafeActionException(subscriptionUpsert.error, {
      action: "billing.getOrCreateCustomer.upsertSubscription",
    });
  }

  return customerId;
}
