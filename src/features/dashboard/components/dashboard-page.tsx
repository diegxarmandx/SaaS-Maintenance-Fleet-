import Link from "next/link";
import {
  AlertTriangle,
  ClipboardCheck,
  FileText,
  Gauge,
  ShieldCheck,
} from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  DashboardAttentionItem,
  DashboardData,
  DashboardRecentActivity,
} from "@/features/dashboard/types";
import { formatShortDate } from "@/features/fleet/helpers";

type DashboardPageViewProps = {
  dashboard: DashboardData;
};

export function DashboardPageView({ dashboard }: DashboardPageViewProps) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <PageHeader
        description="Immediate owner view of maintenance, compliance, documents, and fleet items that need attention."
        eyebrow={dashboard.companyName}
        title="Dashboard"
      />

      {!dashboard.isConfigured ? (
        <EmptyState
          description="Configure Supabase environment variables and apply the migrations to use the live dashboard."
          icon={<Gauge aria-hidden="true" className="h-5 w-5" />}
          title="Dashboard data is not connected"
        />
      ) : (
        <div className="grid gap-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard
              icon={<Gauge aria-hidden="true" className="h-5 w-5" />}
              label="Active assets"
              tone="primary"
              value={dashboard.summary.totalActiveAssets}
            />
            <MetricCard
              icon={<ClipboardCheck aria-hidden="true" className="h-5 w-5" />}
              label="Due soon"
              tone="warning"
              value={dashboard.summary.maintenanceDueSoon}
            />
            <MetricCard
              icon={<AlertTriangle aria-hidden="true" className="h-5 w-5" />}
              label="Overdue"
              tone="danger"
              value={dashboard.summary.overdueMaintenance}
            />
            <MetricCard
              icon={<FileText aria-hidden="true" className="h-5 w-5" />}
              label="Docs expiring"
              tone="warning"
              value={dashboard.summary.documentsExpiringSoon}
            />
            <MetricCard
              icon={<FileText aria-hidden="true" className="h-5 w-5" />}
              label="Docs expired"
              tone="danger"
              value={dashboard.summary.expiredDocuments}
            />
            <MetricCard
              icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
              label="Missing compliance"
              tone="warning"
              value={dashboard.summary.missingComplianceItems}
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Needs attention</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.attentionItems.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-background p-4 text-sm leading-6 text-muted">
                    No overdue, expired, missing, or due-soon items right now.
                  </p>
                ) : (
                  <ol className="divide-y divide-border">
                    {dashboard.attentionItems.map((item) => (
                      <AttentionRow item={item} key={item.id} />
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fleet status</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.fleetStatus.length === 0 ? (
                  <p className="text-sm text-muted">No active assets yet.</p>
                ) : (
                  <ol className="divide-y divide-border">
                    {dashboard.fleetStatus.slice(0, 8).map((asset) => (
                      <li
                        className="flex items-start justify-between gap-3 py-3"
                        key={asset.id}
                      >
                        <div>
                          <Link
                            className="text-sm font-semibold text-foreground hover:text-primary"
                            href={asset.href}
                          >
                            {asset.unitNumber} {asset.assetName}
                          </Link>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            {asset.reasons[0] ?? "No active attention items."}
                          </p>
                        </div>
                        <StatusBadge status={asset.status} />
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 xl:grid-cols-4">
            <ActivityList
              items={dashboard.recentMaintenance}
              title="Recent maintenance"
            />
            <ActivityList items={dashboard.recentDocuments} title="Recent documents" />
            <ActivityList items={dashboard.recentCompliance} title="Recent compliance" />
            <ActivityList
              items={dashboard.recentMeterReadings}
              title="Recent meter readings"
            />
          </section>
        </div>
      )}
    </>
  );
}

function AttentionRow({ item }: { item: DashboardAttentionItem }) {
  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="font-semibold text-foreground hover:text-primary"
            href={item.href}
          >
            {item.title}
          </Link>
          <StatusBadge status={item.status} />
        </div>
        <p className="mt-1 text-sm text-muted">{item.assetLabel}</p>
        <p className="mt-1 text-sm leading-6 text-foreground">{item.description}</p>
      </div>
      <p className="font-mono text-sm text-muted">{item.dueValue}</p>
    </li>
  );
}

function ActivityList({
  title,
  items,
}: {
  title: string;
  items: DashboardRecentActivity[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm leading-6 text-muted">No recent activity.</p>
        ) : (
          <ol className="divide-y divide-border">
            {items.map((item) => (
              <li className="py-3" key={item.id}>
                <Link
                  className="text-sm font-semibold text-foreground hover:text-primary"
                  href={item.href}
                >
                  {item.label}
                </Link>
                <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatShortDate(item.occurredAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
