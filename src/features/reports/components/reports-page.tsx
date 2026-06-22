import Link from "next/link";
import { BarChart3, Download, FileSpreadsheet, Filter, Save } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { updateReportPreferencesAction } from "@/features/reports/actions";
import type {
  ReportData,
  ReportFilters,
  ReportRow,
} from "@/features/reports/server/queries";
import { formatReportAmount } from "@/features/reports/server/queries";
import { PrintButton } from "@/features/reports/components/print-button";

type ReportsPageViewProps = {
  reports: ReportData;
};

const reportColumns: DataTableColumn<ReportRow>[] = [
  {
    key: "asset",
    header: "Asset",
    cell: (row) => row.asset,
  },
  {
    key: "label",
    header: "Item",
    cell: (row) => (
      <Link className="font-semibold text-foreground hover:text-primary" href={row.href}>
        {row.label}
      </Link>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (row) => row.category,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <ReportStatus status={row.status} />,
  },
  {
    key: "date",
    header: "Date",
    cell: (row) => row.date ?? "Not set",
  },
  {
    key: "amount",
    header: "Amount",
    cell: (row) => formatReportAmount(row.amount),
    className: "text-right",
  },
];

export function ReportsPageView({ reports }: ReportsPageViewProps) {
  const exportHref = (type: string) => buildExportHref(type, reports.filters);

  return (
    <>
      <Breadcrumbs items={[{ label: "Reports" }]} />
      <div className="print:hidden">
        <PageHeader
          actions={
            reports.isConfigured ? (
              <>
                <Link
                  className={buttonClassName({ variant: "secondary" })}
                  href={exportHref("history")}
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  CSV
                </Link>
                <PrintButton />
              </>
            ) : null
          }
          description="Owner-facing reports for maintenance, compliance, documents, and asset history."
          eyebrow={reports.companyName}
          title="Reports"
        />
      </div>
      <div className="hidden print:block">
        <h1 className="text-2xl font-semibold">Maintly reports</h1>
        <p className="mt-1 text-sm text-muted">
          {reports.companyName} · Generated {new Date().toISOString().slice(0, 10)}
        </p>
      </div>

      {!reports.isConfigured ? (
        <EmptyState
          description="Configure Supabase environment variables and apply the migrations to use live reports."
          icon={<FileSpreadsheet aria-hidden="true" className="h-5 w-5" />}
          title="Reports are not connected"
        />
      ) : (
        <div className="grid gap-6">
          <ReportFiltersForm reports={reports} />
          <ReportPreferencesForm reports={reports} />

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric
              label="Upcoming maintenance"
              value={reports.upcomingMaintenance.length}
            />
            <Metric
              label="Overdue maintenance"
              value={reports.overdueMaintenance.length}
            />
            <Metric label="Expired compliance" value={reports.expiredCompliance.length} />
            <Metric
              label="Missing compliance"
              value={reports.missingRequirements.length}
            />
            <Metric label="Expired documents" value={reports.expiredDocuments.length} />
          </section>

          {reports.preference.show_charts_by_default ? (
            <section className="grid gap-5 xl:grid-cols-3">
              <BarChartCard
                amount
                items={reports.maintenanceCostsByAsset}
                title="Maintenance cost by asset"
              />
              <BarChartCard
                amount
                items={reports.maintenanceCostsByCategory}
                title="Maintenance cost by category"
              />
              <BarChartCard
                items={reports.documentsByCategory.map((item) => ({
                  label: item.label,
                  value: item.count,
                }))}
                title="Documents by category"
              />
            </section>
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <ReportTable
              exportHref={exportHref("maintenance")}
              rows={[
                ...reports.overdueMaintenance,
                ...reports.upcomingMaintenance,
                ...reports.completedMaintenance,
              ]}
              title="Maintenance report"
            />
            <SummaryList
              amount
              emptyLabel="No maintenance costs in this filter."
              items={reports.maintenanceCostsByAsset}
              title="Costs by asset"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <ReportTable
              exportHref={exportHref("compliance")}
              rows={[
                ...reports.expiredCompliance,
                ...reports.missingRequirements,
                ...reports.expiringCompliance,
                ...reports.complianceStatus.filter(
                  (row) =>
                    row.status !== "Expired" &&
                    row.status !== "Missing" &&
                    row.status !== "Expiring soon",
                ),
              ]}
              title="Compliance report"
            />
            <SummaryList
              emptyLabel="No compliance categories in this filter."
              items={[
                { label: "Expired", count: reports.expiredCompliance.length },
                { label: "Expiring soon", count: reports.expiringCompliance.length },
                { label: "Missing", count: reports.missingRequirements.length },
              ]}
              title="Compliance status"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <ReportTable
              exportHref={exportHref("documents")}
              rows={[
                ...reports.expiredDocuments,
                ...reports.expiringDocuments,
                ...reports.documents.filter(
                  (row) => row.status !== "Expired" && row.status !== "Expiring soon",
                ),
              ]}
              title="Document report"
            />
            <SummaryList
              emptyLabel="No document categories in this filter."
              items={reports.documentsByCategory}
              title="Documents by category"
            />
          </section>

          <ReportTable
            exportHref={exportHref("history")}
            rows={reports.assetHistory}
            title="Asset history"
          />
        </div>
      )}
    </>
  );
}

function ReportPreferencesForm({ reports }: { reports: ReportData }) {
  return (
    <form
      action={updateReportPreferencesAction}
      className="print:hidden grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm lg:grid-cols-[minmax(180px,1fr)_180px_auto_auto]"
    >
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Default asset
        <Select
          defaultValue={reports.preference.default_asset_id ?? ""}
          name="defaultAssetId"
        >
          <option value="">All assets</option>
          {reports.assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.unit_number} {asset.asset_name}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Default lookback days
        <Input
          defaultValue={reports.preference.default_lookback_days}
          max="3650"
          min="0"
          name="defaultLookbackDays"
          type="number"
        />
      </label>
      <label className="flex items-end gap-3 pb-3 text-sm font-medium text-foreground">
        <input
          className="h-4 w-4 rounded border-border text-primary"
          defaultChecked={reports.preference.show_charts_by_default}
          name="showChartsByDefault"
          type="checkbox"
        />
        Show charts
      </label>
      <button
        className={buttonClassName({ variant: "secondary", className: "self-end" })}
        type="submit"
      >
        <Save aria-hidden="true" className="h-4 w-4" />
        Save defaults
      </button>
    </form>
  );
}

function ReportFiltersForm({ reports }: { reports: ReportData }) {
  return (
    <form
      action="/reports"
      className="print:hidden grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm lg:grid-cols-[minmax(180px,1fr)_160px_160px_auto_auto]"
    >
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Asset
        <Select defaultValue={reports.filters.assetId} name="assetId">
          <option value="">All assets</option>
          {reports.assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.unit_number} {asset.asset_name}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        From
        <Input defaultValue={reports.filters.from} name="from" type="date" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        To
        <Input defaultValue={reports.filters.to} name="to" type="date" />
      </label>
      <button className={buttonClassName({ className: "self-end" })} type="submit">
        <Filter aria-hidden="true" className="h-4 w-4" />
        Filter
      </button>
      <Link
        className={buttonClassName({ variant: "ghost", className: "self-end" })}
        href="/reports"
      >
        Clear
      </Link>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <p className="text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </section>
  );
}

function ReportTable({
  title,
  rows,
  exportHref,
}: {
  title: string;
  rows: ReportRow[];
  exportHref: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        <Link
          className={buttonClassName({ variant: "secondary", size: "sm" })}
          href={exportHref}
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Export
        </Link>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background p-4 text-sm leading-6 text-muted">
            No records match the current filters.
          </p>
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable
                caption={title}
                columns={reportColumns}
                rows={rows.slice(0, 100)}
              />
            </div>
            <div className="grid gap-3 md:hidden">
              {rows.slice(0, 100).map((row) => (
                <article
                  className="rounded-lg border border-border bg-surface-subtle p-3"
                  key={row.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        className="font-semibold text-foreground hover:text-primary"
                        href={row.href}
                      >
                        {row.label}
                      </Link>
                      <p className="mt-1 text-sm text-muted">{row.asset}</p>
                    </div>
                    <ReportStatus status={row.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted">Category</dt>
                      <dd className="mt-1 font-medium text-foreground">{row.category}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Date</dt>
                      <dd className="mt-1 font-medium text-foreground">
                        {row.date ?? "Not set"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted">Amount</dt>
                      <dd className="mt-1 font-mono font-medium text-foreground">
                        {formatReportAmount(row.amount)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryList({
  title,
  items,
  emptyLabel,
  amount = false,
}: {
  title: string;
  items: Array<{ label: string; count?: number; amount?: number }>;
  emptyLabel: string;
  amount?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm leading-6 text-muted">{emptyLabel}</p>
        ) : (
          <ol className="divide-y divide-border">
            {items.slice(0, 8).map((item) => (
              <li
                className="flex items-center justify-between gap-3 py-3"
                key={item.label}
              >
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="font-mono text-sm text-muted">
                  {amount ? formatReportAmount(item.amount ?? 0) : (item.count ?? 0)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function BarChartCard({
  title,
  items,
  amount = false,
}: {
  title: string;
  items: Array<{ label: string; amount?: number; value?: number }>;
  amount?: boolean;
}) {
  const normalizedItems = items
    .map((item) => ({
      label: item.label,
      value: item.amount ?? item.value ?? 0,
    }))
    .filter((item) => item.value > 0)
    .slice(0, 6);
  const maxValue = Math.max(...normalizedItems.map((item) => item.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <BarChart3 aria-hidden="true" className="h-4 w-4 text-primary" />
            {title}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {normalizedItems.length === 0 ? (
          <p className="text-sm leading-6 text-muted">
            No chartable data in this filter.
          </p>
        ) : (
          <figure aria-label={title} className="grid gap-3">
            {normalizedItems.map((item, index) => (
              <div className="grid gap-1" key={item.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-foreground">
                    {item.label}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {amount ? formatReportAmount(item.value) : item.value}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-surface-muted">
                  <div
                    aria-hidden="true"
                    className={
                      index % 2 === 0
                        ? "h-3 rounded-full bg-primary"
                        : "h-3 rounded-full bg-accent"
                    }
                    style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </figure>
        )}
      </CardContent>
    </Card>
  );
}

function ReportStatus({ status }: { status: string }) {
  const tone =
    status === "Overdue" || status === "Expired"
      ? "border-danger/25 bg-danger/10 text-danger"
      : status === "Due soon" || status === "Expiring soon"
        ? "border-accent/35 bg-accent/10 text-accent-foreground"
        : status === "Missing"
          ? "border-info/25 bg-info/10 text-info"
          : "border-primary/25 bg-primary/10 text-primary";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-md border px-2 py-1 text-xs font-medium ${tone}`}
    >
      {status}
    </span>
  );
}

function buildExportHref(type: string, filters: ReportFilters) {
  const params = new URLSearchParams({ type });

  if (filters.assetId) params.set("assetId", filters.assetId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  return `/reports/export?${params.toString()}`;
}
