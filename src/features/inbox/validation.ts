import { z } from "zod";

const confidence = z.number().min(0).max(1).catch(0);
const nullableString = z.string().trim().max(500).nullable().catch(null);
const nullableLongString = z.string().trim().max(2000).nullable().catch(null);
const nullableNumber = z.number().nonnegative().nullable().catch(null);

const extractedField = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema.nullable().catch(null),
    confidence,
  });

export const maintenanceExtractionSchema = z.object({
  detectedDocumentType: nullableString,
  documentCategory: extractedField(
    z.enum(["maintenance", "compliance", "general"]),
  ).optional(),
  documentType: extractedField(nullableString).optional(),
  asset: z.object({
    assetId: z.string().uuid().nullable().catch(null),
    label: nullableString,
    confidence,
    reason: nullableString,
  }),
  maintenanceDate: extractedField(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  mileage: extractedField(nullableNumber),
  engineHours: extractedField(nullableNumber),
  serviceProvider: extractedField(nullableString),
  maintenanceType: extractedField(nullableString),
  notes: extractedField(nullableLongString),
  partsCost: extractedField(nullableNumber),
  laborCost: extractedField(nullableNumber),
  otherCost: extractedField(nullableNumber),
  taxCost: extractedField(nullableNumber),
  totalCost: extractedField(nullableNumber),
  complianceExpirationDate: extractedField(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ).optional(),
  overallConfidence: confidence,
  warnings: z.array(z.string().trim().min(1).max(300)).catch([]),
});

export const aiMaintenanceExtractionSchema = z.object({
  detectedDocumentType: z.string().trim().max(120).nullable(),
  assetHint: z
    .object({
      unitNumber: z.string().trim().max(80).nullable(),
      assetName: z.string().trim().max(160).nullable(),
      vinOrSerial: z.string().trim().max(80).nullable(),
      licensePlate: z.string().trim().max(40).nullable(),
      confidence: z.number().min(0).max(1),
      reason: z.string().trim().max(240).nullable(),
    })
    .nullable(),
  maintenanceDate: extractedField(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  mileage: extractedField(nullableNumber),
  engineHours: extractedField(nullableNumber),
  serviceProvider: extractedField(nullableString),
  maintenanceType: extractedField(nullableString),
  notes: extractedField(nullableLongString),
  partsCost: extractedField(nullableNumber),
  laborCost: extractedField(nullableNumber),
  otherCost: extractedField(nullableNumber),
  taxCost: extractedField(nullableNumber),
  totalCost: extractedField(nullableNumber),
  overallConfidence: z.number().min(0).max(1),
  warnings: z.array(z.string().trim().min(1).max(300)),
});

export const assetInboxExtractionSchema = z.object({
  documentCategory: extractedField(z.enum(["maintenance", "compliance", "general"])),
  documentType: extractedField(nullableString),
  maintenanceDate: extractedField(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  mileage: extractedField(nullableNumber),
  engineHours: extractedField(nullableNumber),
  serviceProvider: extractedField(nullableString),
  maintenanceType: extractedField(nullableString),
  notes: extractedField(nullableLongString),
  partsCost: extractedField(nullableNumber),
  laborCost: extractedField(nullableNumber),
  otherCost: extractedField(nullableNumber),
  taxCost: extractedField(nullableNumber),
  totalCost: extractedField(nullableNumber),
  complianceExpirationDate: extractedField(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  overallConfidence: confidence,
  warnings: z.array(z.string().trim().min(1).max(300)).catch([]),
});

const sharedReviewFields = z.object({
  category: z.enum(["maintenance", "compliance", "general"]),
  documentName: z.string().trim().min(1, "Enter a document name.").max(180),
  documentType: z.string().trim().min(1, "Enter a document type.").max(120),
  notes: z.string().trim().max(2000).optional().default(""),
});

const optionalFormNumber = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? null : Number(value),
  z.number().finite().nonnegative().nullable(),
);
const costFormNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? 0 : Number(value)),
  z.number().finite().nonnegative(),
);
const optionalDate = z.union([
  z.literal(""),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
]);

export const inboxReviewSchema = sharedReviewFields
  .extend({
    maintenanceRuleId: z.union([z.literal(""), z.string().uuid()]),
    maintenanceType: z.string().trim().max(140).default(""),
    completionDate: optionalDate.default(""),
    mileage: optionalFormNumber,
    engineHours: optionalFormNumber,
    serviceProvider: z.string().trim().max(160).default(""),
    partsCost: costFormNumber,
    laborCost: costFormNumber,
    otherCost: costFormNumber,
    taxCost: costFormNumber,
    issuingOrganization: z.string().trim().max(160).default(""),
    identificationNumber: z.string().trim().max(120).default(""),
    effectiveDate: optionalDate.default(""),
    expirationDate: optionalDate.default(""),
    reminderDays: z.coerce.number().int().min(0).max(365).default(30),
    documentNumber: z.string().trim().max(120).default(""),
    confirmMeterDecrease: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.category === "maintenance") {
      if (!value.maintenanceType.trim()) {
        context.addIssue({
          code: "custom",
          path: ["maintenanceType"],
          message: "Enter the maintenance type.",
        });
      }
      if (!value.completionDate) {
        context.addIssue({
          code: "custom",
          path: ["completionDate"],
          message: "Enter the completion date.",
        });
      }
    }

    if (value.category === "compliance") {
      if (!value.expirationDate) {
        context.addIssue({
          code: "custom",
          path: ["expirationDate"],
          message: "Enter the expiration date.",
        });
      }

      if (!value.documentType.trim()) {
        context.addIssue({
          code: "custom",
          path: ["documentType"],
          message: "Enter the compliance type.",
        });
      }
    }
  });

export type AiMaintenanceExtraction = z.infer<typeof aiMaintenanceExtractionSchema>;
export type InboxReviewValues = z.infer<typeof inboxReviewSchema>;
