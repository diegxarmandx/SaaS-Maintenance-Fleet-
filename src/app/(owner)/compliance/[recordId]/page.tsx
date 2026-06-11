import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archive, FileText, Pencil } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationSubmit } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { archiveComplianceRecordAction } from "@/features/compliance/server/actions";
import { getComplianceRecordDetail } from "@/features/compliance/server/queries";
import { formatShortDate } from "@/features/fleet/helpers";

type ComplianceRecordPageProps = {
  params: Promise<{
    recordId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Compliance Record",
};

export const dynamic = "force-dynamic";

export default async function ComplianceRecordPage({
  params,
}: ComplianceRecordPageProps) {
  const { recordId } = await params;
  const record = await getComplianceRecordDetail(recordId);

  if (!record || !record.recordId) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Compliance", href: "/compliance" },
          { label: record.compliance_type },
        ]}
      />
      <PageHeader
        actions={
          <>
            <Link
              className={buttonClassName({ variant: "secondary" })}
              href={`/compliance/${record.recordId}/edit`}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit
            </Link>
            <ConfirmationSubmit
              action={archiveComplianceRecordAction.bind(null, record.recordId)}
              confirmLabel="Archive"
              message="Archive this compliance record? It will remain in the database but leave active compliance views."
            >
              <button className={buttonClassName({ variant: "danger" })} type="submit">
                <Archive aria-hidden="true" className="h-4 w-4" />
                Archive
              </button>
            </ConfirmationSubmit>
          </>
        }
        description={`${record.asset.unit_number} ${record.asset.asset_name}`}
        eyebrow="Compliance record"
        title={record.compliance_type}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Record details</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={record.status} />
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Metric
                label="Effective"
                value={
                  record.effective_date
                    ? formatShortDate(record.effective_date)
                    : "Not recorded"
                }
              />
              <Metric
                label="Expires"
                value={
                  record.expiration_date
                    ? formatShortDate(record.expiration_date)
                    : "Not recorded"
                }
              />
              <Metric
                label="Issuer"
                value={record.issuing_organization || "Not recorded"}
              />
              <Metric
                label="ID or policy"
                value={record.identification_number || "Not recorded"}
              />
              <Metric
                label="Reminder"
                value={`${record.reminder_days.toString()} days`}
              />
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
              Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            {record.document?.signedUrl ? (
              <a
                className={buttonClassName({ variant: "secondary", className: "w-full" })}
                href={record.document.signedUrl}
              >
                Secure download
              </a>
            ) : (
              <p className="text-sm leading-6 text-muted">
                No supporting document is attached.
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
