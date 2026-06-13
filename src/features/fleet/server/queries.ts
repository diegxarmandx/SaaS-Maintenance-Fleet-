import { FLEET_PAGE_SIZE } from "@/features/fleet/constants";
import { deriveAssetAttentionStatus } from "@/features/fleet/helpers";
import type {
  AssetProfile,
  FleetAsset,
  FleetAssetListItem,
  FleetListFilters,
} from "@/features/fleet/types";
import { AppError } from "@/lib/errors";
import { serverEnv } from "@/lib/env/server";
import {
  getOwnerDatabaseContext,
  type SupabaseServerClient,
} from "@/features/fleet/server/owner";
import { getSubscriptionCapabilities } from "@/features/billing/access";
import { getSubscriptionSnapshot } from "@/features/billing/server/subscription";
import type { SubscriptionStatus } from "@/features/billing/access";
import { getLocalDemoDataset, localDemoIdentity } from "@/features/demo/local-data";

export type FleetSubscriptionSummary = {
  status: SubscriptionStatus;
  activeAssetCount: number;
  assetLimit: number;
  canCreateActiveAsset: boolean;
  isOverAssetLimit: boolean;
  remainingActiveAssets: number;
  reason: string | null;
};

export type FleetListResult = {
  assets: FleetAssetListItem[];
  totalCount: number;
  pageSize: number;
  filters: FleetListFilters;
  companyName: string;
  isConfigured: boolean;
  subscription: FleetSubscriptionSummary | null;
};

export type FleetSearchParams = Record<string, string | string[] | undefined>;

const sortMap: Record<
  FleetListFilters["sort"],
  { column: keyof FleetAsset; ascending: boolean }
> = {
  updated_desc: { column: "updated_at", ascending: false },
  unit_asc: { column: "unit_number", ascending: true },
  name_asc: { column: "asset_name", ascending: true },
  mileage_desc: { column: "current_mileage", ascending: false },
  hours_desc: { column: "current_engine_hours", ascending: false },
};

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseFleetListFilters(searchParams: FleetSearchParams): FleetListFilters {
  const rawPage = Number(firstParam(searchParams.page) ?? "1");
  const rawStatus = firstParam(searchParams.status) ?? "all";
  const rawSort = firstParam(searchParams.sort) ?? "updated_desc";

  return {
    query: firstParam(searchParams.q)?.trim() ?? "",
    status:
      rawStatus === "active" || rawStatus === "inactive" || rawStatus === "archived"
        ? rawStatus
        : "all",
    assetType: firstParam(searchParams.assetType)?.trim() ?? "",
    sort:
      rawSort === "unit_asc" ||
      rawSort === "name_asc" ||
      rawSort === "mileage_desc" ||
      rawSort === "hours_desc"
        ? rawSort
        : "updated_desc",
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
  };
}

export async function listFleetAssets(
  searchParams: FleetSearchParams,
): Promise<FleetListResult> {
  const filters = parseFleetListFilters(searchParams);
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return getLocalDemoFleetList(filters);
  }

  const { column, ascending } = sortMap[filters.sort];
  const from = (filters.page - 1) * FLEET_PAGE_SIZE;
  const to = from + FLEET_PAGE_SIZE - 1;

  let query = context.supabase
    .from("assets")
    .select("*", { count: "exact" })
    .eq("company_id", context.companyId);

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.assetType) {
    query = query.eq("asset_type", filters.assetType);
  }

  if (filters.query) {
    const term = filters.query.replace(/[%,()]/g, " ").trim();
    if (term) {
      query = query.or(
        [
          `unit_number.ilike.%${term}%`,
          `asset_name.ilike.%${term}%`,
          `asset_type.ilike.%${term}%`,
          `make.ilike.%${term}%`,
          `model.ilike.%${term}%`,
          `vin_or_serial_number.ilike.%${term}%`,
          `license_plate.ilike.%${term}%`,
        ].join(","),
      );
    }
  }

  const { data, error, count } = await query.order(column, { ascending }).range(from, to);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  const assets = await addAssetDisplayData(
    context.supabase,
    (data ?? []) as FleetAsset[],
  );

  const subscription = await getFleetSubscriptionSummary(context);

  return {
    assets,
    totalCount: count ?? 0,
    pageSize: FLEET_PAGE_SIZE,
    filters,
    companyName: context.companyName,
    isConfigured: true,
    subscription,
  };
}

