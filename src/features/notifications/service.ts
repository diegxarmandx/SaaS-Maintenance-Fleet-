import { calculateComplianceStatus } from "@/features/compliance/status";
import { getLocalDemoDataset, localDemoIdentity } from "@/features/demo/local-data";
import { shouldUseLocalDemoData } from "@/features/demo/mode";
import { calculateDocumentStatus } from "@/features/documents/status";
import { calculateMaintenanceStatus } from "@/features/maintenance/schedule";
import {
  buildReminderEmail,
  buildWeeklyFleetSummaryEmail,
} from "@/features/notifications/email-templates";
import { planNotificationSync } from "@/features/notifications/sync-plan";
import type {
  NotificationPreference,
  OwnerNotification,
  ReminderNotificationCandidate,
  ReminderProcessingResult,
} from "@/features/notifications/types";
import { AppError } from "@/lib/errors";
import { isSupabasePublicConfigReady } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";
import { createTransactionalEmailProvider } from "@/lib/email/provider";
import { checkFleetRateLimit } from "@/lib/rate-limit/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/server/db/supabase";

type ServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type CompanyRow = {
  id: string;
  company_name: string;
  owner_name: string;
  email: string;
  preferred_timezone: string;
};

type AssetRow = {
  id: string;
  unit_number: string;
  asset_name: string;
  current_mileage: number;
  current_engine_hours: number;
  status: string;
};

type MaintenanceRuleRow = {
  id: string;
  company_id: string;
  asset_id: string;
  name: string;
  next_due_date: string | null;
  next_due_mileage: number | null;
  next_due_hours: number | null;
  reminder_days: number;
  reminder_mileage: number | null;
  reminder_hours: number | null;
  is_active: boolean;
};

type ComplianceRequirementRow = {
  id: string;
  company_id: string;
  asset_id: string;
  compliance_type: string;
  reminder_days: number;
  archived_at: string | null;
};

type ComplianceRecordRow = {
  id: string;
  company_id: string;
  asset_id: string;
  requirement_id: string | null;
  compliance_type: string;
  expiration_date: string;
  reminder_days: number;
  archived_at: string | null;
};

type DocumentRow = {
  id: string;
  company_id: string;
  asset_id: string | null;
  document_name: string;
  document_type: string;
  expiration_date: string | null;
  archived_at: string | null;
};

type ReminderSourceData = {
  company: CompanyRow;
  preference: NotificationPreference;
  assets: AssetRow[];
  maintenanceRules: MaintenanceRuleRow[];
  complianceRequirements: ComplianceRequirementRow[];
  complianceRecords: ComplianceRecordRow[];
  documents: DocumentRow[];
};

const defaultPreference = (companyId: string): NotificationPreference => ({
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
});

export async function processAllReminderNotifications() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .order("created_at", { ascending: true });

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  const results: ReminderProcessingResult[] = [];

  for (const company of (data ?? []) as Array<{ id: string }>) {
    results.push(await processReminderNotificationsForCompany(company.id, supabase));
  }

  return results;
}

export async function processReminderNotificationsForCompany(
  companyId: string,
  supabase: ServiceClient = createSupabaseServiceClient(),
): Promise<ReminderProcessingResult> {
  const rateLimit = await checkFleetRateLimit("notificationTrigger", companyId);

  if (!rateLimit.success) {
    return {
      companyId,
      generated: 0,
      inserted: 0,
      updated: 0,
      resolved: 0,
      emailsAttempted: 0,
      emailsSent: 0,
      emailsSkipped: 0,
      emailsFailed: 0,
      rateLimited: true,
    };
  }

  const source = await getReminderSourceData(supabase, companyId);
  const candidates = buildReminderNotificationCandidates(source);
  const syncResult = await syncNotificationCandidates(supabase, companyId, candidates);
  const emailResult = await sendEligibleReminderEmails(
    supabase,
    source.company,
    source.preference,
    candidates,
  );

  return {
    companyId,
    generated: candidates.length,
    ...syncResult,
    ...emailResult,
  };
}

