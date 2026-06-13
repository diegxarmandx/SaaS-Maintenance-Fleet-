import { getSubscriptionCapabilities } from "@/features/billing/access";
import { getSubscriptionPlan, type SubscriptionPlanKey } from "@/features/billing/plans";
import type { SubscriptionRecord, SubscriptionSnapshot } from "@/features/billing/types";
import type { OwnerDatabaseContext } from "@/features/fleet/server/owner";
import { AppError } from "@/lib/errors";
import type { SupabaseServerClient } from "@/features/fleet/server/owner";

const DEFAULT_ASSET_LIMIT = 5;

type SubscriptionRecordRow = Partial<SubscriptionRecord> & {
  status?: string | null;
  asset_limit?: number | null;
};

export async function getSubscriptionSnapshot(
  context: OwnerDatabaseContext,
): Promise<SubscriptionSnapshot> {
  const [{ data: record, error: recordError }, activeAssetResult] = await Promise.all([
    context.supabase
      .from("subscription_records")
      .select("*")
      .eq("company_id", context.companyId)
      .maybeSingle(),
    getActiveAssetCount(context.supabase, context.companyId),
  ]);

  if (recordError) {
    throw new AppError("DATA_ACCESS_ERROR", recordError.message);
  }

  const typedRecord = (record as SubscriptionRecordRow | null) ?? null;

  return {
    record: typedRecord ? normalizeSubscriptionRecord(typedRecord) : null,
    status: typedRecord ? normalizeStatus(typedRecord.status) : "trial",
    activeAssetCount: activeAssetResult,
    assetLimit: typedRecord?.asset_limit ?? DEFAULT_ASSET_LIMIT,
  };
}

export async function getAssetCreationGuard(context: OwnerDatabaseContext) {
  const snapshot = await getSubscriptionSnapshot(context);
  return getSubscriptionCapabilities({
    status: snapshot.status,
    activeAssetCount: snapshot.activeAssetCount,
    assetLimit: snapshot.assetLimit,
  });
}

export async function requireActiveAssetCapacity(context: OwnerDatabaseContext) {
  const guard = await getAssetCreationGuard(context);

  if (!guard.canCreateAssets) {
    throw new AppError(
      "AUTHORIZATION_ERROR",
      guard.reason ?? "Your subscription does not currently allow another active asset.",
    );
  }
}

export async function getActiveAssetCount(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  const { count, error } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active")
    .is("archived_at", null);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return count ?? 0;
}

export function getPlanKeyFromPriceId(
  priceId: string | null | undefined,
): SubscriptionPlanKey | null {
  if (!priceId) {
    return null;
  }

  const planKeys: SubscriptionPlanKey[] = ["starter", "small_fleet", "growing_fleet"];
  return (
    planKeys.find((planKey) => getSubscriptionPlan(planKey)?.stripePriceId === priceId) ??
    null
  );
}

function normalizeSubscriptionRecord(row: SubscriptionRecordRow): SubscriptionRecord {
  return {
    id: String(row.id ?? ""),
    company_id: String(row.company_id ?? ""),
    stripe_customer_id: row.stripe_customer_id ?? null,
    stripe_subscription_id: row.stripe_subscription_id ?? null,
    stripe_price_id: row.stripe_price_id ?? null,
    plan_key: row.plan_key ?? getPlanKeyFromPriceId(row.stripe_price_id),
    status: normalizeStatus(row.status),
    current_period_start: row.current_period_start ?? null,
    current_period_end: row.current_period_end ?? null,
    trial_end: row.trial_end ?? null,
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    asset_limit: row.asset_limit ?? DEFAULT_ASSET_LIMIT,
    last_payment_status: row.last_payment_status ?? null,
    restricted_at: row.restricted_at ?? null,
    updated_from_stripe_at: row.updated_from_stripe_at ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function normalizeStatus(
  status: string | null | undefined,
): SubscriptionRecord["status"] {
  if (
    status === "trial" ||
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
