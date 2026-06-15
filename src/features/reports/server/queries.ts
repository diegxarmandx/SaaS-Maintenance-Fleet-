import { calculateComplianceStatus } from "@/features/compliance/status";
import { calculateDocumentStatus } from "@/features/documents/status";
import { formatCurrency } from "@/features/fleet/helpers";
import { calculateMaintenanceStatus } from "@/features/maintenance/schedule";
import {
  buildPreferredReportSearchParams,
  defaultReportPreference,
  type ReportPreference,
} from "@/features/reports/preferences";
import { AppError } from "@/lib/errors";
import {
  getOwnerDatabaseContext,
  type SupabaseServerClient,
} from "@/features/fleet/server/owner";
import { getLocalDemoDataset, localDemoIdentity } from "@/features/demo/local-data";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";

export type ReportSearchParams = Record<string, string | string[] | undefined>;

export type ReportFilters = {
  assetId: string;
  from: string;
  to: string;
};

export type ReportAsset = {
  id: string;
  unit_number: string;
  asset_name: string;
  current_mileage: number;
  current_engine_hours: number;
};

export type ReportRow = {
  id: string;
  assetId: string | null;
  asset: string;
  category: string;
  label: string;
  status: string;
  date: string | null;
  amount: number | null;
  href: string;
};

export type ReportData = {
  isConfigured: boolean;
  companyName: string;
  filters: ReportFilters;
  preference: ReportPreference;
  assets: ReportAsset[];
  upcomingMaintenance: ReportRow[];
  overdueMaintenance: ReportRow[];
  completedMaintenance: ReportRow[];
  maintenanceCostsByAsset: Array<{ label: string; amount: number }>;
  maintenanceCostsByCategory: Array<{ label: string; amount: number }>;
  complianceStatus: ReportRow[];
  expiringCompliance: ReportRow[];
  expiredCompliance: ReportRow[];
  missingRequirements: ReportRow[];
  documents: ReportRow[];
  expiringDocuments: ReportRow[];
  expiredDocuments: ReportRow[];
  documentsByAsset: Array<{ label: string; count: number }>;
  documentsByCategory: Array<{ label: string; count: number }>;
  assetHistory: ReportRow[];
};

type ReportDataOptions = {
  skipRateLimit?: boolean;
};

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseReportFilters(searchParams: ReportSearchParams): ReportFilters {
  return {
    assetId: firstParam(searchParams.assetId)?.trim() ?? "",
    from: firstParam(searchParams.from)?.trim() ?? "",
    to: firstParam(searchParams.to)?.trim() ?? "",
  };
}