export async function getUnreadNotificationCount(companyId: string) {
  const supabase = createSupabaseServiceClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("read_at", null)
    .is("resolved_at", null);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getOwnerNotifications(companyId: string) {
  if (shouldUseLocalDemoData && companyId === localDemoIdentity.companyId) {
    return (getLocalDemoDataset().notifications as unknown as OwnerNotification[])
      .filter((notification) => !notification.resolved_at)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 20);
  }

  if (!isSupabasePublicConfigReady) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("company_id", companyId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []) as OwnerNotification[];
}

export async function getNotificationPreferences(companyId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data as NotificationPreference | null) ?? defaultPreference(companyId);
}

export function buildReminderNotificationCandidates(
  source: ReminderSourceData,
): ReminderNotificationCandidate[] {
  const appUrl = serverEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const assetsById = new Map(source.assets.map((asset) => [asset.id, asset]));
  const candidates: Array<
    Omit<ReminderNotificationCandidate, "emailSubject" | "emailText" | "emailHtml">
  > = [];

  source.maintenanceRules.forEach((rule) => {
    const asset = assetsById.get(rule.asset_id);

    if (!asset || !rule.is_active) {
      return;
    }

    const status = calculateMaintenanceStatus({
      isActive: rule.is_active,
      currentMileage: Number(asset.current_mileage),
      currentEngineHours: Number(asset.current_engine_hours),
      nextDueDate: rule.next_due_date,
      nextDueMileage: numberOrNull(rule.next_due_mileage),
      nextDueHours: numberOrNull(rule.next_due_hours),
      reminderDays: source.preference.maintenance_reminder_days ?? rule.reminder_days,
      reminderMileage: numberOrNull(rule.reminder_mileage),
      reminderHours: numberOrNull(rule.reminder_hours),
      timezone: source.company.preferred_timezone,
    });

    if (status.status === "Current") {
      return;
    }

    const overdue = status.status === "Overdue";
    candidates.push({
      key: `maintenance:${overdue ? "overdue" : "due-soon"}:${rule.id}`,
      companyId: source.company.id,
      assetId: asset.id,
      notificationType: "maintenance_due",
      relatedEntityType: overdue
        ? "maintenance_rule_overdue"
        : "maintenance_rule_due_soon",
      relatedEntityId: rule.id,
      title: overdue ? "Maintenance overdue" : "Maintenance due soon",
      message: `${asset.unit_number} ${asset.asset_name}: ${rule.name} is ${overdue ? "overdue" : "due soon"}.`,
      href: `/maintenance/complete?ruleId=${rule.id}&assetId=${asset.id}`,
      dueDate: rule.next_due_date,
      severity: overdue ? "critical" : "warning",
      metadata: {
        status: status.status,
        daysUntilDue: status.daysUntilDue,
        mileageUntilDue: status.mileageUntilDue,
        hoursUntilDue: status.hoursUntilDue,
      },
    });
  });

  const activeRecords = source.complianceRecords.filter((record) => !record.archived_at);
  const activeRequirementRecordIds = new Set(
    activeRecords
      .map((record) => record.requirement_id)
      .filter((id): id is string => Boolean(id)),
  );

  activeRecords.forEach((record) => {
    const asset = assetsById.get(record.asset_id);

    if (!asset) {
      return;
    }

    const status = calculateComplianceStatus({
      isRequired: true,
      hasValidRecord: true,
      expirationDate: record.expiration_date,
      reminderDays: source.preference.compliance_reminder_days ?? record.reminder_days,
      timezone: source.company.preferred_timezone,
    });

    if (status.status !== "Expired" && status.status !== "Expiring soon") {
      return;
    }

    const expired = status.status === "Expired";
    candidates.push({
      key: `compliance:${expired ? "expired" : "expiring"}:${record.id}`,
      companyId: source.company.id,
      assetId: asset.id,
      notificationType: "compliance_expiration",
      relatedEntityType: expired
        ? "compliance_record_expired"
        : "compliance_record_expiring",
      relatedEntityId: record.id,
      title: expired ? "Compliance expired" : "Compliance expiring soon",
      message: `${asset.unit_number} ${asset.asset_name}: ${record.compliance_type} ${expired ? "expired" : "expires soon"}.`,
      href: `/compliance/${record.id}`,
      dueDate: record.expiration_date,
      severity: expired ? "critical" : "warning",
      metadata: {
        status: status.status,
        daysUntilExpiration: status.daysUntilExpiration,
      },
    });
  });

  source.complianceRequirements.forEach((requirement) => {
    if (requirement.archived_at || activeRequirementRecordIds.has(requirement.id)) {
      return;
    }

    const asset = assetsById.get(requirement.asset_id);

    if (!asset) {
      return;
    }

    candidates.push({
      key: `compliance:missing:${requirement.id}`,
      companyId: source.company.id,
      assetId: asset.id,
      notificationType: "compliance_expiration",
      relatedEntityType: "compliance_requirement_missing",
      relatedEntityId: requirement.id,
      title: "Required compliance missing",
      message: `${asset.unit_number} ${asset.asset_name}: ${requirement.compliance_type} is assigned but has no current record.`,
      href: `/compliance/new?assetId=${asset.id}&requirementId=${requirement.id}&type=${encodeURIComponent(requirement.compliance_type)}`,
      dueDate: null,
      severity: "critical",
      metadata: { status: "Missing" },
    });
  });

  source.documents.forEach((document) => {
    if (!document.expiration_date || document.archived_at) {
      return;
    }

    const asset = document.asset_id ? assetsById.get(document.asset_id) : null;
    const status = calculateDocumentStatus({
      expirationDate: document.expiration_date,
      reminderDays: source.preference.document_reminder_days,
      timezone: source.company.preferred_timezone,
    });

    if (status.status !== "Expired" && status.status !== "Expiring soon") {
      return;
    }

    const expired = status.status === "Expired";
    candidates.push({
      key: `document:${expired ? "expired" : "expiring"}:${document.id}`,
      companyId: source.company.id,
      assetId: document.asset_id,
      notificationType: "document_expiration",
      relatedEntityType: expired ? "document_expired" : "document_expiring",
      relatedEntityId: document.id,
      title: expired ? "Document expired" : "Document expiring soon",
      message: `${asset ? `${asset.unit_number} ${asset.asset_name}: ` : ""}${document.document_name} ${expired ? "expired" : "expires soon"}.`,
      href: `/documents/${document.id}`,
      dueDate: document.expiration_date,
      severity: expired ? "critical" : "warning",
      metadata: {
        status: status.status,
        daysUntilExpiration: status.daysUntilExpiration,
      },
    });
  });

  return candidates
    .map((candidate) => ({
      ...candidate,
      ...buildReminderEmail(candidate, appUrl),
    }))
    .map((candidate) => ({
      ...candidate,
      emailSubject: candidate.subject,
      emailText: candidate.text,
      emailHtml: candidate.html,
    }))
    .sort(compareReminderCandidates);
}

