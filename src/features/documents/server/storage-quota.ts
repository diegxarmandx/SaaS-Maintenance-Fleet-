import type { OwnerDatabaseContext } from "@/features/fleet/server/owner";

type FleetStorageQuotaInput = {
  context: OwnerDatabaseContext;
  incomingBytes: number;
  storageBucket: string;
};

export async function assertFleetStorageQuotaAvailable({
  incomingBytes,
}: FleetStorageQuotaInput) {
  if (incomingBytes <= 0) {
    return;
  }

  // Implementation point: enforce a per-fleet storage allowance here once
  // subscription-specific storage limits are configured.
  return;
}
