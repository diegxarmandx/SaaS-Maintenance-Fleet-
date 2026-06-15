import { createHash } from "node:crypto";

import { serverEnv } from "@/lib/env/server";
import type { RateLimitPolicyName } from "@/lib/rate-limit/policies";

const developmentSalt = "fleetready-local-rate-limit-salt";
const unknownIp = "unknown-ip";

export function normalizeRateLimitEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashRateLimitValue(value: string, purpose = "key") {
  const salt =
    serverEnv.RATE_LIMIT_KEY_SALT ??
    (serverEnv.NODE_ENV === "production" ? "" : developmentSalt);

  return createHash("sha256")
    .update(`${purpose}:${salt}:${value}`)
    .digest("hex")
    .slice(0, 40);
}

export function buildIpRateLimitKey(policyName: RateLimitPolicyName, ipAddress: string) {
  return buildRateLimitKey(policyName, [
    { label: "ip", value: normalizeClientIp(ipAddress) },
  ]);
}

export function buildAuthRateLimitKey(
  policyName: Extract<RateLimitPolicyName, "login" | "passwordReset">,
  email: string,
  ipAddress: string,
) {
  return buildRateLimitKey(policyName, [
    { label: "email", value: normalizeRateLimitEmail(email) },
    { label: "ip", value: normalizeClientIp(ipAddress) },
  ]);
}

export function buildUserRateLimitKey(
  policyName: RateLimitPolicyName,
  userId: string,
) {
  return buildRateLimitKey(policyName, [{ label: "user", value: userId }]);
}

export function buildTenantRateLimitKey(
  policyName: RateLimitPolicyName,
  userId: string,
  companyId: string,
) {
  return buildRateLimitKey(policyName, [
    { label: "user", value: userId },
    { label: "company", value: companyId },
  ]);
}

export function buildFleetRateLimitKey(
  policyName: RateLimitPolicyName,
  companyId: string,
) {
  return buildRateLimitKey(policyName, [{ label: "company", value: companyId }]);
}

export function getClientIpFromHeaders(
  headers: Pick<Headers, "get">,
  options: { trustProxyHeaders?: boolean; fallback?: string } = {},
) {
  const trustProxyHeaders =
    options.trustProxyHeaders ?? Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const fallback = options.fallback ?? unknownIp;

  if (!trustProxyHeaders) {
    return normalizeClientIp(fallback);
  }

  return normalizeClientIp(
    firstHeaderValue(headers.get("x-vercel-forwarded-for")) ??
      firstHeaderValue(headers.get("x-forwarded-for")) ??
      firstHeaderValue(headers.get("x-real-ip")) ??
      fallback,
  );
}

function buildRateLimitKey(
  policyName: RateLimitPolicyName,
  segments: Array<{ label: string; value: string }>,
) {
  const hashedSegments = segments.map(
    (segment) => `${segment.label}_${hashRateLimitValue(segment.value, segment.label)}`,
  );

  return ["fleetready", "rl", policyName, ...hashedSegments].join(":");
}

function normalizeClientIp(value: string) {
  const ip = value.trim().replace(/^\[|\]$/g, "");

  return ip || unknownIp;
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}
