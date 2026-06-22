export const ownerDataExportSchemaVersion = "fleetready-owner-data-export-v1";

export type ExportRecord = Record<string, unknown>;

export type OwnerDataExportInput = {
  companyId: string;
  companyName: string;
  generatedAt: Date;
  company: ExportRecord | null;
  ownerProfile: ExportRecord | null;
  assets: ExportRecord[];
  meterReadings: ExportRecord[];
  maintenanceTemplates: ExportRecord[];
  maintenanceRules: ExportRecord[];
  maintenanceRecords: ExportRecord[];
  complianceRequirements: ExportRecord[];
  complianceRecords: ExportRecord[];
  documents: ExportRecord[];
  documentVersions: ExportRecord[];
  notificationPreferences: ExportRecord | null;
  notifications: ExportRecord[];
  reportPreferences: ExportRecord | null;
  auditEvents: ExportRecord[];
  subscriptionRecords: ExportRecord[];
};

export type OwnerDataExport = {
  schemaVersion: typeof ownerDataExportSchemaVersion;
  generatedAt: string;
  companyId: string;
  companyName: string;
  manifest: {
    format: "json";
    includesUploadedFiles: false;
    uploadedFilesNote: string;
    excludedCategories: string[];
  };
  data: {
    company: ExportRecord | null;
    ownerProfile: ExportRecord | null;
    settings: {
      measurement: unknown;
      notificationPreferences: ExportRecord | null;
      reportPreferences: ExportRecord | null;
    };
    assets: ExportRecord[];
    meterReadings: ExportRecord[];
    maintenanceTemplates: ExportRecord[];
    maintenanceRules: ExportRecord[];
    maintenanceRecords: ExportRecord[];
    complianceRequirements: ExportRecord[];
    complianceRecords: ExportRecord[];
    documents: ExportRecord[];
    documentVersions: ExportRecord[];
    notifications: ExportRecord[];
    auditEvents: ExportRecord[];
    subscriptionRecords: ExportRecord[];
  };
};

const companyFields = [
  "id",
  "company_name",
  "owner_name",
  "phone",
  "email",
  "address",
  "preferred_timezone",
  "preferred_measurement_settings",
  "subscription_status",
  "stripe_customer_id",
  "stripe_subscription_id",
  "created_at",
  "updated_at",
] as const;

const ownerProfileFields = [
  "id",
  "full_name",
  "email",
  "company_id",
  "onboarding_status",
  "created_at",
  "updated_at",
] as const;

const assetFields = [
  "id",
  "company_id",
  "unit_number",
  "asset_name",
  "asset_type",
  "year",
  "make",
  "model",
  "vin_or_serial_number",
  "license_plate",
  "current_mileage",
  "current_engine_hours",
  "purchase_date",
  "purchase_price",
  "status",
  "notes",
  "asset_image_path",
  "created_at",
  "updated_at",
  "archived_at",
] as const;

const meterReadingFields = [
  "id",
  "company_id",
  "asset_id",
  "reading_type",
  "reading_value",
  "reading_date",
  "notes",
  "is_correction",
  "created_at",
] as const;

const maintenanceTemplateFields = [
  "id",
  "company_id",
  "name",
  "description",
  "default_mileage_interval",
  "default_hour_interval",
  "default_calendar_interval_days",
  "is_active",
] as const;

const maintenanceRuleFields = [
  "id",
  "company_id",
  "asset_id",
  "template_id",
  "name",
  "description",
  "mileage_interval",
  "hour_interval",
  "calendar_interval_days",
  "last_completed_date",
  "last_completed_mileage",
  "last_completed_hours",
  "next_due_date",
  "next_due_mileage",
  "next_due_hours",
  "reminder_mileage",
  "reminder_hours",
  "reminder_days",
  "is_active",
  "created_at",
  "updated_at",
] as const;

const maintenanceRecordFields = [
  "id",
  "company_id",
  "asset_id",
  "maintenance_rule_id",
  "maintenance_type",
  "completion_date",
  "mileage",
  "engine_hours",
  "service_provider",
  "parts_cost",
  "labor_cost",
  "other_cost",
  "tax_cost",
  "total_cost",
  "notes",
  "created_at",
  "updated_at",
  "archived_at",
] as const;

const complianceRequirementFields = [
  "id",
  "company_id",
  "asset_id",
  "compliance_type",
  "reminder_days",
  "notes",
  "is_active",
  "archived_at",
  "created_at",
  "updated_at",
] as const;

const complianceRecordFields = [
  "id",
  "company_id",
  "asset_id",
  "requirement_id",
  "compliance_type",
  "issuing_organization",
  "identification_number",
  "effective_date",
  "expiration_date",
  "reminder_days",
  "status_override",
  "notes",
  "created_at",
  "updated_at",
  "archived_at",
] as const;

const documentFields = [
  "id",
  "company_id",
  "asset_id",
  "maintenance_record_id",
  "compliance_record_id",
  "document_name",
  "document_type",
  "category",
  "storage_bucket",
  "storage_path",
  "mime_type",
  "file_size",
  "issue_date",
  "expiration_date",
  "document_number",
  "notes",
  "archived_at",
  "created_at",
  "updated_at",
] as const;

const documentVersionFields = [
  "id",
  "company_id",
  "document_id",
  "version_number",
  "storage_bucket",
  "storage_path",
  "mime_type",
  "file_size",
  "change_reason",
  "created_by",
  "created_at",
] as const;

