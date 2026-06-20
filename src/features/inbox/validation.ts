import { z } from "zod";

import { completedMaintenanceFormSchema } from "@/features/maintenance/validation";

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
  asset: z.object({
    assetId: z.string().uuid().nullable().catch(null),
    label: nullableString,
    confidence,
    reason: nullableString,
  }),
  maintenanceDate: extractedField(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ),
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

export const inboxReviewSchema = completedMaintenanceFormSchema.extend({
  confirmMeterDecrease: z.boolean().default(false),
});

export type AiMaintenanceExtraction = z.infer<typeof aiMaintenanceExtractionSchema>;
export type InboxReviewValues = z.infer<typeof inboxReviewSchema>;
