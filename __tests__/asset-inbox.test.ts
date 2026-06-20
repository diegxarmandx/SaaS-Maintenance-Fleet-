import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildAssetExtractionContext,
  getAssetSection,
  getAssetTimeline,
  getOwnerInboxStatus,
} from "../src/features/inbox/asset-helpers";
import { assetInboxExtractionSchema } from "../src/features/inbox/validation";

describe("asset Inbox helpers", () => {
  it("normalizes asset section navigation", () => {
    expect(getAssetSection("inbox")).toBe("inbox");
    expect(getAssetSection("maintenance")).toBe("maintenance");
    expect(getAssetSection("unknown")).toBe("overview");
    expect(getAssetSection(undefined)).toBe("overview");
  });

  it("maps internal ingestion states to owner-facing states", () => {
    expect(getOwnerInboxStatus("uploaded")).toBe("Pending Review");
    expect(getOwnerInboxStatus("needs_review")).toBe("Pending Review");
    expect(getOwnerInboxStatus("confirmed")).toBe("Completed");
    expect(getOwnerInboxStatus("failed")).toBe("Needs Attention");
    expect(getOwnerInboxStatus("needs_attention")).toBe("Needs Attention");
  });

  it("builds extraction context for the known asset without requesting matching", () => {
    expect(
      buildAssetExtractionContext({
        id: "asset-12",
        unit_number: "Truck #12",
        asset_name: "Delivery Truck",
      }),
    ).toContain("This document belongs to Delivery Truck (Truck #12).");
  });

  it("parses maintenance, compliance, and general extraction fields", () => {
    const parsed = assetInboxExtractionSchema.parse({
      documentCategory: { value: "compliance", confidence: 0.9 },
      documentType: { value: "Insurance", confidence: 0.88 },
      maintenanceDate: { value: null, confidence: 0 },
      mileage: { value: null, confidence: 0 },
      engineHours: { value: null, confidence: 0 },
      serviceProvider: { value: "Example Insurance", confidence: 0.8 },
      maintenanceType: { value: null, confidence: 0 },
      notes: { value: null, confidence: 0 },
      partsCost: { value: 0, confidence: 0 },
      laborCost: { value: 0, confidence: 0 },
      otherCost: { value: 0, confidence: 0 },
      taxCost: { value: 0, confidence: 0 },
      totalCost: { value: 0, confidence: 0 },
      complianceExpirationDate: { value: "2027-06-20", confidence: 0.92 },
      overallConfidence: 0.86,
      warnings: [],
    });

    expect(parsed.documentCategory.value).toBe("compliance");
    expect(parsed.complianceExpirationDate.value).toBe("2027-06-20");
  });

  it("sorts and deduplicates linked timeline activity", () => {
    const timeline = getAssetTimeline({
      meterReadings: [
        {
          id: "meter-1",
          reading_type: "mileage",
          reading_value: 1500,
          reading_date: "2026-06-20",
          notes: null,
        },
      ],
      maintenanceRecords: [
        {
          id: "maintenance-1",
          maintenance_type: "Oil change",
          completion_date: "2026-06-19",
          total_cost: 120,
        },
      ],
      complianceRecords: [],
      documents: [
        {
          id: "document-1",
          document_name: "oil-change.pdf",
          document_type: "Maintenance receipt",
          created_at: "2026-06-19T15:00:00.000Z",
          issue_date: "2026-06-19",
          maintenance_record_id: "maintenance-1",
          compliance_record_id: null,
        },
        {
          id: "document-2",
          document_name: "dashboard-photo.jpg",
          document_type: "Photo",
          created_at: "2026-06-18T15:00:00.000Z",
          issue_date: null,
          maintenance_record_id: null,
          compliance_record_id: null,
        },
      ],
      completedInboxItems: [
        {
          id: "job-1",
          title: "Oil Change Invoice",
          completed_at: "2026-06-19T15:00:00.000Z",
          created_record_type: "maintenance_record",
          created_record_id: "maintenance-1",
        },
        {
          id: "job-2",
          title: "Dashboard Photo",
          completed_at: "2026-06-18T15:00:00.000Z",
          created_record_type: "document",
          created_record_id: "document-2",
        },
      ],
    });

    expect(timeline.map((item) => item.title)).toEqual([
      "Mileage updated",
      "Oil change",
      "Dashboard Photo",
    ]);
  });
});

describe("asset Inbox migration", () => {
  const migrationPath = path.join(
    process.cwd(),
    "supabase/migrations/20260620120000_asset_inbox.sql",
  );

  it("requires asset-scoped ingestion and preserves tenant security", () => {
    const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("needs_attention");
    expect(sql).toContain("upload_note");
    expect(sql).toContain("completed_at");
    expect(sql).toContain("asset_upload");
    expect(sql).toContain("ingestion_jobs_asset_upload_path_scope");
    expect(sql).toContain("split_part(storage_path, '/', 3) = asset_id::text");
    expect(sql).toContain("force row level security");
    expect(sql).toContain("asset_id is not null");
    expect(sql).toContain("complete_asset_inbox_maintenance");
    expect(sql).toContain("complete_asset_inbox_compliance");
    expect(sql).toContain("complete_asset_inbox_document");
  });
});

describe("asset Inbox navigation boundaries", () => {
  it("removes the global Inbox module and keeps Inbox inside asset profiles", () => {
    const navigation = fs.readFileSync(
      path.join(process.cwd(), "src/features/navigation.ts"),
      "utf8",
    );
    const assetProfile = fs.readFileSync(
      path.join(process.cwd(), "src/features/fleet/components/asset-profile-page.tsx"),
      "utf8",
    );

    expect(navigation).not.toContain("inboxModule");
    expect(assetProfile).toContain('inbox: "Inbox"');
    expect(assetProfile).toContain("?section=${item}");
  });
});
