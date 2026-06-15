import { describe, expect, it } from "vitest";

import {
  checkRateLimit,
  createRateLimitHeaders,
  rateLimitedMessage,
  type RateLimitStore,
  type RateLimitStoreResult,
} from "../src/lib/rate-limit/core";
import {
  buildAuthRateLimitKey,
  buildTenantRateLimitKey,
  getClientIpFromHeaders,
  normalizeRateLimitEmail,
} from "../src/lib/rate-limit/identity";
import type { RateLimitPolicy } from "../src/lib/rate-limit/policies";
import {
  genericPasswordResetMessage,
  genericSignInErrorMessage,
  genericSignUpErrorMessage,
} from "../src/features/auth/messages";

class TestRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; reset: number }>();
  private readonly now = Date.now();

  async limit(key: string, policy: RateLimitPolicy): Promise<RateLimitStoreResult> {
    const existing = this.buckets.get(key);
    const reset = existing?.reset ?? this.now + policy.windowSeconds * 1000;
    const count = (existing?.count ?? 0) + 1;

    this.buckets.set(key, { count, reset });

    return {
      success: count <= policy.limit,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - count),
      reset,
    };
  }
}

describe("rate-limit utility", () => {
  it("allows requests below a policy limit and blocks requests over it", async () => {
    const store = new TestRateLimitStore();
    const key = "test-login-key";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await checkRateLimit("login", key, store);
      expect(result.success).toBe(true);
    }

    const blocked = await checkRateLimit("login", key, store);
    const headers = createRateLimitHeaders(blocked);

    expect(blocked.success).toBe(false);
    expect(headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(headers.get("RateLimit-Limit")).toBe("5");
    expect(headers.get("RateLimit-Remaining")).toBe("0");
  });

  it("separates tenant-scoped limits by owner and fleet account", async () => {
    const store = new TestRateLimitStore();
    const ownerId = "11111111-1111-4111-8111-111111111111";
    const firstFleetKey = buildTenantRateLimitKey(
      "documentUpload",
      ownerId,
      "22222222-2222-4222-8222-222222222222",
    );
    const secondFleetKey = buildTenantRateLimitKey(
      "documentUpload",
      ownerId,
      "33333333-3333-4333-8333-333333333333",
    );

    for (let upload = 0; upload < 10; upload += 1) {
      expect((await checkRateLimit("documentUpload", firstFleetKey, store)).success).toBe(
        true,
      );
    }

    expect((await checkRateLimit("documentUpload", firstFleetKey, store)).success).toBe(
      false,
    );
    expect((await checkRateLimit("documentUpload", secondFleetKey, store)).success).toBe(
      true,
    );
  });

  it("hashes normalized auth identifiers before constructing keys", () => {
    const key = buildAuthRateLimitKey(
      "login",
      " Owner@Example.COM ",
      "203.0.113.10",
    );

    expect(normalizeRateLimitEmail(" Owner@Example.COM ")).toBe("owner@example.com");
    expect(key).not.toContain("owner@example.com");
    expect(key).not.toContain("Owner@Example.COM");
    expect(key).not.toContain("203.0.113.10");
  });

  it("does not trust arbitrary forwarded IP headers outside trusted proxy mode", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.2, 198.51.100.3",
      "x-real-ip": "198.51.100.4",
    });

    expect(
      getClientIpFromHeaders(headers, {
        trustProxyHeaders: false,
        fallback: "unknown-test-ip",
      }),
    ).toBe("unknown-test-ip");
    expect(getClientIpFromHeaders(headers, { trustProxyHeaders: true })).toBe(
      "198.51.100.2",
    );
  });

  it("uses generic auth messages that do not disclose whether an email exists", () => {
    expect(genericSignInErrorMessage).not.toMatch(/exists|registered|found/i);
    expect(genericSignUpErrorMessage).not.toMatch(/exists|registered|found/i);
    expect(genericPasswordResetMessage).toBe(
      "If the account exists, a password reset link has been sent.",
    );
    expect(rateLimitedMessage).toBe("Too many requests. Try again later.");
  });
});
