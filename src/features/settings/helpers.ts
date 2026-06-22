import type {
  CompanyProfileFields,
  DistanceUnit,
  OwnerProfileFields,
  WorkspacePreferencesFields,
} from "@/features/settings/types";
import type {
  CompanyProfileValues,
  WorkspacePreferencesValues,
} from "@/features/settings/validation";

export const TIMEZONE_OPTIONS = [
  { label: "Atlantic Time - Puerto Rico", value: "America/Puerto_Rico" },
  { label: "Eastern Time", value: "America/New_York" },
  { label: "Central Time", value: "America/Chicago" },
  { label: "Mountain Time", value: "America/Denver" },
  { label: "Pacific Time", value: "America/Los_Angeles" },
  { label: "Alaska Time", value: "America/Anchorage" },
  { label: "Hawaii Time", value: "Pacific/Honolulu" },
  { label: "UTC", value: "UTC" },
] as const;

export function getCompanyProfileFieldsFromFormData(
  formData: FormData,
): CompanyProfileFields {
  return {
    companyName: String(formData.get("companyName") ?? ""),
    companyEmail: String(formData.get("companyEmail") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
  };
}

export function getOwnerProfileFieldsFromFormData(
  formData: FormData,
): OwnerProfileFields {
  return {
    fullName: String(formData.get("fullName") ?? ""),
  };
}

export function getWorkspacePreferencesFieldsFromFormData(
  formData: FormData,
): WorkspacePreferencesFields {
  return {
    preferredTimezone: String(formData.get("preferredTimezone") ?? ""),
    distanceUnit: String(formData.get("distanceUnit") ?? "miles") as DistanceUnit,
    engineHourTracking: formData.get("engineHourTracking") === "on",
  };
}

export function buildCompanyProfileUpdatePayload(values: CompanyProfileValues) {
  return {
    company_name: values.companyName,
    email: values.companyEmail,
    phone: values.phone || null,
    address: values.address || null,
  };
}

export function buildWorkspacePreferencesUpdatePayload(
  values: WorkspacePreferencesValues,
) {
  return {
    preferred_timezone: values.preferredTimezone,
    preferred_measurement_settings: {
      distanceUnit: values.distanceUnit,
      engineHourTracking: values.engineHourTracking,
    },
  };
}

export function parseMeasurementPreferences(value: unknown): {
  distanceUnit: DistanceUnit;
  engineHourTracking: boolean;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { distanceUnit: "miles", engineHourTracking: true };
  }

  const settings = value as {
    distanceUnit?: unknown;
    engineHourTracking?: unknown;
  };

  return {
    distanceUnit: settings.distanceUnit === "kilometers" ? "kilometers" : "miles",
    engineHourTracking: settings.engineHourTracking !== false,
  };
}
