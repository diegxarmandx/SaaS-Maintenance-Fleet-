import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bell, Shield } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SubscriptionSettings } from "@/features/billing/components/subscription-settings";
import { parseSubscriptionPlanKey } from "@/features/billing/plans";
import { getSubscriptionSnapshot } from "@/features/billing/server/subscription";
import type { SubscriptionSnapshot } from "@/features/billing/types";
import { AccountDataSettings } from "@/features/account-data/components/account-data-settings";
import type { AccountDeletionRequestSummary } from "@/features/account-data/deletion";
import { getAccountDeletionRequestSummary } from "@/features/account-data/server/deletion";
import { getLocalDemoDataset, localDemoIdentity } from "@/features/demo/local-data";
import { shouldUseLocalDemoData } from "@/features/demo/mode";
import {
  NotificationAnalyticsCards,
  type NotificationAnalytics,
} from "@/features/settings/components/notification-analytics";
import { NotificationPreferencesForm } from "@/features/settings/components/notification-preferences-form";
import { AccountSettingsForms } from "@/features/settings/components/account-settings-forms";
import { parseMeasurementPreferences } from "@/features/settings/helpers";
import type { NotificationPreference } from "@/features/notifications/types";
import { getOwnerDatabaseContext } from "@/features/fleet/server/owner";

export const metadata: Metadata = {
  title: "Settings",
};

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{
    plan?: string | string[] | undefined;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [context, params] = await Promise.all([
    getOwnerDatabaseContext(),
    searchParams,
  ]);
  const selectedPlanKey = parseSubscriptionPlanKey(params.plan);

  if (!context) {
    return shouldUseLocalDemoData ? (
      <LocalDemoSettingsPage selectedPlanKey={selectedPlanKey} />
    ) : (
      <DisconnectedSettingsPage />
    );
  }

  const [
    { data },
    { data: notificationRows },
    { data: company },
    { data: profile },
    subscriptionSnapshot,
    deletionRequest,
  ] = await Promise.all([
    context.supabase
      .from("notification_preferences")
      .select("*")
      .eq("company_id", context.companyId)
      .maybeSingle(),
    context.supabase
      .from("notifications")
      .select("severity,read_at,resolved_at,email_delivery_status")
      .eq("company_id", context.companyId)
      .order("created_at", { ascending: false })
      .limit(500),
    context.supabase
      .from("companies")
      .select(
        "company_name,owner_name,email,phone,address,preferred_timezone,preferred_measurement_settings",
      )
      .eq("id", context.companyId)
      .maybeSingle(),
    context.supabase
      .from("profiles")
      .select("full_name,email,onboarding_status")
      .eq("id", context.ownerId)
      .maybeSingle(),
    getSubscriptionSnapshot(context),
    getAccountDeletionRequestSummary(context),
  ]);
  const preference =
    (data as NotificationPreference | null) ?? defaultPreference(context.companyId);
  const analytics = buildNotificationAnalytics(notificationRows ?? []);
  const companyProfile = (company as CompanySettingsRecord | null) ?? null;
  const ownerProfile = (profile as OwnerSettingsRecord | null) ?? null;

  return (
    <SettingsContent
      analytics={analytics}
      companyName={context.companyName}
      companyProfile={companyProfile}
      ownerProfile={ownerProfile}
      preference={preference}
      preferredTimezone={context.preferredTimezone}
      selectedPlanKey={selectedPlanKey}
      subscriptionSnapshot={subscriptionSnapshot}
      deletionRequest={deletionRequest}
    />
  );
}

function DisconnectedSettingsPage() {
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
      />
      <PageHeader
        description="Manage company identity, owner preferences, billing, notifications, and account safety."
        eyebrow="Maintly workspace"
        title="Settings"
      />
      <EmptyState
        description="Configure Supabase environment variables and apply the migrations to use live settings."
        title="Settings data is not connected"
      />
    </>
  );
}

