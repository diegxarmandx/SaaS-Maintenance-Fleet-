import Link from "next/link";
import type { ReactNode } from "react";
import { Archive, Download, FileText, Plus, Search } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
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
  DOCUMENT_SORT_OPTIONS,
  DOCUMENT_STATUS_FILTERS,
} from "@/features/documents/constants";
import { formatFileSize } from "@/features/documents/helpers";
import type { DocumentLibraryResult } from "@/features/documents/server/queries";
import type { FleetDocumentWithRelations } from "@/features/documents/types";
import { formatShortDate } from "@/features/fleet/helpers";

type DocumentLibraryPageProps = {
  library: DocumentLibraryResult;
};

export function DocumentLibraryPage({ library }: DocumentLibraryPageProps) {
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Documents" }]}
      />
      <PageHeader
        actions={
          <Link className={buttonClassName()} href="/documents/upload">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Upload
          </Link>
        }
        description="Store owner-controlled fleet files, link them to assets, maintenance records, or compliance records, and monitor expirations."
        eyebrow={library.companyName}
        title="Documents"
      />

      {!library.isConfigured ? (
        <EmptyState
          description="Configure Supabase environment variables and apply the migrations to use live document storage."
          icon={<FileText aria-hidden="true" className="h-5 w-5" />}
          title="Document storage is not connected"
        />
      ) : (
        <div className="grid gap-6">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              detail="Documents"
              label="Current"
              tone="success"
              value={library.counts.Current}
            />
            <MetricCard
              detail="Documents"
              label="Expiring soon"
              tone="warning"
              value={library.counts["Expiring soon"]}
            />
            <MetricCard
              detail="Documents"
              label="Expired"
              tone="danger"
              value={library.counts.Expired}
            />
            <MetricCard
              detail="Documents"
              label="Archived"
              tone="neutral"
              value={library.counts.Archived}
            />
          </section>

          <DocumentAttentionLists library={library} />

          <section className="rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
            <form
              action="/documents"
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
                    defaultValue={library.filters.query}
                    name="q"
                    placeholder="Name, number, asset"
                    type="search"
                  />
                </span>
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Category
                <Select defaultValue={library.filters.category} name="category">
                  <option value="">All categories</option>
                  {Array.from(
                    new Set(
                      library.allDocuments.map((document) => document.document_type),
                    ),
                  )
                    .sort((a, b) => a.localeCompare(b))
                    .map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                </Select>
              </label>
              <FilterAssetSelect
                assets={library.assets}
                label="Asset"
                name="assetId"
                value={library.filters.assetId}
              />
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Status
                <Select defaultValue={library.filters.status} name="status">
                  {DOCUMENT_STATUS_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Sort
                <Select defaultValue={library.filters.sort} name="sort">
                  {DOCUMENT_SORT_OPTIONS.map((option) => (
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

          {library.documents.length === 0 ? (
            <EmptyState
              action={
                <Link className={buttonClassName()} href="/documents/upload">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Upload first document
                </Link>
              }
              description="Upload fleet documents and connect them to the relevant asset or record."
              icon={<FileText aria-hidden="true" className="h-5 w-5" />}
              title="No documents found"
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  caption="Fleet document library"
                  columns={documentColumns}
                  rows={library.documents}
                />
              </div>
              <MobileCardList className="md:hidden">
                {library.documents.map((document) => (
                  <DocumentMobileCard document={document} key={document.id} />
                ))}
              </MobileCardList>
              <Pagination
                getHref={(page) => getDocumentPageHref(library, page)}
                page={library.filters.page}
                pageSize={library.pageSize}
                totalCount={library.totalCount}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

function DocumentAttentionLists({ library }: { library: DocumentLibraryResult }) {
  if (library.expiringDocuments.length === 0 && library.archivedDocuments.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <DocumentMiniList
        documents={library.expiringDocuments}
        emptyLabel="No expiring or expired documents."
        icon={<FileText aria-hidden="true" className="h-5 w-5 text-primary" />}
        title="Expiring documents"
      />
      <DocumentMiniList
        documents={library.archivedDocuments}
        emptyLabel="No archived documents."
        icon={<Archive aria-hidden="true" className="h-5 w-5 text-primary" />}
        title="Archived documents"
      />
    </section>
  );
}

function DocumentMiniList({
  title,
  emptyLabel,
  documents,
  icon,
}: {
  title: string;
  emptyLabel: string;
  documents: FleetDocumentWithRelations[];
  icon: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        {icon}
        {title}
      </h2>
      {documents.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{emptyLabel}</p>
      ) : (
        <ol className="mt-3 divide-y divide-border">
          {documents.map((document) => (
            <li
              className="flex items-center justify-between gap-3 py-3"
              key={document.id}
            >
              <div>
                <Link
                  className="text-sm font-medium text-foreground hover:text-primary"
                  href={`/documents/${document.id}`}
                >
                  {document.document_name}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  {document.expiration_date
                    ? formatShortDate(document.expiration_date)
                    : "No expiration"}
                </p>
              </div>
              <StatusBadge status={document.status} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const documentColumns: DataTableColumn<FleetDocumentWithRelations>[] = [
  {
    key: "name",
    header: "Document",
    cell: (document) => (
      <div>
        <Link
          className="font-semibold text-foreground hover:text-primary"
          href={`/documents/${document.id}`}
        >
          {document.document_name}
        </Link>
        <p className="mt-1 text-sm text-muted">{document.document_type}</p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (document) => <StatusBadge status={document.status} />,
  },
  {
    key: "asset",
    header: "Asset",
    cell: (document) => (
      <span className="text-sm text-foreground">
        {document.asset
          ? `${document.asset.unit_number} ${document.asset.asset_name}`
          : "General"}
      </span>
    ),
  },
  {
    key: "expiration",
    header: "Expiration",
    cell: (document) => (
      <span className="text-sm text-foreground">
        {document.expiration_date ? formatShortDate(document.expiration_date) : "None"}
      </span>
    ),
  },
  {
    key: "size",
    header: "Size",
    cell: (document) => (
      <span className="font-mono text-sm text-foreground">
        {formatFileSize(document.file_size)}
      </span>
    ),
  },
  {
    key: "download",
    header: <span className="sr-only">Download</span>,
    cell: (document) =>
      document.signedUrl ? (
        <a
          className={buttonClassName({ variant: "secondary", size: "sm" })}
          href={document.signedUrl}
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Download
        </a>
      ) : (
        <span className="text-sm text-muted">Unavailable</span>
      ),
  },
];

function DocumentMobileCard({ document }: { document: FleetDocumentWithRelations }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          className="font-semibold text-foreground hover:text-primary"
          href={`/documents/${document.id}`}
        >
          {document.document_name}
        </Link>
        <StatusBadge status={document.status} />
      </div>
      <p className="mt-1 text-sm text-muted">{document.document_type}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Asset</dt>
          <dd className="mt-1 font-medium text-foreground">
            {document.asset ? document.asset.unit_number : "General"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Expiration</dt>
          <dd className="mt-1 font-medium text-foreground">
            {document.expiration_date
              ? formatShortDate(document.expiration_date)
              : "None"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function FilterAssetSelect({
  assets,
  label,
  name,
  value,
}: {
  assets: DocumentLibraryResult["assets"];
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

function getDocumentPageHref(result: DocumentLibraryResult, page: number) {
  const params = new URLSearchParams();
  const { filters } = result;

  if (filters.query) params.set("q", filters.query);
  if (filters.category) params.set("category", filters.category);
  if (filters.assetId) params.set("assetId", filters.assetId);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.sort !== "created_desc") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));

  return params.toString() ? `/documents?${params.toString()}` : "/documents";
}
