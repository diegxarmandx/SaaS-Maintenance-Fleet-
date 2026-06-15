import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAuthorizedCronRequest } from "@/features/notifications/cron-auth";
import { processAllReminderNotifications } from "@/features/notifications/service";
import { serverEnv } from "@/lib/env/server";
import { getClientIpFromHeaders } from "@/lib/rate-limit/identity";
import {
  checkIpRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ipAddress = getClientIpFromHeaders(request.headers);
  const rateLimit = await checkIpRateLimit("notificationTrigger", ipAddress);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  if (!serverEnv.CRON_SECRET) {
    return NextResponse.json(
      { error: "Scheduled reminders are not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorizedCronRequest(request, serverEnv.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startedAt = Date.now();
  const results = await processAllReminderNotifications();
  const totals = results.reduce(
    (accumulator, result) => ({
      companiesProcessed: accumulator.companiesProcessed + 1,
      generated: accumulator.generated + result.generated,
      inserted: accumulator.inserted + result.inserted,
      updated: accumulator.updated + result.updated,
      resolved: accumulator.resolved + result.resolved,
      emailsAttempted: accumulator.emailsAttempted + result.emailsAttempted,
      emailsSent: accumulator.emailsSent + result.emailsSent,
      emailsSkipped: accumulator.emailsSkipped + result.emailsSkipped,
      emailsFailed: accumulator.emailsFailed + result.emailsFailed,
    }),
    {
      companiesProcessed: 0,
      generated: 0,
      inserted: 0,
      updated: 0,
      resolved: 0,
      emailsAttempted: 0,
      emailsSent: 0,
      emailsSkipped: 0,
      emailsFailed: 0,
    },
  );

  console.info("Reminder processing completed", {
    ...totals,
    durationMs: Date.now() - startedAt,
  });

  return NextResponse.json({
    ok: true,
    ...totals,
    durationMs: Date.now() - startedAt,
  });
}
