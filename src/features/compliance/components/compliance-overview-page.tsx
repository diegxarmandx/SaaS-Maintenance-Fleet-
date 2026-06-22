import Link from "next/link";
import { Archive, FileText, Plus, Search, ShieldCheck } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { ConfirmationSubmit } from "@/components/ui/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MobileCardList } from "@/components/ui/mobile-card-list";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  COMPLIANCE_SORT_OPTIONS,
  COMPLIANCE_STATUS_FILTERS,
} from "@/features/compliance/constants";
import { archiveComplianceRequirementAction } from "@/features/compliance/server/actions";
import type { ComplianceOverviewResult } from "@/features/compliance/server/queries";
import type { ComplianceOverviewItem } from "@/features/compliance/types";
import { formatShortDate } from "@/features/fleet/helpers";

type ComplianceOverviewPageProps = {
  overview: ComplianceOverviewResult;
};

export function ComplianceOverviewPage({ overview }: ComplianceOverviewPageProps) {
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Compliance" }]}
      />
      <PageHeader
        actions={
          <>
            <Link
              className={buttonClassName({ variant: "secondary" })}
              href="/compliance/requirements/new"
            >
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Assign requirement
            </Link>
            <Link className={buttonClassName()} href="/compliance/new">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add record
            </Link>
          </>
        }
        description="Track owner-entered registrations, permits, insurance, inspections, certifications, expirations, and supporting documents."
        eyebrow={overview.companyName}
        title="Compliance"
      />

      {!overview.isConfigured ? (
        <EmptyState
          description="Configure Supabase environment variables and apply the migrations to use live compliance data."
          icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
          title="Compliance data is not connected"
        />
      ) : (
        <div className="grid gap-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              detail="Compliance items"
              label="Current"
              tone="success"
              value={overview.counts.Current}
            />
            <MetricCard
              detail="Compliance items"
              label="Expiring soon"
              tone="warning"
              value={overview.counts["Expiring soon"]}
            />
            <MetricCard
              detail="Compliance items"
              label="Expired"
              tone="danger"
              value={overview.counts.Expired}
            />
            <MetricCard
              detail="Compliance items"
              label="Missing"
              tone="warning"
              value={overview.counts.Missing}
            />
            <MetricCard
              detail="Compliance items"
              label="Archived"
              tone="neutral"
              value={overview.counts.Archived}
            />
          </section>

          <section className="rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
            <form
              action="/compliance"
              className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_170px_170px_auto]"
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
                    placeholder="Type, issuer, asset"
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
                <Select defaultValue={overview.filters.complianceType} name="type">
                  <option value="">All types</option>
                  {overview.complianceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Status
                <Select defaultValue={overview.filters.status} name="status">
                  {COMPLIANCE_STATUS_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Sort
                <Select defaultValue={overview.filters.sort} name="sort">
                  {COMPLIANCE_SORT_OPTIONS.map((option) => (
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

          {overview.items.length === 0 ? (
            <EmptyState
              action={
                <Link className={buttonClassName()} href="/compliance/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add first record
                </Link>
              }
              description="Add compliance records or assign required compliance categories to assets you own."
              icon={<FileText aria-hidden="true" className="h-5 w-5" />}
              title="No compliance items found"
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  caption="Compliance records and assigned requirements"
                  columns={complianceColumns}
                  rows={overview.items}
                />
              </div>
              <MobileCardList className="md:hidden">
                {overview.items.map((item) => (
                  <ComplianceMobileCard item={item} key={item.id} />
                ))}
              </MobileCardList>
              <Pagination
                getHref={(page) => getCompliancePageHref(overview, page)}
                page={overview.filters.page}
                pageSize={overview.pageSize}
                totalCount={overview.totalCount}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

const complianceColumns: DataTableColumn<ComplianceOverviewItem>[] = [
  {
    key: "type",
    header: "Compliance",
    cell: (item) => (
      <div>
        {item.recordId ? (
          <Link
            className="font-semibold text-foreground hover:text-primary"
            href={`/compliance/${item.recordId}`}
          >
            {item.compliance_type}
          </Link>
        ) : (
          <p className="font-semibold text-foreground">{item.compliance_type}</p>
        )}
        <p className="mt-1 text-sm text-muted">
          {item.asset.unit_number} {item.asset.asset_name}
        </p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (item) => <StatusBadge status={item.status} />,
  },
  {
    key: "expiration",
    header: "Expiration",
    cell: (item) => (
      <span className="text-sm text-foreground">
        {item.expiration_date ? formatShortDate(item.expiration_date) : "Not recorded"}
      </span>
    ),
  },
  {
    key: "issuer",
    header: "Issuer",
    cell: (item) => (
      <span className="text-sm text-foreground">
        {item.issuing_organization || "Not recorded"}
      </span>
    ),
  },
  {
    key: "document",
    header: "Document",
    cell: (item) =>
      item.document?.signedUrl ? (
        <a
          className="text-sm font-medium text-primary hover:underline"
          href={item.document.signedUrl}
        >
          Secure file
        </a>
      ) : (
        <span className="text-sm text-muted">None</span>
      ),
  },
  {
    key: "actions",
    header: <span className="sr-only">Actions</span>,
    cell: (item) => <ComplianceItemAction item={item} />,
  },
];

function ComplianceItemAction({ item }: { item: ComplianceOverviewItem }) {
  if (item.recordId) {
    return (
      <Link
        className={buttonClassName({ variant: "secondary", size: "sm" })}
        href={`/compliance/${item.recordId}`}
      >
        View
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        className={buttonClassName({ variant: "secondary", size: "sm" })}
        href={`/compliance/new?assetId=${item.asset_id}&requirementId=${item.requirementId ?? ""}&type=${encodeURIComponent(item.compliance_type)}`}
      >
        Add record
      </Link>
      {item.requirementId ? (
        <ConfirmationSubmit
          action={archiveComplianceRequirementAction.bind(null, item.requirementId)}
          confirmLabel="Archive"
          message="Archive this assigned requirement? It will leave the active compliance overview."
        >
          <button
            className={buttonClassName({ variant: "danger", size: "sm" })}
            type="submit"
          >
            <Archive aria-hidden="true" className="h-4 w-4" />
            Archive
          </button>
        </ConfirmationSubmit>
      ) : null}
    </div>
  );
}

function ComplianceMobileCard({ item }: { item: ComplianceOverviewItem }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">{item.compliance_type}</h3>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-1 text-sm text-muted">
        {item.asset.unit_number} {item.asset.asset_name}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Expiration</dt>
          <dd className="mt-1 font-medium text-foreground">
            {item.expiration_date ? formatShortDate(item.expiration_date) : "Missing"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Issuer</dt>
          <dd className="mt-1 font-medium text-foreground">
            {item.issuing_organization || "Not recorded"}
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <ComplianceItemAction item={item} />
      </div>
    </article>
  );
}

function FilterAssetSelect({
  assets,
  label,
  name,
  value,
}: {
  assets: ComplianceOverviewResult["assets"];
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

function getCompliancePageHref(result: ComplianceOverviewResult, page: number) {
  const params = new URLSearchParams();
  const { filters } = result;

  if (filters.query) params.set("q", filters.query);
  if (filters.assetId) params.set("assetId", filters.assetId);
  if (filters.complianceType) params.set("type", filters.complianceType);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.sort !== "expiration_asc") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));

  return params.toString() ? `/compliance?${params.toString()}` : "/compliance";
}
