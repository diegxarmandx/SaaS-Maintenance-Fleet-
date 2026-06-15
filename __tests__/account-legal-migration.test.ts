import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL(
    "../supabase/migrations/20260615120000_account_legal_controls.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("account legal controls migration", () => {
  it("creates deletion requests with all documented statuses", () => {
    expect(migrationSql).toContain("create type public.account_deletion_status");
    [
      "requested",
      "confirmed",
      "processing",
      "completed",
      "failed",
      "canceled",
    ].forEach((status) => {
      expect(migrationSql).toContain(`'${status}'`);
    });
    expect(migrationSql).toContain(
      "create table if not exists public.account_deletion_requests",
    );
  });

  it("stores internal failure reasons without exposing owner update access", () => {
    expect(migrationSql).toContain("failure_reason_internal text");
    expect(migrationSql).not.toContain("for update\nto authenticated");
    expect(migrationSql).not.toContain("for delete\nto authenticated");
  });

  it("enables RLS and tenant-scoped owner insert/select policies", () => {
    expect(migrationSql).toContain(
      "alter table public.account_deletion_requests enable row level security",
    );
    expect(migrationSql).toContain(
      "alter table public.account_deletion_requests force row level security",
    );
    expect(migrationSql).toContain("account_deletion_requests_owner_select");
    expect(migrationSql).toContain("account_deletion_requests_owner_insert");
    expect(migrationSql).toContain("public.is_member_of_company(company_id)");
    expect(migrationSql).toContain("owner_id = auth.uid()");
  });

  it("prevents duplicate active deletion requests", () => {
    expect(migrationSql).toContain(
      "account_deletion_requests_one_active_per_company",
    );
    expect(migrationSql).toContain(
      "where status in ('requested', 'confirmed', 'processing')",
    );
  });
});
