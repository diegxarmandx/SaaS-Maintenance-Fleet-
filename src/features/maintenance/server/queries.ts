import {
  MAINTENANCE_HISTORY_PAGE_SIZE,
  MAINTENANCE_PAGE_SIZE,
} from "@/features/maintenance/constants";
import {
  compareMaintenanceUrgency,
  calculateMaintenanceStatus,
} from "@/features/maintenance/schedule";
import { summarizeMaintenanceCosts } from "@/features/maintenance/helpers";
import { createAuthorizedSignedDocumentUrl } from "@/features/documents/server/storage";
import type {
  MaintenanceAssetOption,
  MaintenanceAttachment,
  MaintenanceCostSummary,
  MaintenanceHistoryFilters,
  MaintenanceRecord,
  MaintenanceRecordWithAsset,
  MaintenanceRule,
  MaintenanceRuleFilters,
  MaintenanceRuleWithAsset,
  MaintenanceTemplate,
} from "@/features/maintenance/types";
import { AppError } from "@/lib/errors";
import {
  getOwnerDatabaseContext,
  type SupabaseServerClient,
} from "@/features/fleet/server/owner";

export type MaintenanceSearchParams = Record<string, string | string[] | undefined>;

export type MaintenanceOverviewResult = {
  isConfigured: boolean;
  companyName: string;
  timezone: string;
  rules: MaintenanceRuleWithAsset[];
  allRules: MaintenanceRuleWithAsset[];
  assets: MaintenanceAssetOption[];
  templates: MaintenanceTemplate[];
  counts: Record<"Current" | "Due soon" | "Overdue", number>;
  filters: MaintenanceRuleFilters;
  pageSize: number;
  totalCount: number;
};

export type MaintenanceHistoryResult = {
  isConfigured: boolean;
  records: MaintenanceRecordWithAsset[];
  allRecords: MaintenanceRecordWithAsset[];
  assets: MaintenanceAssetOption[];
  filters: MaintenanceHistoryFilters;
  pageSize: number;
  totalCount: number;
  costSummary: MaintenanceCostSummary;
};

export type MaintenanceFormOptions = {
  isConfigured: boolean;
  assets: MaintenanceAssetOption[];
  templates: MaintenanceTemplate[];
  rules: MaintenanceRuleWithAsset[];
};

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseMaintenanceRuleFilters(
  searchParams: MaintenanceSearchParams,
): MaintenanceRuleFilters {
  const rawPage = Number(firstParam(searchParams.page) ?? "1");
  const rawStatus = firstParam(searchParams.status) ?? "all";
  const rawSort = firstParam(searchParams.sort) ?? "urgency";

  return {
    query: firstParam(searchParams.q)?.trim() ?? "",
    assetId: firstParam(searchParams.assetId)?.trim() ?? "",
    maintenanceType: firstParam(searchParams.type)?.trim() ?? "",
    status:
      rawStatus === "Current" || rawStatus === "Due soon" || rawStatus === "Overdue"
        ? rawStatus
        : "all",
    sort:
      rawSort === "asset" || rawSort === "name" || rawSort === "due_date"
        ? rawSort
        : "urgency",
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
  };
}

export function parseMaintenanceHistoryFilters(
  searchParams: MaintenanceSearchParams,
): MaintenanceHistoryFilters {
  const rawPage = Number(firstParam(searchParams.historyPage) ?? "1");

  return {
    query: firstParam(searchParams.historyQ)?.trim() ?? "",
    assetId: firstParam(searchParams.historyAssetId)?.trim() ?? "",
    maintenanceType: firstParam(searchParams.historyType)?.trim() ?? "",
    dateFrom: firstParam(searchParams.dateFrom)?.trim() ?? "",
    dateTo: firstParam(searchParams.dateTo)?.trim() ?? "",
    minCost: firstParam(searchParams.minCost)?.trim() ?? "",
    maxCost: firstParam(searchParams.maxCost)?.trim() ?? "",
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
  };
}