function LocalDemoSettingsPage({
  selectedPlanKey,
}: {
  selectedPlanKey: ReturnType<typeof parseSubscriptionPlanKey>;
}) {
  const dataset = getLocalDemoDataset();
  const preference = dataset.notificationPreference as NotificationPreference;
  const analytics = buildNotificationAnalytics(dataset.notifications);
  const companyProfile = dataset.company as CompanySettingsRecord;
  const ownerProfile: OwnerSettingsRecord = {
    full_name: dataset.profile.full_name,
    email: dataset.profile.email,
    onboarding_status: dataset.profile.onboarding_status,
  };
  const subscriptionSnapshot: SubscriptionSnapshot = {
    record: {
      id: "local-demo-subscription",
      company_id: localDemoIdentity.companyId,
      stripe_customer_id: dataset.subscriptionRecord.stripe_customer_id,
      stripe_subscription_id: dataset.subscriptionRecord.stripe_subscription_id,
      stripe_price_id: dataset.subscriptionRecord.stripe_price_id,
      plan_key: "growing_fleet",
      status: "active",
      current_period_start: dataset.subscriptionRecord.current_period_start,
      current_period_end: dataset.subscriptionRecord.current_period_end,
      trial_end: dataset.subscriptionRecord.trial_end,
      cancel_at_period_end: dataset.subscriptionRecord.cancel_at_period_end,
      asset_limit: dataset.subscriptionRecord.asset_limit,
      last_payment_status: dataset.subscriptionRecord.last_payment_status,
      restricted_at: dataset.subscriptionRecord.restricted_at,
      updated_from_stripe_at: dataset.subscriptionRecord.updated_from_stripe_at,
      created_at: dataset.subscriptionRecord.current_period_start ?? "",
      updated_at: dataset.subscriptionRecord.updated_from_stripe_at ?? "",
    },
    status: "active",
    activeAssetCount: dataset.assets.filter(
      (asset) => asset.status === "active" && !asset.archived_at,
    ).length,
    assetLimit: dataset.subscriptionRecord.asset_limit,
  };

  return (
    <SettingsContent
      analytics={analytics}
      companyName={localDemoIdentity.companyName}
      companyProfile={companyProfile}
      ownerProfile={ownerProfile}
      preference={preference}
      preferredTimezone={localDemoIdentity.timezone}
      selectedPlanKey={selectedPlanKey}
      subscriptionSnapshot={subscriptionSnapshot}
      deletionRequest={null}
    />
  );
}

function SettingsContent({
  analytics,
  companyName,
  companyProfile,
  ownerProfile,
  preference,
  preferredTimezone,
  selectedPlanKey,
  subscriptionSnapshot,
  deletionRequest,
}: {
  analytics: NotificationAnalytics;
  companyName: string;
  companyProfile: CompanySettingsRecord | null;
  ownerProfile: OwnerSettingsRecord | null;
  preference: NotificationPreference;
  preferredTimezone: string;
  selectedPlanKey: ReturnType<typeof parseSubscriptionPlanKey>;
  subscriptionSnapshot: SubscriptionSnapshot;
  deletionRequest: AccountDeletionRequestSummary | null;
}) {
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
      />
      <PageHeader
        description="Manage company identity, owner preferences, billing, notifications, and account safety."
        eyebrow={companyName}
        title="Settings"
      />
      <div className="grid gap-8">
        <section className="grid gap-4" aria-label="Owner workspace">
          <AccountSettingsForms
            companyProfile={{
              companyName: companyProfile?.company_name ?? companyName,
              companyEmail: companyProfile?.email ?? ownerProfile?.email ?? "",
              phone: companyProfile?.phone ?? "",
              address: companyProfile?.address ?? "",
            }}
            ownerProfile={{
              fullName:
                ownerProfile?.full_name || companyProfile?.owner_name || "Fleet owner",
              email: ownerProfile?.email ?? companyProfile?.email ?? "Not recorded",
            }}
            workspacePreferences={{
              preferredTimezone: companyProfile?.preferred_timezone ?? preferredTimezone,
              ...parseMeasurementPreferences(
                companyProfile?.preferred_measurement_settings,
              ),
            }}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <SettingsSummaryCard
              description="Security boundaries for owner access and protected files."
              icon={<Shield aria-hidden="true" className="h-5 w-5" />}
              title="Account security"
            >
              <SettingsDescriptionList
                rows={[
                  ["Authentication", "Supabase email/password"],
                  ["Tenant access", "Company-scoped row-level security"],
                  ["File access", "Private buckets with server-created signed URLs"],
                  ["Password changes", "Use the password reset flow from the login page"],
                ]}
              />
            </SettingsSummaryCard>
          </div>
        </section>

        <SubscriptionSettings
          selectedPlanKey={selectedPlanKey}
          snapshot={subscriptionSnapshot}
        />

        <AccountDataSettings
          companyName={companyName}
          deletionRequest={deletionRequest}
        />

        <section className="grid gap-4" aria-labelledby="notifications-title">
          <div>
            <p className="text-sm font-medium text-primary">Alerts and reminders</p>
            <h2
              id="notifications-title"
              className="mt-1 text-xl font-semibold text-foreground"
            >
              Notification preferences
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Control reminder timing and owner email delivery without adding staff,
              driver, mechanic, or dispatch workflows.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Bell aria-hidden="true" className="h-4 w-4" />
            Notification delivery depends on the configured transactional email provider.
          </div>
          <NotificationAnalyticsCards analytics={analytics} />
          <NotificationPreferencesForm preference={preference} />
        </section>
      </div>
    </>
  );
}

type CompanySettingsRecord = {
  company_name: string;
  owner_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  preferred_timezone: string;
  preferred_measurement_settings: unknown;
};

type OwnerSettingsRecord = {
  full_name: string;
  email: string;
  onboarding_status: string;
};

function SettingsSummaryCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SettingsDescriptionList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 text-sm">
      {rows.map(([label, value]) => (
        <div className="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)]" key={label}>
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 break-words font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
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
