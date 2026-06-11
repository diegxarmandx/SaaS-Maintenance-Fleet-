export const COMPLIANCE_PAGE_SIZE = 12;

export const DEFAULT_COMPLIANCE_TYPES = [
  "Vehicle registration",
  "Safety inspection",
  "Commercial vehicle permit",
  "Insurance",
  "Municipal permit",
  "Operating license",
  "Weight certification",
  "Emissions requirement",
  "Equipment certification",
  "Custom compliance requirement",
] as const;

export const COMPLIANCE_STATUS_FILTERS = [
  { label: "All statuses", value: "all" },
  { label: "Current", value: "Current" },
  { label: "Expiring soon", value: "Expiring soon" },
  { label: "Expired", value: "Expired" },
  { label: "Missing", value: "Missing" },
  { label: "Archived", value: "Archived" },
] as const;

export const COMPLIANCE_SORT_OPTIONS = [
  { label: "Expiration date", value: "expiration_asc" },
  { label: "Newest expiration", value: "expiration_desc" },
  { label: "Asset", value: "asset" },
  { label: "Compliance type", value: "type" },
] as const;
