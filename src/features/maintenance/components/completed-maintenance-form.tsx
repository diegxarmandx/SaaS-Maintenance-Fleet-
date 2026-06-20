"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Save } from "lucide-react";

import { Button, buttonClassName } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Field } from "@/components/ui/field";
import { FileUploadArea } from "@/components/ui/file-upload-area";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAINTENANCE_ATTACHMENT_ALLOWED_TYPES } from "@/features/maintenance/constants";
import { emptyCompletedMaintenanceFormState } from "@/features/maintenance/helpers";
import {
  recordCompletedMaintenanceAction,
  updateMaintenanceRecordAction,
} from "@/features/maintenance/server/actions";
import type { MaintenanceFormOptions } from "@/features/maintenance/server/queries";
import type {
  CompletedMaintenanceFormFields,
  CompletedMaintenanceFormState,
  MaintenanceRecordWithAsset,
} from "@/features/maintenance/types";
import { formatCurrency } from "@/features/fleet/helpers";

type CompletedMaintenanceFormProps = {
  options: MaintenanceFormOptions;
  mode: "create" | "edit";
  record?: MaintenanceRecordWithAsset | undefined;
  defaultAssetId?: string | undefined;
  defaultRuleId?: string | undefined;
  cancelHref: string;
};

type CompletedMaintenanceAction = (
  previousState: CompletedMaintenanceFormState,
  formData: FormData,
) => Promise<CompletedMaintenanceFormState>;

