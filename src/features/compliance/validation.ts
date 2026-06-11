import { z } from "zod";

import { DEFAULT_COMPLIANCE_TYPES } from "@/features/compliance/constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined);

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .or(z.literal(""))
  .transform((value) => value || undefined);

const requiredDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.");

export const complianceRecordFormSchema = z.object({
  assetId: z.string().uuid("Choose an asset."),
  requirementId: z
    .string()
    .uuid()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  complianceType: z
    .string()
    .trim()
    .min(1, "Enter a compliance type.")
    .max(140, "Keep the compliance type under 140 characters."),
  issuingOrganization: optionalText(160),
  identificationNumber: optionalText(160),
  effectiveDate: optionalDate,
  expirationDate: requiredDate,
  reminderDays: z.coerce.number().int().min(0).max(730),
  notes: optionalText(1000),
});

export const complianceRequirementFormSchema = z.object({
  assetId: z.string().uuid("Choose an asset."),
  complianceType: z
    .string()
    .trim()
    .min(1, "Enter a compliance type.")
    .max(140, "Keep the compliance type under 140 characters."),
  reminderDays: z.coerce.number().int().min(0).max(730),
  notes: optionalText(1000),
});

export type ComplianceRecordFormInput = z.infer<typeof complianceRecordFormSchema>;
export type ComplianceRequirementFormInput = z.infer<
  typeof complianceRequirementFormSchema
>;

export function isDefaultComplianceType(value: string) {
  return DEFAULT_COMPLIANCE_TYPES.includes(
    value as (typeof DEFAULT_COMPLIANCE_TYPES)[number],
  );
}
