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

export type FleetListResult = {
  assets: FleetAssetListItem[];
  totalCount: number;
  pageSize: number;
  filters: FleetListFilters;
  companyName: string;
  isConfigured: boolean;
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
    return {
      assets: [],
      totalCount: 0,
      pageSize: FLEET_PAGE_SIZE,
      filters,
      companyName: "FleetReady workspace",
      isConfigured: false,
    };
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

  return {
    assets,
    totalCount: count ?? 0,
    pageSize: FLEET_PAGE_SIZE,
    filters,
    companyName: context.companyName,
    isConfigured: true,
  };
}

export async function getFleetAsset(assetId: string): Promise<AssetProfile | null> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return null;
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
