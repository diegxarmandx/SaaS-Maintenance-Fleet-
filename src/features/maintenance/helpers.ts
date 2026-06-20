import { calculateNextMaintenanceDue } from "@/features/maintenance/schedule";
import type {
  CompletedMaintenanceFormFields,
  CompletedMaintenanceFormState,
  MaintenanceCostSummary,
  MaintenanceRecordWithAsset,
  MaintenanceRuleFormFields,
  MaintenanceRuleFormState,
} from "@/features/maintenance/types";
import type {
  CompletedMaintenanceFormValues,
  MaintenanceRuleFormValues,
} from "@/features/maintenance/validation";

export const emptyMaintenanceRuleFormFields: MaintenanceRuleFormFields = {
  assetId: "",
  templateId: "",
  name: "",
  description: "",
  mileageInterval: "",
  hourInterval: "",
  calendarIntervalDays: "",
  lastCompletedDate: "",
  lastCompletedMileage: "",
  lastCompletedHours: "",
  reminderMileage: "",
  reminderHours: "",
  reminderDays: "14",
  isActive: true,
};

export const emptyMaintenanceRuleFormState: MaintenanceRuleFormState = {
  status: "idle",
  message: "",
  fields: emptyMaintenanceRuleFormFields,
  errors: {},
};

export const emptyCompletedMaintenanceFormFields: CompletedMaintenanceFormFields = {
  assetId: "",
  maintenanceRuleId: "",
  maintenanceType: "",
  completionDate: new Date().toISOString().slice(0, 10),
  mileage: "",
  engineHours: "",
  serviceProvider: "",
  partsCost: "0",
  laborCost: "0",
  otherCost: "0",
  taxCost: "0",
  notes: "",
};

export const emptyCompletedMaintenanceFormState: CompletedMaintenanceFormState = {
  status: "idle",
  message: "",
  fields: emptyCompletedMaintenanceFormFields,
  errors: {},
};

export function getMaintenanceRuleFieldsFromFormData(
  formData: FormData,
): MaintenanceRuleFormFields {
  const getString = (key: keyof MaintenanceRuleFormFields) =>
    String(formData.get(key) ?? "");

  return {
    assetId: getString("assetId"),
    templateId: getString("templateId"),
    name: getString("name"),
    description: getString("description"),
    mileageInterval: getString("mileageInterval"),
    hourInterval: getString("hourInterval"),
    calendarIntervalDays: getString("calendarIntervalDays"),
    lastCompletedDate: getString("lastCompletedDate"),
    lastCompletedMileage: getString("lastCompletedMileage"),
    lastCompletedHours: getString("lastCompletedHours"),
    reminderMileage: getString("reminderMileage"),
    reminderHours: getString("reminderHours"),
    reminderDays: getString("reminderDays"),
    isActive: formData.get("isActive") === "on",
  };
}

export function getCompletedMaintenanceFieldsFromFormData(
  formData: FormData,
): CompletedMaintenanceFormFields {
  const getString = (key: keyof CompletedMaintenanceFormFields) =>
    String(formData.get(key) ?? "");

  return {
    assetId: getString("assetId"),
    maintenanceRuleId: getString("maintenanceRuleId"),
    maintenanceType: getString("maintenanceType"),
    completionDate: getString("completionDate"),
    mileage: getString("mileage"),
    engineHours: getString("engineHours"),
    serviceProvider: getString("serviceProvider"),
    partsCost: getString("partsCost"),
    laborCost: getString("laborCost"),
    otherCost: getString("otherCost"),
    taxCost: getString("taxCost"),
    notes: getString("notes"),
  };
}

const nullableText = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

export function buildMaintenanceRulePayload(
  companyId: string,
  values: MaintenanceRuleFormValues,
) {
  const nextDue = calculateNextMaintenanceDue({
    lastCompletedDate: values.lastCompletedDate ?? null,
    lastCompletedMileage: values.lastCompletedMileage ?? null,
    lastCompletedHours: values.lastCompletedHours ?? null,
    mileageInterval: values.mileageInterval ?? null,
    hourInterval: values.hourInterval ?? null,
    calendarIntervalDays: values.calendarIntervalDays ?? null,
  });

  return {
    company_id: companyId,
    asset_id: values.assetId,
    template_id: values.templateId ?? null,
    name: values.name,
    description: nullableText(values.description),
    mileage_interval: values.mileageInterval ?? null,
    hour_interval: values.hourInterval ?? null,
    calendar_interval_days: values.calendarIntervalDays ?? null,
    last_completed_date: values.lastCompletedDate ?? null,
    last_completed_mileage: values.lastCompletedMileage ?? null,
    last_completed_hours: values.lastCompletedHours ?? null,
    next_due_date: nextDue.nextDueDate?.toISOString().slice(0, 10) ?? null,
    next_due_mileage: nextDue.nextDueMileage,
    next_due_hours: nextDue.nextDueHours,
    reminder_mileage: values.reminderMileage ?? null,
    reminder_hours: values.reminderHours ?? null,
    reminder_days: values.reminderDays,
    is_active: values.isActive,
  };
}

export function calculateTotalCost(values: CompletedMaintenanceFormValues) {
  return values.partsCost + values.laborCost + values.otherCost + values.taxCost;
}

export function summarizeMaintenanceCosts(
  records: MaintenanceRecordWithAsset[],
): MaintenanceCostSummary {
  const summary: MaintenanceCostSummary = {
    totalCost: 0,
    partsCost: 0,
    laborCost: 0,
    otherCost: 0,
    taxCost: 0,
    byAsset: [],
    byCategory: [],
  };
  const byAsset = new Map<
    string,
    { assetId: string; label: string; totalCost: number }
  >();
  const byCategory = new Map<string, { category: string; totalCost: number }>();

  records.forEach((record) => {
    const totalCost = Number(record.total_cost ?? 0);
    summary.totalCost += totalCost;
    summary.partsCost += Number(record.parts_cost ?? 0);
    summary.laborCost += Number(record.labor_cost ?? 0);
    summary.otherCost += Number(record.other_cost ?? 0);
    summary.taxCost += Number(record.tax_cost ?? 0);

    const assetLabel = `${record.asset.unit_number} ${record.asset.asset_name}`;
    const assetSummary = byAsset.get(record.asset_id) ?? {
      assetId: record.asset_id,
      label: assetLabel,
      totalCost: 0,
    };
    assetSummary.totalCost += totalCost;
    byAsset.set(record.asset_id, assetSummary);

    const categorySummary = byCategory.get(record.maintenance_type) ?? {
      category: record.maintenance_type,
      totalCost: 0,
    };
    categorySummary.totalCost += totalCost;
    byCategory.set(record.maintenance_type, categorySummary);
  });

  summary.byAsset = [...byAsset.values()].sort((a, b) => b.totalCost - a.totalCost);
  summary.byCategory = [...byCategory.values()].sort((a, b) => b.totalCost - a.totalCost);

  return summary;
}
