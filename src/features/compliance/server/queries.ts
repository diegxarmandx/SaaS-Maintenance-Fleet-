import {
  COMPLIANCE_PAGE_SIZE,
  DEFAULT_COMPLIANCE_TYPES,
} from "@/features/compliance/constants";
import {
  calculateComplianceStatus,
  compareComplianceUrgency,
  type ComplianceStatus,
} from "@/features/compliance/status";
import type {
  ComplianceAssetOption,
  ComplianceDocument,
  ComplianceFilters,
  ComplianceOverviewItem,
  ComplianceRecord,
  ComplianceRequirement,
} from "@/features/compliance/types";
import { createAuthorizedSignedDocumentUrl } from "@/features/documents/server/storage";
import { AppError } from "@/lib/errors";
import {
  getOwnerDatabaseContext,
  type SupabaseServerClient,
} from "@/features/fleet/server/owner";
import { getLocalDemoDataset, localDemoIdentity } from "@/features/demo/local-data";
import { shouldUseLocalDemoData } from "@/features/demo/mode";

export type ComplianceSearchParams = Record<string, string | string[] | undefined>;

export type ComplianceOverviewResult = {
  isConfigured: boolean;
  companyName: string;
  timezone: string;
  items: ComplianceOverviewItem[];
  allItems: ComplianceOverviewItem[];
  assets: ComplianceAssetOption[];
  complianceTypes: string[];
  counts: Record<ComplianceStatus, number>;
  filters: ComplianceFilters;
  pageSize: number;
  totalCount: number;
};

export type ComplianceFormOptions = {
  isConfigured: boolean;
  assets: ComplianceAssetOption[];
  requirements: ComplianceRequirement[];
  complianceTypes: string[];
};

const emptyCounts: Record<ComplianceStatus, number> = {
  Current: 0,
  "Expiring soon": 0,
  Expired: 0,
  Missing: 0,
  Archived: 0,
};

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseComplianceFilters(
  searchParams: ComplianceSearchParams,
): ComplianceFilters {
  const rawPage = Number(firstParam(searchParams.page) ?? "1");
  const rawStatus = firstParam(searchParams.status) ?? "all";
  const rawSort = firstParam(searchParams.sort) ?? "expiration_asc";

  return {
    query: firstParam(searchParams.q)?.trim() ?? "",
    assetId: firstParam(searchParams.assetId)?.trim() ?? "",
    complianceType: firstParam(searchParams.type)?.trim() ?? "",
    status: isComplianceStatus(rawStatus) ? rawStatus : "all",
    sort:
      rawSort === "expiration_desc" || rawSort === "asset" || rawSort === "type"
        ? rawSort
        : "expiration_asc",
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
  };
}

export async function getComplianceOverview(
  searchParams: ComplianceSearchParams,
): Promise<ComplianceOverviewResult> {
  const filters = parseComplianceFilters(searchParams);
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return shouldUseLocalDemoData
      ? getLocalDemoComplianceOverview(filters)
      : getDisconnectedComplianceOverview(filters);
  }

  const [assets, requirements, records] = await Promise.all([
    getComplianceAssets(context.supabase, context.companyId),
    getComplianceRequirements(context.supabase, context.companyId),
    getComplianceRecords(context.supabase, context.companyId),
  ]);
  const documents = await getComplianceDocuments(
    context.supabase,
    context.companyId,
    records.map((record) => record.id),
  );
  const allItems = decorateComplianceItems({
    assets,
    requirements,
    records,
    documents,
    timezone: context.preferredTimezone,
  });
  const counts = allItems.reduce(
    (current, item) => ({
      ...current,
      [item.status]: current[item.status] + 1,
    }),
    { ...emptyCounts },
  );
  const filteredItems = filterComplianceItems(allItems, filters).sort((a, b) =>
    sortComplianceItems(a, b, filters.sort),
  );
  const from = (filters.page - 1) * COMPLIANCE_PAGE_SIZE;

  return {
    isConfigured: true,
    companyName: context.companyName,
    timezone: context.preferredTimezone,
    items: filteredItems.slice(from, from + COMPLIANCE_PAGE_SIZE),
    allItems,
    assets,
    complianceTypes: buildComplianceTypeOptions(requirements, records),
    counts,
    filters,
    pageSize: COMPLIANCE_PAGE_SIZE,
    totalCount: filteredItems.length,
  };
}

