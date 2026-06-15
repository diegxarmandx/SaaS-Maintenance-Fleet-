export const accountDeletionStatuses = [
  "requested",
  "confirmed",
  "processing",
  "completed",
  "failed",
  "canceled",
] as const;

export type AccountDeletionStatus = (typeof accountDeletionStatuses)[number];

export const activeAccountDeletionStatuses = [
  "requested",
  "confirmed",
  "processing",
] as const satisfies readonly AccountDeletionStatus[];

export type AccountDeletionRequestSummary = {
  id: string;
  status: AccountDeletionStatus;
  requestedAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
};

export type AccountDeletionEvent =
  | "confirm"
  | "start_processing"
  | "complete"
  | "fail"
  | "cancel"
  | "retry";

export function getDeletionConfirmationPhrase(companyName: string) {
  return companyName.trim();
}

export function isDeletionConfirmationValid({
  confirmation,
  companyName,
}: {
  confirmation: string;
  companyName: string;
}) {
  return confirmation.trim() === getDeletionConfirmationPhrase(companyName);
}

export function transitionAccountDeletionStatus(
  status: AccountDeletionStatus,
  event: AccountDeletionEvent,
): AccountDeletionStatus | null {
  const transitions: Record<AccountDeletionStatus, Partial<Record<AccountDeletionEvent, AccountDeletionStatus>>> = {
    requested: {
      confirm: "confirmed",
      cancel: "canceled",
      start_processing: "processing",
    },
    confirmed: {
      cancel: "canceled",
      start_processing: "processing",
    },
    processing: {
      complete: "completed",
      fail: "failed",
    },
    failed: {
      retry: "processing",
      cancel: "canceled",
    },
    completed: {},
    canceled: {},
  };

  return transitions[status][event] ?? null;
}

export function isActiveAccountDeletionStatus(status: AccountDeletionStatus) {
  return (activeAccountDeletionStatuses as readonly AccountDeletionStatus[]).includes(
    status,
  );
}
