"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Save } from "lucide-react";

import { Button, buttonClassName } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Field } from "@/components/ui/field";
import { FileUploadArea } from "@/components/ui/file-upload-area";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  complianceRecordToFields,
  emptyComplianceRecordFormState,
} from "@/features/compliance/helpers";
import {
  createComplianceRecordAction,
  updateComplianceRecordAction,
} from "@/features/compliance/server/actions";
import type { ComplianceFormOptions } from "@/features/compliance/server/queries";
import type {
  ComplianceOverviewItem,
  ComplianceRecordFormState,
} from "@/features/compliance/types";
import { DOCUMENT_ALLOWED_TYPES } from "@/features/documents/constants";

type ComplianceRecordFormProps = {
  options: ComplianceFormOptions;
  mode: "create" | "edit";
  record?: ComplianceOverviewItem | undefined;
  defaultAssetId?: string | undefined;
  defaultRequirementId?: string | undefined;
  defaultComplianceType?: string | undefined;
  cancelHref: string;
};

type ComplianceAction = (
  previousState: ComplianceRecordFormState,
  formData: FormData,
) => Promise<ComplianceRecordFormState>;

export function ComplianceRecordForm({
  options,
  mode,
  record,
  defaultAssetId,
  defaultRequirementId,
  defaultComplianceType,
  cancelHref,
}: ComplianceRecordFormProps) {
  const initialFields =
    record && record.recordId
      ? complianceRecordToFields({
          id: record.recordId,
          company_id: "",
          asset_id: record.asset_id,
          requirement_id: record.requirementId,
          compliance_type: record.compliance_type,
          issuing_organization: record.issuing_organization,
          identification_number: record.identification_number,
          effective_date: record.effective_date,
          expiration_date: record.expiration_date ?? "",
          reminder_days: record.reminder_days,
          status_override: null,
          notes: record.notes,
          archived_at: record.archived_at,
          created_at: "",
          updated_at: "",
        })
      : {
          ...emptyComplianceRecordFormState.fields,
          assetId: defaultAssetId ?? "",
          requirementId: defaultRequirementId ?? "",
          complianceType: defaultComplianceType ?? "",
        };
  const initialState: ComplianceRecordFormState = {
    status: "idle",
    message: "",
    fields: initialFields,
    errors: {},
  };
  const action: ComplianceAction =
    mode === "edit" && record?.recordId
      ? updateComplianceRecordAction.bind(null, record.recordId)
      : createComplianceRecordAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const visibleRequirements = options.requirements.filter(
    (requirement) =>
      !state.fields.assetId || requirement.asset_id === state.fields.assetId,
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.status === "error" ? (
        <ErrorMessage message={state.message} title="Compliance record was not saved" />
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Compliance record</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Records track information entered by the owner; FleetReady does not submit,
          renew, or guarantee legal compliance.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            error={state.errors.requirementId}
            helperText="Optional. Selecting an assigned requirement clears its missing status."
            id="requirementId"
            label="Assigned requirement"
          >
            <Select
              defaultValue={state.fields.requirementId}
              id="requirementId"
              name="requirementId"
            >
              <option value="">No assigned requirement</option>
              {visibleRequirements.map((requirement) => (
                <option key={requirement.id} value={requirement.id}>
                  {requirement.compliance_type}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            error={state.errors.complianceType}
            id="complianceType"
            label="Compliance type"
            required
          >
            <Input
              defaultValue={state.fields.complianceType}
              id="complianceType"
              list="compliance-types"
              name="complianceType"
              placeholder="Vehicle registration"
            />
          </Field>
          <Field
            error={state.errors.issuingOrganization}
            id="issuingOrganization"
            label="Issuing organization"
          >
            <Input
              defaultValue={state.fields.issuingOrganization}
              id="issuingOrganization"
              name="issuingOrganization"
              placeholder="DMV, insurer, agency"
            />
          </Field>
          <Field
            error={state.errors.identificationNumber}
            id="identificationNumber"
            label="Identification or policy number"
          >
            <Input
              defaultValue={state.fields.identificationNumber}
              id="identificationNumber"
              name="identificationNumber"
            />
          </Field>
          <Field
            error={state.errors.effectiveDate}
            id="effectiveDate"
            label="Effective date"
          >
            <Input
              defaultValue={state.fields.effectiveDate}
              id="effectiveDate"
              name="effectiveDate"
              type="date"
            />
          </Field>
          <Field
            error={state.errors.expirationDate}
            id="expirationDate"
            label="Expiration date"
            required
          >
            <Input
              defaultValue={state.fields.expirationDate}
              id="expirationDate"
              name="expirationDate"
              type="date"
            />
          </Field>
          <Field
            error={state.errors.reminderDays}
            id="reminderDays"
            label="Reminder period"
          >
            <Input
              defaultValue={state.fields.reminderDays}
              id="reminderDays"
              min="0"
              name="reminderDays"
              type="number"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Document and notes</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <FileUploadArea
              accept={DOCUMENT_ALLOWED_TYPES.join(",")}
              helperText={
                mode === "edit"
                  ? "Optional replacement. PDF, JPG, or PNG up to 10 MB."
                  : "Optional. PDF, JPG, or PNG up to 10 MB."
              }
              label={mode === "edit" ? "Replace attached document" : "Attached document"}
              name="attachment"
            />
            {state.errors.attachment ? (
              <p className="mt-2 text-sm text-danger" role="status">
                {state.errors.attachment}
              </p>
            ) : null}
          </div>
          <Field error={state.errors.notes} id="notes" label="Notes">
            <Textarea
              defaultValue={state.fields.notes}
              id="notes"
              name="notes"
              placeholder="Owner notes about the record or document."
            />
          </Field>
        </div>
      </section>

      <datalist id="compliance-types">
        {options.complianceTypes.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link className={buttonClassName({ variant: "secondary" })} href={cancelHref}>
          Cancel
        </Link>
        <Button disabled={isPending} type="submit">
          <Save aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Saving" : mode === "edit" ? "Save correction" : "Save record"}
        </Button>
      </div>
    </form>
  );
}
