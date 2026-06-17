import { calculateComplianceStatus } from "@/features/compliance/status";
import { calculateDocumentStatus } from "@/features/documents/status";
import { formatCurrency, formatShortDate } from "@/features/fleet/helpers";
import { calculateMaintenanceStatus } from "@/features/maintenance/schedule";
import type {
  DashboardAttentionItem,
  DashboardData,
  DashboardFleetAssetStatus,
} from "@/features/dashboard/types";
import { getDashboardAttentionRank } from "@/features/dashboard/priority";
import { AppError } from "@/lib/errors";
import {
  getOwnerDatabaseContext,
  type SupabaseServerClient,
} from "@/features/fleet/server/owner";
import { getLocalDemoDataset, localDemoIdentity } from "@/features/demo/local-data";
import { shouldUseLocalDemoData } from "@/features/demo/mode";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";

type AssetRow = {
  id: string;
  unit_number: string;
  asset_name: string;
  current_mileage: number;
  current_engine_hours: number;
  status: string;
};

type MaintenanceRuleRow = {
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
};

type MaintenanceRecordRow = {
  id: string;
  asset_id: string;
  maintenance_type: string;
  completion_date: string;
  total_cost: number;
  created_at: string;
};

type ComplianceRequirementRow = {
  id: string;
  asset_id: string;
  compliance_type: string;
  reminder_days: number;
  archived_at: string | null;
};

type ComplianceRecordRow = {
  id: string;
  asset_id: string;
  requirement_id: string | null;
  compliance_type: string;
  expiration_date: string;
  reminder_days: number;
  archived_at: string | null;
  updated_at: string;
};

type DocumentRow = {
  id: string;
  asset_id: string | null;
  document_name: string;
  document_type: string;
  expiration_date: string | null;
  archived_at: string | null;
  created_at: string;
};

type MeterReadingRow = {
  id: string;
  asset_id: string;
  reading_type: "mileage" | "engine_hours";
  reading_value: number;
  reading_date: string;
};

export async function getDashboardData(): Promise<DashboardData> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return shouldUseLocalDemoData
      ? getLocalDemoDashboardData()
      : getDisconnectedDashboardData();
  }

  await enforceOwnerTenantRateLimit("expensiveOperation", context);

  const [
    assets,
    maintenanceRules,
    maintenanceRecords,
    complianceRequirements,
    complianceRecords,
    documents,
    meterReadings,
  ] = await Promise.all([
    getAssets(context.supabase, context.companyId),
    getMaintenanceRules(context.supabase, context.companyId),
    getMaintenanceRecords(context.supabase, context.companyId),
    getComplianceRequirements(context.supabase, context.companyId),
    getComplianceRecords(context.supabase, context.companyId),
    getDocuments(context.supabase, context.companyId),
    getMeterReadings(context.supabase, context.companyId),
  ]);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const maintenanceItems = buildMaintenanceAttentionItems(
    maintenanceRules,
    assetsById,
    context.preferredTimezone,
  );
  const complianceItems = buildComplianceAttentionItems({
    requirements: complianceRequirements,
    records: complianceRecords,
    assetsById,
    timezone: context.preferredTimezone,
  });
  const documentItems = buildDocumentAttentionItems(
    documents,
    assetsById,
    context.preferredTimezone,
  );
  const attentionItems = [...maintenanceItems, ...complianceItems, ...documentItems]
    .sort(sortAttentionItems)
    .slice(0, 12);
  const fleetStatus = buildFleetStatus(assets, attentionItems);

  return {
    isConfigured: true,
    companyName: context.companyName,
    summary: {
      totalActiveAssets: assets.filter((asset) => asset.status === "active").length,
      maintenanceDueSoon: maintenanceItems.filter((item) => item.status === "Due soon")
        .length,
      overdueMaintenance: maintenanceItems.filter((item) => item.status === "Overdue")
        .length,
      documentsExpiringSoon: documentItems.filter(
        (item) => item.status === "Expiring soon",
      ).length,
      expiredDocuments: documentItems.filter((item) => item.status === "Expired").length,
      missingComplianceItems: complianceItems.filter((item) => item.status === "Missing")
        .length,
    },
    attentionItems,
    recentMaintenance: maintenanceRecords.slice(0, 5).map((record) => {
      const asset = assetsById.get(record.asset_id);

      return {
        id: record.id,
        label: record.maintenance_type,
        detail: `${assetLabel(asset)} - ${formatCurrency(record.total_cost)}`,
        occurredAt: record.completion_date,
        href: `/maintenance/history/${record.id}`,
      };
    }),
    recentDocuments: documents.slice(0, 5).map((document) => {
      const asset = document.asset_id ? assetsById.get(document.asset_id) : null;

      return {
        id: document.id,
        label: document.document_name,
        detail: `${document.document_type} - ${assetLabel(asset)}`,
        occurredAt: document.created_at,
        href: `/documents/${document.id}`,
      };
    }),
    recentCompliance: complianceRecords.slice(0, 5).map((record) => {
      const asset = assetsById.get(record.asset_id);

      return {
        id: record.id,
        label: record.compliance_type,
        detail: `${assetLabel(asset)} - expires ${formatShortDate(record.expiration_date)}`,
        occurredAt: record.updated_at,
        href: `/compliance/${record.id}`,
      };
    }),
    recentMeterReadings: meterReadings.slice(0, 5).map((reading) => {
      const asset = assetsById.get(reading.asset_id);

      return {
        id: reading.id,
        label: reading.reading_type === "mileage" ? "Mileage reading" : "Hour reading",
        detail: `${assetLabel(asset)} - ${Number(reading.reading_value).toLocaleString()}`,
        occurredAt: reading.reading_date,
        href: `/fleet/${reading.asset_id}`,
      };
    }),
    fleetStatus,
  };
}

