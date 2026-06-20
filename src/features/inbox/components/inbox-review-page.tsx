"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, FileText, Flag, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmationSubmit } from "@/components/ui/confirmation-dialog";
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
  completeAssetInboxItemAction,
  deleteAssetInboxItemAction,
  markAssetInboxNeedsAttentionAction,
} from "@/features/inbox/server/actions";
import type { InboxJobDetailResult } from "@/features/inbox/server/queries";
import type {
  InboxDocumentCategory,
  InboxReviewFields,
  InboxReviewFormState,
  MaintenanceExtraction,
} from "@/features/inbox/types";
import type { MaintenanceFormOptions } from "@/features/maintenance/server/queries";

export function InboxReviewPage({
  assetId,
  detail,
  options,
}: {
  assetId: string;
  detail: InboxJobDetailResult;
  options: MaintenanceFormOptions;
}) {
  const job = detail.job;
  if (!job) {
    return (
      <ErrorMessage
        message="This Inbox item was not found for this asset."
        title="Item not found"
      />
    );
  }

  const extraction = isMaintenanceExtraction(job.extracted_data)
    ? job.extracted_data
    : null;

  if (job.status === "confirmed") {
    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(380px,1fr)]">
        <DocumentPreview
          mimeType={job.mime_type}
          signedUrl={detail.signedUrl}
          title={job.original_file_name}
        />
        <Card>
          <CardHeader>
            <Badge className="w-fit" tone="success">
              Completed
            </Badge>
            <CardTitle>Saved to asset history</CardTitle>
            <CardDescription>
              This paperwork has already been reviewed and cannot be deleted from the
              Inbox.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonClassName()} href={`/fleet/${assetId}?section=inbox`}>
              Back to asset Inbox
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ReviewDraftForm
      assetId={assetId}
      extraction={extraction}
      job={job}
      options={options}
      signedUrl={detail.signedUrl}
    />
  );
}