export async function getReportData(
  searchParams: ReportSearchParams,
  options: ReportDataOptions = {},
): Promise<ReportData> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return getLocalDemoReportData(searchParams);
  }

  if (!options.skipRateLimit) {
    await enforceOwnerTenantRateLimit("expensiveOperation", context);
  }

  const preference = await getReportPreference(context.supabase, context.companyId);
  const preferredSearchParams = buildPreferredReportSearchParams({
    searchParams,
    preference,
    timezone: context.preferredTimezone,
  });
  const filters = parseReportFilters(preferredSearchParams);
  const [
    assets,
    rules,
    maintenanceRecords,
    requirements,
    complianceRecords,
    documents,
    readings,
  ] = await Promise.all([
    getAssets(context.supabase, context.companyId),
    getMaintenanceRules(context.supabase, context.companyId),
    getMaintenanceRecords(context.supabase, context.companyId, filters),
    getComplianceRequirements(context.supabase, context.companyId),
    getComplianceRecords(context.supabase, context.companyId, filters),
    getDocuments(context.supabase, context.companyId, filters),
    getMeterReadings(context.supabase, context.companyId, filters),
  ]);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const maintenanceRows = rules.flatMap((rule) => {
    const asset = assetsById.get(rule.asset_id);

    if (!asset || (filters.assetId && asset.id !== filters.assetId)) return [];

    const status = calculateMaintenanceStatus({
      isActive: rule.is_active,
      currentMileage: Number(asset.current_mileage),
      currentEngineHours: Number(asset.current_engine_hours),
      nextDueDate: rule.next_due_date,
      nextDueMileage:
        rule.next_due_mileage === null ? null : Number(rule.next_due_mileage),
      nextDueHours: rule.next_due_hours === null ? null : Number(rule.next_due_hours),
      reminderDays: rule.reminder_days,
      reminderMileage:
        rule.reminder_mileage === null ? null : Number(rule.reminder_mileage),
      reminderHours: rule.reminder_hours === null ? null : Number(rule.reminder_hours),
      timezone: context.preferredTimezone,
    });

    if (status.status === "Current") return [];

    return [
      {
        id: rule.id,
        assetId: asset.id,
        asset: assetLabel(asset),
        category: "Maintenance",
        label: rule.name,
        status: status.status,
        date: rule.next_due_date,
        amount: null,
        href: `/maintenance/complete?ruleId=${rule.id}&assetId=${asset.id}`,
      },
    ];
  });
  const completedMaintenance = maintenanceRecords.map((record) => {
    const asset = assetsById.get(record.asset_id);

    return {
      id: record.id,
      assetId: record.asset_id,
      asset: assetLabel(asset),
      category: record.maintenance_type,
      label: record.maintenance_type,
      status: "Completed",
      date: record.completion_date,
      amount: Number(record.total_cost ?? 0),
      href: `/maintenance/history/${record.id}`,
    };
  });
  const complianceRows = buildComplianceRows({
    requirements,
    records: complianceRecords,
    assetsById,
    timezone: context.preferredTimezone,
  }).filter((row) => !filters.assetId || row.assetId === filters.assetId);
  const documentRows = documents.map((document) => {
    const asset = document.asset_id ? assetsById.get(document.asset_id) : null;
    const status = calculateDocumentStatus({
      expirationDate: document.expiration_date,
      archivedAt: document.archived_at,
      reminderDays: 30,
      timezone: context.preferredTimezone,
    });

    return {
      id: document.id,
      assetId: document.asset_id,
      asset: assetLabel(asset),
      category: document.document_type,
      label: document.document_name,
      status: status.status,
      date: document.expiration_date,
      amount: null,
      href: `/documents/${document.id}`,
    };
  });
  const assetHistory = [
    ...readings.map((reading) => ({
      id: reading.id,
      assetId: reading.asset_id,
      asset: assetLabel(assetsById.get(reading.asset_id)),
      category: "Meter reading",
      label: reading.reading_type === "mileage" ? "Mileage" : "Engine hours",
      status: "Recorded",
      date: reading.reading_date,
      amount: Number(reading.reading_value),
      href: `/fleet/${reading.asset_id}`,
    })),
    ...completedMaintenance,
    ...complianceRows,
    ...documentRows,
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return {
    isConfigured: true,
    companyName: context.companyName,
    filters,
    preference,
    assets,
    upcomingMaintenance: maintenanceRows.filter((row) => row.status === "Due soon"),
    overdueMaintenance: maintenanceRows.filter((row) => row.status === "Overdue"),
    completedMaintenance,
    maintenanceCostsByAsset: summarizeBy(completedMaintenance, "asset"),
    maintenanceCostsByCategory: summarizeBy(completedMaintenance, "category"),
    complianceStatus: complianceRows,
    expiringCompliance: complianceRows.filter((row) => row.status === "Expiring soon"),
    expiredCompliance: complianceRows.filter((row) => row.status === "Expired"),
    missingRequirements: complianceRows.filter((row) => row.status === "Missing"),
    documents: documentRows,
    expiringDocuments: documentRows.filter((row) => row.status === "Expiring soon"),
    expiredDocuments: documentRows.filter((row) => row.status === "Expired"),
    documentsByAsset: countBy(documentRows, "asset"),
    documentsByCategory: countBy(documentRows, "category"),
    assetHistory,
  };
}

