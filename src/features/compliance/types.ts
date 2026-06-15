import type { ComplianceStatus } from "@/features/compliance/status";
import type { SafeActionErrorCode } from "@/lib/action-errors";

export type ComplianceAssetOption = {
  id: string;
  unit_number: string;
  asset_name: string;
  asset_type: string;
};

export type ComplianceRequirement = {
  id: string;
  company_id: string;
  asset_id: string;
  compliance_type: string;
  reminder_days: number;
  notes: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ComplianceRecord = {
  id: string;
  company_id: string;
  asset_id: string;
  requirement_id: string | null;
  compliance_type: string;
  issuing_organization: string | null;
  identification_number: string | null;
  effective_date: string | null;
  expiration_date: string;
  reminder_days: number;
  status_override: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ComplianceDocument = {
  id: string;
  document_name: string;
  document_type: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  signedUrl: string | null;
};

export type ComplianceOverviewItem = {
  id: string;
  recordId: string | null;
  requirementId: string | null;
  asset_id: string;
  asset: ComplianceAssetOption;
  compliance_type: string;
  issuing_organization: string | null;
  identification_number: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  reminder_days: number;
  notes: string | null;
  archived_at: string | null;
  status: ComplianceStatus;
  statusReasons: string[];
  daysUntilExpiration: number | null;
  document: ComplianceDocument | null;
};

export type ComplianceFilters = {
  query: string;
  assetId: string;
  complianceType: string;
  status: ComplianceStatus | "all";
  sort: "expiration_asc" | "expiration_desc" | "asset" | "type";
  page: number;
};

export type ComplianceRecordFormFields = {
  assetId: string;
  requirementId: string;
  complianceType: string;
  issuingOrganization: string;
  identificationNumber: string;
  effectiveDate: string;
  expirationDate: string;
  reminderDays: string;
  notes: string;
};

export type ComplianceRequirementFormFields = {
  assetId: string;
  complianceType: string;
  reminderDays: string;
  notes: string;
};

export type ComplianceRecordFormState = {
  status: "idle" | "success" | "error";
  code?: SafeActionErrorCode;
  message: string;
  fields: ComplianceRecordFormFields;
  errors: Partial<Record<keyof ComplianceRecordFormFields | "attachment", string>>;
};

export type ComplianceRequirementFormState = {
  status: "idle" | "success" | "error";
  code?: SafeActionErrorCode;
  message: string;
  fields: ComplianceRequirementFormFields;
  errors: Partial<Record<keyof ComplianceRequirementFormFields, string>>;
};
