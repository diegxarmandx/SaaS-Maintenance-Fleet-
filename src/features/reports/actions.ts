"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseReportPreferenceForm } from "@/features/reports/preferences";
import { AppError } from "@/lib/errors";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { recordAuditEvent } from "@/server/audit/log";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";

export async function updateReportPreferencesAction(formData: FormData) {
  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("mutation", context);

  const preference = parseReportPreferenceForm(formData);

  if (preference.assetId) {
    const { data, error } = await context.supabase
      .from("assets")
      .select("id")
      .eq("id", preference.assetId)
      .eq("company_id", context.companyId)
      .is("archived_at", null)
      .maybeSingle();

    if (error) {
      throw new AppError("DATA_ACCESS_ERROR", error.message);
    }

    if (!data) {
      throw new AppError("VALIDATION_ERROR", "Choose an active asset from this company.");
    }
  }

  const { error } = await context.supabase.from("report_preferences").upsert(
    {
      company_id: context.companyId,
      default_asset_id: preference.assetId || null,
      default_lookback_days: preference.lookbackDays,
      show_charts_by_default: preference.showCharts,
    },
    { onConflict: "company_id" },
  );

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  await recordAuditEvent(context, {
    eventType: "report_preferences.updated",
    entityType: "report_preferences",
    entityId: context.companyId,
    metadata: {
      defaultLookbackDays: preference.lookbackDays,
      showCharts: preference.showCharts,
    },
  });

  revalidatePath("/reports");
  redirect("/reports");
}
