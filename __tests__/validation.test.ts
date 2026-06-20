import { describe, expect, it } from "vitest";

import { companySchema, profileSchema } from "../src/validation/company";
import { fleetAssetSchema } from "../src/validation/assets";
import { meterReadingSchema } from "../src/validation/readings";
import { completedMaintenanceSchema } from "../src/validation/maintenance";

const companyId = "11111111-1111-4111-8111-111111111111";
const assetId = "22222222-2222-4222-8222-222222222222";

describe("validation schemas", () => {
  it("accepts owner company onboarding data", () => {
    const parsed = companySchema.safeParse({
      companyName: "North Coast Utility Fleet",
      ownerName: "Avery Owner",
      email: "owner@example.com",
      phone: "555-0100",
      address: "100 Harbor Road",
    });

    expect(parsed.success).toBe(true);
  });

  it("allows profiles to be incomplete before company onboarding", () => {
    const parsed = profileSchema.safeParse({
      id: "33333333-3333-4333-8333-333333333333",
      fullName: "Avery Owner",
      email: "owner@example.com",
      companyId: null,
      onboardingStatus: "incomplete",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects negative asset meter and purchase values", () => {
    const parsed = fleetAssetSchema.safeParse({
      companyId,
      type: "vehicle",
      unitNumber: "T-101",
      assetName: "Truck 101",
      currentMileage: -1,
      currentEngineHours: 0,
      purchasePrice: -5,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects negative meter readings", () => {
    const parsed = meterReadingSchema.safeParse({
      companyId,
      assetId,
      readingType: "mileage",
      readingValue: -10,
      readingDate: "2026-06-10",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects negative maintenance costs", () => {
    const parsed = completedMaintenanceSchema.safeParse({
      companyId,
      assetId,
      maintenanceType: "Oil service",
      completionDate: "2026-06-10",
      partsCost: 10,
      laborCost: 1,
      otherCost: 0,
      taxCost: -1,
    });

    expect(parsed.success).toBe(false);
  });
});