export function compareReminderCandidates(
  left: Pick<ReminderNotificationCandidate, "severity" | "metadata" | "title">,
  right: Pick<ReminderNotificationCandidate, "severity" | "metadata" | "title">,
) {
  const severityWeight = { critical: 0, warning: 1, info: 2 };
  const severityDifference =
    severityWeight[left.severity] - severityWeight[right.severity];

  if (severityDifference !== 0) {
    return severityDifference;
  }

  return urgencyDistance(left.metadata) - urgencyDistance(right.metadata);
}

async function getReminderSourceData(
  supabase: ServiceClient,
  companyId: string,
): Promise<ReminderSourceData> {
  const [
    { data: company, error: companyError },
    { data: preferences, error: preferenceError },
    { data: assets, error: assetError },
    { data: maintenanceRules, error: maintenanceError },
    { data: complianceRequirements, error: requirementError },
    { data: complianceRecords, error: complianceError },
    { data: documents, error: documentError },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("id,company_name,owner_name,email,preferred_timezone")
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("assets")
      .select("id,unit_number,asset_name,current_mileage,current_engine_hours,status")
      .eq("company_id", companyId)
      .is("archived_at", null),
    supabase
      .from("maintenance_rules")
      .select(
        "id,company_id,asset_id,name,next_due_date,next_due_mileage,next_due_hours,reminder_days,reminder_mileage,reminder_hours,is_active",
      )
      .eq("company_id", companyId)
      .eq("is_active", true),
    supabase
      .from("compliance_requirements")
      .select("id,company_id,asset_id,compliance_type,reminder_days,archived_at")
      .eq("company_id", companyId)
      .eq("is_active", true),
    supabase
      .from("compliance_records")
      .select(
        "id,company_id,asset_id,requirement_id,compliance_type,expiration_date,reminder_days,archived_at",
      )
      .eq("company_id", companyId),
    supabase
      .from("documents")
      .select(
        "id,company_id,asset_id,document_name,document_type,expiration_date,archived_at",
      )
      .eq("company_id", companyId),
  ]);

  const error =
    companyError ??
    preferenceError ??
    assetError ??
    maintenanceError ??
    requirementError ??
    complianceError ??
    documentError;

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  if (!company) {
    throw new AppError("DATA_ACCESS_ERROR", "Company was not found.");
  }

  return {
    company: company as CompanyRow,
    preference:
      (preferences as NotificationPreference | null) ?? defaultPreference(companyId),
    assets: (assets ?? []) as AssetRow[],
    maintenanceRules: (maintenanceRules ?? []) as MaintenanceRuleRow[],
    complianceRequirements: (complianceRequirements ?? []) as ComplianceRequirementRow[],
    complianceRecords: (complianceRecords ?? []) as ComplianceRecordRow[],
    documents: (documents ?? []) as DocumentRow[],
  };
}

