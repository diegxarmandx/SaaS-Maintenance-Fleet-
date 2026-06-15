import { NextResponse, type NextRequest } from "next/server";

import {
  checkIpRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit/server";
import { getClientIpFromHeaders } from "@/lib/rate-limit/identity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ipAddress = getClientIpFromHeaders(request.headers);
  const rateLimit = await checkIpRateLimit("publicHealth", ipAddress);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