function getLocalDemoReportData(searchParams: ReportSearchParams): ReportData {
  const preference =
    (getLocalDemoDataset().reportPreference as ReportPreference | null) ??
    defaultReportPreference(localDemoIdentity.companyId);
  const preferredSearchParams = buildPreferredReportSearchParams({
    searchParams,
    preference,
    timezone: localDemoIdentity.timezone,
  });
  const filters = parseReportFilters(preferredSearchParams);
  const assets = (
    getLocalDemoDataset().assets as unknown as Array<
      ReportAsset & { archived_at?: string | null }
    >
  )
    .filter((asset) => !asset.archived_at)
    .sort((left, right) => left.unit_number.localeCompare(right.unit_number));
  const rules = getLocalDemoDataset().maintenanceRules as unknown as Array<{
    id: string;
    asset_id: string;
    name: string;
    next_due_date: string | null;
    next_due_mileage: number | null;
    next_due_hours: number | null;
    reminder_days: number;
    reminder_mileage: number | null;
    reminder_hours: number | null;
    is_active: boolean;
  }>;
  const maintenanceRecords = filterReportDateRows(
    getLocalDemoDataset().maintenanceRecords as unknown as Array<{
      id: string;
      asset_id: string;
      maintenance_type: string;
      completion_date: string;
      total_cost: number;
    }>,
    filters,
    "completion_date",
  );
  const requirements = getLocalDemoDataset().complianceRequirements as unknown as Array<{
    id: string;
    asset_id: string;
    compliance_type: string;
    reminder_days: number;
    archived_at: string | null;
  }>;
  const complianceRecords = filterReportDateRows(
    getLocalDemoDataset().complianceRecords as unknown as Array<{
      id: string;
      asset_id: string;
      requirement_id: string | null;
      compliance_type: string;
      expiration_date: string;
      reminder_days: number;
      archived_at: string | null;
    }>,
    filters,
    "expiration_date",
  );
  const documents = filterReportDateRows(
    getLocalDemoDataset().documents as unknown as Array<{
      id: string;
      asset_id: string | null;
      document_name: string;
      document_type: string;
      expiration_date: string | null;
      archived_at: string | null;
    }>,
    filters,
    "expiration_date",
  );
  const readings = filterReportDateRows(
    getLocalDemoDataset().meterReadings as unknown as Array<{
      id: string;
      asset_id: string;
      reading_type: "mileage" | "engine_hours";
      reading_value: number;
      reading_date: string;
    }>,
    filters,
    "reading_date",
  );
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const maintenanceRows = rules.flatMap((rule) => {
    const asset = assetsById.get(rule.asset_id);

    if (!asset || (filters.assetId && asset.id !== filters.assetId)) return [];

    const status = calculateMaintenanceStatus({
      isActive: rule.is_active,
      currentMileage: Number(asset.current_mileage),
      currentEngineHours: Number(asset.current_engine_hours),
      nextDueDate: rule.next_due_date,
      nextDueMileage:
        rule.next_due_mileage === null ? null : Number(rule.next_due_mileage),
      nextDueHours: rule.next_due_hours === null ? null : Number(rule.next_due_hours),
      reminderDays: rule.reminder_days,
      reminderMileage:
        rule.reminder_mileage === null ? null : Number(rule.reminder_mileage),
      reminderHours: rule.reminder_hours === null ? null : Number(rule.reminder_hours),
      timezone: localDemoIdentity.timezone,
    });

    if (status.status === "Current") return [];

    return [
      {
        id: rule.id,
        assetId: asset.id,
        asset: assetLabel(asset),
        category: "Maintenance",
        label: rule.name,
        status: status.status,
        date: rule.next_due_date,
        amount: null,
        href: `/maintenance/complete?ruleId=${rule.id}&assetId=${asset.id}`,
      },
    ];
  });
  const completedMaintenance = maintenanceRecords.map((record) => {
    const asset = assetsById.get(record.asset_id);

    return {
      id: record.id,
      assetId: record.asset_id,
      asset: assetLabel(asset),
      category: record.maintenance_type,
      label: record.maintenance_type,
      status: "Completed",
      date: record.completion_date,
      amount: Number(record.total_cost ?? 0),
      href: `/maintenance/history/${record.id}`,
    };
  });
  const complianceRows = buildComplianceRows({
    requirements,
    records: complianceRecords,
    assetsById,
    timezone: localDemoIdentity.timezone,
  }).filter((row) => !filters.assetId || row.assetId === filters.assetId);
  const documentRows = documents.map((document) => {
    const asset = document.asset_id ? assetsById.get(document.asset_id) : null;
    const status = calculateDocumentStatus({
      expirationDate: document.expiration_date,
      archivedAt: document.archived_at,
      reminderDays: 30,
      timezone: localDemoIdentity.timezone,
    });

    return {
      id: document.id,
      assetId: document.asset_id,
      asset: assetLabel(asset),
      category: document.document_type,
      label: document.document_name,
      status: status.status,
      date: document.expiration_date,
      amount: null,
      href: `/documents/${document.id}`,
    };
  });
  const assetHistory = [
    ...readings.map((reading) => ({
      id: reading.id,
      assetId: reading.asset_id,
      asset: assetLabel(assetsById.get(reading.asset_id)),
      category: "Meter reading",
      label: reading.reading_type === "mileage" ? "Mileage" : "Engine hours",
      status: "Recorded",
      date: reading.reading_date,
      amount: Number(reading.reading_value),
      href: `/fleet/${reading.asset_id}`,
    })),
    ...completedMaintenance,
    ...complianceRows,
    ...documentRows,
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return {
    isConfigured: true,
    companyName: localDemoIdentity.companyName,
    filters,
    preference,
    assets,
    upcomingMaintenance: maintenanceRows.filter((row) => row.status === "Due soon"),
    overdueMaintenance: maintenanceRows.filter((row) => row.status === "Overdue"),
    completedMaintenance,
    maintenanceCostsByAsset: summarizeBy(completedMaintenance, "asset"),
    maintenanceCostsByCategory: summarizeBy(completedMaintenance, "category"),
    complianceStatus: complianceRows,
    expiringCompliance: complianceRows.filter((row) => row.status === "Expiring soon"),
    expiredCompliance: complianceRows.filter((row) => row.status === "Expired"),
    missingRequirements: complianceRows.filter((row) => row.status === "Missing"),
    documents: documentRows,
    expiringDocuments: documentRows.filter((row) => row.status === "Expiring soon"),
    expiredDocuments: documentRows.filter((row) => row.status === "Expired"),
    documentsByAsset: countBy(documentRows, "asset"),
    documentsByCategory: countBy(documentRows, "category"),
    assetHistory,
  };
}

function filterReportDateRows<T extends { asset_id?: string | null }>(
  rows: T[],
  filters: ReportFilters,
  dateKey: keyof T,
) {
  return rows.filter((row) => {
    const value = row[dateKey];
    const date = typeof value === "string" ? value : "";
    const matchesAsset = !filters.assetId || row.asset_id === filters.assetId;
    const matchesFrom = !filters.from || date >= filters.from;
    const matchesTo = !filters.to || date <= filters.to;

    return matchesAsset && matchesFrom && matchesTo;
  });
}

async function getReportPreference(supabase: SupabaseServerClient, companyId: string) {
  const { data, error } = await supabase
    .from("report_preferences")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data as ReportPreference | null) ?? defaultReportPreference(companyId);
}

