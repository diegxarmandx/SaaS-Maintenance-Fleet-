import { describe, expect, it } from "vitest";

import {
  buildOwnerDataExport,
  buildOwnerDataExportFilename,
  type OwnerDataExportInput,
} from "../src/features/account-data/export";

const baseInput: OwnerDataExportInput = {
  companyId: "company-1",
  companyName: "Acme Fleet, LLC",
  generatedAt: new Date("2026-06-15T12:00:00.000Z"),
  company: {
    id: "company-1",
    company_name: "Acme Fleet, LLC",
    owner_name: "Owner One",
    email: "owner@example.test",
    preferred_measurement_settings: { distanceUnit: "miles" },
    internal_secret: "do-not-export",
  },
  ownerProfile: {
    id: "owner-1",
    company_id: "company-1",
    full_name: "Owner One",
    email: "owner@example.test",
    provider_token: "do-not-export",
  },
  assets: [
    { id: "asset-1", company_id: "company-1", unit_number: "A1" },
    { id: "asset-2", company_id: "company-2", unit_number: "B2" },
  ],
  meterReadings: [],
  maintenanceTemplates: [
    { id: "template-system", company_id: null, name: "Oil change" },
    { id: "template-1", company_id: "company-1", name: "Custom PM" },
  ],
  maintenanceRules: [],
  maintenanceRecords: [],
  complianceRequirements: [],
  complianceRecords: [],
  documents: [
    {
      id: "document-1",
      company_id: "company-1",
      document_name: "Registration",
      storage_path: "company-1/general/document-1/file.pdf",
      signed_url: "do-not-export",
    },
  ],
  documentVersions: [],
  notificationPreferences: { company_id: "company-1", email_enabled: false },
  notifications: [],
  reportPreferences: { company_id: "company-1", default_lookback_days: 90 },
  auditEvents: [
    {
      id: "audit-1",
      company_id: "company-1",
      event_type: "document.uploaded",
      metadata: { documentType: "Registration" },
      internal_stack: "do-not-export",
    },
  ],
  subscriptionRecords: [
    {
      id: "subscription-1",
      company_id: "company-1",
      status: "active",
      asset_limit: 15,
      payload: { webhook: "do-not-export" },
    },
  ],
};

describe("owner data export", () => {
  it("exports the expected categories with a versioned manifest", () => {
    const exportData = buildOwnerDataExport(baseInput);

    expect(exportData.schemaVersion).toBe("fleetready-owner-data-export-v1");
    expect(exportData.generatedAt).toBe("2026-06-15T12:00:00.000Z");
    expect(exportData.manifest.includesUploadedFiles).toBe(false);
    expect(exportData.data.company?.company_name).toBe("Acme Fleet, LLC");
    expect(exportData.data.settings.notificationPreferences).toEqual({
      company_id: "company-1",
      email_enabled: false,
    });
    expect(exportData.data.assets).toHaveLength(1);
    expect(exportData.data.maintenanceTemplates).toHaveLength(2);
    expect(exportData.data.documents).toHaveLength(1);
    expect(exportData.data.auditEvents).toHaveLength(1);
    expect(exportData.data.subscriptionRecords).toHaveLength(1);
  });

  it("filters other-company data and excludes internal-only fields", () => {
    const exportData = buildOwnerDataExport(baseInput);
    const serialized = JSON.stringify(exportData);

    expect(serialized).not.toContain("company-2");
    expect(serialized).not.toContain("internal_secret");
    expect(serialized).not.toContain("provider_token");
    expect(serialized).not.toContain("signed_url");
    expect(serialized).not.toContain("internal_stack");
    expect(serialized).not.toContain("do-not-export");
    expect(serialized).not.toContain('"payload"');
  });

  it("builds deterministic safe filenames", () => {
    expect(
      buildOwnerDataExportFilename(
        "Acme Fleet, LLC",
        new Date("2026-06-15T12:00:00.000Z"),
      ),
    ).toBe("acme-fleet-llc-2026-06-15-owner-data-export-v1.json");
  });
});
