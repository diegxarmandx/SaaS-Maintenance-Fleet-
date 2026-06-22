import { z } from "zod";

const optionalTrimmedText = (maximum: number) =>
  z.string().trim().max(maximum).default("");

export const companyProfileSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Enter a company name with at least 2 characters.")
    .max(160, "Company name must be 160 characters or fewer."),
  companyEmail: z
    .string()
    .trim()
    .email("Enter a valid company email address.")
    .max(254, "Company email must be 254 characters or fewer."),
  phone: optionalTrimmedText(40),
  address: optionalTrimmedText(500),
});

export const ownerProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter an owner name with at least 2 characters.")
    .max(160, "Owner name must be 160 characters or fewer."),
});

export const workspacePreferencesSchema = z.object({
  preferredTimezone: z
    .string()
    .trim()
    .min(1, "Choose a timezone.")
    .max(80, "Timezone must be 80 characters or fewer.")
    .refine(isValidTimeZone, "Choose a valid timezone."),
  distanceUnit: z.enum(["miles", "kilometers"], {
    message: "Choose miles or kilometers.",
  }),
  engineHourTracking: z.boolean(),
});

export type CompanyProfileValues = z.output<typeof companyProfileSchema>;
export type OwnerProfileValues = z.output<typeof ownerProfileSchema>;
export type WorkspacePreferencesValues = z.output<typeof workspacePreferencesSchema>;

function isValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
