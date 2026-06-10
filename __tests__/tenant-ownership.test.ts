import { describe, expect, it } from "vitest";

import {
  assertCompanyAccess,
  assertRecordCompanyAccess,
  canAccessCompany,
  isOnboarded,
  type TenantProfile,
} from "../src/server/tenant/ownership";

const profile: TenantProfile = {
  id: "user-1",
  companyId: "company-1",
  onboardingStatus: "complete",
};

describe("tenant ownership helpers", () => {
  it("allows access only to the profile company", () => {
    expect(canAccessCompany(profile, "company-1")).toBe(true);
    expect(canAccessCompany(profile, "company-2")).toBe(false);
  });

  it("throws on unauthorized cross-company access", () => {
    expect(() => assertCompanyAccess(profile, "company-2")).toThrow(
      "Owner cannot access this company record.",
    );
  });

  it("checks record company ownership", () => {
    expect(() =>
      assertRecordCompanyAccess(profile, { companyId: "company-1" }),
    ).not.toThrow();
    expect(() =>
      assertRecordCompanyAccess(profile, { companyId: "company-2" }),
    ).toThrow();
  });

  it("requires complete onboarding and a company", () => {
    expect(isOnboarded(profile)).toBe(true);
    expect(isOnboarded({ ...profile, companyId: null })).toBe(false);
    expect(isOnboarded({ ...profile, onboardingStatus: "incomplete" })).toBe(false);
  });
});
