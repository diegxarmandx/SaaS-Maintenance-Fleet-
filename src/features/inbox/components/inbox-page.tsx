import Link from "next/link";
import { FileText, Inbox, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { InboxOverviewResult } from "@/features/inbox/server/queries";
import type { InboxJobListItem, IngestionStatus } from "@/features/inbox/types";
import { cn } from "@/lib/utils";

export function InboxPage({ inbox }: { inbox: InboxOverviewResult }) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Draft intake</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Review uploaded maintenance receipts before they become fleet history.
          </p>
        </div>
        <Link className={buttonClassName()} href="/inbox/new">
          <Plus aria-hidden="true" className="h-4 w-4" />
          New upload
        </Link>
      </div>

      {inbox.jobs.length === 0 ? (
        <EmptyState
          action={
            <Link className={buttonClassName()} href="/inbox/new">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Upload receipt
            </Link>
          }
          description="Upload a maintenance invoice, receipt, or photo when you want FleetReady to prepare a draft for owner review."
          icon={<Inbox aria-hidden="true" className="h-5 w-5" />}
          title="No Inbox drafts yet"
        />
      ) : (
        <section className="grid gap-3">
          {inbox.jobs.map((job) => (
            <InboxJobCard job={job} key={job.id} />
          ))}
        </section>
      )}
    </div>
  );
}

function InboxJobCard({ job }: { job: InboxJobListItem }) {
  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
            <span className="truncate">{job.original_file_name}</span>
          </CardTitle>
          <p className="mt-1 text-sm text-muted">
            {job.detected_document_type ?? "Maintenance receipt"} ·{" "}
            {formatDateTime(job.created_at)}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted">
          {job.confidence_score === null
            ? job.error_message || "Waiting for review."
            : `${Math.round(job.confidence_score * 100)}% extraction confidence`}
        </div>
        <Link className={buttonClassName({ variant: "secondary" })} href={`/inbox/${job.id}`}>
          Review draft
        </Link>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: IngestionStatus }) {
  const tone =
    status === "confirmed"
      ? "success"
      : status === "failed" || status === "discarded"
        ? "warning"
        : "neutral";

  return (
    <Badge className={cn("w-fit capitalize")} tone={tone}>
      {status.replace("_", " ")}
    </Badge>
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
