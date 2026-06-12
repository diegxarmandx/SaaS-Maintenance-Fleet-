import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import {
  NotificationAnalyticsCards,
  type NotificationAnalytics,
} from "@/features/settings/components/notification-analytics";
import { NotificationPreferencesForm } from "@/features/settings/components/notification-preferences-form";
import type { NotificationPreference } from "@/features/notifications/types";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";

export const metadata: Metadata = {
  title: "Settings",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await requireOwnerDatabaseContext();
  const { data } = await context.supabase
    .from("notification_preferences")
    .select("*")
    .eq("company_id", context.companyId)
    .maybeSingle();
  const { data: notificationRows } = await context.supabase
    .from("notifications")
    .select("severity,read_at,resolved_at,email_delivery_status")
    .eq("company_id", context.companyId)
    .order("created_at", { ascending: false })
    .limit(500);
  const preference =
    (data as NotificationPreference | null) ?? defaultPreference(context.companyId);
  const analytics = buildNotificationAnalytics(notificationRows ?? []);

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
      />
      <PageHeader
        description="Configure owner reminder thresholds and email delivery preferences."
        eyebrow={context.companyName}
        title="Settings"
      />
      <div className="grid gap-6">
        <NotificationAnalyticsCards analytics={analytics} />
        <NotificationPreferencesForm preference={preference} />
      </div>
    </>
  );
}

function defaultPreference(companyId: string): NotificationPreference {
  return {
    company_id: companyId,
    email_enabled: false,
    maintenance_reminder_days: 14,
    compliance_reminder_days: 30,
    document_reminder_days: 30,
    email_warning_enabled: true,
    email_critical_enabled: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
    weekly_summary_enabled: false,
    preferred_summary_day: 1,
  };
}

export function buildNotificationAnalytics(
  rows: Array<{
    severity: string;
    read_at: string | null;
    resolved_at: string | null;
    email_delivery_status: string;
  }>,
): NotificationAnalytics {
  const activeRows = rows.filter((row) => !row.resolved_at);

  return {
    active: activeRows.length,
    unread: activeRows.filter((row) => !row.read_at).length,
    critical: activeRows.filter((row) => row.severity === "critical").length,
    emailFailures: rows.filter((row) => row.email_delivery_status === "failed").length,
  };
}
