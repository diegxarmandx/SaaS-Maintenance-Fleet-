import { z } from "zod";

export const companyOnboardingSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  ownerName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email(),
  address: z.string().trim().min(5).max(500),
  preferredTimezone: z.string().trim().min(1).max(80).default("UTC"),
  distanceUnit: z.enum(["miles", "kilometers"]).default("miles"),
  engineHourTracking: z.boolean().default(true),
});

export type CompanyOnboardingValues = z.input<typeof companyOnboardingSchema>;
export type CompanyOnboardingPayload = z.output<typeof companyOnboardingSchema>;
