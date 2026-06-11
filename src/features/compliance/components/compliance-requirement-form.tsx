"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Save } from "lucide-react";

import { Button, buttonClassName } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { emptyComplianceRequirementFormState } from "@/features/compliance/helpers";
import { createComplianceRequirementAction } from "@/features/compliance/server/actions";
import type { ComplianceFormOptions } from "@/features/compliance/server/queries";
import type { ComplianceRequirementFormState } from "@/features/compliance/types";

type ComplianceRequirementFormProps = {
  options: ComplianceFormOptions;
};

export function ComplianceRequirementForm({ options }: ComplianceRequirementFormProps) {
  const initialState: ComplianceRequirementFormState = {
    ...emptyComplianceRequirementFormState,
    fields: { ...emptyComplianceRequirementFormState.fields },
  };
  const [state, formAction, isPending] = useActionState(
    createComplianceRequirementAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.status === "error" ? (
        <ErrorMessage
          message={state.message}
          title="Compliance requirement was not saved"
        />
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Assigned requirement</h2>
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
          <Field
            className="sm:col-span-2"
            error={state.errors.notes}
            id="notes"
            label="Notes"
          >
            <Textarea
              defaultValue={state.fields.notes}
              id="notes"
              name="notes"
              placeholder="Owner notes about this requirement."
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
        <Link className={buttonClassName({ variant: "secondary" })} href="/compliance">
          Cancel
        </Link>
        <Button disabled={isPending} type="submit">
          <Save aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Saving" : "Assign requirement"}
        </Button>
      </div>
    </form>
  );
}
