export type NotificationSeverity = "critical" | "warning" | "info";

export type ReminderNotificationType =
  | "maintenance_due"
  | "compliance_expiration"
  | "document_expiration";

export type ReminderNotificationCandidate = {
  key: string;
  companyId: string;
  assetId: string | null;
  notificationType: ReminderNotificationType;
  relatedEntityType: string;
  relatedEntityId: string;
  title: string;
  message: string;
  href: string;
  dueDate: string | null;
  severity: NotificationSeverity;
  metadata: Record<string, string | number | boolean | null>;
  emailSubject: string;
  emailText: string;
  emailHtml: string;
};

export type NotificationPreference = {
  company_id: string;
  email_enabled: boolean;
  maintenance_reminder_days: number;
  compliance_reminder_days: number;
  document_reminder_days: number;
  weekly_summary_enabled: boolean;
  preferred_summary_day: number;
};

export type OwnerNotification = {
  id: string;
  company_id: string;
  asset_id: string | null;
  notification_type: ReminderNotificationType | "general";
  related_entity_type: string;
  related_entity_id: string;
  notification_key: string;
  title: string;
  message: string;
  href: string | null;
  due_date: string | null;
  read_at: string | null;
  resolved_at: string | null;
  severity: NotificationSeverity;
  email_delivery_status: "not_queued" | "queued" | "sent" | "failed" | "skipped";
  email_sent_at: string | null;
  email_attempt_count: number;
  created_at: string;
  updated_at: string;
};

export type ReminderProcessingResult = {
  companyId: string;
  generated: number;
  inserted: number;
  updated: number;
  resolved: number;
  emailsAttempted: number;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
};