export async function getCurrentFleetSubscriptionSummary() {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return getLocalDemoFleetSubscriptionSummary();
  }

  return getFleetSubscriptionSummary(context);
}

export async function getFleetAsset(assetId: string): Promise<AssetProfile | null> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return getLocalDemoFleetAsset(assetId);
  }

  const { data: asset, error } = await context.supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("company_id", context.companyId)
    .maybeSingle();

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  if (!asset) {
    return null;
  }

  const [
    { data: meterReadings, error: meterError },
    { count: maintenanceRecordCount, error: maintenanceError },
    { count: complianceRecordCount, error: complianceError },
    { count: documentCount, error: documentError },
    { data: maintenanceTotals, error: totalsError },
  ] = await Promise.all([
    context.supabase
      .from("meter_readings")
      .select("*")
      .eq("asset_id", assetId)
      .eq("company_id", context.companyId)
      .order("reading_date", { ascending: false })
      .limit(10),
    context.supabase
      .from("maintenance_records")
      .select("id", { count: "exact", head: true })
      .eq("asset_id", assetId)
      .eq("company_id", context.companyId),
    context.supabase
      .from("compliance_records")
      .select("id", { count: "exact", head: true })
      .eq("asset_id", assetId)
      .eq("company_id", context.companyId),
    context.supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("asset_id", assetId)
      .eq("company_id", context.companyId),
    context.supabase
      .from("maintenance_records")
      .select("total_cost")
      .eq("asset_id", assetId)
      .eq("company_id", context.companyId),
  ]);

  const firstError =
    meterError ?? maintenanceError ?? complianceError ?? documentError ?? totalsError;

  if (firstError) {
    throw new AppError("DATA_ACCESS_ERROR", firstError.message);
  }

  const [displayAsset] = await addAssetDisplayData(context.supabase, [
    asset as FleetAsset,
  ]);

  if (!displayAsset) {
    return null;
  }

  const expenseTotal = ((maintenanceTotals ?? []) as { total_cost: number }[]).reduce(
    (total, record) => total + Number(record.total_cost ?? 0),
    0,
  );

  return {
    ...displayAsset,
    meterReadings: (meterReadings ?? []) as AssetProfile["meterReadings"],
    maintenanceRecordCount: maintenanceRecordCount ?? 0,
    complianceRecordCount: complianceRecordCount ?? 0,
    documentCount: documentCount ?? 0,
    expenseTotal,
  };
}

function getLocalDemoFleetList(filters: FleetListFilters): FleetListResult {
  const { column, ascending } = sortMap[filters.sort];
  const assets = addLocalAssetDisplayData(
    getLocalDemoDataset().assets as unknown as FleetAsset[],
  );
  const filteredAssets = assets.filter((asset) => {
    const query = filters.query.toLowerCase();
    const matchesQuery =
      !query ||
      asset.unit_number.toLowerCase().includes(query) ||
      asset.asset_name.toLowerCase().includes(query) ||
      asset.asset_type.toLowerCase().includes(query) ||
      (asset.make?.toLowerCase().includes(query) ?? false) ||
      (asset.model?.toLowerCase().includes(query) ?? false) ||
      (asset.vin_or_serial_number?.toLowerCase().includes(query) ?? false) ||
      (asset.license_plate?.toLowerCase().includes(query) ?? false);
    const matchesStatus = filters.status === "all" || asset.status === filters.status;
    const matchesAssetType = !filters.assetType || asset.asset_type === filters.assetType;

    return matchesQuery && matchesStatus && matchesAssetType;
  });
  const sortedAssets = filteredAssets.sort((left, right) => {
    const leftValue = left[column];
    const rightValue = right[column];
    const result = String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
    return ascending ? result : -result;
  });
  const from = (filters.page - 1) * FLEET_PAGE_SIZE;

  return {
    assets: sortedAssets.slice(from, from + FLEET_PAGE_SIZE),
    totalCount: filteredAssets.length,
    pageSize: FLEET_PAGE_SIZE,
    filters,
    companyName: localDemoIdentity.companyName,
    isConfigured: true,
    subscription: getLocalDemoFleetSubscriptionSummary(),
  };
}

