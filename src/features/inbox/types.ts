import type { SafeActionErrorCode } from "@/lib/action-errors";

export const ingestionStatuses = [
  "uploaded",
  "classifying",
  "extracted",
  "needs_review",
  "needs_attention",
  "confirmed",
  "failed",
  "discarded",
] as const;

export type IngestionStatus = (typeof ingestionStatuses)[number];

export type IngestionRecordType = "maintenance_record" | "compliance_record" | "document";

export type InboxDocumentCategory = "maintenance" | "compliance" | "general";

export type ExtractedField<T> = {
  value: T | null;
  confidence: number;
};

export type IngestionAssetSuggestion = {
  assetId: string | null;
  label: string | null;
  confidence: number;
  reason: string | null;
};

export type MaintenanceExtraction = {
  detectedDocumentType: string | null;
  documentCategory?: ExtractedField<InboxDocumentCategory> | undefined;
  documentType?: ExtractedField<string> | undefined;
  asset: IngestionAssetSuggestion;
  maintenanceDate: ExtractedField<string>;
  mileage: ExtractedField<number>;
  engineHours: ExtractedField<number>;
  serviceProvider: ExtractedField<string>;
  maintenanceType: ExtractedField<string>;
  notes: ExtractedField<string>;
  partsCost: ExtractedField<number>;
  laborCost: ExtractedField<number>;
  otherCost: ExtractedField<number>;
  taxCost: ExtractedField<number>;
  totalCost: ExtractedField<number>;
  complianceExpirationDate?: ExtractedField<string> | undefined;
  overallConfidence: number;
  warnings: string[];
};

export type IngestionJob = {
  id: string;
  company_id: string;
  owner_id: string;
  asset_id: string | null;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string;
  mime_type: string;
  file_size: number;
  source_type: "owner_upload" | "asset_upload";
  detected_document_type: string | null;
  status: IngestionStatus;
  extracted_data: MaintenanceExtraction | Record<string, never>;
  corrected_data: Record<string, unknown> | null;
  confidence_score: number | null;
  model_provider: string | null;
  model_version: string | null;
  error_message: string | null;
  upload_note: string | null;
  created_record_type: IngestionRecordType | null;
  created_record_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IngestionEvent = {
  id: string;
  ingestion_job_id: string;
  company_id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type InboxUploadFormState = {
  status: "idle" | "error";
  code?: SafeActionErrorCode;
  message: string;
  errors: Partial<Record<"file" | "note", string>>;
};

export type InboxReviewFields = {
  category: InboxDocumentCategory;
  documentName: string;
  documentType: string;
  maintenanceRuleId: string;
  maintenanceType: string;
  completionDate: string;
  mileage: string;
  engineHours: string;
  serviceProvider: string;
  partsCost: string;
  laborCost: string;
  otherCost: string;
  taxCost: string;
  issuingOrganization: string;
  identificationNumber: string;
  effectiveDate: string;
  expirationDate: string;
  reminderDays: string;
  documentNumber: string;
  notes: string;
  confirmMeterDecrease: boolean;
};

export type InboxReviewFormState = {
  status: "idle" | "error";
  code?: SafeActionErrorCode;
  message: string;
  fields: InboxReviewFields;
  errors: Partial<Record<keyof InboxReviewFields | "form" | "meterConfirmation", string>>;
};

export type InboxJobListItem = Pick<
  IngestionJob,
  | "id"
  | "original_file_name"
  | "status"
  | "detected_document_type"
  | "confidence_score"
  | "created_record_type"
  | "created_record_id"
  | "created_at"
  | "completed_at"
  | "error_message"
>;
