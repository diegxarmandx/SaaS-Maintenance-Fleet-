export type AssetStatus = "active" | "inactive" | "archived";
export type MeterReadingType = "mileage" | "engine_hours";
export type FleetSort =
  | "updated_desc"
  | "unit_asc"
  | "name_asc"
  | "mileage_desc"
  | "hours_desc";
export type FleetStatusFilter = AssetStatus | "all";
export type AssetAttentionStatus =
  | "Current"
  | "Due soon"
  | "Expiring soon"
  | "Overdue"
  | "Expired"
  | "Missing"
  | "Archived"
  | "Active"
  | "Past due"
  | "Canceled"
  | "Read-only";

export type FleetAsset = {
  id: string;
  company_id: string;
  unit_number: string;
  asset_name: string;
  asset_type: string;
  year: number | null;
  make: string | null;
  model: string | null;
  vin_or_serial_number: string | null;
  license_plate: string | null;
  current_mileage: number;
  current_engine_hours: number;
  purchase_date: string | null;
  purchase_price: number | null;
  status: AssetStatus;
  notes: string | null;
  asset_image_path: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type FleetAssetListItem = FleetAsset & {
  assetImageUrl: string | null;
  attentionStatus: AssetAttentionStatus;
};

export type MeterReading = {
  id: string;
  company_id: string;
  asset_id: string;
  reading_type: MeterReadingType;
  reading_value: number;
  reading_date: string;
  notes: string | null;
  is_correction: boolean;
  created_at: string;
};

export type AssetProfile = FleetAssetListItem & {
  meterReadings: MeterReading[];
  maintenanceRecordCount: number;
  complianceRecordCount: number;
  documentCount: number;
  expenseTotal: number;
};

export type AssetFormFields = {
  unitNumber: string;
  assetName: string;
  assetType: string;
  year: string;
  make: string;
  model: string;
  vinOrSerialNumber: string;
  licensePlate: string;
  currentMileage: string;
  currentEngineHours: string;
  purchaseDate: string;
  purchasePrice: string;
  status: AssetStatus;
  notes: string;
};

export type AssetFormState = {
  status: "idle" | "error";
  message: string;
  fields: AssetFormFields;
  errors: Partial<Record<keyof AssetFormFields | "assetImage", string>>;
};

export type MeterReadingFormFields = {
  readingType: MeterReadingType;
  readingValue: string;
  readingDate: string;
  notes: string;
  isCorrection: boolean;
};

export type MeterReadingFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fields: MeterReadingFormFields;
  errors: Partial<Record<keyof MeterReadingFormFields, string>>;
};

export type FleetListFilters = {
  query: string;
  status: FleetStatusFilter;
  assetType: string;
  sort: FleetSort;
  page: number;
};