function getLocalDemoFleetAsset(assetId: string): AssetProfile | null {
  const dataset = getLocalDemoDataset();
  const asset = (dataset.assets as unknown as FleetAsset[]).find(
    (candidate) => candidate.id === assetId,
  );

  if (!asset) {
    return null;
  }

  const [displayAsset] = addLocalAssetDisplayData([asset]);

  if (!displayAsset) {
    return null;
  }

  const maintenanceRecords = dataset.maintenanceRecords.filter(
    (record) => record.asset_id === assetId,
  );

  return {
    ...displayAsset,
    meterReadings: (dataset.meterReadings as unknown as AssetProfile["meterReadings"])
      .filter((reading) => reading.asset_id === assetId)
      .sort((left, right) => right.reading_date.localeCompare(left.reading_date))
      .slice(0, 10),
    maintenanceRecordCount: maintenanceRecords.length,
    complianceRecordCount: dataset.complianceRecords.filter(
      (record) => record.asset_id === assetId,
    ).length,
    documentCount: dataset.documents.filter((document) => document.asset_id === assetId)
      .length,
    expenseTotal: maintenanceRecords.reduce(
      (total, record) => total + Number(record.total_cost ?? 0),
      0,
    ),
  };
}

function addLocalAssetDisplayData(assets: FleetAsset[]): FleetAssetListItem[] {
  return assets.map((asset) => ({
    ...asset,
    assetImageUrl: null,
    attentionStatus: deriveAssetAttentionStatus(asset),
  }));
}

function getLocalDemoFleetSubscriptionSummary(): FleetSubscriptionSummary {
  const dataset = getLocalDemoDataset();
  const activeAssetCount = dataset.assets.filter(
    (asset) => asset.status === "active" && !asset.archived_at,
  ).length;
  const assetLimit = dataset.subscriptionRecord.asset_limit;
  const capabilities = getSubscriptionCapabilities({
    status: "active",
    activeAssetCount,
    assetLimit,
  });

  return {
    status: capabilities.status,
    activeAssetCount,
    assetLimit,
    canCreateActiveAsset: capabilities.canCreateAssets,
    isOverAssetLimit: capabilities.isOverAssetLimit,
    remainingActiveAssets: capabilities.remainingActiveAssets,
    reason: capabilities.reason,
  };
}

async function addAssetDisplayData(
  supabase: SupabaseServerClient,
  assets: FleetAsset[],
): Promise<FleetAssetListItem[]> {
  return Promise.all(
    assets.map(async (asset) => ({
      ...asset,
      assetImageUrl: await getSignedAssetImageUrl(supabase, asset.asset_image_path),
      attentionStatus: deriveAssetAttentionStatus(asset),
    })),
  );
}

async function getFleetSubscriptionSummary(
  context: NonNullable<Awaited<ReturnType<typeof getOwnerDatabaseContext>>>,
): Promise<FleetSubscriptionSummary> {
  const snapshot = await getSubscriptionSnapshot(context);
  const capabilities = getSubscriptionCapabilities({
    status: snapshot.status,
    activeAssetCount: snapshot.activeAssetCount,
    assetLimit: snapshot.assetLimit,
  });

  return {
    status: capabilities.status,
    activeAssetCount: snapshot.activeAssetCount,
    assetLimit: snapshot.assetLimit,
    canCreateActiveAsset: capabilities.canCreateAssets,
    isOverAssetLimit: capabilities.isOverAssetLimit,
    remainingActiveAssets: capabilities.remainingActiveAssets,
    reason: capabilities.reason,
  };
}

async function getSignedAssetImageUrl(
  supabase: SupabaseServerClient,
  storagePath: string | null,
) {
  if (!storagePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(serverEnv.SUPABASE_ASSET_IMAGES_BUCKET)
    .createSignedUrl(storagePath, 60 * 10);

  if (error) {
    return null;
  }

  return data.signedUrl;
}
