import type {
  ComplianceRecord,
  ComplianceRecordFormFields,
  ComplianceRequirementFormFields,
} from "@/features/compliance/types";
import type {
  ComplianceRecordFormInput,
  ComplianceRequirementFormInput,
} from "@/features/compliance/validation";

export const emptyComplianceRecordFormState = {
  status: "idle",
  message: "",
  fields: {
    assetId: "",
    requirementId: "",
    complianceType: "",
    issuingOrganization: "",
    identificationNumber: "",
    effectiveDate: "",
    expirationDate: "",
    reminderDays: "30",
    notes: "",
  },
  errors: {},
} as const;

export const emptyComplianceRequirementFormState = {
  status: "idle",
  message: "",
  fields: {
    assetId: "",
    complianceType: "",
    reminderDays: "30",
    notes: "",
  },
  errors: {},
} as const;

export function getComplianceRecordFieldsFromFormData(
  formData: FormData,
): ComplianceRecordFormFields {
  return {
    assetId: String(formData.get("assetId") ?? ""),
    requirementId: String(formData.get("requirementId") ?? ""),
    complianceType: String(formData.get("complianceType") ?? ""),
    issuingOrganization: String(formData.get("issuingOrganization") ?? ""),
    identificationNumber: String(formData.get("identificationNumber") ?? ""),
    effectiveDate: String(formData.get("effectiveDate") ?? ""),
    expirationDate: String(formData.get("expirationDate") ?? ""),
    reminderDays: String(formData.get("reminderDays") ?? "30"),
    notes: String(formData.get("notes") ?? ""),
  };
}

export function getComplianceRequirementFieldsFromFormData(
  formData: FormData,
): ComplianceRequirementFormFields {
  return {
    assetId: String(formData.get("assetId") ?? ""),
    complianceType: String(formData.get("complianceType") ?? ""),
    reminderDays: String(formData.get("reminderDays") ?? "30"),
    notes: String(formData.get("notes") ?? ""),
  };
}

export function buildComplianceRecordUpdatePayload(input: ComplianceRecordFormInput) {
  return {
    asset_id: input.assetId,
    requirement_id: input.requirementId ?? null,
    compliance_type: input.complianceType,
    issuing_organization: input.issuingOrganization ?? null,
    identification_number: input.identificationNumber ?? null,
    effective_date: input.effectiveDate ?? null,
    expiration_date: input.expirationDate,
    reminder_days: input.reminderDays,
    notes: input.notes ?? null,
  };
}

export function buildComplianceRequirementPayload(
  companyId: string,
  input: ComplianceRequirementFormInput,
) {
  return {
    company_id: companyId,
    asset_id: input.assetId,
    compliance_type: input.complianceType,
    reminder_days: input.reminderDays,
    notes: input.notes ?? null,
    is_active: true,
  };
}

export function complianceRecordToFields(
  record: ComplianceRecord,
): ComplianceRecordFormFields {
  return {
    assetId: record.asset_id,
    requirementId: record.requirement_id ?? "",
    complianceType: record.compliance_type,
    issuingOrganization: record.issuing_organization ?? "",
    identificationNumber: record.identification_number ?? "",
    effectiveDate: record.effective_date ?? "",
    expirationDate: record.expiration_date,
    reminderDays: record.reminder_days.toString(),
    notes: record.notes ?? "",
  };
}
