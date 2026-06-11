import { describe, expect, it } from "vitest";

import {
  calculateComplianceStatus,
  compareComplianceUrgency,
} from "../src/features/compliance/status";

const timezone = "America/Puerto_Rico";
const now = new Date("2026-06-11T12:00:00.000Z");

describe("compliance status calculations", () => {
  it("marks records expired when the expiration date is before today in the company timezone", () => {
    const result = calculateComplianceStatus({
      isRequired: true,
      hasValidRecord: true,
      expirationDate: "2026-06-10",
      reminderDays: 30,
      timezone,
      now,
    });

    expect(result.status).toBe("Expired");
    expect(result.daysUntilExpiration).toBe(-1);
  });

  it("marks records expiring soon inside the configured reminder window", () => {
    const result = calculateComplianceStatus({
      isRequired: true,
      hasValidRecord: true,
      expirationDate: "2026-06-25",
      reminderDays: 30,
      timezone,
      now,
    });

    expect(result.status).toBe("Expiring soon");
    expect(result.daysUntilExpiration).toBe(14);
  });

  it("marks records current outside the reminder window", () => {
    const result = calculateComplianceStatus({
      isRequired: true,
      hasValidRecord: true,
      expirationDate: "2026-09-01",
      reminderDays: 30,
      timezone,
      now,
    });

    expect(result.status).toBe("Current");
  });

  it("marks assigned requirements missing when no valid record or document exists", () => {
    const result = calculateComplianceStatus({
      isRequired: true,
      hasValidRecord: false,
      hasValidDocument: false,
      reminderDays: 30,
      timezone,
      now,
    });

    expect(result.status).toBe("Missing");
  });

  it("lets archived state win over other compliance conditions", () => {
    const result = calculateComplianceStatus({
      isArchived: true,
      isRequired: true,
      hasValidRecord: true,
      expirationDate: "2026-01-01",
      reminderDays: 30,
      timezone,
      now,
    });

    expect(result.status).toBe("Archived");
  });

  it("uses the company timezone for date boundaries", () => {
    const result = calculateComplianceStatus({
      isRequired: true,
      hasValidRecord: true,
      expirationDate: "2026-06-10",
      reminderDays: 0,
      timezone: "Pacific/Honolulu",
      now: new Date("2026-06-11T01:00:00.000Z"),
    });

    expect(result.status).toBe("Expiring soon");
    expect(result.daysUntilExpiration).toBe(0);
  });

  it("sorts the most urgent condition first", () => {
    const statuses = [
      { status: "Current" as const, daysUntilExpiration: 90 },
      { status: "Missing" as const, daysUntilExpiration: null },
      { status: "Expired" as const, daysUntilExpiration: -1 },
      { status: "Expiring soon" as const, daysUntilExpiration: 5 },
    ].sort(compareComplianceUrgency);

    expect(statuses.map((status) => status.status)).toEqual([
      "Expired",
      "Missing",
      "Expiring soon",
      "Current",
    ]);
  });
});
