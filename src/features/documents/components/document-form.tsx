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
import { DOCUMENT_ALLOWED_TYPES } from "@/features/documents/constants";
import { emptyDocumentFormState } from "@/features/documents/helpers";
import {
  updateFleetDocumentAction,
  uploadFleetDocumentAction,
} from "@/features/documents/server/actions";
import type { DocumentFormOptions } from "@/features/documents/server/queries";
import type {
  DocumentFormFields,
  DocumentFormState,
  FleetDocumentWithRelations,
} from "@/features/documents/types";

type DocumentFormProps = {
  options: DocumentFormOptions;
  mode: "create" | "edit";
  document?: FleetDocumentWithRelations | undefined;
  cancelHref: string;
};

type DocumentAction = (
  previousState: DocumentFormState,
  formData: FormData,
) => Promise<DocumentFormState>;

export function DocumentForm({ options, mode, document, cancelHref }: DocumentFormProps) {
  const initialFields = document
    ? documentToFields(document)
    : emptyDocumentFormState.fields;
  const initialState: DocumentFormState = {
    status: "idle",
    message: "",
    fields: initialFields,
    errors: {},
  };
  const action: DocumentAction =
    mode === "edit" && document
      ? updateFleetDocumentAction.bind(null, document.id)
      : uploadFleetDocumentAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.status === "error" ? (
        <ErrorMessage message={state.message} title="Document was not saved" />
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Document details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            error={state.errors.documentName}
            id="documentName"
            label="Document name"
            required
          >
            <Input
              defaultValue={state.fields.documentName}
              id="documentName"
              name="documentName"
              placeholder="Registration certificate"
            />
          </Field>
          <Field
            error={state.errors.documentType}
            id="documentType"
            label="Category"
            required
          >
            <Input
              defaultValue={state.fields.documentType}
              id="documentType"
              list="document-types"
              name="documentType"
              placeholder="Registration"
            />
          </Field>
          <Field error={state.errors.assetId} id="assetId" label="Asset">
            <Select defaultValue={state.fields.assetId} id="assetId" name="assetId">
              <option value="">General fleet document</option>
              {options.assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.unit_number} {asset.asset_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            error={state.errors.documentNumber}
            id="documentNumber"
            label="Document number"
          >
            <Input
              defaultValue={state.fields.documentNumber}
              id="documentNumber"
              name="documentNumber"
            />
          </Field>
          <Field error={state.errors.issueDate} id="issueDate" label="Issue date">
            <Input
              defaultValue={state.fields.issueDate}
              id="issueDate"
              name="issueDate"
              type="date"
            />
          </Field>
          <Field
            error={state.errors.expirationDate}
            id="expirationDate"
            label="Expiration date"
          >
            <Input
              defaultValue={state.fields.expirationDate}
              id="expirationDate"
              name="expirationDate"
              type="date"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Relationships</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            error={state.errors.maintenanceRecordId}
            helperText="Optional. Links receipts or invoices to completed maintenance."
            id="maintenanceRecordId"
            label="Maintenance record"
          >
            <Select
              defaultValue={state.fields.maintenanceRecordId}
              id="maintenanceRecordId"
              name="maintenanceRecordId"
            >
              <option value="">No maintenance record</option>
              {options.maintenanceRecords.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            error={state.errors.complianceRecordId}
            helperText="Optional. Links certificates, permits, insurance, or registration files."
            id="complianceRecordId"
            label="Compliance record"
          >
            <Select
              defaultValue={state.fields.complianceRecordId}
              id="complianceRecordId"
              name="complianceRecordId"
            >
              <option value="">No compliance record</option>
              {options.complianceRecords.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">File and notes</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <FileUploadArea
              accept={DOCUMENT_ALLOWED_TYPES.join(",")}
              helperText={
                mode === "edit"
                  ? "Optional replacement. PDF, JPG, or PNG up to 10 MB."
                  : "Required. PDF, JPG, or PNG up to 10 MB."
              }
              label={mode === "edit" ? "Replace file" : "Uploaded file"}
              name="file"
            />
            {state.errors.file ? (
              <p className="mt-2 text-sm text-danger" role="status">
                {state.errors.file}
              </p>
            ) : null}
          </div>
          <Field error={state.errors.notes} id="notes" label="Notes">
            <Textarea
              defaultValue={state.fields.notes}
              id="notes"
              name="notes"
              placeholder="Owner notes about this file."
            />
          </Field>
        </div>
      </section>

      <datalist id="document-types">
        {options.documentTypes.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link className={buttonClassName({ variant: "secondary" })} href={cancelHref}>
          Cancel
        </Link>
        <Button disabled={isPending} type="submit">
          <Save aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Saving" : mode === "edit" ? "Save document" : "Upload document"}
        </Button>
      </div>
    </form>
  );
}

function documentToFields(document: FleetDocumentWithRelations): DocumentFormFields {
  return {
    documentName: document.document_name,
    documentType: document.document_type,
    assetId: document.asset_id ?? "",
    maintenanceRecordId: document.maintenance_record_id ?? "",
    complianceRecordId: document.compliance_record_id ?? "",
    issueDate: document.issue_date ?? "",
    expirationDate: document.expiration_date ?? "",
    documentNumber: document.document_number ?? "",
    notes: document.notes ?? "",
  };
}
