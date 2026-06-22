import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260621120000_editable_account_settings.sql",
);

describe("editable account settings migration", () => {
  it("atomically updates only the authenticated owner's profile and company name", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("create or replace function public.update_owner_profile_name");
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("update public.profiles");
    expect(sql).toContain("update public.companies");
    expect(sql).toContain("revoke all on function public.update_owner_profile_name");
    expect(sql).toContain("grant execute on function public.update_owner_profile_name");
    expect(sql).toContain("to authenticated");
  });
});
