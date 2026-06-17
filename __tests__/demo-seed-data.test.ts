import { afterEach, describe, expect, it, vi } from "vitest";

import { calculateComplianceStatus } from "../src/features/compliance/status";
import { calculateDocumentStatus } from "../src/features/documents/status";
import { calculateMaintenanceStatus } from "../src/features/maintenance/schedule";

const demoModule = await import("../scripts/demo-seed-data.mjs");

const {
  DEMO_COMPANY_ID,
  DEMO_OWNER_EMAIL,
  assertCanRunDemoSeed,
  buildDemoDataset,
  getDemoResetPlan,
  isProductionLikeEnv,
  summarizeDemoDataset,
} = demoModule;

const baseDate = new Date("2026-06-13T12:00:00.000Z");
const demo = buildDemoDataset({ scenario: "full", baseDate });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("development demo seed data", () => {
  it("builds a fictional owner company with broad connected coverage", () => {
    const summary = summarizeDemoDataset(demo);

    expect(demo.company.id).toBe(DEMO_COMPANY_ID);
    expect(demo.company.email).toBe(DEMO_OWNER_EMAIL);
    expect(demo.company.address).toContain("DEMO ADDRESS");
    expect(summary.assets).toBe(15);
    expect(summary.activeAssets).toBe(13);
    expect(summary.archivedAssets).toBe(2);
    expect(summary.maintenanceRules).toBeGreaterThanOrEqual(12);
    expect(summary.documents).toBeGreaterThanOrEqual(18);
    expect(summary.notifications).toBeGreaterThanOrEqual(7);
  });

  it("uses stable ids without duplicates for idempotent upserts", () => {
    const idSets = [
      demo.assets,
      demo.meterReadings,
      demo.maintenanceTemplates,
      demo.maintenanceRules,
      demo.maintenanceRecords,
      demo.complianceRequirements,
      demo.complianceRecords,
      demo.documents,
      demo.documentVersions,
      demo.notifications,
      demo.auditEvents,
    ].map((rows) => rows.map((row) => row.id));

    for (const ids of idSets) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("keeps current asset meter values aligned with newest seeded readings", () => {
    for (const asset of demo.assets.filter(
      (candidate) => candidate.status !== "archived",
    )) {
      const mileageReadings = demo.meterReadings
        .filter(
          (reading) =>
            reading.asset_id === asset.id && reading.reading_type === "mileage",
        )
        .sort((left, right) => left.reading_date.localeCompare(right.reading_date));
      const hourReadings = demo.meterReadings
        .filter(
          (reading) =>
            reading.asset_id === asset.id && reading.reading_type === "engine_hours",
        )
        .sort((left, right) => left.reading_date.localeCompare(right.reading_date));

      if (mileageReadings.length > 0) {
        expect(mileageReadings.at(-1)?.reading_value).toBe(asset.current_mileage);
      }

      if (hourReadings.length > 0) {
        expect(hourReadings.at(-1)?.reading_value).toBe(asset.current_engine_hours);
      }
    }
  });

  it("represents current, due-soon, and overdue maintenance states", () => {
    const assetsById = new Map(demo.assets.map((asset) => [asset.id, asset]));
    const statuses = new Set(
      demo.maintenanceRules.map((rule) => {
        const asset = assetsById.get(rule.asset_id);
        return calculateMaintenanceStatus({
          isActive: rule.is_active,
          currentMileage: Number(asset?.current_mileage ?? 0),
          currentEngineHours: Number(asset?.current_engine_hours ?? 0),
          nextDueDate: rule.next_due_date,
          nextDueMileage: rule.next_due_mileage,
          nextDueHours: rule.next_due_hours,
          reminderDays: rule.reminder_days,
          reminderMileage: rule.reminder_mileage,
          reminderHours: rule.reminder_hours,
          timezone: "America/Puerto_Rico",
          now: baseDate,
        }).status;
      }),
    );

    expect(statuses.has("Current")).toBe(true);
    expect(statuses.has("Due soon")).toBe(true);
    expect(statuses.has("Overdue")).toBe(true);
  });

  it("represents current, expiring, expired, missing, and archived compliance states", () => {
    const recordsByRequirement = new Map(
      demo.complianceRecords
        .filter((record) => record.requirement_id)
        .map((record) => [record.requirement_id, record]),
    );
    const statuses = new Set(
      demo.complianceRequirements.map((requirement) => {
        const record = recordsByRequirement.get(requirement.id);
        return calculateComplianceStatus({
          isArchived: Boolean(record?.archived_at ?? requirement.archived_at),
          isRequired: requirement.is_active,
          hasValidRecord: Boolean(record && !record.archived_at),
          expirationDate: record?.expiration_date ?? null,
          reminderDays: record?.reminder_days ?? requirement.reminder_days,
          timezone: "America/Puerto_Rico",
          now: baseDate,
        }).status;
      }),
    );

    expect(statuses.has("Current")).toBe(true);
    expect(statuses.has("Expiring soon")).toBe(true);
    expect(statuses.has("Expired")).toBe(true);
    expect(statuses.has("Missing")).toBe(true);
    expect(statuses.has("Archived")).toBe(true);
  });

  it("represents current, expiring, expired, and archived document states", () => {
    const statuses = new Set(
      demo.documents.map(
        (document) =>
          calculateDocumentStatus({
            archivedAt: document.archived_at,
            expirationDate: document.expiration_date,
            reminderDays: 45,
            timezone: "America/Puerto_Rico",
            now: baseDate,
          }).status,
      ),
    );

    expect(statuses.has("Current")).toBe(true);
    expect(statuses.has("Expiring soon")).toBe(true);
    expect(statuses.has("Expired")).toBe(true);
    expect(statuses.has("Archived")).toBe(true);
  });

  it("links notifications to valid seeded entities", () => {
    const entityIds = new Set([
      ...demo.assets.map((row) => row.id),
      ...demo.maintenanceRules.map((row) => row.id),
      ...demo.complianceRequirements.map((row) => row.id),
      ...demo.complianceRecords.map((row) => row.id),
      ...demo.documents.map((row) => row.id),
    ]);

    for (const notification of demo.notifications) {
      expect(notification.company_id).toBe(DEMO_COMPANY_ID);
      expect(entityIds.has(notification.related_entity_id)).toBe(true);
      expect(notification.notification_key).toContain("demo:");
    }
  });

  it("includes subscription fixtures for asset-limit and billing-state QA", () => {
    expect(demo.subscriptionRecord.status).toBe("active");
    expect(demo.subscriptionRecord.asset_limit).toBe(30);
    expect(demo.subscriptionFixtures.map((fixture) => fixture.expected)).toEqual([
      "full_access",
      "read_only",
      "read_only_over_limit",
      "over_limit",
    ]);
  });

  it("defines a reset plan scoped to the fictional demo company only", () => {
    const resetPlan = getDemoResetPlan();

    expect(resetPlan.companyId).toBe(DEMO_COMPANY_ID);
    expect(resetPlan.ownerEmails).toContain(DEMO_OWNER_EMAIL);
    expect(resetPlan.storagePrefix).toBe(DEMO_COMPANY_ID);
  });

  it("blocks production-like environments and requires explicit development intent", () => {
    expect(isProductionLikeEnv({ NODE_ENV: "production" })).toBe(true);
    expect(() => assertCanRunDemoSeed({ NODE_ENV: "development" })).toThrow(
      /DEMO_SEED_ALLOW/,
    );
    expect(() =>
      assertCanRunDemoSeed({ NODE_ENV: "development", DEMO_SEED_ALLOW: "1" }),
    ).not.toThrow();
    expect(() =>
      assertCanRunDemoSeed(
        {
          NODE_ENV: "development",
          DEMO_SEED_ALLOW: "1",
          DEMO_SEED_RESET: "nope",
        },
        { reset: true },
      ),
    ).toThrow(/DEMO_SEED_RESET/);
  });
});

describe("automatic local demo data", () => {
  it("stays hidden by default when Supabase is not configured", async () => {
    vi.stubEnv("ENABLE_LOCAL_DEMO", "0");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.resetModules();

    const { getDashboardData } = await import("../src/features/dashboard/server/queries");
    const { getDocumentLibrary } =
      await import("../src/features/documents/server/queries");
    const { listFleetAssets } = await import("../src/features/fleet/server/queries");
    const { getReportData } = await import("../src/features/reports/server/queries");

    const [dashboard, documents, fleet, reports] = await Promise.all([
      getDashboardData(),
      getDocumentLibrary({}),
      listFleetAssets({}),
      getReportData({}),
    ]);

    expect(dashboard.isConfigured).toBe(false);
    expect(dashboard.summary.totalActiveAssets).toBe(0);
    expect(dashboard.attentionItems).toEqual([]);
    expect(documents.isConfigured).toBe(false);
    expect(documents.documents).toEqual([]);
    expect(fleet.isConfigured).toBe(false);
    expect(fleet.assets).toEqual([]);
    expect(reports.isConfigured).toBe(false);
    expect(reports.assetHistory).toEqual([]);
  });

  it("populates read-only app screens only when local demo mode is enabled", async () => {
    vi.stubEnv("ENABLE_LOCAL_DEMO", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.resetModules();

    const { getDashboardData } = await import("../src/features/dashboard/server/queries");
    const { getDocumentLibrary } =
      await import("../src/features/documents/server/queries");
    const { listFleetAssets } = await import("../src/features/fleet/server/queries");
    const { getReportData } = await import("../src/features/reports/server/queries");

    const [dashboard, documents, fleet, reports] = await Promise.all([
      getDashboardData(),
      getDocumentLibrary({}),
      listFleetAssets({}),
      getReportData({}),
    ]);

    expect(dashboard.isConfigured).toBe(true);
    expect(dashboard.summary.totalActiveAssets).toBeGreaterThan(0);
    expect(dashboard.attentionItems.length).toBeGreaterThan(0);
    expect(documents.isConfigured).toBe(true);
    expect(documents.documents.length).toBeGreaterThan(0);
    expect(fleet.isConfigured).toBe(true);
    expect(fleet.assets.length).toBeGreaterThan(0);
    expect(reports.isConfigured).toBe(true);
    expect(reports.assetHistory.length).toBeGreaterThan(0);
  });
});
