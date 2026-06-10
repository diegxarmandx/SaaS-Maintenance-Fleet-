export const DEFAULT_ASSET_TYPES = [
  "Truck",
  "Van",
  "Car",
  "Trailer",
  "Excavator",
  "Backhoe",
  "Loader",
  "Generator",
  "Other equipment",
] as const;

export const ASSET_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
] as const;

export const ASSET_LIST_STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  ...ASSET_STATUS_OPTIONS,
] as const;

export const FLEET_SORT_OPTIONS = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "unit_asc", label: "Unit number" },
  { value: "name_asc", label: "Asset name" },
  { value: "mileage_desc", label: "Highest mileage" },
  { value: "hours_desc", label: "Highest hours" },
] as const;

export const ASSET_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const ASSET_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const FLEET_PAGE_SIZE = 10;
