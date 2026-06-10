import { z } from "zod";

export const companySchema = z.object({
  id: z.string().uuid().optional(),
  companyName: z.string().trim().min(2).max(160),
  ownerName: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email(),
  address: z.string().trim().max(500).optional(),
  preferredTimezone: z.string().trim().min(1).max(80).default("UTC"),
  preferredMeasurementSettings: z
    .object({
      distanceUnit: z.enum(["miles", "kilometers"]).default("miles"),
      engineHourTracking: z.boolean().default(true),
    })
    .default({
      distanceUnit: "miles",
      engineHourTracking: true,
    }),
});

export const profileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().email(),
  companyId: z.string().uuid().nullable(),
  onboardingStatus: z.enum(["incomplete", "complete"]),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
