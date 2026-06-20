"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, FileText, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/features/fleet/helpers";
import {
  calculateReviewedTotal,
  extractionToReviewFields,
  findMeterDecreaseWarnings,
  hasCostMismatch,
} from "@/features/inbox/helpers";
import {
  confirmInboxMaintenanceAction,
  discardInboxJobAction,
  saveInboxDocumentOnlyAction,
} from "@/features/inbox/server/actions";
import type { InboxJobDetailResult } from "@/features/inbox/server/queries";
import type {
  InboxReviewFields,
  InboxReviewFormState,
  IngestionJob,
  MaintenanceExtraction,
} from "@/features/inbox/types";
import type { MaintenanceFormOptions } from "@/features/maintenance/server/queries";

type InboxReviewPageProps = {
  detail: InboxJobDetailResult;
  options: MaintenanceFormOptions;
};

type InboxReviewAction = (
  previousState: InboxReviewFormState,
  formData: FormData,
) => Promise<InboxReviewFormState>;

export function InboxReviewPage({ detail, options }: InboxReviewPageProps) {
  const { job } = detail;

  if (!job) {
    return (
      <ErrorMessage
        message="This Inbox draft was not found for this owner company."
        title="Draft not found"
      />
    );
  }

  const extraction = isMaintenanceExtraction(job.extracted_data)
    ? job.extracted_data
    : null;

  if (job.status === "failed") {
    return (
      <FailedExtractionState
        jobId={job.id}
        message={
          job.error_message ||
          "FleetReady could not read this file. Enter the maintenance details manually."
        }
      />
    );
  }

  return (
    <ReviewDraftForm
      extraction={extraction}
      job={job}
      options={options}
      signedUrl={detail.signedUrl}
    />
  );
}

