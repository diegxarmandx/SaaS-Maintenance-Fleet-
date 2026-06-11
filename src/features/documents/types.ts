import type { DocumentStatus } from "@/features/documents/status";

export type DocumentAssetOption = {
  id: string;
  unit_number: string;
  asset_name: string;
};

export type DocumentRelationshipOption = {
  id: string;
  label: string;
  asset_id: string | null;
};

export type FleetDocument = {
  id: string;
  company_id: string;
  asset_id: string | null;
  maintenance_record_id: string | null;
  compliance_record_id: string | null;
  document_name: string;
  category: "asset" | "maintenance" | "compliance" | "general";
  document_type: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  issue_date: string | null;
  expiration_date: string | null;
  document_number: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FleetDocumentWithRelations = FleetDocument & {
  asset: DocumentAssetOption | null;
  maintenanceLabel: string | null;
  complianceLabel: string | null;
  signedUrl: string | null;
  status: DocumentStatus;
  daysUntilExpiration: number | null;
  canPreview: boolean;
};

export type DocumentFilters = {
  query: string;
  category: string;
  assetId: string;
  status: DocumentStatus | "all";
  sort: "created_desc" | "created_asc" | "expiration_asc" | "name";
  page: number;
};

export type DocumentFormFields = {
  documentName: string;
  documentType: string;
  assetId: string;
  maintenanceRecordId: string;
  complianceRecordId: string;
  issueDate: string;
  expirationDate: string;
  documentNumber: string;
  notes: string;
};

export type DocumentFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fields: DocumentFormFields;
  errors: Partial<Record<keyof DocumentFormFields | "file", string>>;
};
