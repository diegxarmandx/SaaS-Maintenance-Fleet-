import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archive, Download, Pencil } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationSubmit } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatFileSize } from "@/features/documents/helpers";
import { archiveFleetDocumentAction } from "@/features/documents/server/actions";
import { getDocumentDetail } from "@/features/documents/server/queries";
import { formatShortDate } from "@/features/fleet/helpers";

type DocumentDetailPageProps = {
  params: Promise<{
    documentId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Document",
};

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { documentId } = await params;
  const document = await getDocumentDetail(documentId);

  if (!document) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Documents", href: "/documents" },
          { label: document.document_name },
        ]}
      />
      <PageHeader
        actions={
          <>
            <Link
              className={buttonClassName({ variant: "secondary" })}
              href={`/documents/${document.id}/edit`}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit
            </Link>
            {document.signedUrl ? (
              <a
                className={buttonClassName({ variant: "secondary" })}
                href={document.signedUrl}
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Secure download
              </a>
            ) : null}
            <ConfirmationSubmit
              action={archiveFleetDocumentAction.bind(null, document.id)}
              confirmLabel="Archive"
              message="Archive this document? The file metadata will remain but leave active library views."
            >
              <button className={buttonClassName({ variant: "danger" })} type="submit">
                <Archive aria-hidden="true" className="h-4 w-4" />
                Archive
              </button>
            </ConfirmationSubmit>
          </>
        }
        description={document.document_type}
        eyebrow="Document"
        title={document.document_name}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {document.canPreview && document.signedUrl ? (
              <object
                className="h-[520px] w-full rounded-lg border border-border bg-background"
                data={document.signedUrl}
                type={document.mime_type}
              >
                <p className="p-4 text-sm text-muted">
                  Preview is unavailable in this browser. Use secure download.
                </p>
              </object>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm leading-6 text-muted">
                Preview is available for supported PDFs and images after a signed URL is
                generated.
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="grid gap-5 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge status={document.status} />
              <dl className="mt-5 grid gap-4">
                <Metric
                  label="Asset"
                  value={
                    document.asset
                      ? `${document.asset.unit_number} ${document.asset.asset_name}`
                      : "General fleet document"
                  }
                />
                <Metric label="File size" value={formatFileSize(document.file_size)} />
                <Metric label="MIME type" value={document.mime_type} />
                <Metric
                  label="Issued"
                  value={
                    document.issue_date ? formatShortDate(document.issue_date) : "None"
                  }
                />
                <Metric
                  label="Expires"
                  value={
                    document.expiration_date
                      ? formatShortDate(document.expiration_date)
                      : "None"
                  }
                />
                <Metric
                  label="Document number"
                  value={document.document_number || "Not recorded"}
                />
                <Metric
                  label="Maintenance link"
                  value={document.maintenanceLabel || "None"}
                />
                <Metric
                  label="Compliance link"
                  value={document.complianceLabel || "None"}
                />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted">
                {document.notes || "No notes recorded."}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Version history</CardTitle>
            </CardHeader>
            <CardContent>
              {document.versions && document.versions.length > 0 ? (
                <ol className="divide-y divide-border">
                  {document.versions.map((version) => (
                    <li
                      className="flex items-center justify-between gap-3 py-3"
                      key={version.id}
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Version {version.version_number}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          {version.change_reason.replace("_", " ")} ·{" "}
                          {formatFileSize(version.file_size)} ·{" "}
                          {formatShortDate(version.created_at)}
                        </p>
                      </div>
                      {version.signedUrl ? (
                        <a
                          className={buttonClassName({
                            variant: "secondary",
                            size: "sm",
                          })}
                          href={version.signedUrl}
                        >
                          <Download aria-hidden="true" className="h-4 w-4" />
                          Download
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm leading-6 text-muted">
                  No version history recorded yet.
                </p>
              )}
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
