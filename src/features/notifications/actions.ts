"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { NotificationPreference } from "@/features/notifications/types";
import { AppError } from "@/lib/errors";
import { isSupabasePublicConfigReady } from "@/lib/env/public";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { recordAuditEvent } from "@/server/audit/log";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";

export async function markNotificationReadAction(notificationId: string) {
  if (!isSupabasePublicConfigReady) {
    revalidatePath("/dashboard");
    return;
  }

  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("mutation", context);

  const { error } = await context.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("company_id", context.companyId);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  revalidatePath("/dashboard");
}

export async function markAllNotificationsReadAction() {
  if (!isSupabasePublicConfigReady) {
    revalidatePath("/dashboard");
    return;
  }

  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("mutation", context);

  const { error } = await context.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("company_id", context.companyId)
    .is("resolved_at", null)
    .is("read_at", null);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  revalidatePath("/dashboard");
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("mutation", context);

  const quietHoursStart = parseOptionalTime(formData.get("quietHoursStart"));
  const quietHoursEnd = parseOptionalTime(formData.get("quietHoursEnd"));
  const payload: Omit<NotificationPreference, "company_id"> = {
    email_enabled: formData.get("emailEnabled") === "on",
    maintenance_reminder_days: parseReminderDays(formData.get("maintenanceReminderDays")),
    compliance_reminder_days: parseReminderDays(formData.get("complianceReminderDays")),
    document_reminder_days: parseReminderDays(formData.get("documentReminderDays")),
    email_warning_enabled: formData.get("emailWarningEnabled") === "on",
    email_critical_enabled: formData.get("emailCriticalEnabled") === "on",
    quiet_hours_start: quietHoursStart && quietHoursEnd ? quietHoursStart : null,
    quiet_hours_end: quietHoursStart && quietHoursEnd ? quietHoursEnd : null,
    weekly_summary_enabled: formData.get("weeklySummaryEnabled") === "on",
    preferred_summary_day: parseSummaryDay(formData.get("preferredSummaryDay")),
  };
  const { error } = await context.supabase.from("notification_preferences").upsert(
    {
      company_id: context.companyId,
      ...payload,
    },
    { onConflict: "company_id" },
  );

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  await recordAuditEvent(context, {
    eventType: "notification_preferences.updated",
    entityType: "notification_preferences",
    entityId: context.companyId,
    metadata: {
      emailEnabled: payload.email_enabled,
      warningEmail: payload.email_warning_enabled,
      criticalEmail: payload.email_critical_enabled,
    },
  });

  revalidatePath("/settings");
  redirect("/settings");
}

function parseReminderDays(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function parseSummaryDay(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 1);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 6) {
    return 1;
  }

  return Math.floor(parsed);
}

function parseOptionalTime(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  return /^\d{2}:\d{2}$/.test(text) ? text : null;
}
