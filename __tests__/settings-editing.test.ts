import { describe, expect, it } from "vitest";

import {
  buildCompanyProfileUpdatePayload,
  buildWorkspacePreferencesUpdatePayload,
  getCompanyProfileFieldsFromFormData,
  getOwnerProfileFieldsFromFormData,
  getWorkspacePreferencesFieldsFromFormData,
  parseMeasurementPreferences,
} from "@/features/settings/helpers";
import {
  companyProfileSchema,
  ownerProfileSchema,
  workspacePreferencesSchema,
} from "@/features/settings/validation";

describe("editable account settings", () => {
  it("normalizes valid company profile values", () => {
    const parsed = companyProfileSchema.parse({
      companyName: "  Northstar Fleet Services LLC ",
      companyEmail: " owner@example.com ",
      phone: " 555-0100 ",
      address: " 100 Fleet Road ",
    });

    expect(parsed).toEqual({
      companyName: "Northstar Fleet Services LLC",
      companyEmail: "owner@example.com",
      phone: "555-0100",
      address: "100 Fleet Road",
    });
    expect(buildCompanyProfileUpdatePayload(parsed)).toEqual({
      company_name: "Northstar Fleet Services LLC",
      email: "owner@example.com",
      phone: "555-0100",
      address: "100 Fleet Road",
    });
  });

  it("preserves submitted company fields after validation", () => {
    const formData = new FormData();
    formData.set("companyName", "Fleet One");
    formData.set("companyEmail", "invalid-email");
    formData.set("phone", "");
    formData.set("address", "");

    expect(getCompanyProfileFieldsFromFormData(formData)).toEqual({
      companyName: "Fleet One",
      companyEmail: "invalid-email",
      phone: "",
      address: "",
    });
    expect(
      companyProfileSchema.safeParse(getCompanyProfileFieldsFromFormData(formData))
        .success,
    ).toBe(false);
  });

  it("requires a useful owner display name", () => {
    expect(ownerProfileSchema.safeParse({ fullName: "A" }).success).toBe(false);

    const formData = new FormData();
    formData.set("fullName", "  Alex Rivera ");
    expect(ownerProfileSchema.parse(getOwnerProfileFieldsFromFormData(formData))).toEqual(
      {
        fullName: "Alex Rivera",
      },
    );
  });

  it("accepts an IANA timezone and normalized measurement preferences", () => {
    const formData = new FormData();
    formData.set("preferredTimezone", "America/Puerto_Rico");
    formData.set("distanceUnit", "kilometers");
    formData.set("engineHourTracking", "on");
    const fields = getWorkspacePreferencesFieldsFromFormData(formData);

    expect(workspacePreferencesSchema.parse(fields)).toEqual({
      preferredTimezone: "America/Puerto_Rico",
      distanceUnit: "kilometers",
      engineHourTracking: true,
    });
    expect(
      buildWorkspacePreferencesUpdatePayload(workspacePreferencesSchema.parse(fields)),
    ).toEqual({
      preferred_timezone: "America/Puerto_Rico",
      preferred_measurement_settings: {
        distanceUnit: "kilometers",
        engineHourTracking: true,
      },
    });
  });

  it("rejects invalid timezones and safely parses stored measurement JSON", () => {
    expect(
      workspacePreferencesSchema.safeParse({
        preferredTimezone: "Mars/Olympus_Mons",
        distanceUnit: "miles",
        engineHourTracking: false,
      }).success,
    ).toBe(false);

    expect(parseMeasurementPreferences(null)).toEqual({
      distanceUnit: "miles",
      engineHourTracking: true,
    });
    expect(
      parseMeasurementPreferences({
        distanceUnit: "kilometers",
        engineHourTracking: false,
      }),
    ).toEqual({
      distanceUnit: "kilometers",
      engineHourTracking: false,
    });
  });
});