function getDisconnectedDashboardData(): DashboardData {
  return {
    isConfigured: false,
    companyName: "FleetReady workspace",
    summary: {
      totalActiveAssets: 0,
      maintenanceDueSoon: 0,
      overdueMaintenance: 0,
      documentsExpiringSoon: 0,
      expiredDocuments: 0,
      missingComplianceItems: 0,
    },
    attentionItems: [],
    recentMaintenance: [],
    recentDocuments: [],
    recentCompliance: [],
    recentMeterReadings: [],
    fleetStatus: [],
  };
}

function getLocalDemoDashboardData(): DashboardData {
  const dataset = getLocalDemoDataset();
  const assets = dataset.assets as unknown as AssetRow[];
  const maintenanceRules = dataset.maintenanceRules as unknown as MaintenanceRuleRow[];
  const maintenanceRecords =
    dataset.maintenanceRecords as unknown as MaintenanceRecordRow[];
  const complianceRequirements =
    dataset.complianceRequirements as unknown as ComplianceRequirementRow[];
  const complianceRecords = dataset.complianceRecords as unknown as ComplianceRecordRow[];
  const documents = dataset.documents as unknown as DocumentRow[];
  const meterReadings = dataset.meterReadings as unknown as MeterReadingRow[];
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const maintenanceItems = buildMaintenanceAttentionItems(
    maintenanceRules,
    assetsById,
    localDemoIdentity.timezone,
  );
  const complianceItems = buildComplianceAttentionItems({
    requirements: complianceRequirements,
    records: complianceRecords,
    assetsById,
    timezone: localDemoIdentity.timezone,
  });
  const documentItems = buildDocumentAttentionItems(
    documents,
    assetsById,
    localDemoIdentity.timezone,
  );
  const attentionItems = [...maintenanceItems, ...complianceItems, ...documentItems]
    .sort(sortAttentionItems)
    .slice(0, 12);
  const fleetStatus = buildFleetStatus(assets, attentionItems);

  return {
    isConfigured: true,
    companyName: localDemoIdentity.companyName,
    summary: {
      totalActiveAssets: assets.filter((asset) => asset.status === "active").length,
      maintenanceDueSoon: maintenanceItems.filter((item) => item.status === "Due soon")
        .length,
      overdueMaintenance: maintenanceItems.filter((item) => item.status === "Overdue")
        .length,
      documentsExpiringSoon: documentItems.filter(
        (item) => item.status === "Expiring soon",
      ).length,
      expiredDocuments: documentItems.filter((item) => item.status === "Expired").length,
      missingComplianceItems: complianceItems.filter((item) => item.status === "Missing")
        .length,
    },
    attentionItems,
    recentMaintenance: maintenanceRecords.slice(0, 5).map((record) => {
      const asset = assetsById.get(record.asset_id);

      return {
        id: record.id,
        label: record.maintenance_type,
        detail: `${assetLabel(asset)} - ${formatCurrency(record.total_cost)}`,
        occurredAt: record.completion_date,
        href: `/maintenance/history/${record.id}`,
      };
    }),
    recentDocuments: documents.slice(0, 5).map((document) => {
      const asset = document.asset_id ? assetsById.get(document.asset_id) : null;

      return {
        id: document.id,
        label: document.document_name,
        detail: `${document.document_type} - ${assetLabel(asset)}`,
        occurredAt: document.created_at,
        href: `/documents/${document.id}`,
      };
    }),
    recentCompliance: complianceRecords.slice(0, 5).map((record) => {
      const asset = assetsById.get(record.asset_id);

      return {
        id: record.id,
        label: record.compliance_type,
        detail: `${assetLabel(asset)} - expires ${formatShortDate(record.expiration_date)}`,
        occurredAt: record.updated_at,
        href: `/compliance/${record.id}`,
      };
    }),
    recentMeterReadings: meterReadings.slice(0, 5).map((reading) => {
      const asset = assetsById.get(reading.asset_id);

      return {
        id: reading.id,
        label: reading.reading_type === "mileage" ? "Mileage reading" : "Hour reading",
        detail: `${assetLabel(asset)} - ${Number(reading.reading_value).toLocaleString()}`,
        occurredAt: reading.reading_date,
        href: `/fleet/${reading.asset_id}`,
      };
    }),
    fleetStatus,
  };
}