function buildComplianceRows({
  requirements,
  records,
  assetsById,
  timezone,
}: {
  requirements: Array<{
    id: string;
    asset_id: string;
    compliance_type: string;
    reminder_days: number;
    archived_at: string | null;
  }>;
  records: Array<{
    id: string;
    asset_id: string;
    requirement_id: string | null;
    compliance_type: string;
    expiration_date: string;
    reminder_days: number;
    archived_at: string | null;
  }>;
  assetsById: Map<string, ReportAsset>;
  timezone: string;
}): ReportRow[] {
  const activeRecords = records.filter((record) => !record.archived_at);
  const requirementIds = new Set(
    activeRecords
      .map((record) => record.requirement_id)
      .filter((id): id is string => Boolean(id)),
  );
  const recordRows = activeRecords.map((record) => {
    const status = calculateComplianceStatus({
      isRequired: true,
      hasValidRecord: true,
      expirationDate: record.expiration_date,
      reminderDays: record.reminder_days,
      timezone,
    });

    return {
      id: record.id,
      assetId: record.asset_id,
      asset: assetLabel(assetsById.get(record.asset_id)),
      category: "Compliance",
      label: record.compliance_type,
      status: status.status,
      date: record.expiration_date,
      amount: null,
      href: `/compliance/${record.id}`,
    };
  });
  const missingRows = requirements.flatMap((requirement) => {
    if (requirement.archived_at || requirementIds.has(requirement.id)) return [];

    return [
      {
        id: requirement.id,
        assetId: requirement.asset_id,
        asset: assetLabel(assetsById.get(requirement.asset_id)),
        category: "Compliance",
        label: requirement.compliance_type,
        status: "Missing",
        date: null,
        amount: null,
        href: `/compliance/new?assetId=${requirement.asset_id}&requirementId=${requirement.id}&type=${encodeURIComponent(requirement.compliance_type)}`,
      },
    ];
  });

  return [...recordRows, ...missingRows];
}

async function getAssets(supabase: SupabaseServerClient, companyId: string) {
  const { data, error } = await supabase
    .from("assets")
    .select("id,unit_number,asset_name,current_mileage,current_engine_hours")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("unit_number", { ascending: true });

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as ReportAsset[];
}

