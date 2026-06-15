import { headers } from "next/headers";

import type { OwnerDatabaseContext } from "@/features/fleet/server/owner";
import {
  assertRateLimitAllowed,
  checkRateLimit,
  rateLimitResponse,
  rateLimitedMessage,
  type RateLimitResult,
} from "@/lib/rate-limit/core";
import {
  buildAuthRateLimitKey,
  buildFleetRateLimitKey,
  buildIpRateLimitKey,
  buildTenantRateLimitKey,
  buildUserRateLimitKey,
  getClientIpFromHeaders,
} from "@/lib/rate-limit/identity";
import type { RateLimitPolicyName } from "@/lib/rate-limit/policies";

export async function getCurrentRequestIp() {
  return getClientIpFromHeaders(await headers());
}

export async function checkAuthRateLimit(
  policyName: "login" | "passwordReset",
  email: string,
) {
  const ipAddress = await getCurrentRequestIp();

  return checkRateLimit(policyName, buildAuthRateLimitKey(policyName, email, ipAddress));
}

export async function checkIpRateLimit(
  policyName: RateLimitPolicyName,
  ipAddress: string,
) {
  return checkRateLimit(policyName, buildIpRateLimitKey(policyName, ipAddress));
}

export async function checkOwnerUserRateLimit(
  policyName: RateLimitPolicyName,
  ownerId: string,
) {
  return checkRateLimit(policyName, buildUserRateLimitKey(policyName, ownerId));
}

export async function checkOwnerTenantRateLimit(
  policyName: RateLimitPolicyName,
  context: OwnerDatabaseContext,
) {
  return checkRateLimit(
    policyName,
    buildTenantRateLimitKey(policyName, context.ownerId, context.companyId),
  );
}

export async function checkFleetRateLimit(
  policyName: RateLimitPolicyName,
  companyId: string,
) {
  return checkRateLimit(policyName, buildFleetRateLimitKey(policyName, companyId));
}

export async function enforceOwnerUserRateLimit(
  policyName: RateLimitPolicyName,
  ownerId: string,
) {
  assertRateLimitAllowed(await checkOwnerUserRateLimit(policyName, ownerId));
}

export async function enforceOwnerTenantRateLimit(
  policyName: RateLimitPolicyName,
  context: OwnerDatabaseContext,
) {
  assertRateLimitAllowed(await checkOwnerTenantRateLimit(policyName, context));
}

export function isRateLimited(result: RateLimitResult) {
  return !result.success;
}

export { rateLimitResponse, rateLimitedMessage };