export async function getMaintenanceOverview(
  searchParams: MaintenanceSearchParams,
): Promise<MaintenanceOverviewResult> {
  const filters = parseMaintenanceRuleFilters(searchParams);
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return {
      isConfigured: false,
      companyName: "FleetReady workspace",
      timezone: "UTC",
      rules: [],
      allRules: [],
      assets: [],
      templates: [],
      counts: { Current: 0, "Due soon": 0, Overdue: 0 },
      filters,
      pageSize: MAINTENANCE_PAGE_SIZE,
      totalCount: 0,
    };
  }

  const [assets, templates, rules] = await Promise.all([
    getMaintenanceAssets(context.supabase, context.companyId),
    getMaintenanceTemplates(context.supabase, context.companyId),
    getMaintenanceRules(context.supabase, context.companyId),
  ]);

  const rulesWithStatus = decorateRulesWithAssets(
    rules,
    assets,
    context.preferredTimezone,
  );
  const counts = rulesWithStatus.reduce(
    (current, rule) => ({
      ...current,
      [rule.status]: current[rule.status] + 1,
    }),
    { Current: 0, "Due soon": 0, Overdue: 0 },
  );
  const filteredRules = filterMaintenanceRules(rulesWithStatus, filters).sort((a, b) =>
    sortRules(a, b, filters.sort),
  );
  const from = (filters.page - 1) * MAINTENANCE_PAGE_SIZE;
  const pagedRules = filteredRules.slice(from, from + MAINTENANCE_PAGE_SIZE);

  return {
    isConfigured: true,
    companyName: context.companyName,
    timezone: context.preferredTimezone,
    rules: pagedRules,
    allRules: rulesWithStatus,
    assets,
    templates,
    counts,
    filters,
    pageSize: MAINTENANCE_PAGE_SIZE,
    totalCount: filteredRules.length,
  };
}

export async function getMaintenanceFormOptions(): Promise<MaintenanceFormOptions> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return { isConfigured: false, assets: [], templates: [], rules: [] };
  }

  const [assets, templates, rules] = await Promise.all([
    getMaintenanceAssets(context.supabase, context.companyId),
    getMaintenanceTemplates(context.supabase, context.companyId),
    getMaintenanceRules(context.supabase, context.companyId),
  ]);

  return {
    isConfigured: true,
    assets,
    templates,
    rules: decorateRulesWithAssets(rules, assets, context.preferredTimezone),
  };
}

export async function getMaintenanceHistory(
  searchParams: MaintenanceSearchParams,
): Promise<MaintenanceHistoryResult> {
  const filters = parseMaintenanceHistoryFilters(searchParams);
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return {
      isConfigured: false,
      records: [],
      allRecords: [],
      assets: [],
      filters,
      pageSize: MAINTENANCE_HISTORY_PAGE_SIZE,
      totalCount: 0,
      costSummary: summarizeMaintenanceCosts([]),
    };
  }

  const [assets, records] = await Promise.all([
    getMaintenanceAssets(context.supabase, context.companyId),
    getMaintenanceRecords(context.supabase, context.companyId),
  ]);
  const recordsWithAssets = await decorateRecordsWithAssets(
    context.supabase,
    records,
    assets,
  );
  const filteredRecords = filterMaintenanceRecords(recordsWithAssets, filters);
  const from = (filters.page - 1) * MAINTENANCE_HISTORY_PAGE_SIZE;

  return {
    isConfigured: true,
    records: filteredRecords.slice(from, from + MAINTENANCE_HISTORY_PAGE_SIZE),
    allRecords: recordsWithAssets,
    assets,
    filters,
    pageSize: MAINTENANCE_HISTORY_PAGE_SIZE,
    totalCount: filteredRecords.length,
    costSummary: summarizeMaintenanceCosts(filteredRecords),
  };
}

export async function getMaintenanceRecordDetail(recordId: string) {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return null;
  }

  const [assets, { data: record, error }] = await Promise.all([
    getMaintenanceAssets(context.supabase, context.companyId),
    context.supabase
      .from("maintenance_records")
      .select("*")
      .eq("id", recordId)
      .eq("company_id", context.companyId)
      .maybeSingle(),
  ]);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  if (!record) {
    return null;
  }

  const [decoratedRecord] = await decorateRecordsWithAssets(
    context.supabase,
    [record as MaintenanceRecord],
    assets,
  );

  return decoratedRecord ?? null;
}