export async function getComplianceFormOptions(): Promise<ComplianceFormOptions> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    if (!shouldUseLocalDemoData) {
      return getDisconnectedComplianceFormOptions();
    }

    const requirements = getLocalDemoDataset()
      .complianceRequirements as unknown as ComplianceRequirement[];
    const records = getLocalDemoDataset()
      .complianceRecords as unknown as ComplianceRecord[];

    return {
      isConfigured: true,
      assets: getLocalDemoComplianceAssets(),
      requirements,
      complianceTypes: buildComplianceTypeOptions(requirements, records),
    };
  }

  const [assets, requirements, records] = await Promise.all([
    getComplianceAssets(context.supabase, context.companyId),
    getComplianceRequirements(context.supabase, context.companyId),
    getComplianceRecords(context.supabase, context.companyId),
  ]);

  return {
    isConfigured: true,
    assets,
    requirements,
    complianceTypes: buildComplianceTypeOptions(requirements, records),
  };
}

export async function getComplianceRecordDetail(recordId: string) {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return shouldUseLocalDemoData ? getLocalDemoComplianceRecordDetail(recordId) : null;
  }

  const [assets, requirements, { data: record, error }] = await Promise.all([
    getComplianceAssets(context.supabase, context.companyId),
    getComplianceRequirements(context.supabase, context.companyId),
    context.supabase
      .from("compliance_records")
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

  const documents = await getComplianceDocuments(context.supabase, context.companyId, [
    recordId,
  ]);
  const [item] = decorateComplianceItems({
    assets,
    requirements,
    records: [record as ComplianceRecord],
    documents,
    timezone: context.preferredTimezone,
  });

  return item ?? null;
}

export async function getAssetComplianceSnapshot(assetId: string) {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return shouldUseLocalDemoData
      ? getLocalDemoAssetComplianceSnapshot(assetId)
      : getDisconnectedAssetComplianceSnapshot();
  }

  const [assets, requirements, records] = await Promise.all([
    getComplianceAssets(context.supabase, context.companyId),
    getComplianceRequirements(context.supabase, context.companyId, assetId),
    getComplianceRecords(context.supabase, context.companyId, assetId),
  ]);
  const documents = await getComplianceDocuments(
    context.supabase,
    context.companyId,
    records.map((record) => record.id),
  );
  const items = decorateComplianceItems({
    assets,
    requirements,
    records,
    documents,
    timezone: context.preferredTimezone,
  });
  const activeItems = items.filter((item) => item.status !== "Archived");
  const expiredItems = activeItems.filter((item) => item.status === "Expired");
  const expiringItems = activeItems.filter((item) => item.status === "Expiring soon");
  const missingItems = activeItems.filter((item) => item.status === "Missing");
  const mostUrgent = [...activeItems].sort(compareComplianceUrgency)[0];

  return {
    status: mostUrgent?.status ?? ("Current" as ComplianceStatus),
    items: activeItems,
    expiredItems,
    expiringItems,
    missingItems,
  };
}

function getDisconnectedComplianceOverview(
  filters: ComplianceFilters,
): ComplianceOverviewResult {
  return {
    isConfigured: false,
    companyName: "FleetReady workspace",
    timezone: "UTC",
    items: [],
    allItems: [],
    assets: [],
    complianceTypes: [...DEFAULT_COMPLIANCE_TYPES],
    counts: { ...emptyCounts },
    filters,
    pageSize: COMPLIANCE_PAGE_SIZE,
    totalCount: 0,
  };
}

