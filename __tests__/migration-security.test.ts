import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL(
    "../supabase/migrations/20260610190000_owner_tenant_security_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

const fleetAssetMigrationSql = readFileSync(
  new URL(
    "../supabase/migrations/20260610210000_fleet_asset_management.sql",
    import.meta.url,
  ),
  "utf8",
);

const maintenanceMigrationSql = readFileSync(
  new URL(
    "../supabase/migrations/20260610230000_preventive_maintenance_module.sql",
    import.meta.url,
  ),
  "utf8",
);

const complianceDocumentsMigrationSql = readFileSync(
  new URL(
    "../supabase/migrations/20260611170000_compliance_and_documents_module.sql",
    import.meta.url,
  ),
  "utf8",
);

const dashboardNotificationsMigrationSql = readFileSync(
  new URL(
    "../supabase/migrations/20260611190000_dashboard_notifications_reports.sql",
    import.meta.url,
  ),
  "utf8",
);

const step7MigrationSql = readFileSync(
  new URL(
    "../supabase/migrations/20260611210000_step7_reporting_notifications_documents.sql",
    import.meta.url,
  ),
  "utf8",
);

const inboxMigrationSql = readFileSync(
  new URL(
    "../supabase/migrations/20260617120000_fleetready_inbox_ingestion.sql",
    import.meta.url,
  ),
  "utf8",
);

const tenantTables = [
  "profiles",
  "companies",
  "assets",
  "meter_readings",
  "maintenance_templates",
  "maintenance_rules",
  "maintenance_records",
  "compliance_records",
  "documents",
  "notifications",
  "subscription_records",
] as const;

describe("database migration security", () => {
  it("creates all required tenant tables", () => {
    tenantTables.forEach((table) => {
      expect(migrationSql).toContain(`create table public.${table}`);
    });
  });

  it("enables row-level security on every tenant-owned table", () => {
    tenantTables.forEach((table) => {
      expect(migrationSql).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(migrationSql).toContain(
        `alter table public.${table} force row level security`,
      );
    });
  });

  it("defines tenant helper functions and company-scoped policies", () => {
    expect(migrationSql).toContain(
      "create or replace function public.current_company_id()",
    );
    expect(migrationSql).toContain(
      "create or replace function public.is_member_of_company",
    );
    expect(migrationSql).toContain("public.is_member_of_company(company_id)");
  });

  it("prevents silent meter rollbacks without correction", () => {
    expect(migrationSql).toContain("create trigger meter_readings_apply_to_asset");
    expect(migrationSql).toContain("cannot decrease without an explicit correction");
    expect(migrationSql).toContain("meter_readings_correction_requires_note");
  });

  it("creates private storage buckets with upload limits and policies", () => {
    [
      "asset-images",
      "maintenance-attachments",
      "compliance-documents",
      "fleet-documents",
    ].forEach((bucket) => {
      expect(migrationSql).toContain(`'${bucket}'`);
    });
    expect(migrationSql).toContain("file_size_limit");
    expect(migrationSql).toContain("allowed_mime_types");
    expect(migrationSql).toContain("create policy storage_company_insert");
  });

  it("uses numeric money fields and nonnegative checks", () => {
    expect(migrationSql).toContain("purchase_price numeric(12, 2)");
    expect(migrationSql).toContain("parts_cost numeric(12, 2)");
    expect(migrationSql).toContain("check (parts_cost >= 0)");
    expect(migrationSql).toContain("check (current_mileage >= 0)");
    expect(inboxMigrationSql).toContain("tax_cost numeric(12, 2)");
    expect(inboxMigrationSql).toContain("check (tax_cost >= 0)");
    expect(inboxMigrationSql).toContain(
      "parts_cost + labor_cost + other_cost + tax_cost",
    );
  });

  it("adds flexible asset types for owner-facing defaults", () => {
    expect(fleetAssetMigrationSql).toContain("alter column asset_type type text");
    expect(fleetAssetMigrationSql).toContain("assets_asset_type_not_blank");
  });

  it("creates an authenticated meter-reading RPC scoped to the owner company", () => {
    expect(fleetAssetMigrationSql).toContain(
      "create or replace function public.create_meter_reading_for_asset",
    );
    expect(fleetAssetMigrationSql).toContain(
      "owner_company_id uuid := public.current_company_id()",
    );
    expect(fleetAssetMigrationSql).toContain("auth.uid() is null");
    expect(fleetAssetMigrationSql).toContain(
      "grant execute on function public.create_meter_reading_for_asset",
    );
  });

  it("seeds system preventive maintenance templates", () => {
    [
      "Engine oil and filter",
      "Fuel filter",
      "Air filter",
      "Transmission service",
      "Annual preventive maintenance",
      "Custom maintenance item",
    ].forEach((templateName) => {
      expect(maintenanceMigrationSql).toContain(templateName);
    });
  });

  it("creates a transactional completed-maintenance RPC scoped to owner company", () => {
    expect(maintenanceMigrationSql).toContain(
      "create or replace function public.complete_maintenance_and_update_rule",
    );
    expect(maintenanceMigrationSql).toContain(
      "owner_company_id uuid := public.current_company_id()",
    );
    expect(maintenanceMigrationSql).toContain("for update");
    expect(maintenanceMigrationSql).toContain("update public.maintenance_rules");
    expect(maintenanceMigrationSql).toContain("insert into public.maintenance_records");
    expect(maintenanceMigrationSql).toContain("insert into public.documents");
  });

  it("adds archive support for maintenance history instead of destructive deletion", () => {
    expect(maintenanceMigrationSql).toContain(
      "add column if not exists archived_at timestamptz",
    );
    expect(maintenanceMigrationSql).toContain("maintenance_records_archived_at_idx");
  });

  it("adds owner-scoped compliance requirements for missing status tracking", () => {
    expect(complianceDocumentsMigrationSql).toContain(
      "create table if not exists public.compliance_requirements",
    );
    expect(complianceDocumentsMigrationSql).toContain(
      "alter table public.compliance_requirements enable row level security",
    );
    expect(complianceDocumentsMigrationSql).toContain(
      "compliance_requirements_owner_access",
    );
    expect(complianceDocumentsMigrationSql).toContain(
      "compliance_requirements_active_unique",
    );
  });

  it("adds compliance archive support and a transactional compliance document RPC", () => {
    expect(complianceDocumentsMigrationSql).toContain(
      "add column if not exists requirement_id uuid",
    );
    expect(complianceDocumentsMigrationSql).toContain(
      "add column if not exists archived_at timestamptz",
    );
    expect(complianceDocumentsMigrationSql).toContain(
      "create or replace function public.create_compliance_record_with_document",
    );
    expect(complianceDocumentsMigrationSql).toContain(
      "owner_company_id uuid := public.current_company_id()",
    );
    expect(complianceDocumentsMigrationSql).toContain(
      "Document path is not scoped to this owner company",
    );
    expect(complianceDocumentsMigrationSql).toContain(
      "grant execute on function public.create_compliance_record_with_document",
    );
  });

  it("stores document bucket metadata and enforces company-scoped paths", () => {
    expect(complianceDocumentsMigrationSql).toContain(
      "add column if not exists document_type text",
    );
    expect(complianceDocumentsMigrationSql).toContain(
      "add column if not exists storage_bucket text",
    );
    expect(complianceDocumentsMigrationSql).toContain("documents_storage_bucket_allowed");
    expect(complianceDocumentsMigrationSql).toContain(
      "documents_storage_path_company_scope",
    );
    expect(complianceDocumentsMigrationSql).toContain("documents_archived_at_idx");
  });

  it("adds owner-scoped notification preferences for reminder settings", () => {
    expect(dashboardNotificationsMigrationSql).toContain(
      "create table if not exists public.notification_preferences",
    );
    expect(dashboardNotificationsMigrationSql).toContain(
      "alter table public.notification_preferences enable row level security",
    );
    expect(dashboardNotificationsMigrationSql).toContain(
      "notification_preferences_owner_access",
    );
    expect(dashboardNotificationsMigrationSql).toContain(
      "preferred_summary_day between 0 and 6",
    );
  });

  it("prevents duplicate active notifications and tracks email delivery attempts", () => {
    expect(dashboardNotificationsMigrationSql).toContain(
      "create unique index if not exists notifications_active_key_unique",
    );
    expect(dashboardNotificationsMigrationSql).toContain("where resolved_at is null");
    expect(dashboardNotificationsMigrationSql).toContain("email_last_attempt_at");
    expect(dashboardNotificationsMigrationSql).toContain("email_attempt_count");
    expect(dashboardNotificationsMigrationSql).toContain("email_sent_at");
  });

  it("adds owner-scoped report preferences for saved report defaults", () => {
    expect(step7MigrationSql).toContain(
      "create table if not exists public.report_preferences",
    );
    expect(step7MigrationSql).toContain(
      "alter table public.report_preferences enable row level security",
    );
    expect(step7MigrationSql).toContain("report_preferences_owner_access");
    expect(step7MigrationSql).toContain("default_lookback_days >= 0");
  });

  it("adds document versions with company-scoped storage paths", () => {
    expect(step7MigrationSql).toContain(
      "create table if not exists public.document_versions",
    );
    expect(step7MigrationSql).toContain("document_versions_storage_path_company_scope");
    expect(step7MigrationSql).toContain(
      "alter table public.document_versions enable row level security",
    );
    expect(step7MigrationSql).toContain("document_versions_owner_access");
  });

  it("adds append-only owner audit event insert and select policies", () => {
    expect(step7MigrationSql).toContain("create table if not exists public.audit_events");
    expect(step7MigrationSql).toContain("audit_events_owner_select");
    expect(step7MigrationSql).toContain("audit_events_owner_insert");
    expect(step7MigrationSql).not.toContain("audit_events_owner_update");
  });

  it("adds owner-scoped Maintly Inbox ingestion audit tables", () => {
    expect(inboxMigrationSql).toContain(
      "create table if not exists public.ingestion_jobs",
    );
    expect(inboxMigrationSql).toContain(
      "create table if not exists public.ingestion_job_events",
    );
    expect(inboxMigrationSql).toContain(
      "alter table public.ingestion_jobs enable row level security",
    );
    expect(inboxMigrationSql).toContain(
      "alter table public.ingestion_jobs force row level security",
    );
    expect(inboxMigrationSql).toContain(
      "alter table public.ingestion_job_events enable row level security",
    );
    expect(inboxMigrationSql).toContain("ingestion_jobs_owner_access");
    expect(inboxMigrationSql).toContain("ingestion_job_events_owner_select");
    expect(inboxMigrationSql).toContain("ingestion_job_events_owner_insert");
    expect(inboxMigrationSql).toContain(
      "split_part(storage_path, '/', 1) = company_id::text",
    );
  });
});