export async function getAssetMaintenanceSnapshot(assetId: string) {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return {
      rules: [],
      nextDueItems: [],
      overdueItems: [],
      recentRecords: [],
      costSummary: summarizeMaintenanceCosts([]),
      status: "Current" as const,
    };
  }

  const [assets, allRules, allRecords] = await Promise.all([
    getMaintenanceAssets(context.supabase, context.companyId),
    getMaintenanceRules(context.supabase, context.companyId),
    getMaintenanceRecords(context.supabase, context.companyId, assetId),
  ]);
  const assetRules = allRules.filter((rule) => rule.asset_id === assetId);
  const rules = decorateRulesWithAssets(assetRules, assets, context.preferredTimezone);
  const records = await decorateRecordsWithAssets(context.supabase, allRecords, assets);
  const overdueItems = rules.filter((rule) => rule.status === "Overdue");
  const nextDueItems = rules
    .filter((rule) => rule.status !== "Overdue")
    .sort((a, b) => sortRules(a, b, "urgency"))
    .slice(0, 5);

  return {
    rules,
    nextDueItems,
    overdueItems,
    recentRecords: records.slice(0, 5),
    costSummary: summarizeMaintenanceCosts(records),
    status:
      overdueItems.length > 0
        ? ("Overdue" as const)
        : rules.some((rule) => rule.status === "Due soon")
          ? ("Due soon" as const)
          : ("Current" as const),
  };
}

async function getMaintenanceAssets(
  supabase: SupabaseServerClient,
  companyId: string,
): Promise<MaintenanceAssetOption[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("id,unit_number,asset_name,asset_type,current_mileage,current_engine_hours")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("unit_number", { ascending: true });

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []) as MaintenanceAssetOption[];
}

async function getMaintenanceTemplates(
  supabase: SupabaseServerClient,
  companyId: string,
): Promise<MaintenanceTemplate[]> {
  const { data, error } = await supabase
    .from("maintenance_templates")
    .select("*")
    .or(`company_id.is.null,company_id.eq.${companyId}`)
    .eq("is_active", true)
    .order("company_id", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []) as MaintenanceTemplate[];
}

async function getMaintenanceRules(
  supabase: SupabaseServerClient,
  companyId: string,
): Promise<MaintenanceRule[]> {
  const { data, error } = await supabase
    .from("maintenance_rules")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []) as MaintenanceRule[];
}

async function getMaintenanceRecords(
  supabase: SupabaseServerClient,
  companyId: string,
  assetId?: string,
): Promise<MaintenanceRecord[]> {
  let query = supabase
    .from("maintenance_records")
    .select("*")
    .eq("company_id", companyId)
    .is("archived_at", null);

  if (assetId) {
    query = query.eq("asset_id", assetId);
  }

  const { data, error } = await query.order("completion_date", { ascending: false });

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []) as MaintenanceRecord[];
}

function decorateRulesWithAssets(
  rules: MaintenanceRule[],
  assets: MaintenanceAssetOption[],
  timezone: string,
): MaintenanceRuleWithAsset[] {
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  return rules.flatMap((rule) => {
    const asset = assetsById.get(rule.asset_id);

    if (!asset) {
      return [];
    }

    const status = calculateMaintenanceStatus({
      isActive: rule.is_active,
      currentMileage: Number(asset.current_mileage),
      currentEngineHours: Number(asset.current_engine_hours),
      nextDueDate: rule.next_due_date,
      nextDueMileage: numberOrNull(rule.next_due_mileage),
      nextDueHours: numberOrNull(rule.next_due_hours),
      reminderDays: rule.reminder_days,
      reminderMileage: numberOrNull(rule.reminder_mileage),
      reminderHours: numberOrNull(rule.reminder_hours),
      timezone,
    });

    return [
      {
        ...rule,
        asset,
        status: status.status,
        statusReasons: status.reasons,
        daysUntilDue: status.daysUntilDue,
        mileageUntilDue: status.mileageUntilDue,
        hoursUntilDue: status.hoursUntilDue,
      },
    ];
  });
}

