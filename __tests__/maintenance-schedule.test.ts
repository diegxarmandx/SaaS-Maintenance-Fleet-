import { describe, expect, it } from "vitest";

import { calculateNextMaintenanceDue } from "../src/features/maintenance/schedule";

describe("maintenance interval calculations", () => {
  it("calculates mileage, hour, and calendar due values", () => {
    const due = calculateNextMaintenanceDue({
      lastCompletedDate: new Date("2026-01-01T00:00:00.000Z"),
      lastCompletedMileage: 10000,
      lastCompletedHours: 500,
      mileageInterval: 5000,
      hourInterval: 250,
      calendarIntervalDays: 180,
    });

    expect(due.nextDueMileage).toBe(15000);
    expect(due.nextDueHours).toBe(750);
    expect(due.nextDueDate?.toISOString()).toBe("2026-06-30T00:00:00.000Z");
  });

  it("returns null for intervals without a baseline", () => {
    const due = calculateNextMaintenanceDue({
      mileageInterval: 5000,
      hourInterval: 250,
      calendarIntervalDays: 180,
    });

    expect(due).toEqual({
      nextDueDate: null,
      nextDueMileage: null,
      nextDueHours: null,
    });
  });
});
