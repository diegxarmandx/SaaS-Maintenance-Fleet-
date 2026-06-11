export const MAINTENANCE_PAGE_SIZE = 10;
export const MAINTENANCE_HISTORY_PAGE_SIZE = 10;

export const MAINTENANCE_STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "Current", label: "Current" },
  { value: "Due soon", label: "Due soon" },
  { value: "Overdue", label: "Overdue" },
] as const;

export const MAINTENANCE_RULE_SORT_OPTIONS = [
  { value: "urgency", label: "Urgency" },
  { value: "asset", label: "Asset" },
  { value: "name", label: "Maintenance type" },
  { value: "due_date", label: "Next due date" },
] as const;

export const MAINTENANCE_ATTACHMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAINTENANCE_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
