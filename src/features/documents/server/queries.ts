import { DOCUMENT_PAGE_SIZE, DOCUMENT_TYPES } from "@/features/documents/constants";
import { canPreviewDocument } from "@/features/documents/helpers";
import {
  calculateDocumentStatus,
  type DocumentStatus,
} from "@/features/documents/status";
import { createAuthorizedSignedDocumentUrl } from "@/features/documents/server/storage";
import type {
  DocumentAssetOption,
  DocumentFilters,
  DocumentRelationshipOption,
  FleetDocument,
  FleetDocumentVersion,
  FleetDocumentWithRelations,
} from "@/features/documents/types";
import { AppError } from "@/lib/errors";
import {
  getOwnerDatabaseContext,
  type SupabaseServerClient,
} from "@/features/fleet/server/owner";

export type DocumentSearchParams = Record<string, string | string[] | undefined>;

export type DocumentLibraryResult = {
  isConfigured: boolean;
  companyName: string;
  timezone: string;
  documents: FleetDocumentWithRelations[];
  allDocuments: FleetDocumentWithRelations[];
  expiringDocuments: FleetDocumentWithRelations[];
  archivedDocuments: FleetDocumentWithRelations[];
  assets: DocumentAssetOption[];
  filters: DocumentFilters;
  pageSize: number;
  totalCount: number;
  counts: Record<DocumentStatus, number>;
};

export type DocumentFormOptions = {
  isConfigured: boolean;
  assets: DocumentAssetOption[];
  maintenanceRecords: DocumentRelationshipOption[];
  complianceRecords: DocumentRelationshipOption[];
  documentTypes: string[];
};

const emptyCounts: Record<DocumentStatus, number> = {
  Current: 0,
  "Expiring soon": 0,
  Expired: 0,
  Archived: 0,
};

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseDocumentFilters(
  searchParams: DocumentSearchParams,
): DocumentFilters {
  const rawPage = Number(firstParam(searchParams.page) ?? "1");
  const rawStatus = firstParam(searchParams.status) ?? "all";
  const rawSort = firstParam(searchParams.sort) ?? "created_desc";

  return {
    query: firstParam(searchParams.q)?.trim() ?? "",
    category: firstParam(searchParams.category)?.trim() ?? "",
    assetId: firstParam(searchParams.assetId)?.trim() ?? "",
    status: isDocumentStatus(rawStatus) ? rawStatus : "all",
    sort:
      rawSort === "created_asc" || rawSort === "expiration_asc" || rawSort === "name"
        ? rawSort
        : "created_desc",
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
  };
}

export async function getDocumentLibrary(
  searchParams: DocumentSearchParams,
): Promise<DocumentLibraryResult> {
  const filters = parseDocumentFilters(searchParams);
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return {
      isConfigured: false,
      companyName: "FleetReady workspace",
      timezone: "UTC",
      documents: [],
      allDocuments: [],
      expiringDocuments: [],
      archivedDocuments: [],
      assets: [],
      filters,
      pageSize: DOCUMENT_PAGE_SIZE,
      totalCount: 0,
      counts: emptyCounts,
    };
  }

  const [assets, maintenanceRecords, complianceRecords, documents] = await Promise.all([
    getDocumentAssets(context.supabase, context.companyId),
    getMaintenanceRecordOptions(context.supabase, context.companyId),
    getComplianceRecordOptions(context.supabase, context.companyId),
    getDocuments(context.supabase, context.companyId),
  ]);
  const decoratedDocuments = await decorateDocuments({
    supabase: context.supabase,
    companyId: context.companyId,
    timezone: context.preferredTimezone,
    documents,
    assets,
    maintenanceRecords,
    complianceRecords,
  });
  const counts = decoratedDocuments.reduce(
    (current, document) => ({
      ...current,
      [document.status]: current[document.status] + 1,
    }),
    { ...emptyCounts },
  );
  const filteredDocuments = filterDocuments(decoratedDocuments, filters).sort((a, b) =>
    sortDocuments(a, b, filters.sort),
  );
  const from = (filters.page - 1) * DOCUMENT_PAGE_SIZE;

  return {
    isConfigured: true,
    companyName: context.companyName,
    timezone: context.preferredTimezone,
    documents: filteredDocuments.slice(from, from + DOCUMENT_PAGE_SIZE),
    allDocuments: decoratedDocuments,
    expiringDocuments: decoratedDocuments
      .filter(
        (document) =>
          document.status === "Expiring soon" || document.status === "Expired",
      )
      .sort((a, b) =>
        (a.expiration_date ?? "9999-12-31").localeCompare(
          b.expiration_date ?? "9999-12-31",
        ),
      )
      .slice(0, 6),
    archivedDocuments: decoratedDocuments
      .filter((document) => document.status === "Archived")
      .slice(0, 6),
    assets,
    filters,
    pageSize: DOCUMENT_PAGE_SIZE,
    totalCount: filteredDocuments.length,
    counts,
  };
}

