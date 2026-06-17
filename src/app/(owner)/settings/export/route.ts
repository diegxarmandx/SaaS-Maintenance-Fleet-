import { NextResponse } from "next/server";

import {
  buildOwnerDataExportFilename,
  ownerDataExportSchemaVersion,
} from "@/features/account-data/export";
import {
  buildLiveOwnerDataExport,
  buildLocalDemoOwnerDataExport,
} from "@/features/account-data/server/export";
import { shouldUseLocalDemoData } from "@/features/demo/mode";
import { getOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { toSafeActionError } from "@/server/actions/safe-error";

export const dynamic = "force-dynamic";

export async function GET() {
  let context: Awaited<ReturnType<typeof getOwnerDatabaseContext>>;

  try {
    context = await getOwnerDatabaseContext();
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    const safeError = toSafeActionError(error, { action: "accountData.export.context" });

    return NextResponse.json(safeError, { status: 500 });
  }

  try {
    const generatedAt = new Date();
    if (!context && !shouldUseLocalDemoData) {
      return NextResponse.json(
        {
          code: "CONFIGURATION_ERROR",
          message: "Supabase is not connected yet. Owner data export is unavailable.",
        },
        { status: 503 },
      );
    }

    const exportData = context
      ? await buildLiveOwnerDataExport(context, generatedAt)
      : buildLocalDemoOwnerDataExport(generatedAt);
    const body = JSON.stringify(exportData, null, 2);
    const filename = buildOwnerDataExportFilename(exportData.companyName, generatedAt);

    return new Response(body, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-FleetReady-Export-Schema": ownerDataExportSchemaVersion,
      },
    });
  } catch (error) {
    const safeError = toSafeActionError(error, { action: "accountData.export" });

    return NextResponse.json(safeError, { status: 500 });
  }
}

function isNextRedirectError(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }

  const digest = (error as { digest: unknown }).digest;

  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
