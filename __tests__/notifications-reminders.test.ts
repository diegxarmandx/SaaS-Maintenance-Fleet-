import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "../src/features/notifications/cron-auth";
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
});