export async function getDocumentFormOptions(): Promise<DocumentFormOptions> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return {
      isConfigured: false,
      assets: [],
      maintenanceRecords: [],
      complianceRecords: [],
      documentTypes: [...DOCUMENT_TYPES],
    };
  }

  const [assets, maintenanceRecords, complianceRecords, documents] = await Promise.all([
    getDocumentAssets(context.supabase, context.companyId),
    getMaintenanceRecordOptions(context.supabase, context.companyId),
    getComplianceRecordOptions(context.supabase, context.companyId),
    getDocuments(context.supabase, context.companyId),
  ]);

  return {
    isConfigured: true,
    assets,
    maintenanceRecords,
    complianceRecords,
    documentTypes: buildDocumentTypeOptions(documents),
  };
}

export async function getDocumentDetail(documentId: string) {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return null;
  }

  const [assets, maintenanceRecords, complianceRecords, { data: document, error }] =
    await Promise.all([
      getDocumentAssets(context.supabase, context.companyId),
      getMaintenanceRecordOptions(context.supabase, context.companyId),
      getComplianceRecordOptions(context.supabase, context.companyId),
      context.supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .eq("company_id", context.companyId)
        .maybeSingle(),
    ]);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  if (!document) {
    return null;
  }

  const [decoratedDocument] = await decorateDocuments({
    supabase: context.supabase,
    companyId: context.companyId,
    timezone: context.preferredTimezone,
    documents: [document as FleetDocument],
    assets,
    maintenanceRecords,
    complianceRecords,
  });

  if (!decoratedDocument) {
    return null;
  }

  const versions = await getDocumentVersions(
    context.supabase,
    context.companyId,
    documentId,
  );

  return {
    ...decoratedDocument,
    versions,
  };
}

export async function getAssetDocumentSnapshot(assetId: string) {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return {
      recentDocuments: [],
      expiringDocuments: [],
      expiredDocuments: [],
      categoryCounts: [],
    };
  }

  const [assets, maintenanceRecords, complianceRecords, documents] = await Promise.all([
    getDocumentAssets(context.supabase, context.companyId),
    getMaintenanceRecordOptions(context.supabase, context.companyId),
    getComplianceRecordOptions(context.supabase, context.companyId),
    getDocuments(context.supabase, context.companyId, assetId),
  ]);
  const decoratedDocuments = await decorateDocuments({
    supabase: context.supabase,
    companyId: context.companyId,
    timezone: context.preferredTimezone,
    documents,
    assets,
    maintenanceRecords,
    complianceRecords,
  });
  const activeDocuments = decoratedDocuments.filter(
    (document) => document.status !== "Archived",
  );
  const counts = new Map<string, number>();

  activeDocuments.forEach((document) => {
    counts.set(document.document_type, (counts.get(document.document_type) ?? 0) + 1);
  });

  return {
    recentDocuments: activeDocuments.slice(0, 5),
    expiringDocuments: activeDocuments
      .filter((document) => document.status === "Expiring soon")
      .slice(0, 5),
    expiredDocuments: activeDocuments
      .filter((document) => document.status === "Expired")
      .slice(0, 5),
    categoryCounts: Array.from(counts.entries()).map(([category, count]) => ({
      category,
      count,
    })),
  };
}

async function getDocumentAssets(
  supabase: SupabaseServerClient,
  companyId: string,
): Promise<DocumentAssetOption[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("id,unit_number,asset_name")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("unit_number", { ascending: true });

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []) as DocumentAssetOption[];
}

async function getDocuments(
  supabase: SupabaseServerClient,
  companyId: string,
  assetId?: string,
): Promise<FleetDocument[]> {
  let query = supabase.from("documents").select("*").eq("company_id", companyId);

  if (assetId) {
    query = query.eq("asset_id", assetId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []) as FleetDocument[];
}

async function getDocumentVersions(
  supabase: SupabaseServerClient,
  companyId: string,
  documentId: string,
): Promise<FleetDocumentVersion[]> {
  const { data, error } = await supabase
    .from("document_versions")
    .select(
      "id,version_number,storage_bucket,storage_path,mime_type,file_size,change_reason,created_at",
    )
    .eq("company_id", companyId)
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(12);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return Promise.all(
    (
      (data ?? []) as Array<
        Omit<FleetDocumentVersion, "signedUrl"> & { file_size: number | string }
      >
    ).map(async (version) => ({
      ...version,
      file_size: Number(version.file_size ?? 0),
      signedUrl: await createAuthorizedSignedDocumentUrl(supabase, companyId, version),
    })),
  );
}

async function getMaintenanceRecordOptions(
  supabase: SupabaseServerClient,
  companyId: string,
): Promise<DocumentRelationshipOption[]> {
  const { data, error } = await supabase
    .from("maintenance_records")
    .select("id,asset_id,maintenance_type,completion_date")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("completion_date", { ascending: false })
    .limit(100);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []).map((record) => ({
    id: record.id,
    asset_id: record.asset_id,
    label: `${record.maintenance_type} - ${record.completion_date}`,
  }));
}