const notificationPreferenceFields = [
  "company_id",
  "email_enabled",
  "maintenance_reminder_days",
  "compliance_reminder_days",
  "document_reminder_days",
  "email_warning_enabled",
  "email_critical_enabled",
  "quiet_hours_start",
  "quiet_hours_end",
  "weekly_summary_enabled",
  "preferred_summary_day",
] as const;

const notificationFields = [
  "id",
  "company_id",
  "asset_id",
  "notification_type",
  "related_entity_type",
  "related_entity_id",
  "severity",
  "title",
  "message",
  "due_date",
  "read_at",
  "resolved_at",
  "email_delivery_status",
  "created_at",
] as const;

const reportPreferenceFields = [
  "id",
  "company_id",
  "default_asset_id",
  "default_lookback_days",
  "show_charts_by_default",
  "created_at",
  "updated_at",
] as const;

const auditEventFields = [
  "id",
  "company_id",
  "actor_user_id",
  "event_type",
  "entity_type",
  "entity_id",
  "metadata",
  "created_at",
] as const;

const subscriptionRecordFields = [
  "id",
  "company_id",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_price_id",
  "plan_key",
  "status",
  "current_period_start",
  "current_period_end",
  "trial_end",
  "cancel_at_period_end",
  "last_payment_status",
  "restricted_at",
  "updated_from_stripe_at",
  "asset_limit",
  "created_at",
  "updated_at",
] as const;

export function buildOwnerDataExport(input: OwnerDataExportInput): OwnerDataExport {
  return {
    schemaVersion: ownerDataExportSchemaVersion,
    generatedAt: input.generatedAt.toISOString(),
    companyId: input.companyId,
    companyName: input.companyName,
    manifest: {
      format: "json",
      includesUploadedFiles: false,
      uploadedFilesNote:
        "Uploaded document and image files are not embedded in this JSON export. Document and file metadata are included so a file retrieval workflow can be reconciled separately.",
      excludedCategories: [
        "Supabase service-role keys and authentication tokens",
        "Stripe webhook payloads and provider secrets",
        "Private signed URLs and document file contents",
        "Other companies' tenant data",
        "Internal diagnostics and server logs",
      ],
    },
    data: {
      company: filterSingleCompanyRecord(input.company, input.companyId, companyFields),
      ownerProfile: filterOwnerProfile(input.ownerProfile, input.companyId),
      settings: {
        measurement: input.company?.preferred_measurement_settings ?? null,
        notificationPreferences: filterSingleCompanyRecord(
          input.notificationPreferences,
          input.companyId,
          notificationPreferenceFields,
        ),
        reportPreferences: filterSingleCompanyRecord(
          input.reportPreferences,
          input.companyId,
          reportPreferenceFields,
        ),
      },
      assets: filterCompanyRecords(input.assets, input.companyId, assetFields),
      meterReadings: filterCompanyRecords(
        input.meterReadings,
        input.companyId,
        meterReadingFields,
      ),
      maintenanceTemplates: filterCompanyRecords(
        input.maintenanceTemplates,
        input.companyId,
        maintenanceTemplateFields,
        { includeSystemTemplates: true },
      ),
      maintenanceRules: filterCompanyRecords(
        input.maintenanceRules,
        input.companyId,
        maintenanceRuleFields,
      ),
      maintenanceRecords: filterCompanyRecords(
        input.maintenanceRecords,
        input.companyId,
        maintenanceRecordFields,
      ),
      complianceRequirements: filterCompanyRecords(
        input.complianceRequirements,
        input.companyId,
        complianceRequirementFields,
      ),
      complianceRecords: filterCompanyRecords(
        input.complianceRecords,
        input.companyId,
        complianceRecordFields,
      ),
      documents: filterCompanyRecords(input.documents, input.companyId, documentFields),
      documentVersions: filterCompanyRecords(
        input.documentVersions,
        input.companyId,
        documentVersionFields,
      ),
      notifications: filterCompanyRecords(
        input.notifications,
        input.companyId,
        notificationFields,
      ),
      auditEvents: filterCompanyRecords(input.auditEvents, input.companyId, auditEventFields),
      subscriptionRecords: filterCompanyRecords(
        input.subscriptionRecords,
        input.companyId,
        subscriptionRecordFields,
      ),
    },
  };
}

export function buildOwnerDataExportFilename(companyName: string, generatedAt: Date) {
  const date = generatedAt.toISOString().slice(0, 10);
  const slug = slugify(companyName) || "maintly-company";

  return `${slug}-${date}-owner-data-export-v1.json`;
}

function filterCompanyRecords(
  records: ExportRecord[],
  companyId: string,
  fields: readonly string[],
  options: { includeSystemTemplates?: boolean } = {},
) {
  return records
    .filter((record) => {
      const recordCompanyId = record.company_id;

      if (recordCompanyId === companyId) {
        return true;
      }

      return options.includeSystemTemplates === true && recordCompanyId === null;
    })
    .map((record) => pickFields(record, fields));
}

function filterSingleCompanyRecord(
  record: ExportRecord | null,
  companyId: string,
  fields: readonly string[],
) {
  if (!record) {
    return null;
  }

  const recordId = record.id;
  const recordCompanyId = record.company_id;

  if (recordId !== companyId && recordCompanyId !== companyId) {
    return null;
  }

  return pickFields(record, fields);
}

function filterOwnerProfile(record: ExportRecord | null, companyId: string) {
  if (!record || record.company_id !== companyId) {
    return null;
  }

  return pickFields(record, ownerProfileFields);
}

function pickFields(record: ExportRecord, fields: readonly string[]) {
  return fields.reduce<ExportRecord>((result, field) => {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      result[field] = record[field];
    }

    return result;
  }, {});
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