function getDisconnectedComplianceFormOptions(): ComplianceFormOptions {
  return {
    isConfigured: false,
    assets: [],
    requirements: [],
    complianceTypes: [...DEFAULT_COMPLIANCE_TYPES],
  };
}

function getDisconnectedAssetComplianceSnapshot() {
  return {
    status: "Current" as ComplianceStatus,
    items: [],
    expiredItems: [],
    expiringItems: [],
    missingItems: [],
  };
}

function getLocalDemoComplianceOverview(
  filters: ComplianceFilters,
): ComplianceOverviewResult {
  const assets = getLocalDemoComplianceAssets();
  const requirements = getLocalDemoDataset()
    .complianceRequirements as unknown as ComplianceRequirement[];
  const records = getLocalDemoDataset()
    .complianceRecords as unknown as ComplianceRecord[];
  const documents = getLocalDemoComplianceDocuments(records.map((record) => record.id));
  const allItems = decorateComplianceItems({
    assets,
    requirements,
    records,
    documents,
    timezone: localDemoIdentity.timezone,
  });
  const counts = allItems.reduce(
    (current, item) => ({
      ...current,
      [item.status]: current[item.status] + 1,
    }),
    { ...emptyCounts },
  );
  const filteredItems = filterComplianceItems(allItems, filters).sort((a, b) =>
    sortComplianceItems(a, b, filters.sort),
  );
  const from = (filters.page - 1) * COMPLIANCE_PAGE_SIZE;

  return {
    isConfigured: true,
    companyName: localDemoIdentity.companyName,
    timezone: localDemoIdentity.timezone,
    items: filteredItems.slice(from, from + COMPLIANCE_PAGE_SIZE),
    allItems,
    assets,
    complianceTypes: buildComplianceTypeOptions(requirements, records),
    counts,
    filters,
    pageSize: COMPLIANCE_PAGE_SIZE,
    totalCount: filteredItems.length,
  };
}

function getLocalDemoComplianceRecordDetail(recordId: string) {
  const assets = getLocalDemoComplianceAssets();
  const requirements = getLocalDemoDataset()
    .complianceRequirements as unknown as ComplianceRequirement[];
  const record = (
    getLocalDemoDataset().complianceRecords as unknown as ComplianceRecord[]
  ).find((candidate) => candidate.id === recordId);

  if (!record) {
    return null;
  }

  const [item] = decorateComplianceItems({
    assets,
    requirements,
    records: [record],
    documents: getLocalDemoComplianceDocuments([recordId]),
    timezone: localDemoIdentity.timezone,
  });

  return item ?? null;
}

function getLocalDemoAssetComplianceSnapshot(assetId: string) {
  const assets = getLocalDemoComplianceAssets();
  const requirements = (
    getLocalDemoDataset().complianceRequirements as unknown as ComplianceRequirement[]
  ).filter((requirement) => requirement.asset_id === assetId);
  const records = (
    getLocalDemoDataset().complianceRecords as unknown as ComplianceRecord[]
  ).filter((record) => record.asset_id === assetId);
  const items = decorateComplianceItems({
    assets,
    requirements,
    records,
    documents: getLocalDemoComplianceDocuments(records.map((record) => record.id)),
    timezone: localDemoIdentity.timezone,
  });
  const activeItems = items.filter((item) => item.status !== "Archived");
  const expiredItems = activeItems.filter((item) => item.status === "Expired");
  const expiringItems = activeItems.filter((item) => item.status === "Expiring soon");
  const missingItems = activeItems.filter((item) => item.status === "Missing");
  const mostUrgent = [...activeItems].sort(compareComplianceUrgency)[0];

  return {
    status: mostUrgent?.status ?? ("Current" as ComplianceStatus),
    items: activeItems,
    expiredItems,
    expiringItems,
    missingItems,
  };
}