async function getComplianceRecordOptions(
  supabase: SupabaseServerClient,
  companyId: string,
): Promise<DocumentRelationshipOption[]> {
  const { data, error } = await supabase
    .from("compliance_records")
    .select("id,asset_id,compliance_type,expiration_date")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("expiration_date", { ascending: true })
    .limit(100);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []).map((record) => ({
    id: record.id,
    asset_id: record.asset_id,
    label: `${record.compliance_type} - expires ${record.expiration_date}`,
  }));
}

async function decorateDocuments({
  supabase,
  companyId,
  timezone,
  documents,
  assets,
  maintenanceRecords,
  complianceRecords,
}: {
  supabase: SupabaseServerClient;
  companyId: string;
  timezone: string;
  documents: FleetDocument[];
  assets: DocumentAssetOption[];
  maintenanceRecords: DocumentRelationshipOption[];
  complianceRecords: DocumentRelationshipOption[];
}): Promise<FleetDocumentWithRelations[]> {
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const maintenanceById = new Map(
    maintenanceRecords.map((record) => [record.id, record.label]),
  );
  const complianceById = new Map(
    complianceRecords.map((record) => [record.id, record.label]),
  );

  return Promise.all(
    documents.map(async (document) => {
      const status = calculateDocumentStatus({
        archivedAt: document.archived_at,
        expirationDate: document.expiration_date,
        reminderDays: 30,
        timezone,
      });
      const signedUrl = await createAuthorizedSignedDocumentUrl(
        supabase,
        companyId,
        document,
      );

      return {
        ...document,
        file_size: Number(document.file_size ?? 0),
        asset: document.asset_id ? (assetsById.get(document.asset_id) ?? null) : null,
        maintenanceLabel: document.maintenance_record_id
          ? (maintenanceById.get(document.maintenance_record_id) ?? null)
          : null,
        complianceLabel: document.compliance_record_id
          ? (complianceById.get(document.compliance_record_id) ?? null)
          : null,
        signedUrl,
        status: status.status,
        daysUntilExpiration: status.daysUntilExpiration,
        canPreview: canPreviewDocument(document.mime_type),
      };
    }),
  );
}

function filterDocuments(
  documents: FleetDocumentWithRelations[],
  filters: DocumentFilters,
) {
  return documents.filter((document) => {
    const query = filters.query.toLowerCase();
    const matchesQuery =
      !query ||
      document.document_name.toLowerCase().includes(query) ||
      document.document_type.toLowerCase().includes(query) ||
      (document.document_number?.toLowerCase().includes(query) ?? false) ||
      (document.asset?.unit_number.toLowerCase().includes(query) ?? false) ||
      (document.asset?.asset_name.toLowerCase().includes(query) ?? false);
    const matchesCategory =
      !filters.category ||
      document.document_type.toLowerCase() === filters.category.toLowerCase();
    const matchesAsset = !filters.assetId || document.asset_id === filters.assetId;
    const matchesStatus =
      filters.status === "all"
        ? document.status !== "Archived"
        : document.status === filters.status;

    return matchesQuery && matchesCategory && matchesAsset && matchesStatus;
  });
}

function sortDocuments(
  left: FleetDocumentWithRelations,
  right: FleetDocumentWithRelations,
  sort: DocumentFilters["sort"],
) {
  if (sort === "created_asc") {
    return left.created_at.localeCompare(right.created_at);
  }

  if (sort === "expiration_asc") {
    return (left.expiration_date ?? "9999-12-31").localeCompare(
      right.expiration_date ?? "9999-12-31",
    );
  }

  if (sort === "name") {
    return left.document_name.localeCompare(right.document_name);
  }

  return right.created_at.localeCompare(left.created_at);
}

function buildDocumentTypeOptions(documents: FleetDocument[]) {
  return Array.from(
    new Set([...DOCUMENT_TYPES, ...documents.map((document) => document.document_type)]),
  ).sort((a, b) => a.localeCompare(b));
}

function isDocumentStatus(value: string): value is DocumentStatus {
  return (
    value === "Current" ||
    value === "Expiring soon" ||
    value === "Expired" ||
    value === "Archived"
  );
}
