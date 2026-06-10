import { AppError } from "@/lib/errors";

export type TenantProfile = {
  id: string;
  companyId: string | null;
  onboardingStatus: "incomplete" | "complete";
};

export type CompanyScopedRecord = {
  companyId: string;
};

export function canAccessCompany(profile: TenantProfile | null, companyId: string) {
  return Boolean(profile?.companyId && profile.companyId === companyId);
}

export function assertCompanyAccess(profile: TenantProfile | null, companyId: string) {
  if (!canAccessCompany(profile, companyId)) {
    throw new AppError(
      "AUTHORIZATION_ERROR",
      "Owner cannot access this company record.",
      {
        statusCode: 403,
      },
    );
  }
}

export function assertRecordCompanyAccess(
  profile: TenantProfile | null,
  record: CompanyScopedRecord,
) {
  assertCompanyAccess(profile, record.companyId);
}

export function isOnboarded(profile: TenantProfile | null) {
  return Boolean(profile?.companyId && profile.onboardingStatus === "complete");
}
