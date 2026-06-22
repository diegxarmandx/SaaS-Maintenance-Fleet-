import type { SafeActionErrorCode } from "@/lib/action-errors";

export type CompanyProfileFields = {
  companyName: string;
  companyEmail: string;
  phone: string;
  address: string;
};

export type OwnerProfileFields = {
  fullName: string;
};

export type DistanceUnit = "miles" | "kilometers";

export type WorkspacePreferencesFields = {
  preferredTimezone: string;
  distanceUnit: DistanceUnit;
  engineHourTracking: boolean;
};

export type SettingsFormState<TFields> = {
  status: "idle" | "success" | "error";
  code?: SafeActionErrorCode;
  message: string;
  fields: TFields;
  errors: Partial<Record<keyof TFields, string>>;
};

export type CompanyProfileFormState = SettingsFormState<CompanyProfileFields>;
export type OwnerProfileFormState = SettingsFormState<OwnerProfileFields>;
export type WorkspacePreferencesFormState = SettingsFormState<WorkspacePreferencesFields>;