function ReviewDraftForm({
  assetId,
  job,
  options,
  signedUrl,
  extraction,
}: {
  assetId: string;
  job: NonNullable<InboxJobDetailResult["job"]>;
  options: MaintenanceFormOptions;
  signedUrl: string | null;
  extraction: MaintenanceExtraction | null;
}) {
  const initialFields = extractionToReviewFields(
    extraction ?? {},
    job.original_file_name,
  );
  const [category, setCategory] = useState<InboxDocumentCategory>(initialFields.category);
  const action = completeAssetInboxItemAction.bind(null, assetId, job.id);
  const [state, formAction, isPending] = useActionState<InboxReviewFormState, FormData>(
    action,
    {
      status: "idle",
      message: "",
      fields: initialFields,
      errors: {},
    },
  );
  const selectedAsset = options.assets.find((asset) => asset.id === assetId);
  const meterWarnings =
    category === "maintenance" && selectedAsset
      ? findMeterDecreaseWarnings(state.fields, selectedAsset)
      : [];
  const totalCost = useMemo(() => calculateReviewedTotal(state.fields), [state.fields]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1fr)]">
      <div className="grid content-start gap-4">
        <DocumentPreview
          mimeType={job.mime_type}
          signedUrl={signedUrl}
          title={job.original_file_name}
        />
        {job.upload_note ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload note</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted">
              {job.upload_note}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="grid gap-4">
        <form action={formAction} className="grid gap-4" noValidate>
          {state.status === "error" ? (
            <ErrorMessage message={state.message} title="Item was not completed" />
          ) : null}
          {job.status === "needs_attention" || job.error_message ? (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
              <p className="font-semibold">Needs attention</p>
              <p className="mt-1 text-muted">
                {job.error_message ||
                  "Review the extracted details before marking this item completed."}
              </p>
            </div>
          ) : null}
          {extraction?.warnings.length ? (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
              <p className="font-semibold">Review warnings</p>
              <ul className="mt-2 grid gap-1 text-muted">
                {extraction.warnings.map((warning) => (
                  <li className="flex gap-2" key={warning}>
                    <AlertTriangle
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Review extracted fields</CardTitle>
                  <CardDescription>
                    Choose where this paperwork belongs and correct any missing details.
                  </CardDescription>
                </div>
                {extraction ? (
                  <Badge
                    tone={extraction.overallConfidence >= 0.75 ? "success" : "warning"}
                  >
                    {Math.round(extraction.overallConfidence * 100)}% confidence
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field id="category" label="Save as" required>
                <Select
                  defaultValue={category}
                  id="category"
                  name="category"
                  onChange={(event) =>
                    setCategory(event.target.value as InboxDocumentCategory)
                  }
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="compliance">Compliance</option>
                  <option value="general">General document</option>
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewField
                  className="sm:col-span-2"
                  error={state.errors.documentName}
                  id="documentName"
                  label="Document name"
                  value={state.fields.documentName}
                />
                <ReviewField
                  className="sm:col-span-2"
                  confidence={extraction?.documentType?.confidence}
                  error={state.errors.documentType}
                  id="documentType"
                  label={category === "compliance" ? "Compliance type" : "Document type"}
                  value={state.fields.documentType}
                />

                {category === "maintenance" ? (
                  <>
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
                          .filter((rule) => rule.asset_id === assetId)
                          .map((rule) => (
                            <option key={rule.id} value={rule.id}>
                              {rule.name}
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
                      confidence={extraction?.serviceProvider.confidence}
                      error={state.errors.serviceProvider}
                      id="serviceProvider"
                      label="Vendor"
                      value={state.fields.serviceProvider}
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
                  </>
                ) : null}

                {category === "compliance" ? (
                  <>
                    <ReviewField
                      error={state.errors.issuingOrganization}
                      id="issuingOrganization"
                      label="Issuing organization"
                      value={state.fields.issuingOrganization}
                    />
                    <ReviewField
                      error={state.errors.identificationNumber}
                      id="identificationNumber"
                      label="Identification number"
                      value={state.fields.identificationNumber}
                    />
                    <ReviewField
                      error={state.errors.effectiveDate}
                      id="effectiveDate"
                      label="Effective date"
                      type="date"
                      value={state.fields.effectiveDate}
                    />
                    <ReviewField
                      confidence={extraction?.complianceExpirationDate?.confidence}
                      error={state.errors.expirationDate}
                      id="expirationDate"
                      label="Expiration date"
                      type="date"
                      value={state.fields.expirationDate}
                    />
                    <ReviewField
                      error={state.errors.reminderDays}
                      id="reminderDays"
                      label="Remind days before"
                      type="number"
                      value={state.fields.reminderDays}
                    />
                  </>
                ) : null}

                {category === "general" ? (
                  <>
                    <ReviewField
                      error={state.errors.effectiveDate}
                      id="effectiveDate"
                      label="Issue date"
                      type="date"
                      value={state.fields.effectiveDate}
                    />
                    <ReviewField
                      error={state.errors.expirationDate}
                      id="expirationDate"
                      label="Expiration date"
                      type="date"
                      value={state.fields.expirationDate}
                    />
                    <ReviewField
                      className="sm:col-span-2"
                      error={state.errors.documentNumber}
                      id="documentNumber"
                      label="Document number"
                      value={state.fields.documentNumber}
                    />
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {category === "maintenance" ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Maintenance costs</CardTitle>
                  <span className="font-mono text-lg font-semibold">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
                {extraction && hasCostMismatch(extraction) ? (
                  <CardDescription>
                    The extracted total does not match the itemized costs.
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-4">
                {(["partsCost", "laborCost", "otherCost", "taxCost"] as const).map(
                  (id) => (
                    <ReviewField
                      id={id}
                      key={id}
                      label={
                        id === "partsCost"
                          ? "Parts"
                          : id === "laborCost"
                            ? "Labor"
                            : id === "otherCost"
                              ? "Other"
                              : "Tax"
                      }
                      step="0.01"
                      type="number"
                      value={state.fields[id]}
                    />
                  ),
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="pt-4">
              <Field error={state.errors.notes} id="notes" label="Notes">
                <Textarea
                  defaultValue={state.fields.notes}
                  id="notes"
                  name="notes"
                  rows={4}
                />
              </Field>
              {meterWarnings.length > 0 || state.errors.meterConfirmation ? (
                <label className="mt-4 flex items-start gap-3 text-sm">
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
                      {state.errors.meterConfirmation || meterWarnings.join(" ")}
                    </span>
                  </span>
                </label>
              ) : null}
            </CardContent>
          </Card>

          <Button disabled={isPending} type="submit">
            <Save aria-hidden="true" className="h-4 w-4" />
            {isPending ? "Saving to asset history" : "Mark completed"}
          </Button>
        </form>

        <Card>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
            <form action={markAssetInboxNeedsAttentionAction.bind(null, assetId, job.id)}>
              <Button className="w-full" type="submit" variant="secondary">
                <Flag aria-hidden="true" className="h-4 w-4" />
                Needs attention
              </Button>
            </form>
            <ConfirmationSubmit
              action={deleteAssetInboxItemAction.bind(null, assetId, job.id)}
              confirmLabel="Delete item"
              message="Delete this pending Inbox item and its private uploaded file? This cannot be undone."
            >
              <button className={buttonClassName({ variant: "danger" })} type="submit">
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Delete item
              </button>
            </ConfirmationSubmit>
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
        <CardDescription className="break-words">{title}</CardDescription>
      </CardHeader>
      <CardContent>
        {signedUrl ? (
          <iframe
            className="h-[520px] w-full rounded-lg border border-border bg-surface-muted"
            src={signedUrl}
            title={`Preview of ${title}`}
          />
        ) : (
          <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-border bg-surface-muted p-6 text-center text-sm text-muted">
            <span>
              Private preview is unavailable here.
              <span className="mt-1 block">File type: {mimeType}</span>
            </span>
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
          <span className="text-xs text-muted">
            <Badge tone={confidence < 0.75 ? "warning" : "success"}>
              {confidence < 0.75 ? "Low confidence" : "Confidence"} ·{" "}
              {Math.round(confidence * 100)}%
            </Badge>
          </span>
        ) : null}
      </div>
    </Field>
  );
}

function isMaintenanceExtraction(
  value: NonNullable<InboxJobDetailResult["job"]>["extracted_data"],
): value is MaintenanceExtraction {
  return "maintenanceType" in value;
}