function getLocalDemoComplianceAssets(): ComplianceAssetOption[] {
  return (
    getLocalDemoDataset().assets as unknown as Array<
      ComplianceAssetOption & { archived_at?: string | null }
    >
  )
    .filter((asset) => !asset.archived_at)
    .sort((left, right) => left.unit_number.localeCompare(right.unit_number));
}

function getLocalDemoComplianceDocuments(recordIds: string[]) {
  const documentsByRecord = new Map<string, ComplianceDocument>();

  for (const document of getLocalDemoDataset().documents) {
    if (
      document.compliance_record_id &&
      recordIds.includes(document.compliance_record_id) &&
      !document.archived_at
    ) {
      documentsByRecord.set(document.compliance_record_id, {
        id: document.id,
        document_name: document.document_name,
        document_type: document.document_type,
        storage_bucket: document.storage_bucket,
        storage_path: document.storage_path,
        mime_type: document.mime_type,
        file_size: Number(document.file_size ?? 0),
        signedUrl: null,
      });
    }
  }

  return documentsByRecord;
}

async function getComplianceAssets(
  supabase: SupabaseServerClient,
  companyId: string,
): Promise<ComplianceAssetOption[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("id,unit_number,asset_name,asset_type")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("unit_number", { ascending: true });

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []) as ComplianceAssetOption[];
}

async function getComplianceRequirements(
  supabase: SupabaseServerClient,
  companyId: string,
  assetId?: string,
): Promise<ComplianceRequirement[]> {
  let query = supabase
    .from("compliance_requirements")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (assetId) {
    query = query.eq("asset_id", assetId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []) as ComplianceRequirement[];
}

async function getComplianceRecords(
  supabase: SupabaseServerClient,
  companyId: string,
  assetId?: string,
): Promise<ComplianceRecord[]> {
  let query = supabase.from("compliance_records").select("*").eq("company_id", companyId);

  if (assetId) {
    query = query.eq("asset_id", assetId);
  }

  const { data, error } = await query.order("expiration_date", { ascending: true });

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []) as ComplianceRecord[];
}

async function getComplianceDocuments(
  supabase: SupabaseServerClient,
  companyId: string,
  recordIds: string[],
) {
  const documentsByRecord = new Map<string, ComplianceDocument>();

  if (recordIds.length === 0) {
    return documentsByRecord;
  }

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id,compliance_record_id,document_name,document_type,storage_bucket,storage_path,mime_type,file_size",
    )
    .eq("company_id", companyId)
    .in("compliance_record_id", recordIds)
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

      documentsByRecord.set(String(document.compliance_record_id), {
        id: document.id,
        document_name: document.document_name,
        document_type: document.document_type,
        storage_bucket: document.storage_bucket,
        storage_path: document.storage_path,
        mime_type: document.mime_type,
        file_size: Number(document.file_size ?? 0),
        signedUrl,
      });
    }),
  );

  return documentsByRecord;
}

