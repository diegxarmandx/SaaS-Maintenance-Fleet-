import { z } from "zod";

export const readingKindSchema = z.enum(["mileage", "engine_hours"]);

export const meterReadingSchema = z.object({
  ownerId: z.string().uuid(),
  assetId: z.string().uuid(),
  kind: readingKindSchema,
  value: z.number().nonnegative(),
  recordedAt: z.coerce.date(),
  note: z.string().trim().max(500).optional(),
});

export type MeterReadingInput = z.infer<typeof meterReadingSchema>;
