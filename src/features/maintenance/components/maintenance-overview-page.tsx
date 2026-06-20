import Link from "next/link";
import { ClipboardCheck, FileText, Plus, Search, Wrench } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MobileCardList } from "@/components/ui/mobile-card-list";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  MAINTENANCE_RULE_SORT_OPTIONS,
  MAINTENANCE_STATUS_FILTERS,
} from "@/features/maintenance/constants";
import {
  formatCurrency,
  formatMeterValue,
  formatShortDate,
} from "@/features/fleet/helpers";
import type {
  MaintenanceHistoryResult,
  MaintenanceOverviewResult,
} from "@/features/maintenance/server/queries";
import type {
  MaintenanceRecordWithAsset,
  MaintenanceRuleWithAsset,
} from "@/features/maintenance/types";

type MaintenanceOverviewPageProps = {
  overview: MaintenanceOverviewResult;
  history: MaintenanceHistoryResult;
};

export function MaintenanceOverviewPage({
  overview,
  history,
}: MaintenanceOverviewPageProps) {
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Maintenance" }]}
      />
      <PageHeader
        actions={
          <>
            <Link
              className={buttonClassName({ variant: "secondary" })}
              href="/maintenance/complete"
            >
              <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
              Record completed
            </Link>
            <Link className={buttonClassName()} href="/maintenance/rules/new">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add rule
            </Link>
          </>
        }
        description="Track preventive maintenance intervals, upcoming reminders, completed maintenance, attachments, and owner costs."
        eyebrow={overview.companyName}
        title="Maintenance"
      />

      {!overview.isConfigured ? (
        <EmptyState
          description="Configure Supabase environment variables and apply the migrations to use live maintenance data."
          icon={<Wrench aria-hidden="true" className="h-5 w-5" />}
          title="Maintenance data is not connected"
        />
      ) : (
        <div className="grid gap-6">
          <section className="grid gap-3 sm:grid-cols-3">
            <CountCard count={overview.counts.Current} label="Current" />
            <CountCard count={overview.counts["Due soon"]} label="Due soon" />
            <CountCard count={overview.counts.Overdue} label="Overdue" />
          </section>

          <section className="rounded-lg border border-border bg-surface p-4">
            <form
              action="/maintenance"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(0,1fr)_180px_180px_170px_160px_auto]"
            >
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Search
                <span className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  />
                  <Input
                    className="pl-9"
                    defaultValue={overview.filters.query}
                    name="q"
                    placeholder="Rule, unit, asset"
                    type="search"
                  />
                </span>
              </label>
              <FilterAssetSelect
                assets={overview.assets}
                label="Asset"
                name="assetId"
                value={overview.filters.assetId}
              />
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Type
                <Input
                  defaultValue={overview.filters.maintenanceType}
                  name="type"
                  placeholder="Oil, tire, annual"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Status
                <Select defaultValue={overview.filters.status} name="status">
                  {MAINTENANCE_STATUS_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Sort
                <Select defaultValue={overview.filters.sort} name="sort">
                  {MAINTENANCE_RULE_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex items-end">
                <button
                  className={buttonClassName({ className: "w-full" })}
                  type="submit"
                >
                  Apply
                </button>
              </div>
            </form>
          </section>

          {overview.rules.length === 0 ? (
            <EmptyState
              action={
                <Link className={buttonClassName()} href="/maintenance/rules/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add first rule
                </Link>
              }
              description="Add preventive maintenance rules for assets you own."
              icon={<Wrench aria-hidden="true" className="h-5 w-5" />}
              title="No active maintenance rules"
            />
          ) : (
            <>
              <div className="hidden min-w-0 md:block">
                <DataTable
                  caption="Active maintenance rules"
                  columns={ruleColumns}
                  rows={overview.rules}
                />
              </div>
              <MobileCardList className="md:hidden">
                {overview.rules.map((rule) => (
                  <RuleMobileCard key={rule.id} rule={rule} />
                ))}
              </MobileCardList>
              <Pagination
                getHref={(page) => getRulePageHref(overview, page)}
                page={overview.filters.page}
                pageSize={overview.pageSize}
                totalCount={overview.totalCount}
              />
            </>
          )}

          <section id="history" className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Maintenance history
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Completed preventive maintenance and owner cost records.
                </p>
              </div>
              <Link
                className={buttonClassName({ variant: "secondary" })}
                href="/maintenance/complete"
              >
                <FileText aria-hidden="true" className="h-4 w-4" />
                Add record
              </Link>
            </div>
            <CostSummaryCards history={history} />
            <HistoryFilters history={history} />
            {history.records.length === 0 ? (
              <EmptyState
                description="Completed maintenance records will appear here after you enter service history."
                title="No completed maintenance found"
              />
            ) : (
              <>
                <div className="hidden min-w-0 md:block">
                  <DataTable
                    caption="Completed maintenance history"
                    columns={historyColumns}
                    rows={history.records}
                  />
                </div>
                <MobileCardList className="md:hidden">
                  {history.records.map((record) => (
                    <HistoryMobileCard key={record.id} record={record} />
                  ))}
                </MobileCardList>
                <Pagination
                  getHref={(page) => getHistoryPageHref(history, page)}
                  page={history.filters.page}
                  pageSize={history.pageSize}
                  totalCount={history.totalCount}
                />
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function CountCard({
  label,
  count,
}: {
  label: "Current" | "Due soon" | "Overdue";
  count: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <StatusBadge status={label} />
      <p className="mt-3 text-3xl font-semibold text-foreground">{count}</p>
      <p className="mt-1 text-sm text-muted">Active rules</p>
    </section>
  );
}

const ruleColumns: DataTableColumn<MaintenanceRuleWithAsset>[] = [
  {
    key: "rule",
    header: "Maintenance",
    cell: (rule) => (
      <div>
        <p className="font-semibold text-foreground">{rule.name}</p>
        <p className="mt-1 text-sm text-muted">
          {rule.asset.unit_number} {rule.asset.asset_name}
        </p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (rule) => <StatusBadge status={rule.status} />,
  },
  {
    key: "nextDue",
    header: "Next due",
    cell: (rule) => (
      <div className="text-sm text-foreground">
        <p>{formatShortDate(rule.next_due_date)}</p>
        <p className="mt-1 font-mono text-muted">
          {rule.next_due_mileage ? `${formatMeterValue(rule.next_due_mileage)} mi` : ""}
          {rule.next_due_hours ? ` ${formatMeterValue(rule.next_due_hours)} hrs` : ""}
        </p>
      </div>
    ),
  },
  {
    key: "last",
    header: "Last completed",
    cell: (rule) => (
      <span className="text-sm text-muted">
        {formatShortDate(rule.last_completed_date)}
      </span>
    ),
  },
  {
    key: "actions",
    header: <span className="sr-only">Actions</span>,
    cell: (rule) => (
      <Link
        className={buttonClassName({ variant: "secondary", size: "sm" })}
        href={`/maintenance/complete?ruleId=${rule.id}&assetId=${rule.asset_id}`}
      >
        Record
      </Link>
    ),
  },
];

const historyColumns: DataTableColumn<MaintenanceRecordWithAsset>[] = [
  {
    key: "record",
    header: "Record",
    cell: (record) => (
      <div>
        <Link
          className="font-semibold text-foreground hover:text-primary"
          href={`/maintenance/history/${record.id}`}
        >
          {record.maintenance_type}
        </Link>
        <p className="mt-1 text-sm text-muted">
          {record.asset.unit_number} {record.asset.asset_name}
        </p>
      </div>
    ),
  },
  {
    key: "date",
    header: "Completed",
    cell: (record) => (
      <span className="text-sm text-muted">
        {formatShortDate(record.completion_date)}
      </span>
    ),
  },
  {
    key: "provider",
    header: "Provider",
    cell: (record) => (
      <span className="text-sm text-foreground">
        {record.service_provider || "Not recorded"}
      </span>
    ),
  },
  {
    key: "cost",
    header: "Total",
    cell: (record) => (
      <span className="font-mono text-sm text-foreground">
        {formatCurrency(Number(record.total_cost))}
      </span>
    ),
  },
  {
    key: "attachment",
    header: "Attachment",
    cell: (record) =>
      record.attachment?.signedUrl ? (
        <a
          className="text-sm font-medium text-primary hover:underline"
          href={record.attachment.signedUrl}
        >
          Secure file
        </a>
      ) : (
        <span className="text-sm text-muted">None</span>
      ),
  },
];

function RuleMobileCard({ rule }: { rule: MaintenanceRuleWithAsset }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">{rule.name}</h3>
        <StatusBadge status={rule.status} />
      </div>
      <p className="mt-1 text-sm text-muted">
        {rule.asset.unit_number} {rule.asset.asset_name}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Next date</dt>
          <dd className="mt-1 font-medium text-foreground">
            {formatShortDate(rule.next_due_date)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Last done</dt>
          <dd className="mt-1 font-medium text-foreground">
            {formatShortDate(rule.last_completed_date)}
          </dd>
        </div>
      </dl>
      <Link
        className={buttonClassName({
          variant: "secondary",
          size: "sm",
          className: "mt-4 w-full",
        })}
        href={`/maintenance/complete?ruleId=${rule.id}&assetId=${rule.asset_id}`}
      >
        Record completed
      </Link>
    </article>
  );
}

function HistoryMobileCard({ record }: { record: MaintenanceRecordWithAsset }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            className="font-semibold text-foreground hover:text-primary"
            href={`/maintenance/history/${record.id}`}
          >
            {record.maintenance_type}
          </Link>
          <p className="mt-1 text-sm text-muted">
            {record.asset.unit_number} {record.asset.asset_name}
          </p>
        </div>
        <span className="font-mono text-sm text-foreground">
          {formatCurrency(Number(record.total_cost))}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted">
        Completed {formatShortDate(record.completion_date)}
      </p>
    </article>
  );
}

function FilterAssetSelect({
  assets,
  label,
  name,
  value,
}: {
  assets: MaintenanceOverviewResult["assets"];
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      <Select defaultValue={value} name={name}>
        <option value="">All assets</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.unit_number} {asset.asset_name}
          </option>
        ))}
      </Select>
    </label>
  );
}

function CostSummaryCards({ history }: { history: MaintenanceHistoryResult }) {
  return (
    <section className="grid gap-3 sm:grid-cols-5">
      <CostCard label="Total" value={history.costSummary.totalCost} />
      <CostCard label="Parts" value={history.costSummary.partsCost} />
      <CostCard label="Labor" value={history.costSummary.laborCost} />
      <CostCard label="Other" value={history.costSummary.otherCost} />
      <CostCard label="Tax" value={history.costSummary.taxCost} />
    </section>
  );
}

function CostCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold text-foreground">
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function HistoryFilters({ history }: { history: MaintenanceHistoryResult }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <form
        action="/maintenance#history"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(0,1fr)_180px_160px_150px_150px_130px_130px_auto]"
      >
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Search
          <Input
            defaultValue={history.filters.query}
            name="historyQ"
            placeholder="Type, provider, asset"
            type="search"
          />
        </label>
        <FilterAssetSelect
          assets={history.assets}
          label="Asset"
          name="historyAssetId"
          value={history.filters.assetId}
        />
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Type
          <Input
            defaultValue={history.filters.maintenanceType}
            name="historyType"
            placeholder="Oil"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          From
          <Input defaultValue={history.filters.dateFrom} name="dateFrom" type="date" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          To
          <Input defaultValue={history.filters.dateTo} name="dateTo" type="date" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Min cost
          <Input
            defaultValue={history.filters.minCost}
            min="0"
            name="minCost"
            type="number"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Max cost
          <Input
            defaultValue={history.filters.maxCost}
            min="0"
            name="maxCost"
            type="number"
          />
        </label>
        <div className="flex items-end">
          <button className={buttonClassName({ className: "w-full" })} type="submit">
            Apply
          </button>
        </div>
      </form>
    </section>
  );
}

function getRulePageHref(result: MaintenanceOverviewResult, page: number) {
  const params = new URLSearchParams();
  const { filters } = result;

  if (filters.query) params.set("q", filters.query);
  if (filters.assetId) params.set("assetId", filters.assetId);
  if (filters.maintenanceType) params.set("type", filters.maintenanceType);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.sort !== "urgency") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));

  return params.toString() ? `/maintenance?${params.toString()}` : "/maintenance";
}

function getHistoryPageHref(result: MaintenanceHistoryResult, page: number) {
  const params = new URLSearchParams();
  const { filters } = result;

  if (filters.query) params.set("historyQ", filters.query);
  if (filters.assetId) params.set("historyAssetId", filters.assetId);
  if (filters.maintenanceType) params.set("historyType", filters.maintenanceType);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.minCost) params.set("minCost", filters.minCost);
  if (filters.maxCost) params.set("maxCost", filters.maxCost);
  if (page > 1) params.set("historyPage", String(page));

  return params.toString()
    ? `/maintenance?${params.toString()}#history`
    : "/maintenance#history";
}