function decorateComplianceItems({
  assets,
  requirements,
  records,
  documents,
  timezone,
}: {
  assets: ComplianceAssetOption[];
  requirements: ComplianceRequirement[];
  records: ComplianceRecord[];
  documents: Map<string, ComplianceDocument>;
  timezone: string;
}): ComplianceOverviewItem[] {
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const activeRecordRequirementIds = new Set(
    records
      .filter((record) => !record.archived_at)
      .map((record) => record.requirement_id)
      .filter((id): id is string => Boolean(id)),
  );
  const recordItems = records.flatMap((record) => {
    const asset = assetsById.get(record.asset_id);

    if (!asset) {
      return [];
    }

    const document = documents.get(record.id) ?? null;
    const status = calculateComplianceStatus({
      isArchived: Boolean(record.archived_at),
      isRequired: true,
      hasValidRecord: true,
      hasValidDocument: Boolean(document),
      expirationDate: record.expiration_date,
      reminderDays: record.reminder_days,
      timezone,
    });

    return [
      {
        id: record.id,
        recordId: record.id,
        requirementId: record.requirement_id,
        asset_id: record.asset_id,
        asset,
        compliance_type: record.compliance_type,
        issuing_organization: record.issuing_organization,
        identification_number: record.identification_number,
        effective_date: record.effective_date,
        expiration_date: record.expiration_date,
        reminder_days: record.reminder_days,
        notes: record.notes,
        archived_at: record.archived_at,
        status: status.status,
        statusReasons: status.reasons,
        daysUntilExpiration: status.daysUntilExpiration,
        document,
      },
    ];
  });
  const missingItems = requirements.flatMap((requirement) => {
    if (requirement.archived_at || activeRecordRequirementIds.has(requirement.id)) {
      return [];
    }

    const asset = assetsById.get(requirement.asset_id);

    if (!asset) {
      return [];
    }

    const status = calculateComplianceStatus({
      isRequired: true,
      hasValidRecord: false,
      hasValidDocument: false,
      reminderDays: requirement.reminder_days,
      timezone,
    });

    return [
      {
        id: `requirement:${requirement.id}`,
        recordId: null,
        requirementId: requirement.id,
        asset_id: requirement.asset_id,
        asset,
        compliance_type: requirement.compliance_type,
        issuing_organization: null,
        identification_number: null,
        effective_date: null,
        expiration_date: null,
        reminder_days: requirement.reminder_days,
        notes: requirement.notes,
        archived_at: requirement.archived_at,
        status: status.status,
        statusReasons: status.reasons,
        daysUntilExpiration: status.daysUntilExpiration,
        document: null,
      },
    ];
  });

  return [...recordItems, ...missingItems];
}

function filterComplianceItems(
  items: ComplianceOverviewItem[],
  filters: ComplianceFilters,
) {
  return items.filter((item) => {
    const query = filters.query.toLowerCase();
    const matchesQuery =
      !query ||
      item.compliance_type.toLowerCase().includes(query) ||
      item.asset.unit_number.toLowerCase().includes(query) ||
      item.asset.asset_name.toLowerCase().includes(query) ||
      (item.issuing_organization?.toLowerCase().includes(query) ?? false) ||
      (item.identification_number?.toLowerCase().includes(query) ?? false);
    const matchesAsset = !filters.assetId || item.asset_id === filters.assetId;
    const matchesType =
      !filters.complianceType ||
      item.compliance_type.toLowerCase() === filters.complianceType.toLowerCase();
    const matchesStatus =
      filters.status === "all"
        ? item.status !== "Archived"
        : item.status === filters.status;

    return matchesQuery && matchesAsset && matchesType && matchesStatus;
  });
}

function sortComplianceItems(
  left: ComplianceOverviewItem,
  right: ComplianceOverviewItem,
  sort: ComplianceFilters["sort"],
) {
  if (sort === "asset") {
    return left.asset.unit_number.localeCompare(right.asset.unit_number);
  }

  if (sort === "type") {
    return left.compliance_type.localeCompare(right.compliance_type);
  }

  if (sort === "expiration_desc") {
    return (right.expiration_date ?? "0000-01-01").localeCompare(
      left.expiration_date ?? "0000-01-01",
    );
  }

  return (left.expiration_date ?? "9999-12-31").localeCompare(
    right.expiration_date ?? "9999-12-31",
  );
}

function buildComplianceTypeOptions(
  requirements: ComplianceRequirement[],
  records: ComplianceRecord[],
) {
  return Array.from(
    new Set([
      ...DEFAULT_COMPLIANCE_TYPES,
      ...requirements.map((requirement) => requirement.compliance_type),
      ...records.map((record) => record.compliance_type),
    ]),
  ).sort((a, b) => a.localeCompare(b));
}

function isComplianceStatus(value: string): value is ComplianceStatus {
  return (
    value === "Current" ||
    value === "Expiring soon" ||
    value === "Expired" ||
    value === "Missing" ||
    value === "Archived"
  );
}
