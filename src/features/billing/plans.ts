import { serverEnv } from "@/lib/env/server";

export const SUBSCRIPTION_PLAN_KEYS = [
  "free",
  "starter",
  "small_fleet",
  "growing_fleet",
] as const;

export type SubscriptionPlanKey = (typeof SUBSCRIPTION_PLAN_KEYS)[number];

export type SubscriptionPlan = {
  key: SubscriptionPlanKey;
  name: string;
  description: string;
  assetLimit: number;
  assetRangeLabel: string;
  suggestedMonthlyPrice: string;
  requiresStripe: boolean;
  stripePriceId: string | undefined;
  highlight?: boolean;
};

export const subscriptionPlans = [
  {
    key: "free",
    name: "Free",
    description: "For trying Maintly with one active vehicle, trailer, or equipment record.",
    assetLimit: 1,
    assetRangeLabel: "1 active asset",
    suggestedMonthlyPrice: "$0/mo",
    requiresStripe: false,
    stripePriceId: undefined,
  },
  {
    key: "starter",
    name: "Starter",
    description: "For owners ready to manage a small working fleet.",
    assetLimit: 5,
    assetRangeLabel: "2-5 active assets",
    suggestedMonthlyPrice: "$19-$29/mo",
    requiresStripe: true,
    stripePriceId: serverEnv.STRIPE_STARTER_PRICE_ID,
  },
  {
    key: "small_fleet",
    name: "Small Fleet",
    description: "For growing owner-operated fleets that need more active assets.",
    assetLimit: 15,
    assetRangeLabel: "6-15 active assets",
    suggestedMonthlyPrice: "$49-$69/mo",
    requiresStripe: true,
    stripePriceId: serverEnv.STRIPE_SMALL_FLEET_PRICE_ID,
    highlight: true,
  },
  {
    key: "growing_fleet",
    name: "Growing Fleet",
    description: "For owners managing the upper end of the small-fleet range.",
    assetLimit: 30,
    assetRangeLabel: "16-30 active assets",
    suggestedMonthlyPrice: "$89-$119/mo",
    requiresStripe: true,
    stripePriceId: serverEnv.STRIPE_GROWING_FLEET_PRICE_ID,
  },
] satisfies SubscriptionPlan[];

export function getSubscriptionPlan(
  planKey: string | null | undefined,
): SubscriptionPlan | null {
  return subscriptionPlans.find((plan) => plan.key === planKey) ?? null;
}

export function isSubscriptionPlanKey(
  planKey: string | null | undefined,
): planKey is SubscriptionPlanKey {
  return subscriptionPlans.some((plan) => plan.key === planKey);
}

export function parseSubscriptionPlanKey(
  value: string | string[] | null | undefined,
): SubscriptionPlanKey | null {
  const planKey = Array.isArray(value) ? value[0] : value;

  return isSubscriptionPlanKey(planKey) ? planKey : null;
}