function buildMaintenanceAttentionItems(
  rules: MaintenanceRuleRow[],
  assetsById: Map<string, AssetRow>,
  timezone: string,
): DashboardAttentionItem[] {
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

    if (status.status === "Current") {
      return [];
    }

    return [
      {
        id: `maintenance:${rule.id}`,
        priority: getDashboardAttentionRank(status.status),
        assetLabel: assetLabel(asset),
        title: rule.name,
        description:
          status.status === "Overdue"
            ? "Maintenance is overdue."
            : "Maintenance is due soon.",
        dueValue: formatDueValue(rule.next_due_date),
        href: `/maintenance/complete?ruleId=${rule.id}&assetId=${asset.id}`,
        status: status.status,
      },
    ];
  });
}

function buildComplianceAttentionItems({
  requirements,
  records,
  assetsById,
  timezone,
}: {
  requirements: ComplianceRequirementRow[];
  records: ComplianceRecordRow[];
  assetsById: Map<string, AssetRow>;
  timezone: string;
}) {
  const items: DashboardAttentionItem[] = [];
  const activeRecords = records.filter((record) => !record.archived_at);
  const activeRequirementIds = new Set(
    activeRecords
      .map((record) => record.requirement_id)
      .filter((id): id is string => Boolean(id)),
  );

  activeRecords.forEach((record) => {
    const asset = assetsById.get(record.asset_id);

    if (!asset) return;

    const status = calculateComplianceStatus({
      isRequired: true,
      hasValidRecord: true,
      expirationDate: record.expiration_date,
      reminderDays: record.reminder_days,
      timezone,
    });

    if (status.status !== "Expired" && status.status !== "Expiring soon") {
      return;
    }

    items.push({
      id: `compliance:${record.id}`,
      priority: getDashboardAttentionRank(status.status),
      assetLabel: assetLabel(asset),
      title: record.compliance_type,
      description:
        status.status === "Expired"
          ? "Compliance record has expired."
          : "Compliance record expires soon.",
      dueValue: formatShortDate(record.expiration_date),
      href: `/compliance/${record.id}`,
      status: status.status,
    });
  });

  requirements.forEach((requirement) => {
    const asset = assetsById.get(requirement.asset_id);

    if (!asset || requirement.archived_at || activeRequirementIds.has(requirement.id)) {
      return;
    }

    items.push({
      id: `requirement:${requirement.id}`,
      priority: getDashboardAttentionRank("Missing"),
      assetLabel: assetLabel(asset),
      title: requirement.compliance_type,
      description: "Assigned compliance requirement is missing a current record.",
      dueValue: "Missing",
      href: `/compliance/new?assetId=${asset.id}&requirementId=${requirement.id}&type=${encodeURIComponent(requirement.compliance_type)}`,
      status: "Missing",
    });
  });

  return items;
}

