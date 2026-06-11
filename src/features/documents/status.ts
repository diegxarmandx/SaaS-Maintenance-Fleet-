import { getCompanyDateKey } from "@/features/maintenance/schedule";

export type DocumentStatus = "Current" | "Expiring soon" | "Expired" | "Archived";

export type DocumentStatusInput = {
  archivedAt?: string | null;
  expirationDate?: string | Date | null;
  reminderDays?: number | null;
  timezone: string;
  now?: Date | undefined;
};

export type DocumentStatusOutput = {
  status: DocumentStatus;
  daysUntilExpiration: number | null;
};

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function calculateDocumentStatus({
  archivedAt,
  expirationDate,
  reminderDays = 30,
  timezone,
  now = new Date(),
}: DocumentStatusInput): DocumentStatusOutput {
  if (archivedAt) {
    return { status: "Archived", daysUntilExpiration: null };
  }

  if (!expirationDate) {
    return { status: "Current", daysUntilExpiration: null };
  }

  const daysUntilExpiration = daysUntilCompanyDate(expirationDate, timezone, now);

  if (daysUntilExpiration < 0) {
    return { status: "Expired", daysUntilExpiration };
  }

  if (daysUntilExpiration <= Math.max(reminderDays ?? 0, 0)) {
    return { status: "Expiring soon", daysUntilExpiration };
  }

  return { status: "Current", daysUntilExpiration };
}

function daysUntilCompanyDate(dueDate: string | Date, timezone: string, now: Date) {
  const dueKey = toDateKey(dueDate);
  const todayKey = getCompanyDateKey(now, timezone);

  return dateKeyToUtcDay(dueKey) - dateKeyToUtcDay(todayKey);
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

function dateKeyToUtcDay(dateKey: string) {
  const [year = "1970", month = "01", day = "01"] = dateKey.split("-");

  return Math.floor(
    Date.UTC(Number(year), Number(month) - 1, Number(day)) / millisecondsPerDay,
  );
}
