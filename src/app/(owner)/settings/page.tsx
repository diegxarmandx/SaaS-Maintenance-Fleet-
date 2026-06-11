import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
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
  const preference =
    (data as NotificationPreference | null) ?? defaultPreference(context.companyId);

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
      <NotificationPreferencesForm preference={preference} />
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
    weekly_summary_enabled: false,
    preferred_summary_day: 1,
  };
}