function buildDocumentAttentionItems(
  documents: DocumentRow[],
  assetsById: Map<string, AssetRow>,
  timezone: string,
) {
  return documents.flatMap((document) => {
    if (!document.expiration_date || document.archived_at) {
      return [];
    }

    const status = calculateDocumentStatus({
      expirationDate: document.expiration_date,
      reminderDays: 30,
      timezone,
    });

    if (status.status !== "Expired" && status.status !== "Expiring soon") {
      return [];
    }

    const asset = document.asset_id ? assetsById.get(document.asset_id) : null;

    return [
      {
        id: `document:${document.id}`,
        priority: getDashboardAttentionRank(status.status),
        assetLabel: assetLabel(asset),
        title: document.document_name,
        description:
          status.status === "Expired"
            ? "Document has expired."
            : "Document expires soon.",
        dueValue: formatShortDate(document.expiration_date),
        href: `/documents/${document.id}`,
        status: status.status,
      },
    ];
  });
}

function buildFleetStatus(
  assets: AssetRow[],
  attentionItems: DashboardAttentionItem[],
): DashboardFleetAssetStatus[] {
  return assets.map((asset) => {
    const assetItems = attentionItems.filter(
      (item) => item.assetLabel === assetLabel(asset),
    );
    const status =
      assetItems.find((item) => item.status === "Overdue" || item.status === "Expired")
        ?.status ??
      assetItems.find((item) => item.status === "Missing")?.status ??
      assetItems.find(
        (item) => item.status === "Due soon" || item.status === "Expiring soon",
      )?.status ??
      "Current";

    return {
      id: asset.id,
      unitNumber: asset.unit_number,
      assetName: asset.asset_name,
      status,
      reasons: assetItems.slice(0, 3).map((item) => item.description),
      href: `/fleet/${asset.id}`,
    };
  });
}

async function getAssets(supabase: SupabaseServerClient, companyId: string) {
  const { data, error } = await supabase
    .from("assets")
    .select("id,unit_number,asset_name,current_mileage,current_engine_hours,status")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("unit_number", { ascending: true });

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as AssetRow[];
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
  return (data ?? []) as MaintenanceRuleRow[];
}

async function getMaintenanceRecords(supabase: SupabaseServerClient, companyId: string) {
  const { data, error } = await supabase
    .from("maintenance_records")
    .select("id,asset_id,maintenance_type,completion_date,total_cost,created_at")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("completion_date", { ascending: false })
    .limit(5);

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as MaintenanceRecordRow[];
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
  return (data ?? []) as ComplianceRequirementRow[];
}

async function getComplianceRecords(supabase: SupabaseServerClient, companyId: string) {
  const { data, error } = await supabase
    .from("compliance_records")
    .select(
      "id,asset_id,requirement_id,compliance_type,expiration_date,reminder_days,archived_at,updated_at",
    )
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as ComplianceRecordRow[];
}

async function getDocuments(supabase: SupabaseServerClient, companyId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id,asset_id,document_name,document_type,expiration_date,archived_at,created_at",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as DocumentRow[];
}

async function getMeterReadings(supabase: SupabaseServerClient, companyId: string) {
  const { data, error } = await supabase
    .from("meter_readings")
    .select("id,asset_id,reading_type,reading_value,reading_date")
    .eq("company_id", companyId)
    .order("reading_date", { ascending: false })
    .limit(5);

  if (error) throw new AppError("DATA_ACCESS_ERROR", error.message);
  return (data ?? []) as MeterReadingRow[];
}

function sortAttentionItems(left: DashboardAttentionItem, right: DashboardAttentionItem) {
  if (left.priority !== right.priority) {
    return left.priority - right.priority;
  }

  return left.dueValue.localeCompare(right.dueValue);
}

function assetLabel(asset: AssetRow | null | undefined) {
  return asset ? `${asset.unit_number} ${asset.asset_name}` : "General fleet";
}

function formatDueValue(value: string | null) {
  return value ? formatShortDate(value) : "Meter interval";
}

function numberOrNull(value: number | null) {
  return value === null ? null : Number(value);
}