async function decorateRecordsWithAssets(
  supabase: SupabaseServerClient,
  records: MaintenanceRecord[],
  assets: MaintenanceAssetOption[],
): Promise<MaintenanceRecordWithAsset[]> {
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const attachments = await getMaintenanceAttachments(
    supabase,
    records[0]?.company_id ?? "",
    records.map((record) => record.id),
  );

  return records.flatMap((record) => {
    const asset = assetsById.get(record.asset_id);

    if (!asset) {
      return [];
    }

    return [{ ...record, asset, attachment: attachments.get(record.id) ?? null }];
  });
}

async function getMaintenanceAttachments(
  supabase: SupabaseServerClient,
  companyId: string,
  recordIds: string[],
) {
  const attachmentsByRecord = new Map<string, MaintenanceAttachment>();

  if (recordIds.length === 0) {
    return attachmentsByRecord;
  }

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id,maintenance_record_id,document_name,storage_bucket,storage_path,mime_type,file_size",
    )
    .eq("company_id", companyId)
    .in("maintenance_record_id", recordIds)
    .is("archived_at", null);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  await Promise.all(
    (data ?? []).map(async (document) => {
      const signedUrl = await createAuthorizedSignedDocumentUrl(
        supabase,
        companyId,
        document,
      );

      attachmentsByRecord.set(String(document.maintenance_record_id), {
        id: document.id,
        document_name: document.document_name,
        storage_bucket: document.storage_bucket,
        storage_path: document.storage_path,
        mime_type: document.mime_type,
        file_size: Number(document.file_size ?? 0),
        signedUrl,
      });
    }),
  );

  return attachmentsByRecord;
}

function filterMaintenanceRules(
  rules: MaintenanceRuleWithAsset[],
  filters: MaintenanceRuleFilters,
) {
  return rules.filter((rule) => {
    const query = filters.query.toLowerCase();
    const matchesQuery =
      !query ||
      rule.name.toLowerCase().includes(query) ||
      rule.asset.unit_number.toLowerCase().includes(query) ||
      rule.asset.asset_name.toLowerCase().includes(query);
    const matchesAsset = !filters.assetId || rule.asset_id === filters.assetId;
    const matchesType =
      !filters.maintenanceType ||
      rule.name.toLowerCase().includes(filters.maintenanceType.toLowerCase());
    const matchesStatus = filters.status === "all" || rule.status === filters.status;

    return matchesQuery && matchesAsset && matchesType && matchesStatus;
  });
}

function filterMaintenanceRecords(
  records: MaintenanceRecordWithAsset[],
  filters: MaintenanceHistoryFilters,
) {
  const minCost = filters.minCost ? Number(filters.minCost) : null;
  const maxCost = filters.maxCost ? Number(filters.maxCost) : null;

  return records.filter((record) => {
    const query = filters.query.toLowerCase();
    const matchesQuery =
      !query ||
      record.maintenance_type.toLowerCase().includes(query) ||
      record.asset.unit_number.toLowerCase().includes(query) ||
      record.asset.asset_name.toLowerCase().includes(query) ||
      (record.service_provider?.toLowerCase().includes(query) ?? false);
    const matchesAsset = !filters.assetId || record.asset_id === filters.assetId;
    const matchesType =
      !filters.maintenanceType ||
      record.maintenance_type
        .toLowerCase()
        .includes(filters.maintenanceType.toLowerCase());
    const matchesDateFrom =
      !filters.dateFrom || record.completion_date >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || record.completion_date <= filters.dateTo;
    const matchesMinCost = minCost === null || Number(record.total_cost) >= minCost;
    const matchesMaxCost = maxCost === null || Number(record.total_cost) <= maxCost;

    return (
      matchesQuery &&
      matchesAsset &&
      matchesType &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesMinCost &&
      matchesMaxCost
    );
  });
}

function sortRules(
  left: MaintenanceRuleWithAsset,
  right: MaintenanceRuleWithAsset,
  sort: MaintenanceRuleFilters["sort"],
) {
  if (sort === "asset") {
    return left.asset.unit_number.localeCompare(right.asset.unit_number);
  }

  if (sort === "name") {
    return left.name.localeCompare(right.name);
  }

  if (sort === "due_date") {
    return (left.next_due_date ?? "9999-12-31").localeCompare(
      right.next_due_date ?? "9999-12-31",
    );
  }

  return compareMaintenanceUrgency(left, right);
}

function numberOrNull(value: number | null) {
  return value === null ? null : Number(value);
}
