import { describe, expect, it } from "vitest";

import {
  calculateMaintenanceStatus,
  calculateNextMaintenanceDue,
  getCompanyDateKey,
} from "../src/features/maintenance/schedule";

describe("maintenance status calculations", () => {
  it("calculates date-based due values", () => {
    const due = calculateNextMaintenanceDue({
      lastCompletedDate: "2026-01-01",
      calendarIntervalDays: 180,
    });

    expect(due.nextDueDate?.toISOString()).toBe("2026-06-30T00:00:00.000Z");
  });

  it("marks calendar intervals overdue only after the due date has passed", () => {
    const status = calculateMaintenanceStatus({
      isActive: true,
      currentMileage: 0,
      currentEngineHours: 0,
      nextDueDate: "2026-06-10",
      reminderDays: 14,
      timezone: "America/Puerto_Rico",
      now: new Date("2026-06-11T12:00:00.000Z"),
    });

    expect(status.status).toBe("Overdue");
    expect(status.reasons).toContain("Calendar interval is overdue.");
  });

  it("marks mileage intervals overdue when current mileage reaches next due", () => {
    const status = calculateMaintenanceStatus({
      isActive: true,
      currentMileage: 15000,
      currentEngineHours: 100,
      nextDueMileage: 15000,
      reminderMileage: 500,
      timezone: "UTC",
      now: new Date("2026-06-10T12:00:00.000Z"),
    });

    expect(status.status).toBe("Overdue");
    expect(status.mileageUntilDue).toBe(0);
  });

  it("marks engine-hour intervals overdue when current hours reach next due", () => {
    const status = calculateMaintenanceStatus({
      isActive: true,
      currentMileage: 1000,
      currentEngineHours: 750,
      nextDueHours: 750,
      reminderHours: 25,
      timezone: "UTC",
      now: new Date("2026-06-10T12:00:00.000Z"),
    });

    expect(status.status).toBe("Overdue");
    expect(status.hoursUntilDue).toBe(0);
  });

  it("uses due-soon thresholds before intervals are overdue", () => {
    const status = calculateMaintenanceStatus({
      isActive: true,
      currentMileage: 14520,
      currentEngineHours: 100,
      nextDueMileage: 15000,
      reminderMileage: 500,
      timezone: "UTC",
      now: new Date("2026-06-10T12:00:00.000Z"),
    });

    expect(status.status).toBe("Due soon");
    expect(status.reasons).toContain("Mileage reminder threshold has been reached.");
  });

  it("lets the most urgent combined interval win", () => {
    const status = calculateMaintenanceStatus({
      isActive: true,
      currentMileage: 9500,
      currentEngineHours: 800,
      nextDueDate: "2026-06-20",
      nextDueMileage: 10000,
      nextDueHours: 750,
      reminderDays: 14,
      reminderMileage: 750,
      reminderHours: 50,
      timezone: "UTC",
      now: new Date("2026-06-10T12:00:00.000Z"),
    });

    expect(status.status).toBe("Overdue");
    expect(status.reasons).toContain("Engine-hour interval is overdue.");
  });

  it("uses the company timezone when determining the company date", () => {
    const instant = new Date("2026-06-11T02:30:00.000Z");

    expect(getCompanyDateKey(instant, "America/Puerto_Rico")).toBe("2026-06-10");
    expect(getCompanyDateKey(instant, "UTC")).toBe("2026-06-11");
  });
});