function ReviewDraftForm({
  job,
  options,
  signedUrl,
  extraction,
}: {
  job: IngestionJob;
  options: MaintenanceFormOptions;
  signedUrl: string | null;
  extraction: MaintenanceExtraction | null;
}) {
  const initialFields = extraction
    ? extractionToReviewFields(extraction)
    : extractionToReviewFields({});
  const action: InboxReviewAction = confirmInboxMaintenanceAction.bind(null, job.id);
  const [state, formAction, isPending] = useActionState(action, {
    status: "idle",
    message: "",
    fields: initialFields,
    errors: {},
  });
  const selectedAsset = options.assets.find((asset) => asset.id === state.fields.assetId);
  const meterWarnings = selectedAsset
    ? findMeterDecreaseWarnings(state.fields, selectedAsset)
    : [];
  const totalCost = useMemo(() => calculateReviewedTotal(state.fields), [state.fields]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1fr)]">
      <DocumentPreview
        mimeType={job.mime_type}
        signedUrl={signedUrl}
        title={job.original_file_name}
      />

      <form action={formAction} className="grid gap-5" noValidate>
        {state.status === "error" ? (
          <ErrorMessage message={state.message} title="Maintenance record was not saved" />
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Review extracted maintenance</CardTitle>
                <CardDescription>
                  AI prepared these fields. Edit anything before creating the final
                  maintenance record.
                </CardDescription>
              </div>
              {extraction ? (
                <Badge tone={extraction.overallConfidence >= 0.75 ? "success" : "warning"}>
                  {Math.round(extraction.overallConfidence * 100)}% confidence
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {extraction?.warnings.length ? (
              <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent-foreground">
                <p className="font-semibold">Review warnings</p>
                <ul className="mt-2 grid gap-1">
                  {extraction.warnings.map((warning) => (
                    <li className="flex gap-2" key={warning}>
                      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {extraction && hasCostMismatch(extraction) ? (
              <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent-foreground">
                The extracted total does not match parts, labor, other, and tax. Review
                the costs before saving.
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field error={state.errors.assetId} id="assetId" label="Asset" required>
                <Select defaultValue={state.fields.assetId} id="assetId" name="assetId">
                  <option value="">Choose asset</option>
                  {options.assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.unit_number} {asset.asset_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                error={state.errors.maintenanceRuleId}
                id="maintenanceRuleId"
                label="Related rule"
              >
                <Select
                  defaultValue={state.fields.maintenanceRuleId}
                  id="maintenanceRuleId"
                  name="maintenanceRuleId"
                >
                  <option value="">No related rule</option>
                  {options.rules
                    .filter(
                      (rule) =>
                        !state.fields.assetId || rule.asset_id === state.fields.assetId,
                    )
                    .map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.asset.unit_number} - {rule.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <ReviewField
                confidence={extraction?.maintenanceType.confidence}
                error={state.errors.maintenanceType}
                id="maintenanceType"
                label="Maintenance type"
                value={state.fields.maintenanceType}
              />
              <ReviewField
                confidence={extraction?.maintenanceDate.confidence}
                error={state.errors.completionDate}
                id="completionDate"
                label="Completion date"
                type="date"
                value={state.fields.completionDate}
              />
              <ReviewField
                confidence={extraction?.mileage.confidence}
                error={state.errors.mileage}
                id="mileage"
                label="Mileage"
                step="0.1"
                type="number"
                value={state.fields.mileage}
              />
              <ReviewField
                confidence={extraction?.engineHours.confidence}
                error={state.errors.engineHours}
                id="engineHours"
                label="Engine hours"
                step="0.1"
                type="number"
                value={state.fields.engineHours}
              />
              <ReviewField
                className="sm:col-span-2"
                confidence={extraction?.serviceProvider.confidence}
                error={state.errors.serviceProvider}
                id="serviceProvider"
                label="Service provider"
                value={state.fields.serviceProvider}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Costs</CardTitle>
                <CardDescription>Tax is tracked separately and included in total.</CardDescription>
              </div>
              <p className="font-mono text-lg font-semibold text-foreground">
                {formatCurrency(totalCost)}
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <ReviewField
              confidence={extraction?.partsCost.confidence}
              error={state.errors.partsCost}
              id="partsCost"
              label="Parts"
              step="0.01"
              type="number"
              value={state.fields.partsCost}
            />
            <ReviewField
              confidence={extraction?.laborCost.confidence}
              error={state.errors.laborCost}
              id="laborCost"
              label="Labor"
              step="0.01"
              type="number"
              value={state.fields.laborCost}
            />
            <ReviewField
              confidence={extraction?.otherCost.confidence}
              error={state.errors.otherCost}
              id="otherCost"
              label="Other"
              step="0.01"
              type="number"
              value={state.fields.otherCost}
            />
            <ReviewField
              confidence={extraction?.taxCost.confidence}
              error={state.errors.taxCost}
              id="taxCost"
              label="Tax"
              step="0.01"
              type="number"
              value={state.fields.taxCost}
            />
            <Field
              className="sm:col-span-4"
              error={state.errors.notes}
              id="notes"
              label="Notes"
            >
              <Textarea defaultValue={state.fields.notes} id="notes" name="notes" />
            </Field>
          </CardContent>
        </Card>

        {meterWarnings.length > 0 || state.errors.meterConfirmation ? (
          <Card>
            <CardContent className="pt-4">
              <label className="flex items-start gap-3 text-sm text-foreground">
                <input
                  className="mt-1 h-4 w-4"
                  name="confirmMeterDecrease"
                  type="checkbox"
                />
                <span>
                  <span className="block font-semibold">
                    Confirm lower meter reading
                  </span>
                  <span className="mt-1 block text-muted">
                    {state.errors.meterConfirmation ||
                      meterWarnings.join(" ") ||
                      "Confirm this is intentional before saving."}
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Link
            className={buttonClassName({ variant: "secondary" })}
            href="/maintenance/complete"
          >
            Use Manual Entry Instead
          </Link>
          <Button disabled={isPending} type="submit">
            <Save aria-hidden="true" className="h-4 w-4" />
            {isPending ? "Creating record" : "Create Maintenance Record"}
          </Button>
        </div>
      </form>

      <div className="xl:col-start-2">
        <SecondaryActions jobId={job.id} />
      </div>
    </div>
  );
}

function FailedExtractionState({ jobId, message }: { jobId: string; message: string }) {
  return (
    <div className="grid gap-5">
      <ErrorMessage message={message} title="FleetReady could not read this file" />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link className={buttonClassName()} href="/inbox/new">
          Try another file/photo
        </Link>
        <Link className={buttonClassName({ variant: "secondary" })} href="/maintenance/complete">
          Use Manual Entry
        </Link>
      </div>
      <SecondaryActions jobId={jobId} />
    </div>
  );
}

function isMaintenanceExtraction(
  value: IngestionJob["extracted_data"],
): value is MaintenanceExtraction {
  return "maintenanceType" in value;
}

function DocumentPreview({
  signedUrl,
  title,
  mimeType,
}: {
  signedUrl: string | null;
  title: string;
  mimeType: string;
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText aria-hidden="true" className="h-4 w-4 text-muted" />
          Uploaded file
        </CardTitle>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        {signedUrl ? (
          <iframe
            className="h-[520px] w-full rounded-lg border border-border bg-surface-muted"
            src={signedUrl}
            title={`Preview of ${title}`}
          />
        ) : (
          <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-border bg-surface-muted p-6 text-center text-sm text-muted">
            Private preview is unavailable in local demo mode.
            <span className="mt-1 block">File type: {mimeType}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewField({
  id,
  label,
  value,
  error,
  confidence,
  type = "text",
  step,
  className,
}: {
  id: keyof InboxReviewFields;
  label: string;
  value: string;
  error?: string | undefined;
  confidence?: number | undefined;
  type?: string | undefined;
  step?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <Field className={className} error={error} id={id} label={label}>
      <div className="grid gap-2">
        <Input
          defaultValue={value}
          id={id}
          min={type === "number" ? "0" : undefined}
          name={id}
          step={step}
          type={type}
        />
        {typeof confidence === "number" ? (
          <ConfidenceBadge confidence={confidence} />
        ) : null}
      </div>
    </Field>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const low = confidence < 0.75;

  return (
    <span className="text-xs text-muted">
      <Badge tone={low ? "warning" : "success"}>
        {low ? "Low confidence" : "Confidence"} · {Math.round(confidence * 100)}%
      </Badge>
    </span>
  );
}

function SecondaryActions({ jobId }: { jobId: string }) {
  return (
    <Card>
      <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
        <form action={saveInboxDocumentOnlyAction.bind(null, jobId)}>
          <Button className="w-full" type="submit" variant="secondary">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Save as Document Only
          </Button>
        </form>
        <form action={discardInboxJobAction.bind(null, jobId)}>
          <Button className="w-full" type="submit" variant="danger">
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Discard Draft
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
