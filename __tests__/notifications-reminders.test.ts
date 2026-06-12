import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "../src/features/notifications/cron-auth";
import {
  isReminderEmailEligible,
  isWithinQuietHours,
} from "../src/features/notifications/service";
import { planNotificationSync } from "../src/features/notifications/sync-plan";

describe("notification reminder processing helpers", () => {
  it("authorizes cron requests with bearer or cron-secret headers only", () => {
    expect(
      isAuthorizedCronRequest(
        new Request("https://example.test", {
          headers: { authorization: "Bearer expected-secret" },
        }),
        "expected-secret",
      ),
    ).toBe(true);
    expect(
      isAuthorizedCronRequest(
        new Request("https://example.test", {
          headers: { "x-cron-secret": "expected-secret" },
        }),
        "expected-secret",
      ),
    ).toBe(true);
    expect(
      isAuthorizedCronRequest(
        new Request("https://example.test", {
          headers: { authorization: "Bearer wrong-secret" },
        }),
        "expected-secret",
      ),
    ).toBe(false);
  });

  it("plans idempotent notification inserts, updates, and resolutions", () => {
    expect(
      planNotificationSync({
        activeKeys: ["maintenance:overdue:1", "document:expired:1"],
        candidateKeys: ["maintenance:overdue:1", "compliance:missing:2"],
      }),
    ).toEqual({
      insertKeys: ["compliance:missing:2"],
      updateKeys: ["maintenance:overdue:1"],
      resolveKeys: ["document:expired:1"],
    });
  });

  it("respects warning and critical email delivery preferences", () => {
    const preference = {
      email_warning_enabled: false,
      email_critical_enabled: true,
      quiet_hours_start: null,
      quiet_hours_end: null,
    };

    expect(isReminderEmailEligible({ severity: "warning" }, preference)).toBe(false);
    expect(isReminderEmailEligible({ severity: "critical" }, preference)).toBe(true);
  });

  it("detects quiet hours across midnight in the company timezone", () => {
    expect(
      isWithinQuietHours(
        new Date("2026-06-11T02:30:00.000Z"),
        "21:00",
        "06:00",
        "America/Puerto_Rico",
      ),
    ).toBe(true);
    expect(
      isWithinQuietHours(
        new Date("2026-06-11T14:30:00.000Z"),
        "21:00",
        "06:00",
        "America/Puerto_Rico",
      ),
    ).toBe(false);
  });
});
