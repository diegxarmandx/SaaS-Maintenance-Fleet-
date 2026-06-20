"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Download, FileText, LifeBuoy, Trash2 } from "lucide-react";

import { Button, buttonClassName } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-message";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestAccountDeletionAction } from "@/features/account-data/actions";
import type { AccountDeletionActionState } from "@/features/account-data/actions";
import {
  getDeletionConfirmationPhrase,
  type AccountDeletionRequestSummary,
} from "@/features/account-data/deletion";

type AccountDataSettingsProps = {
  companyName: string;
  deletionRequest: AccountDeletionRequestSummary | null;
};

const initialAccountDeletionActionState: AccountDeletionActionState = {
  status: "idle",
  message: "",
  errors: {},
};

export function AccountDataSettings({
  companyName,
  deletionRequest,
}: AccountDataSettingsProps) {
  const [state, formAction, isPending] = useActionState(
    requestAccountDeletionAction,
    initialAccountDeletionActionState,
  );
  const visibleRequest = state.request ?? deletionRequest;
  const confirmationPhrase = getDeletionConfirmationPhrase(companyName);

  return (
    <section className="grid gap-4" aria-labelledby="account-data-title">
      <div>
        <p className="text-sm font-medium text-primary">Account and data</p>
        <h2
          id="account-data-title"
          className="mt-1 text-xl font-semibold text-foreground"
        >
          Legal, support, export, and deletion controls
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Exporting company data, signing out, changing billing, archiving records, and
          requesting account deletion are separate actions. Deletion is irreversible
          after processing and should be requested only after downloading an export.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Owner data export</CardTitle>
            <CardDescription>
              Download a JSON export for this owner company. Uploaded files are not
              embedded; file and document metadata are included.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                className={buttonClassName({
                  variant: "primary",
                  className: "w-full sm:w-auto",
                })}
                href="/settings/export"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Download JSON export
              </Link>
              <Link
                className={buttonClassName({
                  variant: "secondary",
                  className: "w-full sm:w-auto",
                })}
                href="/support"
              >
                <LifeBuoy aria-hidden="true" className="h-4 w-4" />
                Contact support
              </Link>
            </div>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-muted sm:grid-cols-3">
              <Link className="font-medium text-primary hover:underline" href="/privacy">
                Privacy notice
              </Link>
              <Link className="font-medium text-primary hover:underline" href="/terms">
                Terms of service
              </Link>
              <Link className="font-medium text-primary hover:underline" href="/support">
                Support
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileText aria-hidden="true" className="h-5 w-5 text-primary" />
            <CardTitle>Deletion request status</CardTitle>
            <CardDescription>
              Requests are reviewed and processed through a secure operations workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {visibleRequest ? (
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Status</dt>
                  <dd className="font-medium capitalize text-foreground">
                    {visibleRequest.status.replace("_", " ")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Requested</dt>
                  <dd className="font-medium text-foreground">
                    {formatTimestamp(visibleRequest.requestedAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Completed</dt>
                  <dd className="font-medium text-foreground">
                    {formatTimestamp(visibleRequest.completedAt)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm leading-6 text-muted">
                This company has no account deletion request.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-danger/30">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <Trash2 aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Request account and company deletion</CardTitle>
              <CardDescription>
                This records a deletion request. It does not immediately erase fleet
                records, documents, billing records, or backups.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-warning-foreground">
            Download an export first. After deletion is processed, fleet records,
            account access, document metadata, and private uploaded files may no longer
            be recoverable. Some billing, security, backup, and audit records may be
            retained as documented.
          </div>

          {state.status === "error" ? (
            <div className="mb-4">
              <ErrorMessage
                message={state.message}
                title="Deletion request was not recorded"
              />
            </div>
          ) : null}
          {state.status === "success" ? (
            <div
              className="mb-4 rounded-lg border border-primary/25 bg-primary/10 p-4 text-sm leading-6 text-primary"
              role="status"
            >
              {state.message}
            </div>
          ) : null}

          <form action={formAction} className="grid gap-4" noValidate>
            <Field
              error={state.errors.confirmation}
              helperText={`Type "${confirmationPhrase}" exactly to request deletion.`}
              id="confirmation"
              label="Company name confirmation"
              required
            >
              <Input
                aria-describedby="confirmation-helper"
                autoComplete="off"
                id="confirmation"
                name="confirmation"
              />
            </Field>
            <Field
              error={state.errors.currentPassword}
              helperText="Required for live Supabase accounts. The local demo does not verify a password."
              id="currentPassword"
              label="Current password"
            >
              <Input
                aria-describedby="currentPassword-helper"
                autoComplete="current-password"
                id="currentPassword"
                name="currentPassword"
                type="password"
              />
            </Field>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link className={buttonClassName({ variant: "secondary" })} href="/support">
                Ask support first
              </Link>
              <Button disabled={isPending} type="submit" variant="danger">
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                {isPending ? "Recording request" : "Request deletion"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
