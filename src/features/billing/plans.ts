import { serverEnv } from "@/lib/env/server";

export const SUBSCRIPTION_PLAN_KEYS = [
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
  suggestedMonthlyPrice: string;
  stripePriceId: string | undefined;
  highlight?: boolean;
};

export const subscriptionPlans = [
  {
    key: "starter",
    name: "Starter",
    description: "For owners tracking a small set of vehicles, trailers, or equipment.",
    assetLimit: 5,
    suggestedMonthlyPrice: "$19-$29/mo",
    stripePriceId: serverEnv.STRIPE_STARTER_PRICE_ID,
  },
  {
    key: "small_fleet",
    name: "Small Fleet",
    description: "For growing owner-operated fleets that need more active assets.",
    assetLimit: 15,
    suggestedMonthlyPrice: "$49-$69/mo",
    stripePriceId: serverEnv.STRIPE_SMALL_FLEET_PRICE_ID,
    highlight: true,
  },
  {
    key: "growing_fleet",
    name: "Growing Fleet",
    description: "For owners managing the upper end of the small-fleet range.",
    assetLimit: 30,
    suggestedMonthlyPrice: "$89-$119/mo",
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
