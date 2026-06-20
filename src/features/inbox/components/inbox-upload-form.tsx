"use client";

import Link from "next/link";
import { useActionState } from "react";
import { UploadCloud } from "lucide-react";

import { Button, buttonClassName } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Field } from "@/components/ui/field";
import { FileUploadArea } from "@/components/ui/file-upload-area";
import { Textarea } from "@/components/ui/textarea";
import { emptyInboxUploadFormState } from "@/features/inbox/helpers";
import { uploadAssetInboxDocumentAction } from "@/features/inbox/server/actions";
import type { InboxUploadFormState } from "@/features/inbox/types";
import { MAINTENANCE_ATTACHMENT_ALLOWED_TYPES } from "@/features/maintenance/constants";

export function InboxUploadForm({
  assetId,
  assetLabel,
}: {
  assetId: string;
  assetLabel: string;
}) {
  const action = uploadAssetInboxDocumentAction.bind(null, assetId);
  const [state, formAction, isPending] = useActionState<InboxUploadFormState, FormData>(
    action,
    emptyInboxUploadFormState,
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.status === "error" ? (
        <ErrorMessage message={state.message} title="Upload was not started" />
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">
          Upload paperwork for {assetLabel}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          The file will be attached to this asset automatically and kept private until you
          review it.
        </p>
        <div className="mt-4 grid gap-4">
          <FileUploadArea
            accept={MAINTENANCE_ATTACHMENT_ALLOWED_TYPES.join(",")}
            helperText="PDF, JPG, PNG, or WebP up to 10 MB."
            label="Take a photo or upload a file"
            name="file"
            required
          />
          {state.errors.file ? (
            <p className="text-sm text-danger" role="status">
              {state.errors.file}
            </p>
          ) : null}
          <Field error={state.errors.note} id="note" label="Short note">
            <Textarea id="note" maxLength={500} name="note" rows={3} />
            <p className="text-xs text-muted">
              Optional. Add context that may help during review.
            </p>
          </Field>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className={buttonClassName({ variant: "secondary" })}
          href={`/fleet/${assetId}?section=inbox`}
        >
          Cancel
        </Link>
        <Button disabled={isPending} type="submit">
          <UploadCloud aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Uploading paperwork" : "Upload paperwork"}
        </Button>
      </div>
    </form>
  );
}
