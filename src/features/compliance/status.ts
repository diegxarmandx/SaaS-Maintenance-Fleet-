import { getCompanyDateKey } from "@/features/maintenance/schedule";

export type ComplianceStatus =
  | "Current"
  | "Expiring soon"
  | "Expired"
  | "Missing"
  | "Archived";

export type ComplianceStatusInput = {
  isArchived?: boolean;
  isRequired?: boolean;
  hasValidRecord?: boolean;
  hasValidDocument?: boolean;
  expirationDate?: string | Date | null;
  reminderDays?: number | null;
  timezone: string;
  now?: Date | undefined;
};

export type ComplianceStatusOutput = {
  status: ComplianceStatus;
  reasons: string[];
  daysUntilExpiration: number | null;
};

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function calculateComplianceStatus({
  isArchived = false,
  isRequired = false,
  hasValidRecord = false,
  hasValidDocument = false,
  expirationDate,
  reminderDays = 30,
  timezone,
  now = new Date(),
}: ComplianceStatusInput): ComplianceStatusOutput {
  if (isArchived) {
    return {
      status: "Archived",
      reasons: ["Compliance record is archived."],
      daysUntilExpiration: null,
    };
  }

  const hasEvidence = hasValidRecord || hasValidDocument;

  if (isRequired && !hasEvidence) {
    return {
      status: "Missing",
      reasons: ["Required compliance item has no valid record or document."],
      daysUntilExpiration: null,
    };
  }

  if (!expirationDate) {
    return {
      status: hasEvidence ? "Current" : "Missing",
      reasons: hasEvidence
        ? ["Compliance evidence is recorded without an expiration date."]
        : ["No compliance evidence is recorded."],
      daysUntilExpiration: null,
    };
  }

  const daysUntilExpiration = daysUntilCompanyDate(expirationDate, timezone, now);

  if (daysUntilExpiration < 0) {
    return {
      status: "Expired",
      reasons: ["Expiration date has passed."],
      daysUntilExpiration,
    };
  }

  if (daysUntilExpiration <= Math.max(reminderDays ?? 0, 0)) {
    return {
      status: "Expiring soon",
      reasons: ["Expiration date is inside the configured reminder period."],
      daysUntilExpiration,
    };
  }

  return {
    status: "Current",
    reasons: ["Compliance evidence is current."],
    daysUntilExpiration,
  };
}

export function compareComplianceUrgency(
  left: Pick<ComplianceStatusOutput, "status" | "daysUntilExpiration">,
  right: Pick<ComplianceStatusOutput, "status" | "daysUntilExpiration">,
) {
  const statusWeight: Record<ComplianceStatus, number> = {
    Expired: 0,
    Missing: 1,
    "Expiring soon": 2,
    Current: 3,
    Archived: 4,
  };
  const statusDifference = statusWeight[left.status] - statusWeight[right.status];

  if (statusDifference !== 0) {
    return statusDifference;
  }

  return (
    expirationDistance(left.daysUntilExpiration) -
    expirationDistance(right.daysUntilExpiration)
  );
}

function expirationDistance(value: number | null) {
  return typeof value === "number" ? value : Number.POSITIVE_INFINITY;
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
