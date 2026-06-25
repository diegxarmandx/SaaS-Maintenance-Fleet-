import { z } from "zod";

export const subscriptionRecordSchema = z.object({
  companyId: z.string().uuid(),
  stripeCustomerId: z.string().trim().optional(),
  stripeSubscriptionId: z.string().trim().optional(),
  stripePriceId: z.string().trim().optional(),
  planKey: z.enum(["free", "starter", "small_fleet", "growing_fleet"]).optional(),
  status: z
    .enum([
      "trial",
      "trialing",
      "active",
      "past_due",
      "unpaid",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "paused",
    ])
    .default("trial"),
  currentPeriodStart: z.coerce.date().optional(),
  currentPeriodEnd: z.coerce.date().optional(),
  trialEnd: z.coerce.date().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  assetLimit: z.number().int().positive().default(1),
  lastPaymentStatus: z.string().trim().optional(),
});

export type SubscriptionRecordInput = z.infer<typeof subscriptionRecordSchema>;
