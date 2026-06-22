import Link from "next/link";
import {
  AlertTriangle,
  CreditCard,
  Gauge,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { AssetPhoto } from "@/features/fleet/components/asset-photo";
import {
  ASSET_LIST_STATUS_FILTERS,
  DEFAULT_ASSET_TYPES,
  FLEET_SORT_OPTIONS,
} from "@/features/fleet/constants";
import { formatMeterValue, formatShortDate } from "@/features/fleet/helpers";
import type { FleetListResult } from "@/features/fleet/server/queries";
import type { FleetAssetListItem } from "@/features/fleet/types";
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

type FleetListPageProps = {
  result: FleetListResult;
};

export function FleetListPage({ result }: FleetListPageProps) {
  const { assets, filters } = result;
  const canCreateAsset = result.subscription?.canCreateActiveAsset ?? true;
  const hasFilters = Boolean(
    filters.query || filters.assetType || filters.status !== "all",
  );

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Fleet" }]}
      />
      <PageHeader
        actions={
          canCreateAsset ? (
            <Link className={buttonClassName()} href="/fleet/new">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add asset
            </Link>
          ) : (
            <Link
              className={buttonClassName({ variant: "secondary" })}
              href="/settings#subscription"
            >
              <CreditCard aria-hidden="true" className="h-4 w-4" />
              Review plan
            </Link>
          )
        }
        description="Track vehicles, trailers, and equipment with owner-managed meter values, documents, and maintenance context."
        eyebrow={result.companyName}
        title="Fleet assets"
      />

      {result.subscription?.reason ? (
        <section className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-warning"
            />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">
                Active asset limit
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {result.subscription.reason}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {result.subscription.activeAssetCount} active of{" "}
                {result.subscription.assetLimit} allowed.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
        <form
          action="/fleet"
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_190px_auto]"
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
                defaultValue={filters.query}
                name="q"
                placeholder="Unit, name, plate, serial"
                type="search"
              />
            </span>
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Status
            <Select defaultValue={filters.status} name="status">
              {ASSET_LIST_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Type
            <Select defaultValue={filters.assetType} name="assetType">
              <option value="">All types</option>
              {DEFAULT_ASSET_TYPES.map((assetType) => (
                <option key={assetType} value={assetType}>
                  {assetType}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Sort
            <Select defaultValue={filters.sort} name="sort">
              {FLEET_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-end">
            <button className={buttonClassName({ className: "w-full" })} type="submit">
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              Apply
            </button>
          </div>
        </form>
      </section>

      {!result.isConfigured ? (
        <EmptyState
          description="Configure Supabase environment variables and apply the migrations to use live fleet asset data."
          icon={<Gauge aria-hidden="true" className="h-5 w-5" />}
          title="Fleet data is not connected"
        />
      ) : assets.length === 0 ? (
        <EmptyState
          action={
            canCreateAsset ? (
              <Link className={buttonClassName()} href="/fleet/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add first asset
              </Link>
            ) : (
              <Link
                className={buttonClassName({ variant: "secondary" })}
                href="/settings#subscription"
              >
                <CreditCard aria-hidden="true" className="h-4 w-4" />
                Review plan
              </Link>
            )
          }
          description={
            hasFilters
              ? "No assets match the current search and filters."
              : "Add the vehicles, trailers, and equipment you personally manage."
          }
          icon={<Gauge aria-hidden="true" className="h-5 w-5" />}
          title={hasFilters ? "No matching assets" : "No assets yet"}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable caption="Fleet assets" columns={assetColumns} rows={assets} />
          </div>
          <MobileCardList className="md:hidden">
            {assets.map((asset) => (
              <AssetMobileCard asset={asset} key={asset.id} />
            ))}
          </MobileCardList>
          <Pagination
            getHref={(page) => getFleetPageHref(result, page)}
            page={filters.page}
            pageSize={result.pageSize}
            totalCount={result.totalCount}
          />
        </>
      )}
    </>
  );
}

const assetColumns: DataTableColumn<FleetAssetListItem>[] = [
  {
    key: "asset",
    header: "Asset",
    cell: (asset) => (
      <div className="flex items-center gap-3">
        <AssetPhoto
          alt={`${asset.unit_number} ${asset.asset_name}`}
          className="h-12 w-12"
          src={asset.assetImageUrl}
        />
        <div className="min-w-0">
          <Link
            className="font-semibold text-foreground hover:text-primary"
            href={`/fleet/${asset.id}`}
          >
            {asset.unit_number}
          </Link>
          <p className="mt-1 text-sm text-muted">{asset.asset_name}</p>
          <p className="mt-1 text-xs text-muted">
            {[asset.year, asset.make, asset.model].filter(Boolean).join(" ") ||
              "Details missing"}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
    cell: (asset) => (
      <span className="font-medium text-foreground">{asset.asset_type}</span>
    ),
  },
  {
    key: "identifier",
    header: "Plate or serial",
    cell: (asset) => (
      <div className="text-sm text-foreground">
        <p>{asset.license_plate || "Plate missing"}</p>
        <p className="mt-1 text-xs text-muted">
          {asset.vin_or_serial_number || "Serial missing"}
        </p>
      </div>
    ),
  },
  {
    key: "meters",
    header: "Meters",
    cell: (asset) => (
      <div className="font-mono text-sm text-foreground">
        <p>{formatMeterValue(asset.current_mileage)} mi</p>
        <p className="mt-1 text-muted">
          {formatMeterValue(asset.current_engine_hours)} hrs
        </p>
      </div>
    ),
  },
  {
    key: "attention",
    header: "Attention",
    cell: (asset) => <StatusBadge status={asset.attentionStatus} />,
  },
  {
    key: "updated",
    header: "Updated",
    cell: (asset) => (
      <span className="text-sm text-muted">{formatShortDate(asset.updated_at)}</span>
    ),
  },
  {
    key: "actions",
    header: <span className="sr-only">Actions</span>,
    cell: (asset) => (
      <Link
        className={buttonClassName({ variant: "secondary", size: "sm" })}
        href={`/fleet/${asset.id}`}
      >
        View
      </Link>
    ),
  },
];

function AssetMobileCard({ asset }: { asset: FleetAssetListItem }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AssetPhoto
          alt={`${asset.unit_number} ${asset.asset_name}`}
          className="h-14 w-14"
          src={asset.assetImageUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="font-semibold text-foreground hover:text-primary"
              href={`/fleet/${asset.id}`}
            >
              {asset.unit_number}
            </Link>
            <StatusBadge status={asset.attentionStatus} />
          </div>
          <p className="mt-1 text-sm text-muted">{asset.asset_name}</p>
          <p className="mt-1 text-sm text-foreground">
            {[asset.year, asset.make, asset.model].filter(Boolean).join(" ") ||
              asset.asset_type}
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Type</dt>
          <dd className="mt-1 font-medium text-foreground">{asset.asset_type}</dd>
        </div>
        <div>
          <dt className="text-muted">Plate</dt>
          <dd className="mt-1 font-medium text-foreground">
            {asset.license_plate || "Missing"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Mileage</dt>
          <dd className="mt-1 font-mono text-foreground">
            {formatMeterValue(asset.current_mileage)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Hours</dt>
          <dd className="mt-1 font-mono text-foreground">
            {formatMeterValue(asset.current_engine_hours)}
          </dd>
        </div>
      </dl>
      <Link
        className={buttonClassName({
          variant: "secondary",
          size: "sm",
          className: "mt-4 w-full",
        })}
        href={`/fleet/${asset.id}`}
      >
        View asset
      </Link>
    </article>
  );
}

function getFleetPageHref(result: FleetListResult, page: number) {
  const params = new URLSearchParams();
  const { filters } = result;

  if (filters.query) {
    params.set("q", filters.query);
  }
  if (filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.assetType) {
    params.set("assetType", filters.assetType);
  }
  if (filters.sort !== "updated_desc") {
    params.set("sort", filters.sort);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `/fleet?${queryString}` : "/fleet";
}
