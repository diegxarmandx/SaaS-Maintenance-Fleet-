export const DOCUMENT_PAGE_SIZE = 12;
export const DOCUMENT_UPLOAD_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_UPLOAD_MAX_SIZE_LABEL = "10 MB";

export const DOCUMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const DOCUMENT_TYPES = [
  "Registration",
  "Title",
  "Insurance",
  "Inspection certificate",
  "Purchase agreement",
  "Loan document",
  "Warranty",
  "Maintenance receipt",
  "Repair invoice",
  "Parts receipt",
  "Vehicle permit",
  "Equipment certification",
  "Owner's manual",
  "Photo",
  "Other",
] as const;

export const DOCUMENT_STATUS_FILTERS = [
  { label: "All statuses", value: "all" },
  { label: "Current", value: "Current" },
  { label: "Expiring soon", value: "Expiring soon" },
  { label: "Expired", value: "Expired" },
  { label: "Archived", value: "Archived" },
] as const;

export const DOCUMENT_SORT_OPTIONS = [
  { label: "Newest first", value: "created_desc" },
  { label: "Oldest first", value: "created_asc" },
  { label: "Expiration date", value: "expiration_asc" },
  { label: "Document name", value: "name" },
] as const;
