import { z } from "zod";

export const complianceRequirementKindSchema = z.enum([
  "registration",
  "insurance",
  "inspection",
  "permit",
  "other",
]);

export const complianceRequirementSchema = z.object({
  ownerId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  kind: complianceRequirementKindSchema,
  name: z.string().trim().min(1).max(140),
  expiresAt: z.coerce.date(),
  alertDaysBefore: z.number().int().min(0).max(365).default(30),
  notes: z.string().trim().max(1000).optional(),
});

export type ComplianceRequirementInput = z.infer<typeof complianceRequirementSchema>;
