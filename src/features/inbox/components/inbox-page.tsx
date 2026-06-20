import Link from "next/link";
import { FileText, Inbox, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getOwnerInboxStatus } from "@/features/inbox/asset-helpers";
import type { AssetInboxOverviewResult } from "@/features/inbox/server/queries";
import type { InboxJobListItem } from "@/features/inbox/types";

export function AssetInboxPage({
  assetId,
  inbox,
}: {
  assetId: string;
  inbox: AssetInboxOverviewResult;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {inbox.pendingCount} pending {inbox.pendingCount === 1 ? "item" : "items"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Review paperwork before saving it to this asset&apos;s history.
          </p>
        </div>
        <Link className={buttonClassName()} href={`/fleet/${assetId}/upload`}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Upload paperwork
        </Link>
      </div>

      {inbox.jobs.length === 0 ? (
        <EmptyState
          action={
            <Link className={buttonClassName()} href={`/fleet/${assetId}/upload`}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Upload paperwork
            </Link>
          }
          description="Upload a receipt, invoice, registration, insurance card, inspection document, photo, or other fleet paperwork."
          icon={<Inbox aria-hidden="true" className="h-5 w-5" />}
          title="No paperwork waiting for review"
        />
      ) : (
        <section aria-label="Asset Inbox items" className="grid gap-3">
          {inbox.jobs.map((job) => (
            <InboxJobCard assetId={assetId} job={job} key={job.id} />
          ))}
        </section>
      )}
    </div>
  );
}

function InboxJobCard({ assetId, job }: { assetId: string; job: InboxJobListItem }) {
  const status = getOwnerInboxStatus(job.status);
  const tone = status === "Completed" ? "success" : "warning";

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
            <span className="break-words">{job.original_file_name}</span>
          </CardTitle>
          <p className="mt-1 text-sm text-muted">
            {job.detected_document_type ?? "Unknown document"} ·{" "}
            {formatDateTime(job.created_at)}
          </p>
        </div>
        <Badge tone={tone}>{status}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {job.confidence_score === null
            ? job.error_message || "Ready for owner review."
            : `${Math.round(job.confidence_score * 100)}% extraction confidence`}
        </p>
        <Link
          className={buttonClassName({ variant: "secondary" })}
          href={`/fleet/${assetId}/inbox/${job.id}`}
        >
          {status === "Completed" ? "View item" : "Review item"}
        </Link>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
