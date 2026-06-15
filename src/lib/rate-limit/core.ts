import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { serverEnv } from "@/lib/env/server";
import {
  getRateLimitPolicy,
  type RateLimitPolicy,
  type RateLimitPolicyName,
} from "@/lib/rate-limit/policies";

export const rateLimitedMessage = "Too many requests. Try again later.";

export type RateLimitStoreResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export type RateLimitStore = {
  limit: (key: string, policy: RateLimitPolicy) => Promise<RateLimitStoreResult>;
};

export type RateLimitResult = RateLimitStoreResult & {
  policy: RateLimitPolicy;
  configured: boolean;
  retryAfter: number;
  reason?: "not_configured" | "store_error";
};

const redisConfigured = Boolean(
  serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN,
);
const hasProductionKeySalt = Boolean(serverEnv.RATE_LIMIT_KEY_SALT);

let upstashStore: RateLimitStore | null = null;
const limiters: Record<string, Ratelimit | undefined> = {};

export function isRateLimitConfigured() {
  return redisConfigured && (serverEnv.NODE_ENV !== "production" || hasProductionKeySalt);
}

export async function checkRateLimit(
  policyName: RateLimitPolicyName,
  key: string,
  store = getDefaultRateLimitStore(),
): Promise<RateLimitResult> {
  const policy = getRateLimitPolicy(policyName);

  if (!store) {
    return missingConfigurationResult(policy);
  }

  try {
    const result = await store.limit(key, policy);
    return normalizeStoreResult(result, policy);
  } catch (error) {
    console.error("Rate limit check failed", {
      policy: policy.name,
      error: error instanceof Error ? error.name : "UnknownError",
    });

    return storeErrorResult(policy);
  }
}

export function createRateLimitHeaders(result: RateLimitResult) {
  const headers = new Headers();
  const resetSeconds = Math.ceil(result.reset / 1000);

  headers.set("RateLimit-Limit", String(result.limit));
  headers.set("RateLimit-Remaining", String(Math.max(0, result.remaining)));
  headers.set("RateLimit-Reset", String(resetSeconds));
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(Math.max(0, result.remaining)));
  headers.set("X-RateLimit-Reset", String(resetSeconds));

  if (!result.success) {
    headers.set("Retry-After", String(result.retryAfter));
  }

  return headers;
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: rateLimitedMessage },
    {
      status: 429,
      headers: createRateLimitHeaders(result),
    },
  );
}

export function assertRateLimitAllowed(result: RateLimitResult) {
  if (result.success) {
    return;
  }

  throw new AppError("RATE_LIMIT_ERROR", rateLimitedMessage, { statusCode: 429 });
}

function getDefaultRateLimitStore() {
  if (!isRateLimitConfigured()) {
    return null;
  }

  upstashStore ??= createUpstashRateLimitStore();

  return upstashStore;
}

function createUpstashRateLimitStore(): RateLimitStore {
  const redis = new Redis({
    url: serverEnv.UPSTASH_REDIS_REST_URL ?? "",
    token: serverEnv.UPSTASH_REDIS_REST_TOKEN ?? "",
  });

  return {
    async limit(key, policy) {
      const limiter =
        limiters[policy.name] ??
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(policy.limit, `${policy.windowSeconds} s`),
          analytics: false,
          prefix: `fleetready:${policy.name}`,
          ephemeralCache: false,
        });
      limiters[policy.name] = limiter;

      const result = await limiter.limit(key);

      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    },
  };
}

function normalizeStoreResult(
  result: RateLimitStoreResult,
  policy: RateLimitPolicy,
): RateLimitResult {
  return {
    ...result,
    policy,
    configured: true,
    retryAfter: retryAfterFromReset(result.reset),
  };
}

function missingConfigurationResult(policy: RateLimitPolicy): RateLimitResult {
  const allowInLocalMode = serverEnv.NODE_ENV !== "production";
  const reset = Date.now() + 60_000;

  return {
    policy,
    configured: false,
    success: allowInLocalMode,
    limit: policy.limit,
    remaining: allowInLocalMode ? policy.limit : 0,
    reset,
    retryAfter: retryAfterFromReset(reset),
    reason: "not_configured",
  };
}

function storeErrorResult(policy: RateLimitPolicy): RateLimitResult {
  const allowInLocalMode = serverEnv.NODE_ENV !== "production";
  const reset = Date.now() + 60_000;

  return {
    policy,
    configured: true,
    success: allowInLocalMode,
    limit: policy.limit,
    remaining: allowInLocalMode ? policy.limit : 0,
    reset,
    retryAfter: retryAfterFromReset(reset),
    reason: "store_error",
  };
}

function retryAfterFromReset(reset: number) {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}
