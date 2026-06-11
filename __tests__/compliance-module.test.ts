import { describe, expect, it } from "vitest";

import {
  buildComplianceRecordUpdatePayload,
  buildComplianceRequirementPayload,
} from "../src/features/compliance/helpers";
import {
  complianceRecordFormSchema,
  complianceRequirementFormSchema,
  isDefaultComplianceType,
} from "../src/features/compliance/validation";

const companyId = "11111111-1111-4111-8111-111111111111";
const assetId = "22222222-2222-4222-8222-222222222222";

describe("compliance module helpers", () => {
  it("accepts default and custom compliance types", () => {
    expect(isDefaultComplianceType("Vehicle registration")).toBe(true);
    expect(isDefaultComplianceType("Custom crane annual")).toBe(false);
  });

  it("validates and builds assigned requirement payloads", () => {
    const values = complianceRequirementFormSchema.parse({
      assetId,
      complianceType: "Safety inspection",
      reminderDays: "30",
      notes: "",
    });

    const payload = buildComplianceRequirementPayload(companyId, values);

    expect(payload.company_id).toBe(companyId);
    expect(payload.asset_id).toBe(assetId);
    expect(payload.is_active).toBe(true);
  });

  it("validates and builds compliance record correction payloads", () => {
    const values = complianceRecordFormSchema.parse({
      assetId,
      requirementId: "",
      complianceType: "Insurance",
      issuingOrganization: "Harbor Mutual",
      identificationNumber: "POL-2026",
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
      reminderDays: "45",
      notes: "",
    });

    const payload = buildComplianceRecordUpdatePayload(values);

    expect(payload.asset_id).toBe(assetId);
    expect(payload.compliance_type).toBe("Insurance");
    expect(payload.identification_number).toBe("POL-2026");
    expect(payload.reminder_days).toBe(45);
  });
});
