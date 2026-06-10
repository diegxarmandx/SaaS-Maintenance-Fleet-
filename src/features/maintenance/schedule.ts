export type MaintenanceIntervalInput = {
  lastCompletedDate?: Date | null;
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

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function calculateNextMaintenanceDue({
  lastCompletedDate,
  lastCompletedMileage,
  lastCompletedHours,
  mileageInterval,
  hourInterval,
  calendarIntervalDays,
}: MaintenanceIntervalInput): MaintenanceDueOutput {
  return {
    nextDueDate:
      lastCompletedDate && calendarIntervalDays
        ? new Date(
            lastCompletedDate.getTime() + calendarIntervalDays * millisecondsPerDay,
          )
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
