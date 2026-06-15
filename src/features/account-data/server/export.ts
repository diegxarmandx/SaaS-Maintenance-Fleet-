import "server-only";

import { getLocalDemoDataset, localDemoIdentity } from "@/features/demo/local-data";
import type { OwnerDatabaseContext } from "@/features/fleet/server/owner";
import {
  buildOwnerDataExport,
  type ExportRecord,
  type OwnerDataExport,
  ownerDataExportSchemaVersion,
} from "@/features/account-data/export";
import { AppError } from "@/lib/errors";
import { recordAuditEvent } from "@/server/audit/log";

const exportRowLimit = 10_000;

export async function buildLiveOwnerDataExport(
  context: OwnerDatabaseContext,
  generatedAt = new Date(),
): Promise<OwnerDataExport> {
  await recordAuditEvent(context, {
    eventType: "owner_data_export.requested",
    entityType: "company",
    entityId: context.companyId,
    metadata: { schemaVersion: ownerDataExportSchemaVersion },
  });

  const [
    company,
    ownerProfile,
    assets,
    meterReadings,
    maintenanceTemplates,
    maintenanceRules,
    maintenanceRecords,
    complianceRequirements,
    complianceRecords,
    documents,
    documentVersions,
    notificationPreferences,
    notifications,
    reportPreferences,
    auditEvents,
    subscriptionRecords,
  ] = await Promise.all([
    fetchSingleRecord(
      context,
      "companies",
      "id,company_name,owner_name,phone,email,address,preferred_timezone,preferred_measurement_settings,subscription_status,stripe_customer_id,stripe_subscription_id,created_at,updated_at",
      "id",
      context.companyId,
    ),
    fetchSingleRecord(
      context,
      "profiles",
      "id,full_name,email,company_id,onboarding_status,created_at,updated_at",
      "id",
      context.ownerId,
    ),
    fetchCompanyRows(context, "assets"),
    fetchCompanyRows(context, "meter_readings"),
    fetchMaintenanceTemplates(context),
    fetchCompanyRows(context, "maintenance_rules"),
    fetchCompanyRows(context, "maintenance_records"),
    fetchCompanyRows(context, "compliance_requirements"),
    fetchCompanyRows(context, "compliance_records"),
    fetchCompanyRows(context, "documents"),
    fetchCompanyRows(context, "document_versions"),
    fetchCompanyMaybeSingle(context, "notification_preferences"),
    fetchCompanyRows(context, "notifications"),
    fetchCompanyMaybeSingle(context, "report_preferences"),
    fetchCompanyRows(context, "audit_events"),
    fetchCompanyRows(context, "subscription_records"),
  ]);

  const exportData = buildOwnerDataExport({
    companyId: context.companyId,
    companyName: context.companyName,
    generatedAt,
    company,
    ownerProfile,
    assets,
    meterReadings,
    maintenanceTemplates,
    maintenanceRules,
    maintenanceRecords,
    complianceRequirements,
    complianceRecords,
    documents,
    documentVersions,
    notificationPreferences,
    notifications,
    reportPreferences,
    auditEvents,
    subscriptionRecords,
  });

  await recordAuditEvent(context, {
    eventType: "owner_data_export.completed",
    entityType: "company",
    entityId: context.companyId,
    metadata: {
      schemaVersion: ownerDataExportSchemaVersion,
      format: "json",
    },
  });

  return exportData;
}

export function buildLocalDemoOwnerDataExport(generatedAt = new Date()) {
  const dataset = getLocalDemoDataset();

  return buildOwnerDataExport({
    companyId: localDemoIdentity.companyId,
    companyName: localDemoIdentity.companyName,
    generatedAt,
    company: toRecord(dataset.company),
    ownerProfile: toRecord(dataset.profile),
    assets: toRecordArray(dataset.assets),
    meterReadings: toRecordArray(dataset.meterReadings),
    maintenanceTemplates: toRecordArray(dataset.maintenanceTemplates),
    maintenanceRules: toRecordArray(dataset.maintenanceRules),
    maintenanceRecords: toRecordArray(dataset.maintenanceRecords),
    complianceRequirements: toRecordArray(dataset.complianceRequirements),
    complianceRecords: toRecordArray(dataset.complianceRecords),
    documents: toRecordArray(dataset.documents),
    documentVersions: toRecordArray(dataset.documentVersions),
    notificationPreferences: toRecord(dataset.notificationPreference),
    notifications: toRecordArray(dataset.notifications),
    reportPreferences: toRecord(dataset.reportPreference),
    auditEvents: toRecordArray(dataset.auditEvents),
    subscriptionRecords: toRecordArray([dataset.subscriptionRecord]),
  });
}

async function fetchCompanyRows(
  context: OwnerDatabaseContext,
  table: string,
  select = "*",
) {
  const { data, error } = await context.supabase
    .from(table)
    .select(select)
    .eq("company_id", context.companyId)
    .limit(exportRowLimit);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", "Owner data export could not be prepared.", {
      cause: error,
    });
  }

  return toRecordArray(data);
}

async function fetchCompanyMaybeSingle(
  context: OwnerDatabaseContext,
  table: string,
  select = "*",
) {
  const { data, error } = await context.supabase
    .from(table)
    .select(select)
    .eq("company_id", context.companyId)
    .maybeSingle();

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", "Owner data export could not be prepared.", {
      cause: error,
    });
  }

  return toRecord(data);
}

async function fetchSingleRecord(
  context: OwnerDatabaseContext,
  table: string,
  select: string,
  column: string,
  value: string,
) {
  const { data, error } = await context.supabase
    .from(table)
    .select(select)
    .eq(column, value)
    .maybeSingle();

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", "Owner data export could not be prepared.", {
      cause: error,
    });
  }

  return toRecord(data);
}

async function fetchMaintenanceTemplates(context: OwnerDatabaseContext) {
  const { data, error } = await context.supabase
    .from("maintenance_templates")
    .select("*")
    .or(`company_id.eq.${context.companyId},company_id.is.null`)
    .limit(exportRowLimit);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", "Owner data export could not be prepared.", {
      cause: error,
    });
  }

  return toRecordArray(data);
}

function toRecordArray(value: unknown): ExportRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

function toRecord(value: unknown): ExportRecord | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is ExportRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
