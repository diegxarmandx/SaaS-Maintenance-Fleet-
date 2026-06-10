import { describe, expect, it } from "vitest";

import {
  applyMeterReadingSnapshot,
  buildArchiveAssetPayload,
  buildAssetInsertPayload,
  buildAssetUpdatePayload,
  filterAssetsForCompany,
  validateMeterReadingChange,
} from "../src/features/fleet/helpers";
import {
  assetFormSchema,
  meterReadingFormSchema,
} from "../src/features/fleet/validation";
import type { FleetAsset } from "../src/features/fleet/types";

const companyId = "11111111-1111-4111-8111-111111111111";
const otherCompanyId = "99999999-9999-4999-8999-999999999999";
const assetId = "22222222-2222-4222-8222-222222222222";

const assetValues = {
  unitNumber: "T-101",
  assetName: "Service Truck 101",
  assetType: "Truck",
  year: "2022",
  make: "Ford",
  model: "F-250",
  vinOrSerialNumber: "1FT7X2B60LEE00001",
  licensePlate: "PR-101",
  currentMileage: "45210",
  currentEngineHours: "1350",
  purchaseDate: "2022-01-15",
  purchasePrice: "42000",
  status: "active",
  notes: "Owner-operated service truck.",
};

const baseAsset: FleetAsset = {
  id: assetId,
  company_id: companyId,
  unit_number: "T-101",
  asset_name: "Service Truck 101",
  asset_type: "Truck",
  year: 2022,
  make: "Ford",
  model: "F-250",
  vin_or_serial_number: "1FT7X2B60LEE00001",
  license_plate: "PR-101",
  current_mileage: 45210,
  current_engine_hours: 1350,
  purchase_date: "2022-01-15",
  purchase_price: 42000,
  status: "active",
  notes: "Owner-operated service truck.",
  asset_image_path: null,
  created_at: "2026-06-10T00:00:00Z",
  updated_at: "2026-06-10T00:00:00Z",
  archived_at: null,
};

describe("fleet asset validation and payloads", () => {
  it("accepts owner-facing default asset types", () => {
    const parsed = assetFormSchema.safeParse(assetValues);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.assetType).toBe("Truck");
      expect(parsed.data.currentMileage).toBe(45210);
    }
  });

  it("rejects negative meters and costs", () => {
    const parsed = assetFormSchema.safeParse({
      ...assetValues,
      currentMileage: "-1",
      currentEngineHours: "-2",
      purchasePrice: "-3",
    });

    expect(parsed.success).toBe(false);
  });

  it("builds company-scoped asset create and edit payloads", () => {
    const parsed = assetFormSchema.parse(assetValues);
    const insertPayload = buildAssetInsertPayload(
      companyId,
      assetId,
      parsed,
      `${companyId}/assets/${assetId}/truck.webp`,
    );
    const updatePayload = buildAssetUpdatePayload(parsed, insertPayload.asset_image_path);

    expect(insertPayload.company_id).toBe(companyId);
    expect(insertPayload.asset_type).toBe("Truck");
    expect(insertPayload.asset_image_path).toContain(`${companyId}/assets/${assetId}`);
    expect(updatePayload.unit_number).toBe("T-101");
    expect(updatePayload.purchase_price).toBe(42000);
  });

  it("archives assets instead of preparing a destructive delete", () => {
    const payload = buildArchiveAssetPayload();

    expect(payload.status).toBe("archived");
    expect(new Date(payload.archived_at).toString()).not.toBe("Invalid Date");
  });

  it("filters assets by tenant company", () => {
    const visibleAssets = filterAssetsForCompany(
      [
        baseAsset,
        {
          ...baseAsset,
          id: "33333333-3333-4333-8333-333333333333",
          company_id: otherCompanyId,
        },
      ],
      companyId,
    );

    expect(visibleAssets).toHaveLength(1);
    expect(visibleAssets[0]?.company_id).toBe(companyId);
  });
});

describe("meter reading updates", () => {
  it("accepts increasing mileage readings", () => {
    const reading = meterReadingFormSchema.parse({
      readingType: "mileage",
      readingValue: "46000",
      readingDate: "2026-06-10",
      notes: "",
      isCorrection: false,
    });

    const result = applyMeterReadingSnapshot(baseAsset, reading);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.currentMileage).toBe(46000);
      expect(result.currentEngineHours).toBe(1350);
    }
  });

  it("accepts increasing engine-hour readings", () => {
    const reading = meterReadingFormSchema.parse({
      readingType: "engine_hours",
      readingValue: "1400",
      readingDate: "2026-06-10",
      notes: "",
      isCorrection: false,
    });

    const result = applyMeterReadingSnapshot(baseAsset, reading);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.currentMileage).toBe(45210);
      expect(result.currentEngineHours).toBe(1400);
    }
  });

  it("rejects accidental meter decreases", () => {
    const reading = meterReadingFormSchema.parse({
      readingType: "mileage",
      readingValue: "44000",
      readingDate: "2026-06-10",
      notes: "",
      isCorrection: false,
    });

    const result = validateMeterReadingChange({
      reading,
      currentMileage: baseAsset.current_mileage,
      currentEngineHours: baseAsset.current_engine_hours,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("cannot decrease");
  });

  it("requires a note for explicit decreasing corrections", () => {
    const reading = meterReadingFormSchema.parse({
      readingType: "engine_hours",
      readingValue: "1200",
      readingDate: "2026-06-10",
      notes: "",
      isCorrection: true,
    });

    const result = validateMeterReadingChange({
      reading,
      currentMileage: baseAsset.current_mileage,
      currentEngineHours: baseAsset.current_engine_hours,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("correction note");
  });
});
