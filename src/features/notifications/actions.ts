"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { NotificationPreference } from "@/features/notifications/types";
import { AppError } from "@/lib/errors";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";

export async function markNotificationReadAction(notificationId: string) {
  const context = await requireOwnerDatabaseContext();
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
  const context = await requireOwnerDatabaseContext();
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
  const payload: Omit<NotificationPreference, "company_id"> = {
    email_enabled: formData.get("emailEnabled") === "on",
    maintenance_reminder_days: parseReminderDays(formData.get("maintenanceReminderDays")),
    compliance_reminder_days: parseReminderDays(formData.get("complianceReminderDays")),
    document_reminder_days: parseReminderDays(formData.get("documentReminderDays")),
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