async function syncNotificationCandidates(
  supabase: ServiceClient,
  companyId: string,
  candidates: ReminderNotificationCandidate[],
) {
  const now = new Date().toISOString();
  const candidateKeys = candidates.map((candidate) => candidate.key);
  const { data: activeNotifications, error } = await supabase
    .from("notifications")
    .select("id,notification_key")
    .eq("company_id", companyId)
    .is("resolved_at", null);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  const existingByKey = new Map(
    ((activeNotifications ?? []) as Array<{ id: string; notification_key: string }>).map(
      (notification) => [notification.notification_key, notification],
    ),
  );
  const syncPlan = planNotificationSync({
    activeKeys: Array.from(existingByKey.keys()),
    candidateKeys,
  });
  let inserted = 0;
  let updated = 0;
  let resolved = 0;

  for (const candidate of candidates) {
    const existing = existingByKey.get(candidate.key);
    const payload = {
      company_id: candidate.companyId,
      asset_id: candidate.assetId,
      notification_type: candidate.notificationType,
      related_entity_type: candidate.relatedEntityType,
      related_entity_id: candidate.relatedEntityId,
      notification_key: candidate.key,
      title: candidate.title,
      message: candidate.message,
      href: candidate.href,
      due_date: candidate.dueDate,
      severity: candidate.severity,
      last_generated_at: now,
      metadata: candidate.metadata,
    };

    if (existing && syncPlan.updateKeys.includes(candidate.key)) {
      const { error: updateError } = await supabase
        .from("notifications")
        .update(payload)
        .eq("id", existing.id)
        .eq("company_id", companyId);

      if (updateError) {
        throw new AppError("DATA_ACCESS_ERROR", updateError.message);
      }

      updated += 1;
    } else if (syncPlan.insertKeys.includes(candidate.key)) {
      const { error: insertError } = await supabase.from("notifications").insert({
        ...payload,
        email_delivery_status: "not_queued",
      });

      if (insertError) {
        throw new AppError("DATA_ACCESS_ERROR", insertError.message);
      }

      inserted += 1;
    }
  }

  const staleIds = (
    (activeNotifications ?? []) as Array<{
      id: string;
      notification_key: string;
    }>
  )
    .filter((notification) =>
      syncPlan.resolveKeys.includes(notification.notification_key),
    )
    .map((notification) => notification.id);

  if (staleIds.length > 0) {
    const { error: resolveError } = await supabase
      .from("notifications")
      .update({ resolved_at: now, read_at: now })
      .in("id", staleIds)
      .eq("company_id", companyId);

    if (resolveError) {
      throw new AppError("DATA_ACCESS_ERROR", resolveError.message);
    }

    resolved = staleIds.length;
  }

  return { inserted, updated, resolved };
}

