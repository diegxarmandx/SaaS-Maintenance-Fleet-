import { describe, expect, it } from "vitest";

import {
  calculateReviewedTotal,
  findMeterDecreaseWarnings,
  hasCostMismatch,
  normalizeMaintenanceExtraction,
} from "../src/features/inbox/helpers";
import { aiMaintenanceExtractionSchema } from "../src/features/inbox/validation";

const assetId = "22222222-2222-4222-8222-222222222222";

describe("Maintly Inbox ingestion helpers", () => {
  it("normalizes AI extraction and matches an owner asset", () => {
    const parsed = aiMaintenanceExtractionSchema.parse({
      detectedDocumentType: "Maintenance receipt",
      assetHint: {
        unitNumber: "T-101",
        assetName: null,
        vinOrSerial: null,
        licensePlate: null,
        confidence: 0.95,
        reason: "Unit number visible.",
      },
      maintenanceDate: { value: "2026-06-10", confidence: 0.91 },
      mileage: { value: 12000, confidence: 0.88 },
      engineHours: { value: null, confidence: 0 },
      serviceProvider: { value: "Owner Shop", confidence: 0.82 },
      maintenanceType: { value: "Oil service", confidence: 0.9 },
      notes: { value: "Invoice line items visible.", confidence: 0.7 },
      partsCost: { value: 80, confidence: 0.92 },
      laborCost: { value: 25, confidence: 0.9 },
      otherCost: { value: 0, confidence: 0.9 },
      taxCost: { value: 5, confidence: 0.86 },
      totalCost: { value: 110, confidence: 0.93 },
      overallConfidence: 0.89,
      warnings: [],
    });

    const normalized = normalizeMaintenanceExtraction(parsed, [
      {
        id: assetId,
        unit_number: "T-101",
        asset_name: "Truck 101",
        asset_type: "Truck",
        current_mileage: 12100,
        current_engine_hours: 600,
        vin_or_serial: null,
        license_plate: "ABC123",
        make: "Ford",
        model: "F-650",
      },
    ]);

    expect(normalized.asset.assetId).toBe(assetId);
    expect(normalized.overallConfidence).toBe(0.89);
    expect(normalized.warnings).not.toContain("No asset was matched.");
  });

  it("flags missing asset and low confidence fields", () => {
    const parsed = aiMaintenanceExtractionSchema.parse({
      detectedDocumentType: null,
      assetHint: null,
      maintenanceDate: { value: null, confidence: 0 },
      mileage: { value: null, confidence: 0 },
      engineHours: { value: null, confidence: 0 },
      serviceProvider: { value: null, confidence: 0 },
      maintenanceType: { value: null, confidence: 0 },
      notes: { value: null, confidence: 0 },
      partsCost: { value: 0, confidence: 0.3 },
      laborCost: { value: 0, confidence: 0.3 },
      otherCost: { value: 0, confidence: 0.3 },
      taxCost: { value: 0, confidence: 0.3 },
      totalCost: { value: 0, confidence: 0.3 },
      overallConfidence: 0.4,
      warnings: [],
    });

    const normalized = normalizeMaintenanceExtraction(parsed, []);

    expect(normalized.asset.assetId).toBeNull();
    expect(normalized.warnings).toContain(
      "No asset was matched. Choose the asset before saving.",
    );
    expect(normalized.warnings).toContain(
      "Overall extraction confidence is low. Review every field.",
    );
  });

  it("detects meter decreases and cost mismatch", () => {
    const warnings = findMeterDecreaseWarnings(
      { mileage: "100", engineHours: "40" },
      {
        current_mileage: 120,
        current_engine_hours: 45,
      },
    );

    expect(warnings).toHaveLength(2);
    expect(
      calculateReviewedTotal({
        partsCost: "10",
        laborCost: "5",
        otherCost: "2",
        taxCost: "1",
      }),
    ).toBe(18);
    expect(
      hasCostMismatch({
        detectedDocumentType: "Maintenance receipt",
        asset: { assetId, label: "T-101", confidence: 1, reason: null },
        maintenanceDate: { value: "2026-06-10", confidence: 1 },
        mileage: { value: null, confidence: 0 },
        engineHours: { value: null, confidence: 0 },
        serviceProvider: { value: null, confidence: 0 },
        maintenanceType: { value: "Oil service", confidence: 1 },
        notes: { value: null, confidence: 0 },
        partsCost: { value: 10, confidence: 1 },
        laborCost: { value: 5, confidence: 1 },
        otherCost: { value: 2, confidence: 1 },
        taxCost: { value: 1, confidence: 1 },
        totalCost: { value: 20, confidence: 1 },
        overallConfidence: 1,
        warnings: [],
      }),
    ).toBe(true);
  });
});
