import Link from "next/link";
import {
  Archive,
  ClipboardCheck,
  FileText,
  Gauge,
  Inbox,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationSubmit } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type { getAssetComplianceSnapshot } from "@/features/compliance/server/queries";
import type { getAssetDocumentSnapshot } from "@/features/documents/server/queries";
import { AssetPhoto } from "@/features/fleet/components/asset-photo";
import { MeterReadingForm } from "@/features/fleet/components/meter-reading-form";
import {
  formatCurrency,
  formatMeterValue,
  formatShortDate,
} from "@/features/fleet/helpers";
import { archiveAssetAction } from "@/features/fleet/server/actions";
import type { AssetProfile } from "@/features/fleet/types";
import {
  assetSections,
  getAssetTimeline,
  type AssetSection,
} from "@/features/inbox/asset-helpers";
import { AssetInboxPage } from "@/features/inbox/components/inbox-page";
import type { AssetInboxOverviewResult } from "@/features/inbox/server/queries";
import type { getAssetMaintenanceSnapshot } from "@/features/maintenance/server/queries";
import { cn } from "@/lib/utils";

type AssetProfilePageProps = {
  asset: AssetProfile;
  section: AssetSection;
  maintenanceSnapshot: Awaited<ReturnType<typeof getAssetMaintenanceSnapshot>>;
  complianceSnapshot: Awaited<ReturnType<typeof getAssetComplianceSnapshot>>;
  documentSnapshot: Awaited<ReturnType<typeof getAssetDocumentSnapshot>>;
  inboxSnapshot: AssetInboxOverviewResult;
};

const sectionLabels: Record<AssetSection, string> = {
  overview: "Overview",
  maintenance: "Maintenance",
  compliance: "Compliance",
  documents: "Documents",
  inbox: "Inbox",
};