async function sendEligibleReminderEmails(
  supabase: ServiceClient,
  company: CompanyRow,
  preference: NotificationPreference,
  candidates: ReminderNotificationCandidate[],
) {
  if (!preference.email_enabled || !company.email) {
    return {
      emailsAttempted: 0,
      emailsSent: 0,
      emailsSkipped: candidates.length,
      emailsFailed: 0,
    };
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id,notification_key,email_sent_at,email_delivery_status,email_attempt_count")
    .eq("company_id", company.id)
    .is("resolved_at", null)
    .in(
      "notification_key",
      candidates.map((candidate) => candidate.key),
    );

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  const notificationsByKey = new Map(
    (
      (data ?? []) as Array<{
        id: string;
        notification_key: string;
        email_sent_at: string | null;
        email_delivery_status: string;
        email_attempt_count: number;
      }>
    ).map((notification) => [notification.notification_key, notification]),
  );
  const provider =
    serverEnv.EMAIL_PROVIDER === "none" ? null : createTransactionalEmailProvider();
  let emailsAttempted = 0;
  let emailsSent = 0;
  let emailsSkipped = 0;
  let emailsFailed = 0;

  for (const candidate of candidates) {
    const notification = notificationsByKey.get(candidate.key);

    if (!notification || notification.email_sent_at) {
      emailsSkipped += 1;
      continue;
    }

    if (
      !isReminderEmailEligible(
        candidate,
        preference,
        new Date(),
        company.preferred_timezone,
      )
    ) {
      emailsSkipped += 1;
      continue;
    }

    if (!provider) {
      await supabase
        .from("notifications")
        .update({
          email_delivery_status: "skipped",
          email_last_attempt_at: new Date().toISOString(),
          email_attempt_count: notification.email_attempt_count + 1,
          email_error: "Email provider is disabled.",
        })
        .eq("id", notification.id)
        .eq("company_id", company.id);
      emailsSkipped += 1;
      continue;
    }

    emailsAttempted += 1;

    try {
      await provider.send({
        to: { email: company.email, name: company.owner_name },
        subject: candidate.emailSubject,
        text: candidate.emailText,
        html: candidate.emailHtml,
      });

      await supabase
        .from("notifications")
        .update({
          email_delivery_status: "sent",
          email_sent_at: new Date().toISOString(),
          email_last_attempt_at: new Date().toISOString(),
          email_attempt_count: notification.email_attempt_count + 1,
          email_error: null,
        })
        .eq("id", notification.id)
        .eq("company_id", company.id);
      emailsSent += 1;
    } catch (error) {
      await supabase
        .from("notifications")
        .update({
          email_delivery_status: "failed",
          email_last_attempt_at: new Date().toISOString(),
          email_attempt_count: notification.email_attempt_count + 1,
          email_error: error instanceof Error ? error.message : "Unknown email error.",
        })
        .eq("id", notification.id)
        .eq("company_id", company.id);
      emailsFailed += 1;
    }
  }

  await maybeSendWeeklySummary(supabase, company, preference);

  return { emailsAttempted, emailsSent, emailsSkipped, emailsFailed };
}

async function maybeSendWeeklySummary(
  supabase: ServiceClient,
  company: CompanyRow,
  preference: NotificationPreference,
) {
  if (
    !preference.email_enabled ||
    !preference.weekly_summary_enabled ||
    serverEnv.EMAIL_PROVIDER === "none"
  ) {
    return;
  }

  const today = new Date();

  if (today.getDay() !== preference.preferred_summary_day) {
    return;
  }

  const { count: alreadySent } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id)
    .eq("related_entity_type", "weekly_summary")
    .gte("created_at", new Date(today.toDateString()).toISOString());

  if ((alreadySent ?? 0) > 0) {
    return;
  }

  const { count: criticalCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id)
    .eq("severity", "critical")
    .is("resolved_at", null);

  const email = buildWeeklyFleetSummaryEmail({
    companyName: company.company_name,
    dashboardUrl: new URL(
      "/dashboard",
      serverEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    ).toString(),
    counts: {
      overdueMaintenance: criticalCount ?? 0,
      maintenanceDueSoon: 0,
      expiredCompliance: 0,
      missingCompliance: 0,
      documentsExpiringSoon: 0,
      expiredDocuments: 0,
    },
  });

  const provider = createTransactionalEmailProvider();
  await provider.send({
    to: { email: company.email, name: company.owner_name },
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  await supabase.from("notifications").insert({
    company_id: company.id,
    notification_type: "general",
    related_entity_type: "weekly_summary",
    related_entity_id: company.id,
    notification_key: `weekly-summary:${new Date().toISOString().slice(0, 10)}`,
    title: "Weekly fleet summary sent",
    message: "Maintly sent the weekly owner summary email.",
    href: "/dashboard",
    severity: "info",
    email_delivery_status: "sent",
    email_sent_at: new Date().toISOString(),
    resolved_at: new Date().toISOString(),
    read_at: new Date().toISOString(),
  });
}

function urgencyDistance(metadata: Record<string, string | number | boolean | null>) {
  const candidates = [
    metadata.daysUntilDue,
    metadata.mileageUntilDue,
    metadata.hoursUntilDue,
    metadata.daysUntilExpiration,
  ].filter((value): value is number => typeof value === "number");

  return candidates.length > 0 ? Math.min(...candidates) : Number.POSITIVE_INFINITY;
}

function numberOrNull(value: number | null) {
  return value === null ? null : Number(value);
}

export function isReminderEmailEligible(
  candidate: Pick<ReminderNotificationCandidate, "severity">,
  preference: Pick<
    NotificationPreference,
    | "email_warning_enabled"
    | "email_critical_enabled"
    | "quiet_hours_start"
    | "quiet_hours_end"
  >,
  now: Date = new Date(),
  timezone = "UTC",
) {
  if (candidate.severity === "warning" && !preference.email_warning_enabled) {
    return false;
  }

  if (candidate.severity === "critical" && !preference.email_critical_enabled) {
    return false;
  }

  if (
    preference.quiet_hours_start &&
    preference.quiet_hours_end &&
    isWithinQuietHours(
      now,
      preference.quiet_hours_start,
      preference.quiet_hours_end,
      timezone,
    )
  ) {
    return false;
  }

  return true;
}

export function isWithinQuietHours(
  now: Date,
  start: string,
  end: string,
  timezone = "UTC",
) {
  const currentMinutes = getTimeZoneMinutes(now, timezone);
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  if (startMinutes === endMinutes) {
    return false;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function parseTimeToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");

  return Number(hours) * 60 + Number(minutes);
}

function getTimeZoneMinutes(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return hour * 60 + minute;
}
