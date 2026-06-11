import type { DocumentFormFields } from "@/features/documents/types";
import type { DocumentFormInput } from "@/features/documents/validation";

export const emptyDocumentFormState = {
  status: "idle",
  message: "",
  fields: {
    documentName: "",
    documentType: "",
    assetId: "",
    maintenanceRecordId: "",
    complianceRecordId: "",
    issueDate: "",
    expirationDate: "",
    documentNumber: "",
    notes: "",
  },
  errors: {},
} as const;

export function getDocumentFieldsFromFormData(formData: FormData): DocumentFormFields {
  return {
    documentName: String(formData.get("documentName") ?? ""),
    documentType: String(formData.get("documentType") ?? ""),
    assetId: String(formData.get("assetId") ?? ""),
    maintenanceRecordId: String(formData.get("maintenanceRecordId") ?? ""),
    complianceRecordId: String(formData.get("complianceRecordId") ?? ""),
    issueDate: String(formData.get("issueDate") ?? ""),
    expirationDate: String(formData.get("expirationDate") ?? ""),
    documentNumber: String(formData.get("documentNumber") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

export function buildDocumentMetadataPayload(
  companyId: string,
  input: DocumentFormInput,
  upload: {
    storageBucket: string;
    storagePath: string;
    mimeType: string;
    fileSize: number;
  },
) {
  const category = resolveDocumentCategory(input);

  return {
    company_id: companyId,
    asset_id: input.assetId ?? null,
    maintenance_record_id: input.maintenanceRecordId ?? null,
    compliance_record_id: input.complianceRecordId ?? null,
    document_name: input.documentName,
    category,
    document_type: input.documentType,
    storage_bucket: upload.storageBucket,
    storage_path: upload.storagePath,
    mime_type: upload.mimeType,
    file_size: upload.fileSize,
    issue_date: input.issueDate ?? null,
    expiration_date: input.expirationDate ?? null,
    document_number: input.documentNumber ?? null,
    notes: input.notes ?? null,
  };
}

export function buildDocumentUpdatePayload(input: DocumentFormInput) {
  return {
    asset_id: input.assetId ?? null,
    maintenance_record_id: input.maintenanceRecordId ?? null,
    compliance_record_id: input.complianceRecordId ?? null,
    document_name: input.documentName,
    category: resolveDocumentCategory(input),
    document_type: input.documentType,
    issue_date: input.issueDate ?? null,
    expiration_date: input.expirationDate ?? null,
    document_number: input.documentNumber ?? null,
    notes: input.notes ?? null,
  };
}

export function resolveDocumentCategory(input: {
  documentType: string;
  assetId?: string | undefined;
  maintenanceRecordId?: string | undefined;
  complianceRecordId?: string | undefined;
}): "asset" | "maintenance" | "compliance" | "general" {
  if (input.complianceRecordId) {
    return "compliance";
  }

  if (input.maintenanceRecordId) {
    return "maintenance";
  }

  if (
    [
      "Registration",
      "Insurance",
      "Inspection certificate",
      "Vehicle permit",
      "Equipment certification",
    ].includes(input.documentType)
  ) {
    return "compliance";
  }

  if (
    ["Maintenance receipt", "Repair invoice", "Parts receipt"].includes(
      input.documentType,
    )
  ) {
    return "maintenance";
  }

  return input.assetId ? "asset" : "general";
}

export function canPreviewDocument(mimeType: string) {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
