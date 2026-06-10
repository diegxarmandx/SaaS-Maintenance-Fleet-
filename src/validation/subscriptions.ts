import { z } from "zod";

export const subscriptionRecordSchema = z.object({
  companyId: z.string().uuid(),
  stripeCustomerId: z.string().trim().optional(),
  stripeSubscriptionId: z.string().trim().optional(),
  stripePriceId: z.string().trim().optional(),
  status: z
    .enum(["trial", "active", "past_due", "canceled", "incomplete"])
    .default("trial"),
  currentPeriodEnd: z.coerce.date().optional(),
  assetLimit: z.number().int().positive().default(25),
});

export type SubscriptionRecordInput = z.infer<typeof subscriptionRecordSchema>;
