export type MaintenanceStatus = "Current" | "Due soon" | "Overdue";

export type MaintenanceIntervalInput = {
  lastCompletedDate?: Date | string | null;
  lastCompletedMileage?: number | null;
  lastCompletedHours?: number | null;
  mileageInterval?: number | null;
  hourInterval?: number | null;
  calendarIntervalDays?: number | null;
};

export type MaintenanceDueOutput = {
  nextDueDate: Date | null;
  nextDueMileage: number | null;
  nextDueHours: number | null;
};

export type MaintenanceStatusInput = {
  isActive: boolean;
  currentMileage: number;
  currentEngineHours: number;
  nextDueDate?: string | Date | null;
  nextDueMileage?: number | null;
  nextDueHours?: number | null;
  reminderDays?: number | null;
  reminderMileage?: number | null;
  reminderHours?: number | null;
  timezone: string;
  now?: Date | undefined;
};

export type MaintenanceStatusOutput = {
  status: MaintenanceStatus;
  reasons: string[];
  daysUntilDue: number | null;
  mileageUntilDue: number | null;
  hoursUntilDue: number | null;
};

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function calculateNextMaintenanceDue({
  lastCompletedDate,
  lastCompletedMileage,
  lastCompletedHours,
  mileageInterval,
  hourInterval,
  calendarIntervalDays,
}: MaintenanceIntervalInput): MaintenanceDueOutput {
  const completionDate = normalizeDate(lastCompletedDate);

  return {
    nextDueDate:
      completionDate && calendarIntervalDays
        ? new Date(completionDate.getTime() + calendarIntervalDays * millisecondsPerDay)
        : null,
    nextDueMileage:
      typeof lastCompletedMileage === "number" && mileageInterval
        ? lastCompletedMileage + mileageInterval
        : null,
    nextDueHours:
      typeof lastCompletedHours === "number" && hourInterval
        ? lastCompletedHours + hourInterval
        : null,
  };
}

export function calculateMaintenanceStatus({
  isActive,
  currentMileage,
  currentEngineHours,
  nextDueDate,
  nextDueMileage,
  nextDueHours,
  reminderDays = 14,
  reminderMileage = 0,
  reminderHours = 0,
  timezone,
  now = new Date(),
}: MaintenanceStatusInput): MaintenanceStatusOutput {
  if (!isActive) {
    return {
      status: "Current",
      reasons: ["Rule is inactive."],
      daysUntilDue: null,
      mileageUntilDue: null,
      hoursUntilDue: null,
    };
  }

  const reasons: string[] = [];
  let hasDueSoonSignal = false;
  const daysUntilDue = nextDueDate
    ? daysUntilCompanyDate(nextDueDate, timezone, now)
    : null;
  const mileageUntilDue =
    typeof nextDueMileage === "number" ? nextDueMileage - currentMileage : null;
  const hoursUntilDue =
    typeof nextDueHours === "number" ? nextDueHours - currentEngineHours : null;

  if (daysUntilDue !== null && daysUntilDue < 0) {
    reasons.push("Calendar interval is overdue.");
  }

  if (mileageUntilDue !== null && mileageUntilDue <= 0) {
    reasons.push("Mileage interval is overdue.");
  }

  if (hoursUntilDue !== null && hoursUntilDue <= 0) {
    reasons.push("Engine-hour interval is overdue.");
  }

  if (reasons.length > 0) {
    return {
      status: "Overdue",
      reasons,
      daysUntilDue,
      mileageUntilDue,
      hoursUntilDue,
    };
  }

  if (
    daysUntilDue !== null &&
    daysUntilDue >= 0 &&
    daysUntilDue <= Math.max(reminderDays ?? 0, 0)
  ) {
    hasDueSoonSignal = true;
    reasons.push("Calendar reminder threshold has been reached.");
  }

  if (mileageUntilDue !== null && mileageUntilDue <= Math.max(reminderMileage ?? 0, 0)) {
    hasDueSoonSignal = true;
    reasons.push("Mileage reminder threshold has been reached.");
  }

  if (hoursUntilDue !== null && hoursUntilDue <= Math.max(reminderHours ?? 0, 0)) {
    hasDueSoonSignal = true;
    reasons.push("Engine-hour reminder threshold has been reached.");
  }

  return {
    status: hasDueSoonSignal ? "Due soon" : "Current",
    reasons: hasDueSoonSignal ? reasons : ["All enabled intervals are current."],
    daysUntilDue,
    mileageUntilDue,
    hoursUntilDue,
  };
}

export function compareMaintenanceUrgency(
  left: Pick<
    MaintenanceStatusOutput,
    "status" | "daysUntilDue" | "mileageUntilDue" | "hoursUntilDue"
  >,
  right: Pick<
    MaintenanceStatusOutput,
    "status" | "daysUntilDue" | "mileageUntilDue" | "hoursUntilDue"
  >,
) {
  const statusWeight: Record<MaintenanceStatus, number> = {
    Overdue: 0,
    "Due soon": 1,
    Current: 2,
  };
  const statusDifference = statusWeight[left.status] - statusWeight[right.status];

  if (statusDifference !== 0) {
    return statusDifference;
  }

  return urgencyDistance(left) - urgencyDistance(right);
}

function urgencyDistance(
  value: Pick<
    MaintenanceStatusOutput,
    "daysUntilDue" | "mileageUntilDue" | "hoursUntilDue"
  >,
) {
  const candidates = [
    value.daysUntilDue,
    value.mileageUntilDue,
    value.hoursUntilDue,
  ].filter((candidate): candidate is number => typeof candidate === "number");

  if (candidates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...candidates);
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(`${value}T00:00:00.000Z`);
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

export function getCompanyDateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function dateKeyToUtcDay(dateKey: string) {
  const [year = "1970", month = "01", day = "01"] = dateKey.split("-");
  return Math.floor(
    Date.UTC(Number(year), Number(month) - 1, Number(day)) / millisecondsPerDay,
  );
}
