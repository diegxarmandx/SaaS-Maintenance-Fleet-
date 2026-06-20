"use client";

import Link from "next/link";
import { useActionState } from "react";
import { UploadCloud } from "lucide-react";

import { Button, buttonClassName } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FileUploadArea } from "@/components/ui/file-upload-area";
import { MAINTENANCE_ATTACHMENT_ALLOWED_TYPES } from "@/features/maintenance/constants";
import { emptyInboxUploadFormState } from "@/features/inbox/helpers";
import { uploadInboxDocumentAction } from "@/features/inbox/server/actions";
import type { InboxUploadFormState } from "@/features/inbox/types";

export function InboxUploadForm() {
  const [state, formAction, isPending] = useActionState<
    InboxUploadFormState,
    FormData
  >(uploadInboxDocumentAction, emptyInboxUploadFormState);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.status === "error" ? (
        <ErrorMessage message={state.message} title="Inbox upload was not started" />
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">
          Maintenance invoice or receipt
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Upload one PDF or image. FleetReady will prepare a draft, but no maintenance
          record is created until you review and confirm it.
        </p>
        <div className="mt-4">
          <FileUploadArea
            accept={MAINTENANCE_ATTACHMENT_ALLOWED_TYPES.join(",")}
            helperText="PDF, JPG, PNG, or WebP up to 10 MB."
            label="Upload invoice, receipt, or photo"
            name="file"
            required
          />
          {state.errors.file ? (
            <p className="mt-2 text-sm text-danger" role="status">
              {state.errors.file}
            </p>
          ) : null}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link className={buttonClassName({ variant: "secondary" })} href="/inbox">
          Cancel
        </Link>
        <Button disabled={isPending} type="submit">
          <UploadCloud aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Preparing draft" : "Prepare draft"}
        </Button>
      </div>
    </form>
  );
}
