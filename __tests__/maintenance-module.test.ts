import { describe, expect, it } from "vitest";

import {
  buildMaintenanceRulePayload,
  calculateTotalCost,
  summarizeMaintenanceCosts,
} from "../src/features/maintenance/helpers";
import {
  completedMaintenanceFormSchema,
  maintenanceRuleFormSchema,
} from "../src/features/maintenance/validation";
import type { MaintenanceRecordWithAsset } from "../src/features/maintenance/types";

const companyId = "11111111-1111-4111-8111-111111111111";
const assetId = "22222222-2222-4222-8222-222222222222";

describe("maintenance rule and record helpers", () => {
  it("requires at least one enabled rule interval", () => {
    const parsed = maintenanceRuleFormSchema.safeParse({
      assetId,
      templateId: "",
      name: "Engine oil and filter",
      description: "",
      mileageInterval: "",
      hourInterval: "",
      calendarIntervalDays: "",
      lastCompletedDate: "",
      lastCompletedMileage: "",
      lastCompletedHours: "",
      reminderMileage: "",
      reminderHours: "",
      reminderDays: "14",
      isActive: true,
    });

    expect(parsed.success).toBe(false);
  });

  it("builds next due values from last completed values", () => {
    const values = maintenanceRuleFormSchema.parse({
      assetId,
      templateId: "",
      name: "Engine oil and filter",
      description: "",
      mileageInterval: "5000",
      hourInterval: "250",
      calendarIntervalDays: "180",
      lastCompletedDate: "2026-01-01",
      lastCompletedMileage: "10000",
      lastCompletedHours: "500",
      reminderMileage: "500",
      reminderHours: "25",
      reminderDays: "14",
      isActive: true,
    });

    const payload = buildMaintenanceRulePayload(companyId, values);

    expect(payload.company_id).toBe(companyId);
    expect(payload.next_due_date).toBe("2026-06-30");
    expect(payload.next_due_mileage).toBe(15000);
    expect(payload.next_due_hours).toBe(750);
  });

  it("calculates completed maintenance total costs", () => {
    const values = completedMaintenanceFormSchema.parse({
      assetId,
      maintenanceRuleId: "",
      maintenanceType: "Engine oil and filter",
      completionDate: "2026-06-10",
      mileage: "12000",
      engineHours: "620",
      serviceProvider: "Owner completed",
      partsCost: "80",
      laborCost: "25",
      otherCost: "10",
      taxCost: "5",
      notes: "",
    });

    expect(calculateTotalCost(values)).toBe(120);
  });

  it("summarizes costs by asset and category", () => {
    const records: MaintenanceRecordWithAsset[] = [
      buildRecord("Engine oil and filter", 90, assetId, "T-101"),
      buildRecord("Brake inspection", 40, assetId, "T-101"),
      buildRecord(
        "Engine oil and filter",
        50,
        "33333333-3333-4333-8333-333333333333",
        "TR-7",
      ),
    ];

    const summary = summarizeMaintenanceCosts(records);

    expect(summary.totalCost).toBe(180);
    expect(summary.byAsset[0]?.label).toContain("T-101");
    expect(summary.taxCost).toBe(0);
    expect(summary.byCategory[0]?.category).toBe("Engine oil and filter");
    expect(summary.byCategory[0]?.totalCost).toBe(140);
  });
});

function buildRecord(
  maintenanceType: string,
  totalCost: number,
  recordAssetId: string,
  unitNumber: string,
): MaintenanceRecordWithAsset {
  return {
    id: crypto.randomUUID(),
    company_id: companyId,
    asset_id: recordAssetId,
    maintenance_rule_id: null,
    maintenance_type: maintenanceType,
    completion_date: "2026-06-10",
    mileage: null,
    engine_hours: null,
    service_provider: "Owner completed",
    parts_cost: totalCost,
    labor_cost: 0,
    other_cost: 0,
    tax_cost: 0,
    total_cost: totalCost,
    notes: null,
    archived_at: null,
    created_at: "2026-06-10T00:00:00Z",
    updated_at: "2026-06-10T00:00:00Z",
    asset: {
      id: recordAssetId,
      unit_number: unitNumber,
      asset_name: "Demo asset",
      asset_type: "Truck",
      current_mileage: 12000,
      current_engine_hours: 600,
    },
    attachment: null,
  };
}
