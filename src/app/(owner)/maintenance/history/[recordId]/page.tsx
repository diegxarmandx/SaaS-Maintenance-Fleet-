import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archive, FileText, Pencil } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationSubmit } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { archiveMaintenanceRecordAction } from "@/features/maintenance/server/actions";
import { getMaintenanceRecordDetail } from "@/features/maintenance/server/queries";
import {
  formatCurrency,
  formatMeterValue,
  formatShortDate,
} from "@/features/fleet/helpers";

type MaintenanceRecordPageProps = {
  params: Promise<{
    recordId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Maintenance Record",
};

export const dynamic = "force-dynamic";

export default async function MaintenanceRecordPage({
  params,
}: MaintenanceRecordPageProps) {
  const { recordId } = await params;
  const record = await getMaintenanceRecordDetail(recordId);

  if (!record) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Maintenance", href: "/maintenance" },
          { label: record.maintenance_type },
        ]}
      />
      <PageHeader
        actions={
          <>
            <Link
              className={buttonClassName({ variant: "secondary" })}
              href={`/maintenance/history/${record.id}/edit`}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit correction
            </Link>
            <ConfirmationSubmit
              action={archiveMaintenanceRecordAction.bind(null, record.id)}
              confirmLabel="Archive"
              message="Archive this maintenance record? It will remain in the database but leave active history views."
            >
              <button className={buttonClassName({ variant: "danger" })} type="submit">
                <Archive aria-hidden="true" className="h-4 w-4" />
                Archive
              </button>
            </ConfirmationSubmit>
          </>
        }
        description={`${record.asset.unit_number} ${record.asset.asset_name}`}
        eyebrow="Maintenance record"
        title={record.maintenance_type}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Record details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Metric label="Completed" value={formatShortDate(record.completion_date)} />
              <Metric
                label="Service provider"
                value={record.service_provider || "Not recorded"}
              />
              <Metric
                label="Mileage"
                value={
                  record.mileage === null
                    ? "Not recorded"
                    : `${formatMeterValue(record.mileage)} mi`
                }
              />
              <Metric
                label="Engine hours"
                value={
                  record.engine_hours === null
                    ? "Not recorded"
                    : `${formatMeterValue(record.engine_hours)} hrs`
                }
              />
              <Metric label="Parts cost" value={formatCurrency(record.parts_cost)} />
              <Metric label="Labor cost" value={formatCurrency(record.labor_cost)} />
              <Metric label="Other cost" value={formatCurrency(record.other_cost)} />
              <Metric label="Tax" value={formatCurrency(record.tax_cost)} />
              <Metric label="Total cost" value={formatCurrency(record.total_cost)} />
            </dl>
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-foreground">Notes</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {record.notes || "No notes recorded."}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText aria-hidden="true" className="h-5 w-5 text-primary" />
              Attachment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {record.attachment?.signedUrl ? (
              <a
                className={buttonClassName({ variant: "secondary", className: "w-full" })}
                href={record.attachment.signedUrl}
              >
                Secure download
              </a>
            ) : (
              <p className="text-sm leading-6 text-muted">
                No receipt or invoice attachment was uploaded.
              </p>
            )}
          </CardContent>
        </Card>
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
