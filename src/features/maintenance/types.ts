import type { MaintenanceStatus } from "@/features/maintenance/schedule";
import type { SafeActionErrorCode } from "@/lib/action-errors";

export type MaintenanceTemplate = {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  default_mileage_interval: number | null;
  default_hour_interval: number | null;
  default_calendar_interval_days: number | null;
  is_active: boolean;
};

export type MaintenanceAssetOption = {
  id: string;
  unit_number: string;
  asset_name: string;
  asset_type: string;
  current_mileage: number;
  current_engine_hours: number;
};

export type MaintenanceRule = {
  id: string;
  company_id: string;
  asset_id: string;
  template_id: string | null;
  name: string;
  description: string | null;
  mileage_interval: number | null;
  hour_interval: number | null;
  calendar_interval_days: number | null;
  last_completed_date: string | null;
  last_completed_mileage: number | null;
  last_completed_hours: number | null;
  next_due_date: string | null;
  next_due_mileage: number | null;
  next_due_hours: number | null;
  reminder_mileage: number | null;
  reminder_hours: number | null;
  reminder_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MaintenanceRuleWithAsset = MaintenanceRule & {
  asset: MaintenanceAssetOption;
  status: MaintenanceStatus;
  statusReasons: string[];
  daysUntilDue: number | null;
  mileageUntilDue: number | null;
  hoursUntilDue: number | null;
};

export type MaintenanceRecord = {
  id: string;
  company_id: string;
  asset_id: string;
  maintenance_rule_id: string | null;
  maintenance_type: string;
  completion_date: string;
  mileage: number | null;
  engine_hours: number | null;
  service_provider: string | null;
  parts_cost: number;
  labor_cost: number;
  other_cost: number;
  total_cost: number;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceRecordWithAsset = MaintenanceRecord & {
  asset: MaintenanceAssetOption;
  attachment: MaintenanceAttachment | null;
};

export type MaintenanceAttachment = {
  id: string;
  document_name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  signedUrl: string | null;
};

export type MaintenanceCostSummary = {
  totalCost: number;
  partsCost: number;
  laborCost: number;
  otherCost: number;
  byAsset: Array<{ assetId: string; label: string; totalCost: number }>;
  byCategory: Array<{ category: string; totalCost: number }>;
};

export type MaintenanceRuleFormFields = {
  assetId: string;
  templateId: string;
  name: string;
  description: string;
  mileageInterval: string;
  hourInterval: string;
  calendarIntervalDays: string;
  lastCompletedDate: string;
  lastCompletedMileage: string;
  lastCompletedHours: string;
  reminderMileage: string;
  reminderHours: string;
  reminderDays: string;
  isActive: boolean;
};

export type MaintenanceRuleFormState = {
  status: "idle" | "error";
  code?: SafeActionErrorCode;
  message: string;
  fields: MaintenanceRuleFormFields;
  errors: Partial<Record<keyof MaintenanceRuleFormFields, string>>;
};

export type CompletedMaintenanceFormFields = {
  assetId: string;
  maintenanceRuleId: string;
  maintenanceType: string;
  completionDate: string;
  mileage: string;
  engineHours: string;
  serviceProvider: string;
  partsCost: string;
  laborCost: string;
  otherCost: string;
  notes: string;
};

export type CompletedMaintenanceFormState = {
  status: "idle" | "error";
  code?: SafeActionErrorCode;
  message: string;
  fields: CompletedMaintenanceFormFields;
  errors: Partial<Record<keyof CompletedMaintenanceFormFields | "attachment", string>>;
};

export type MaintenanceRuleFilters = {
  query: string;
  assetId: string;
  maintenanceType: string;
  status: MaintenanceStatus | "all";
  sort: "urgency" | "asset" | "name" | "due_date";
  page: number;
};

export type MaintenanceHistoryFilters = {
  query: string;
  assetId: string;
  maintenanceType: string;
  dateFrom: string;
  dateTo: string;
  minCost: string;
  maxCost: string;
  page: number;
};