export function AssetProfilePage({
  asset,
  section,
  maintenanceSnapshot,
  complianceSnapshot,
  documentSnapshot,
  inboxSnapshot,
}: AssetProfilePageProps) {
  const assetTitle = `${asset.unit_number} ${asset.asset_name}`;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Fleet", href: "/fleet" },
          { label: asset.unit_number },
        ]}
      />
      <PageHeader
        actions={
          <>
            <Link
              className={buttonClassName({ variant: "secondary" })}
              href={`/fleet/${asset.id}/edit`}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit
            </Link>
            <ConfirmationSubmit
              action={archiveAssetAction.bind(null, asset.id)}
              confirmLabel="Archive"
              message={`Archive ${asset.unit_number}? It will remain in history but leave the active fleet list when filtered.`}
            >
              <button className={buttonClassName({ variant: "danger" })} type="submit">
                <Archive aria-hidden="true" className="h-4 w-4" />
                Archive
              </button>
            </ConfirmationSubmit>
          </>
        }
        description={[
          asset.asset_type,
          [asset.year, asset.make, asset.model].filter(Boolean).join(" "),
        ]
          .filter(Boolean)
          .join(" | ")}
        eyebrow="Fleet asset"
        title={assetTitle}
      />

      <nav
        aria-label="Asset sections"
        className="mb-5 overflow-x-auto border-b border-border"
      >
        <div className="flex min-w-max gap-1">
          {assetSections.map((item) => (
            <Link
              aria-current={section === item ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 items-center gap-2 px-3 py-2 text-sm font-medium text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                section === item &&
                  "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary",
              )}
              href={
                item === "overview"
                  ? `/fleet/${asset.id}`
                  : `/fleet/${asset.id}?section=${item}`
              }
              key={item}
            >
              {sectionLabels[item]}
              {item === "inbox" && inboxSnapshot.pendingCount > 0 ? (
                <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-foreground">
                  {inboxSnapshot.pendingCount}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </nav>

      {section === "overview" ? (
        <OverviewSection
          asset={asset}
          complianceSnapshot={complianceSnapshot}
          documentSnapshot={documentSnapshot}
          inboxSnapshot={inboxSnapshot}
          maintenanceSnapshot={maintenanceSnapshot}
        />
      ) : null}
      {section === "maintenance" ? (
        <MaintenanceSection assetId={asset.id} snapshot={maintenanceSnapshot} />
      ) : null}
      {section === "compliance" ? (
        <ComplianceSection assetId={asset.id} snapshot={complianceSnapshot} />
      ) : null}
      {section === "documents" ? (
        <DocumentsSection assetId={asset.id} snapshot={documentSnapshot} />
      ) : null}
      {section === "inbox" ? (
        <AssetInboxPage assetId={asset.id} inbox={inboxSnapshot} />
      ) : null}
    </>
  );
}

function OverviewSection({
  asset,
  maintenanceSnapshot,
  complianceSnapshot,
  documentSnapshot,
  inboxSnapshot,
}: Omit<AssetProfilePageProps, "section">) {
  const timeline = getAssetTimeline({
    meterReadings: asset.meterReadings,
    maintenanceRecords: maintenanceSnapshot.recentRecords,
    complianceRecords: complianceSnapshot.items.flatMap((item) =>
      item.recordId
        ? [
            {
              id: item.recordId,
              compliance_type: item.compliance_type,
              effective_date: item.effective_date,
              expiration_date: item.expiration_date ?? asset.updated_at.slice(0, 10),
            },
          ]
        : [],
    ),
    documents: documentSnapshot.recentDocuments,
    completedInboxItems: inboxSnapshot.jobs.flatMap((job) =>
      job.completed_at
        ? [
            {
              id: job.id,
              title: job.detected_document_type ?? job.original_file_name,
              completed_at: job.completed_at,
              created_record_type: job.created_record_type,
              created_record_id: job.created_record_id,
            },
          ]
        : [],
    ),
  }).slice(0, 12);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5">
        <section className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <AssetPhoto
              alt={`${asset.unit_number} ${asset.asset_name}`}
              className="h-28 w-28 shrink-0"
              src={asset.assetImageUrl}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={asset.attentionStatus} />
                <span className="rounded-md border border-border bg-surface-muted px-2 py-1 text-xs font-medium text-foreground">
                  {asset.status}
                </span>
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Metric
                  label="Mileage"
                  value={`${formatMeterValue(asset.current_mileage)} mi`}
                />
                <Metric
                  label="Engine hours"
                  value={`${formatMeterValue(asset.current_engine_hours)} hrs`}
                />
                <Metric label="Plate" value={asset.license_plate || "Missing"} />
                <Metric
                  label="VIN or serial"
                  value={asset.vin_or_serial_number || "Missing"}
                />
                <Metric
                  label="Maintenance cost"
                  value={formatCurrency(maintenanceSnapshot.costSummary.totalCost)}
                />
                <Metric label="Updated" value={formatShortDate(asset.updated_at)} />
              </dl>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<ClipboardCheck aria-hidden="true" className="h-5 w-5" />}
            label="Maintenance rules"
            value={maintenanceSnapshot.rules.length}
          />
          <SummaryCard
            icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
            label="Compliance items"
            value={complianceSnapshot.items.length}
          />
          <SummaryCard
            icon={<FileText aria-hidden="true" className="h-5 w-5" />}
            label="Documents"
            value={documentSnapshot.recentDocuments.length}
          />
          <SummaryCard
            icon={<Inbox aria-hidden="true" className="h-5 w-5" />}
            label="Pending review"
            value={inboxSnapshot.pendingCount}
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Asset timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm leading-6 text-muted">
                Activity will appear here as paperwork, maintenance, compliance, and meter
                readings are recorded.
              </p>
            ) : (
              <ol className="divide-y divide-border">
                {timeline.map((item) => (
                  <li
                    className="grid gap-1 py-3 sm:grid-cols-[120px_1fr_auto]"
                    key={item.id}
                  >
                    <time className="text-sm text-muted">
                      {formatShortDate(item.date)}
                    </time>
                    <span className="text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="text-sm text-muted">{item.detail}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="grid content-start gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge aria-hidden="true" className="h-5 w-5 text-primary" />
              Add meter reading
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MeterReadingForm assetId={asset.id} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overview notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted">
            {asset.notes || "No notes recorded for this asset."}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function MaintenanceSection({
  assetId,
  snapshot,
}: {
  assetId: string;
  snapshot: Awaited<ReturnType<typeof getAssetMaintenanceSnapshot>>;
}) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <StatusBadge status={snapshot.status} />
          <p className="mt-2 text-sm text-muted">
            {snapshot.overdueItems.length} overdue · {snapshot.rules.length} active rules
          </p>
        </div>
        <Link className={buttonClassName()} href="/maintenance/complete">
          Record completed maintenance
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Maintenance rules</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.rules.length === 0 ? (
            <p className="text-sm text-muted">
              No maintenance rules are connected to this asset.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {snapshot.rules.map((rule) => (
                <li className="flex justify-between gap-3 py-3" key={rule.id}>
                  <span className="text-sm font-medium">{rule.name}</span>
                  <StatusBadge status={rule.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Completed maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.recentRecords.length === 0 ? (
            <p className="text-sm text-muted">No completed maintenance yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {snapshot.recentRecords.map((record) => (
                <li
                  className="flex items-center justify-between gap-3 py-3"
                  key={record.id}
                >
                  <Link
                    className="text-sm font-medium hover:text-primary"
                    href={`/maintenance/history/${record.id}`}
                  >
                    {record.maintenance_type}
                  </Link>
                  <span className="font-mono text-sm">
                    {formatCurrency(record.total_cost)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Link
        className="text-sm font-medium text-primary hover:underline"
        href={`/fleet/${assetId}?section=inbox`}
      >
        Upload maintenance paperwork through this asset&apos;s Inbox
      </Link>
    </div>
  );
}

function ComplianceSection({
  assetId,
  snapshot,
}: {
  assetId: string;
  snapshot: Awaited<ReturnType<typeof getAssetComplianceSnapshot>>;
}) {
  return (
    <div className="grid gap-5">
      <div>
        <StatusBadge status={snapshot.status} />
        <p className="mt-2 text-sm text-muted">
          {snapshot.expiredItems.length} expired · {snapshot.missingItems.length} missing
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Compliance records</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.items.length === 0 ? (
            <p className="text-sm text-muted">
              No compliance requirements are connected to this asset.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {snapshot.items.map((item) => (
                <li className="flex justify-between gap-3 py-3" key={item.id}>
                  <div>
                    <p className="text-sm font-medium">{item.compliance_type}</p>
                    <p className="mt-1 text-xs text-muted">
                      {item.expiration_date
                        ? `Expires ${formatShortDate(item.expiration_date)}`
                        : "Expiration date missing"}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Link
        className="text-sm font-medium text-primary hover:underline"
        href={`/fleet/${assetId}?section=inbox`}
      >
        Upload compliance paperwork through this asset&apos;s Inbox
      </Link>
    </div>
  );
}

function DocumentsSection({
  assetId,
  snapshot,
}: {
  assetId: string;
  snapshot: Awaited<ReturnType<typeof getAssetDocumentSnapshot>>;
}) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Private documents connected to this asset.</p>
        <Link className={buttonClassName()} href={`/fleet/${assetId}/upload`}>
          Upload paperwork
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.recentDocuments.length === 0 ? (
            <p className="text-sm text-muted">
              No documents have been linked to this asset.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {snapshot.recentDocuments.map((document) => (
                <li
                  className="flex items-center justify-between gap-3 py-3"
                  key={document.id}
                >
                  <Link
                    className="min-w-0 break-words text-sm font-medium hover:text-primary"
                    href={`/documents/${document.id}`}
                  >
                    {document.document_name}
                  </Link>
                  <StatusBadge status={document.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 break-words font-medium text-foreground">{value}</dd>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4">
        <span className="text-primary">{icon}</span>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-sm text-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
