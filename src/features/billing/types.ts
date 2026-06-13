import type { SubscriptionPlanKey } from "@/features/billing/plans";
import type { SubscriptionStatus } from "@/features/billing/access";

export type SubscriptionRecord = {
  id: string;
  company_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_key: SubscriptionPlanKey | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  asset_limit: number;
  last_payment_status: string | null;
  restricted_at: string | null;
  updated_from_stripe_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionSnapshot = {
  record: SubscriptionRecord | null;
  status: SubscriptionStatus;
  activeAssetCount: number;
  assetLimit: number;
};
