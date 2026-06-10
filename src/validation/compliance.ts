import { z } from "zod";

export const complianceRequirementKindSchema = z.enum([
  "registration",
  "insurance",
  "inspection",
  "permit",
  "other",
]);

export const complianceRequirementSchema = z.object({
  companyId: z.string().uuid(),
  assetId: z.string().uuid(),
  complianceType: z.string().trim().min(1).max(140),
  issuingOrganization: z.string().trim().max(160).optional(),
  identificationNumber: z.string().trim().max(160).optional(),
  effectiveDate: z.coerce.date().optional(),
  expirationDate: z.coerce.date(),
  reminderDays: z.number().int().min(0).max(365).default(30),
  statusOverride: z.enum(["active", "expiring", "expired", "waived"]).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type ComplianceRequirementInput = z.infer<typeof complianceRequirementSchema>;
