import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type NotificationAnalytics = {
  active: number;
  unread: number;
  critical: number;
  emailFailures: number;
};

type NotificationAnalyticsCardsProps = {
  analytics: NotificationAnalytics;
};

export function NotificationAnalyticsCards({
  analytics,
}: NotificationAnalyticsCardsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AnalyticsCard label="Active notifications" value={analytics.active} />
      <AnalyticsCard label="Unread notifications" value={analytics.unread} />
      <AnalyticsCard label="Critical reminders" value={analytics.critical} />
      <AnalyticsCard label="Email failures" value={analytics.emailFailures} />
    </section>
  );
}

function AnalyticsCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
