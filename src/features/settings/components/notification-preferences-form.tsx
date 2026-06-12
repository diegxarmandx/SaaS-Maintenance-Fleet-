import { Save } from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { updateNotificationPreferencesAction } from "@/features/notifications/actions";
import type { NotificationPreference } from "@/features/notifications/types";

type NotificationPreferencesFormProps = {
  preference: NotificationPreference;
};

const weekdayOptions = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

export function NotificationPreferencesForm({
  preference,
}: NotificationPreferencesFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updateNotificationPreferencesAction} className="grid gap-5">
          <label className="flex items-center gap-3 text-sm font-medium text-foreground">
            <input
              className="h-4 w-4 rounded border-border text-primary"
              defaultChecked={preference.email_enabled}
              name="emailEnabled"
              type="checkbox"
            />
            Email reminders enabled
          </label>
          <div className="grid gap-4 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
              <input
                className="h-4 w-4 rounded border-border text-primary"
                defaultChecked={preference.email_warning_enabled}
                name="emailWarningEnabled"
                type="checkbox"
              />
              Due-soon and expiring emails
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
              <input
                className="h-4 w-4 rounded border-border text-primary"
                defaultChecked={preference.email_critical_enabled}
                name="emailCriticalEnabled"
                type="checkbox"
              />
              Overdue, expired, and missing emails
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Maintenance reminder days
              <Input
                defaultValue={preference.maintenance_reminder_days}
                min="0"
                name="maintenanceReminderDays"
                type="number"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Compliance reminder days
              <Input
                defaultValue={preference.compliance_reminder_days}
                min="0"
                name="complianceReminderDays"
                type="number"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Document reminder days
              <Input
                defaultValue={preference.document_reminder_days}
                min="0"
                name="documentReminderDays"
                type="number"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Quiet hours start
              <Input
                defaultValue={preference.quiet_hours_start ?? ""}
                name="quietHoursStart"
                type="time"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Quiet hours end
              <Input
                defaultValue={preference.quiet_hours_end ?? ""}
                name="quietHoursEnd"
                type="time"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
              <input
                className="h-4 w-4 rounded border-border text-primary"
                defaultChecked={preference.weekly_summary_enabled}
                name="weeklySummaryEnabled"
                type="checkbox"
              />
              Weekly summary enabled
            </label>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Preferred summary day
              <Select
                defaultValue={String(preference.preferred_summary_day)}
                name="preferredSummaryDay"
              >
                {weekdayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="flex justify-end">
            <button className={buttonClassName()} type="submit">
              <Save aria-hidden="true" className="h-4 w-4" />
              Save preferences
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
