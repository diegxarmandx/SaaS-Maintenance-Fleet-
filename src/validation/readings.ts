import { z } from "zod";

export const readingKindSchema = z.enum(["mileage", "engine_hours"]);

export const meterReadingSchema = z.object({
  companyId: z.string().uuid(),
  assetId: z.string().uuid(),
  readingType: readingKindSchema,
  readingValue: z.number().nonnegative(),
  readingDate: z.coerce.date(),
  note: z.string().trim().max(500).optional(),
  isCorrection: z.boolean().default(false),
});

export type MeterReadingInput = z.infer<typeof meterReadingSchema>;