export function CompletedMaintenanceForm({
  options,
  mode,
  record,
  defaultAssetId,
  defaultRuleId,
  cancelHref,
}: CompletedMaintenanceFormProps) {
  const initialFields = record
    ? recordToFields(record)
    : {
        ...emptyCompletedMaintenanceFormState.fields,
        assetId: defaultAssetId ?? "",
        maintenanceRuleId: defaultRuleId ?? "",
        maintenanceType:
          options.rules.find((rule) => rule.id === defaultRuleId)?.name ?? "",
      };
  const initialState: CompletedMaintenanceFormState = {
    status: "idle",
    message: "",
    fields: initialFields,
    errors: {},
  };
  const action: CompletedMaintenanceAction =
    mode === "edit" && record
      ? updateMaintenanceRecordAction.bind(null, record.id)
      : recordCompletedMaintenanceAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [costs, setCosts] = useState({
    partsCost: state.fields.partsCost || "0",
    laborCost: state.fields.laborCost || "0",
    otherCost: state.fields.otherCost || "0",
    taxCost: state.fields.taxCost || "0",
  });
  const totalCost = useMemo(
    () =>
      Number(costs.partsCost || 0) +
      Number(costs.laborCost || 0) +
      Number(costs.otherCost || 0) +
      Number(costs.taxCost || 0),
    [costs],
  );
  const visibleRules = options.rules.filter(
    (rule) => !state.fields.assetId || rule.asset_id === state.fields.assetId,
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.status === "error" ? (
        <ErrorMessage message={state.message} title="Maintenance record was not saved" />
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Completed maintenance</h2>
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
            error={state.errors.maintenanceRuleId}
            helperText="Optional, but selecting a rule advances its next due values."
            id="maintenanceRuleId"
            label="Related rule"
          >
            <Select
              defaultValue={state.fields.maintenanceRuleId}
              id="maintenanceRuleId"
              name="maintenanceRuleId"
            >
              <option value="">No related rule</option>
              {visibleRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.asset.unit_number} - {rule.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            error={state.errors.maintenanceType}
            id="maintenanceType"
            label="Maintenance type"
            required
          >
            <Input
              defaultValue={state.fields.maintenanceType}
              id="maintenanceType"
              name="maintenanceType"
              placeholder="Engine oil and filter"
            />
          </Field>
          <Field
            error={state.errors.completionDate}
            id="completionDate"
            label="Completion date"
            required
          >
            <Input
              defaultValue={state.fields.completionDate}
              id="completionDate"
              name="completionDate"
              type="date"
            />
          </Field>
          <Field error={state.errors.mileage} id="mileage" label="Mileage">
            <Input
              defaultValue={state.fields.mileage}
              id="mileage"
              min="0"
              name="mileage"
              step="0.1"
              type="number"
            />
          </Field>
          <Field error={state.errors.engineHours} id="engineHours" label="Engine hours">
            <Input
              defaultValue={state.fields.engineHours}
              id="engineHours"
              min="0"
              name="engineHours"
              step="0.1"
              type="number"
            />
          </Field>
          <Field
            className="sm:col-span-2"
            error={state.errors.serviceProvider}
            id="serviceProvider"
            label="Service provider"
          >
            <Input
              defaultValue={state.fields.serviceProvider}
              id="serviceProvider"
              name="serviceProvider"
              placeholder="Owner completed or service provider name"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground">Costs</h2>
          <p className="font-mono text-lg font-semibold text-foreground">
            {formatCurrency(totalCost)}
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <CostField
            error={state.errors.partsCost}
            id="partsCost"
            label="Parts cost"
            setCosts={setCosts}
            value={state.fields.partsCost}
          />
          <CostField
            error={state.errors.laborCost}
            id="laborCost"
            label="Labor cost"
            setCosts={setCosts}
            value={state.fields.laborCost}
          />
          <CostField
            error={state.errors.otherCost}
            id="otherCost"
            label="Other cost"
            setCosts={setCosts}
            value={state.fields.otherCost}
          />
          <CostField
            error={state.errors.taxCost}
            id="taxCost"
            label="Tax"
            setCosts={setCosts}
            value={state.fields.taxCost}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Attachment and notes</h2>
        <div className="mt-4 grid gap-4">
          {mode === "create" ? (
            <div>
              <FileUploadArea
                accept={MAINTENANCE_ATTACHMENT_ALLOWED_TYPES.join(",")}
                helperText="PDF, JPG, PNG, or WebP up to 10 MB."
                label="Receipt or invoice attachment"
                name="attachment"
              />
              {state.errors.attachment ? (
                <p className="mt-2 text-sm text-danger" role="status">
                  {state.errors.attachment}
                </p>
              ) : null}
            </div>
          ) : null}
          <Field error={state.errors.notes} id="notes" label="Notes">
            <Textarea
              defaultValue={state.fields.notes}
              id="notes"
              name="notes"
              placeholder="Correction notes, completion details, or receipt context."
            />
          </Field>
        </div>
      </section>

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

function CostField({
  id,
  label,
  value,
  error,
  setCosts,
}: {
  id: "partsCost" | "laborCost" | "otherCost" | "taxCost";
  label: string;
  value: string;
  error?: string | undefined;
  setCosts: React.Dispatch<
    React.SetStateAction<{
      partsCost: string;
      laborCost: string;
      otherCost: string;
      taxCost: string;
    }>
  >;
}) {
  return (
    <Field error={error} id={id} label={label}>
      <Input
        defaultValue={value}
        id={id}
        min="0"
        name={id}
        onInput={(event) =>
          setCosts((current) => ({
            ...current,
            [id]: event.currentTarget.value,
          }))
        }
        step="0.01"
        type="number"
      />
    </Field>
  );
}

function recordToFields(
  record: MaintenanceRecordWithAsset,
): CompletedMaintenanceFormFields {
  return {
    assetId: record.asset_id,
    maintenanceRuleId: record.maintenance_rule_id ?? "",
    maintenanceType: record.maintenance_type,
    completionDate: record.completion_date,
    mileage: record.mileage?.toString() ?? "",
    engineHours: record.engine_hours?.toString() ?? "",
    serviceProvider: record.service_provider ?? "",
    partsCost: record.parts_cost.toString(),
    laborCost: record.labor_cost.toString(),
    otherCost: record.other_cost.toString(),
    taxCost: record.tax_cost.toString(),
    notes: record.notes ?? "",
  };
}