async function getMaintenanceRules(supabase: SupabaseServerClient, companyId: string) {
  const { data, error } = await supabase
    .from("maintenance_rules")
    .select(
      "id,asset_id,name,next_due_date,next_due_mileage,next_due_hours,reminder_days,reminder_mileage,reminder_hours,is_active",
    )
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as Array<{
    id: string;
    asset_id: string;
    name: string;
    next_due_date: string | null;
    next_due_mileage: number | null;
    next_due_hours: number | null;
    reminder_days: number;
    reminder_mileage: number | null;
    reminder_hours: number | null;
    is_active: boolean;
  }>;
}

async function getMaintenanceRecords(
  supabase: SupabaseServerClient,
  companyId: string,
  filters: ReportFilters,
) {
  let query = supabase
    .from("maintenance_records")
    .select("id,asset_id,maintenance_type,completion_date,total_cost")
    .eq("company_id", companyId)
    .is("archived_at", null);

  if (filters.assetId) query = query.eq("asset_id", filters.assetId);
  if (filters.from) query = query.gte("completion_date", filters.from);
  if (filters.to) query = query.lte("completion_date", filters.to);

  const { data, error } = await query
    .order("completion_date", { ascending: false })
    .limit(500);

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as Array<{
    id: string;
    asset_id: string;
    maintenance_type: string;
    completion_date: string;
    total_cost: number;
  }>;
}

async function getComplianceRequirements(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  const { data, error } = await supabase
    .from("compliance_requirements")
    .select("id,asset_id,compliance_type,reminder_days,archived_at")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as Array<{
    id: string;
    asset_id: string;
    compliance_type: string;
    reminder_days: number;
    archived_at: string | null;
  }>;
}

async function getComplianceRecords(
  supabase: SupabaseServerClient,
  companyId: string,
  filters: ReportFilters,
) {
  let query = supabase
    .from("compliance_records")
    .select(
      "id,asset_id,requirement_id,compliance_type,expiration_date,reminder_days,archived_at",
    )
    .eq("company_id", companyId);

  if (filters.assetId) query = query.eq("asset_id", filters.assetId);
  if (filters.from) query = query.gte("expiration_date", filters.from);
  if (filters.to) query = query.lte("expiration_date", filters.to);

  const { data, error } = await query
    .order("expiration_date", { ascending: true })
    .limit(500);

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as Array<{
    id: string;
    asset_id: string;
    requirement_id: string | null;
    compliance_type: string;
    expiration_date: string;
    reminder_days: number;
    archived_at: string | null;
  }>;
}

async function getDocuments(
  supabase: SupabaseServerClient,
  companyId: string,
  filters: ReportFilters,
) {
  let query = supabase
    .from("documents")
    .select("id,asset_id,document_name,document_type,expiration_date,archived_at")
    .eq("company_id", companyId);

  if (filters.assetId) query = query.eq("asset_id", filters.assetId);
  if (filters.from) query = query.gte("expiration_date", filters.from);
  if (filters.to) query = query.lte("expiration_date", filters.to);

  const { data, error } = await query
    .order("expiration_date", { ascending: true })
    .limit(500);

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as Array<{
    id: string;
    asset_id: string | null;
    document_name: string;
    document_type: string;
    expiration_date: string | null;
    archived_at: string | null;
  }>;
}

async function getMeterReadings(
  supabase: SupabaseServerClient,
  companyId: string,
  filters: ReportFilters,
) {
  let query = supabase
    .from("meter_readings")
    .select("id,asset_id,reading_type,reading_value,reading_date")
    .eq("company_id", companyId);

  if (filters.assetId) query = query.eq("asset_id", filters.assetId);
  if (filters.from) query = query.gte("reading_date", filters.from);
  if (filters.to) query = query.lte("reading_date", filters.to);

  const { data, error } = await query
    .order("reading_date", { ascending: false })
    .limit(500);

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as Array<{
    id: string;
    asset_id: string;
    reading_type: "mileage" | "engine_hours";
    reading_value: number;
    reading_date: string;
  }>;
}

function summarizeBy(rows: ReportRow[], key: "asset" | "category") {
  const map = new Map<string, number>();

  rows.forEach((row) => {
    map.set(row[key], (map.get(row[key]) ?? 0) + Number(row.amount ?? 0));
  });

  return Array.from(map.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function countBy(rows: ReportRow[], key: "asset" | "category") {
  const map = new Map<string, number>();

  rows.forEach((row) => {
    map.set(row[key], (map.get(row[key]) ?? 0) + 1);
  });

  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function assetLabel(asset: ReportAsset | null | undefined) {
  return asset ? `${asset.unit_number} ${asset.asset_name}` : "General fleet";
}

export function formatReportAmount(value: number | null) {
  return value === null ? "" : formatCurrency(value);
}
