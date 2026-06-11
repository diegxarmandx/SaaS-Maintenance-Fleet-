import Link from "next/link";
import type { ReactNode } from "react";
import {
  Archive,
  ClipboardCheck,
  DollarSign,
  FileText,
  Gauge,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import { ConfirmationSubmit } from "@/components/ui/confirmation-dialog";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { AssetPhoto } from "@/features/fleet/components/asset-photo";
import { MeterReadingForm } from "@/features/fleet/components/meter-reading-form";
import {
  formatCurrency,
  formatMeterValue,
  formatShortDate,
} from "@/features/fleet/helpers";
import { archiveAssetAction } from "@/features/fleet/server/actions";
import type { AssetProfile } from "@/features/fleet/types";
import type { getAssetMaintenanceSnapshot } from "@/features/maintenance/server/queries";

type AssetProfilePageProps = {
  asset: AssetProfile;
  maintenanceSnapshot: Awaited<ReturnType<typeof getAssetMaintenanceSnapshot>>;
};

export function AssetProfilePage({ asset, maintenanceSnapshot }: AssetProfilePageProps) {
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-5">
          <section className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <AssetPhoto
                alt={assetTitle}
                className="h-28 w-28 shrink-0"
                src={asset.assetImageUrl}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={asset.attentionStatus} />
                  <span className="rounded-md border border-border bg-surface-muted px-2 py-1 text-xs font-medium text-muted">
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
                  <Metric label="Updated" value={formatShortDate(asset.updated_at)} />
                  <Metric label="Plate" value={asset.license_plate || "Missing"} />
                  <Metric
                    label="VIN or serial"
                    value={asset.vin_or_serial_number || "Missing"}
                  />
                  <Metric
                    label="Purchase price"
                    value={formatCurrency(asset.purchase_price)}
                  />
                </dl>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <PreparedSection
              count={maintenanceSnapshot.rules.length}
              icon={<ClipboardCheck aria-hidden="true" className="h-5 w-5" />}
              title="Maintenance"
            />
            <PreparedSection
              count={asset.complianceRecordCount}
              icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
              title="Compliance"
            />
            <PreparedSection
              count={asset.documentCount}
              icon={<FileText aria-hidden="true" className="h-5 w-5" />}
              title="Documents"
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign aria-hidden="true" className="h-5 w-5 text-primary" />
                  Expense summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(asset.expenseTotal)}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Total completed maintenance cost recorded for this asset.
                </p>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck aria-hidden="true" className="h-5 w-5 text-primary" />
                Maintenance status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge status={maintenanceSnapshot.status} />
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Active rules"
                  value={maintenanceSnapshot.rules.length.toString()}
                />
                <Metric
                  label="Overdue"
                  value={maintenanceSnapshot.overdueItems.length.toString()}
                />
                <Metric
                  label="Maintenance cost"
                  value={formatCurrency(maintenanceSnapshot.costSummary.totalCost)}
                />
              </div>
              {maintenanceSnapshot.overdueItems.length > 0 ? (
                <div className="mt-4 rounded-lg border border-danger/25 bg-danger/10 p-3">
                  <h3 className="text-sm font-semibold text-danger">Overdue items</h3>
                  <ul className="mt-2 grid gap-2 text-sm text-danger">
                    {maintenanceSnapshot.overdueItems.slice(0, 3).map((rule) => (
                      <li key={rule.id}>{rule.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {maintenanceSnapshot.nextDueItems.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-foreground">Next due</h3>
                  <ul className="mt-2 grid gap-2 text-sm text-muted">
                    {maintenanceSnapshot.nextDueItems.map((rule) => (
                      <li key={rule.id}>
                        {rule.name} - {formatShortDate(rule.next_due_date)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-4">
                <a
                  className="text-sm font-medium text-primary hover:underline"
                  href="/maintenance"
                >
                  View maintenance
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge aria-hidden="true" className="h-5 w-5 text-primary" />
                Meter history
              </CardTitle>
            </CardHeader>
            <CardContent>
              {asset.meterReadings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm leading-6 text-muted">
                  No meter readings yet. Add mileage or engine-hour readings to keep
                  reminders accurate.
                </div>
              ) : (
                <ol className="divide-y divide-border">
                  {asset.meterReadings.map((reading) => (
                    <li
                      className="grid gap-2 py-3 text-sm sm:grid-cols-[160px_1fr_auto]"
                      key={reading.id}
                    >
                      <span className="font-medium text-foreground">
                        {reading.reading_type === "mileage" ? "Mileage" : "Engine hours"}
                      </span>
                      <span className="font-mono text-foreground">
                        {formatMeterValue(reading.reading_value)}
                      </span>
                      <span className="text-muted">
                        {formatShortDate(reading.reading_date)}
                      </span>
                      {reading.notes ? (
                        <p className="text-muted sm:col-span-3">{reading.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent completed maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              {maintenanceSnapshot.recentRecords.length === 0 ? (
                <p className="text-sm leading-6 text-muted">
                  No completed maintenance has been recorded for this asset.
                </p>
              ) : (
                <ol className="divide-y divide-border">
                  {maintenanceSnapshot.recentRecords.map((record) => (
                    <li
                      className="flex items-center justify-between gap-3 py-3"
                      key={record.id}
                    >
                      <div>
                        <a
                          className="text-sm font-medium text-foreground hover:text-primary"
                          href={`/maintenance/history/${record.id}`}
                        >
                          {record.maintenance_type}
                        </a>
                        <p className="mt-1 text-xs text-muted">
                          {formatShortDate(record.completion_date)}
                        </p>
                      </div>
                      <span className="font-mono text-sm text-foreground">
                        {formatCurrency(record.total_cost)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="grid gap-5 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Add meter reading</CardTitle>
            </CardHeader>
            <CardContent>
              <MeterReadingForm assetId={asset.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Overview notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted">
                {asset.notes || "No notes recorded for this asset."}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
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

function PreparedSection({
  icon,
  title,
  count,
}: {
  icon: ReactNode;
  title: string;
  count: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{count}</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          {count === 1
            ? "Record connected to this asset."
            : "Records connected to this asset."}
        </p>
      </CardContent>
    </Card>
  );
}
