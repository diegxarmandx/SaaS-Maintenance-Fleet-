import "server-only";

import type { AccountDeletionRequestSummary } from "@/features/account-data/deletion";
import type { OwnerDatabaseContext } from "@/features/fleet/server/owner";
import { AppError } from "@/lib/errors";

export async function getAccountDeletionRequestSummary(
  context: OwnerDatabaseContext,
): Promise<AccountDeletionRequestSummary | null> {
  const { data, error } = await context.supabase
    .from("account_deletion_requests")
    .select("id,status,requested_at,confirmed_at,completed_at,canceled_at")
    .eq("company_id", context.companyId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError(
      "DATA_ACCESS_ERROR",
      "Account deletion request status could not be loaded.",
      { cause: error },
    );
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as {
    id: string;
    status: AccountDeletionRequestSummary["status"];
    requested_at: string;
    confirmed_at: string | null;
    completed_at: string | null;
    canceled_at: string | null;
  };

  return {
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at,
    confirmedAt: row.confirmed_at,
    completedAt: row.completed_at,
    canceledAt: row.canceled_at,
  };
}
