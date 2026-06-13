export const SUBSCRIPTION_STATUSES = [
  "trial",
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type SubscriptionCapabilitySnapshot = {
  status: SubscriptionStatus;
  activeAssetCount: number;
  assetLimit: number;
};

export type SubscriptionCapabilities = {
  status: SubscriptionStatus;
  isFullAccess: boolean;
  isReadOnly: boolean;
  canAccessBilling: boolean;
  canCreateAssets: boolean;
  canEditRecords: boolean;
  canUploadFiles: boolean;
  canExportReports: boolean;
  isOverAssetLimit: boolean;
  remainingActiveAssets: number;
  reason: string | null;
};

const fullAccessStatuses = new Set<SubscriptionStatus>(["trial", "trialing", "active"]);

const knownStatuses = new Set<SubscriptionStatus>(SUBSCRIPTION_STATUSES);

export function normalizeSubscriptionStatus(
  status: string | null | undefined,
): SubscriptionStatus {
  if (status && knownStatuses.has(status as SubscriptionStatus)) {
    return status as SubscriptionStatus;
  }

  return "incomplete";
}

export function hasFullSubscriptionAccess(status: string | null | undefined) {
  return fullAccessStatuses.has(normalizeSubscriptionStatus(status));
}

export function getSubscriptionCapabilities({
  status,
  activeAssetCount,
  assetLimit,
}: SubscriptionCapabilitySnapshot): SubscriptionCapabilities {
  const normalizedStatus = normalizeSubscriptionStatus(status);
  const isFullAccess = fullAccessStatuses.has(normalizedStatus);
  const remainingActiveAssets = Math.max(assetLimit - activeAssetCount, 0);
  const isOverAssetLimit = activeAssetCount > assetLimit;
  const canCreateAssets = isFullAccess && !isOverAssetLimit && remainingActiveAssets > 0;

  return {
    status: normalizedStatus,
    isFullAccess,
    isReadOnly: !isFullAccess,
    canAccessBilling: true,
    canCreateAssets,
    canEditRecords: isFullAccess,
    canUploadFiles: isFullAccess && !isOverAssetLimit,
    canExportReports: true,
    isOverAssetLimit,
    remainingActiveAssets,
    reason: getSubscriptionRestrictionReason({
      status: normalizedStatus,
      isFullAccess,
      isOverAssetLimit,
      remainingActiveAssets,
      assetLimit,
    }),
  };
}

function getSubscriptionRestrictionReason({
  status,
  isFullAccess,
  isOverAssetLimit,
  remainingActiveAssets,
  assetLimit,
}: {
  status: SubscriptionStatus;
  isFullAccess: boolean;
  isOverAssetLimit: boolean;
  remainingActiveAssets: number;
  assetLimit: number;
}) {
  if (!isFullAccess) {
    return `Subscription status is ${formatSubscriptionStatus(status)}. Billing access remains available, but record changes are restricted until billing is resolved.`;
  }

  if (isOverAssetLimit) {
    return `This workspace has more active assets than the current plan allows. Archive assets or upgrade before adding another active asset.`;
  }

  if (remainingActiveAssets === 0) {
    return `This workspace has reached its ${assetLimit}-asset plan limit. Archive an asset or upgrade before adding another active asset.`;
  }

  return null;
}

export function formatSubscriptionStatus(status: string | null | undefined) {
  const normalized = normalizeSubscriptionStatus(status);

  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
