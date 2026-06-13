import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  getSubscriptionCapabilities,
  hasFullSubscriptionAccess,
} from "../src/features/billing/access";

const billingMigrationSql = readFileSync(
  new URL(
    "../supabase/migrations/20260612120000_subscription_billing_and_limits.sql",
    import.meta.url,
  ),
  "utf8",
);

const webhookRouteSource = readFileSync(
  new URL("../src/app/api/stripe/webhook/route.ts", import.meta.url),
  "utf8",
);

const webhookProcessorSource = readFileSync(
  new URL("../src/features/billing/server/webhooks.ts", import.meta.url),
  "utf8",
);

describe("subscription access rules", () => {
  it("allows full access for active and trialing states under the asset limit", () => {
    const active = getSubscriptionCapabilities({
      status: "active",
      activeAssetCount: 4,
      assetLimit: 5,
    });
    const trialing = getSubscriptionCapabilities({
      status: "trialing",
      activeAssetCount: 1,
      assetLimit: 5,
    });

    expect(active.canCreateAssets).toBe(true);
    expect(active.canEditRecords).toBe(true);
    expect(trialing.canUploadFiles).toBe(true);
    expect(hasFullSubscriptionAccess("trialing")).toBe(true);
  });

  it("blocks new active assets at or above the active-asset limit", () => {
    const atLimit = getSubscriptionCapabilities({
      status: "active",
      activeAssetCount: 5,
      assetLimit: 5,
    });
    const overLimit = getSubscriptionCapabilities({
      status: "active",
      activeAssetCount: 7,
      assetLimit: 5,
    });

    expect(atLimit.canCreateAssets).toBe(false);
    expect(atLimit.reason).toContain("reached");
    expect(overLimit.isOverAssetLimit).toBe(true);
    expect(overLimit.reason).toContain("more active assets");
  });

  it("keeps billing and read access available for billing-problem states", () => {
    const pastDue = getSubscriptionCapabilities({
      status: "past_due",
      activeAssetCount: 2,
      assetLimit: 5,
    });

    expect(pastDue.isReadOnly).toBe(true);
    expect(pastDue.canAccessBilling).toBe(true);
    expect(pastDue.canCreateAssets).toBe(false);
    expect(pastDue.canExportReports).toBe(true);
  });
});

describe("subscription billing migration", () => {
  it("adds Stripe statuses, event persistence, and RLS without owner payload access", () => {
    expect(billingMigrationSql).toContain("add value if not exists 'trialing'");
    expect(billingMigrationSql).toContain("add value if not exists 'unpaid'");
    expect(billingMigrationSql).toContain(
      "create table if not exists public.stripe_events",
    );
    expect(billingMigrationSql).toContain(
      "alter table public.stripe_events enable row level security",
    );
    expect(billingMigrationSql).toContain("revoke all on public.stripe_events");
    expect(billingMigrationSql).not.toContain("stripe_events_owner_access");
  });

  it("enforces active-asset limits in the database and onboarding starter limit", () => {
    expect(billingMigrationSql).toContain(
      "create or replace function public.enforce_active_asset_limit",
    );
    expect(billingMigrationSql).toContain("assets_active_asset_limit");
    expect(billingMigrationSql).toContain("status, asset_limit");
    expect(billingMigrationSql).toContain(
      "values (new_company_id, 'trial', 5, 'starter')",
    );
    expect(billingMigrationSql).toContain(
      "Subscription status does not allow creating or reactivating active assets.",
    );
  });
});

describe("Stripe webhook handling", () => {
  it("verifies webhook signatures and avoids trusting checkout redirects", () => {
    expect(webhookRouteSource).toContain("constructEvent");
    expect(webhookRouteSource).toContain("STRIPE_WEBHOOK_SECRET");
    expect(webhookRouteSource).not.toContain("checkout=success");
  });

  it("uses idempotent event inserts before processing subscription changes", () => {
    expect(webhookProcessorSource).toContain("insertStripeEvent");
    expect(webhookProcessorSource).toContain('error.code === "23505"');
    expect(webhookProcessorSource).toContain("sanitizeStripeEventPayload");
    expect(webhookProcessorSource).toContain("customer.subscription.updated");
    expect(webhookProcessorSource).toContain("invoice.payment_failed");
  });
});
