import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL(
    "../supabase/migrations/20260610190000_owner_tenant_security_foundation.sql",
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
  });
});
