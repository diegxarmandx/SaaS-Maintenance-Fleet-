"use client";

import { useActionState } from "react";
import { Gauge, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getMeterReadingFormState,
  defaultMeterReadingFields,
} from "@/features/fleet/helpers";
import { createMeterReadingAction } from "@/features/fleet/server/actions";
import type { MeterReadingFormState } from "@/features/fleet/types";

type MeterReadingFormProps = {
  assetId: string;
};

type MeterReadingAction = (
  previousState: MeterReadingFormState,
  formData: FormData,
) => Promise<MeterReadingFormState>;

export function MeterReadingForm({ assetId }: MeterReadingFormProps) {
  const action: MeterReadingAction = createMeterReadingAction.bind(null, assetId);
  const [state, formAction, isPending] = useActionState(
    action,
    getMeterReadingFormState(defaultMeterReadingFields()),
  );

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.status === "error" ? (
        <ErrorMessage message={state.message} title="Reading was not saved" />
      ) : null}
      {state.status === "success" ? (
        <p
          className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary"
          role="status"
        >
          <Gauge aria-hidden="true" className="h-4 w-4" />
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field error={state.errors.readingType} id="readingType" label="Reading type">
          <Select
            defaultValue={state.fields.readingType}
            id="readingType"
            name="readingType"
          >
            <option value="mileage">Mileage</option>
            <option value="engine_hours">Engine hours</option>
          </Select>
        </Field>
        <Field
          error={state.errors.readingValue}
          id="readingValue"
          label="Reading value"
          required
        >
          <Input
            aria-invalid={Boolean(state.errors.readingValue)}
            defaultValue={state.fields.readingValue}
            id="readingValue"
            inputMode="decimal"
            min="0"
            name="readingValue"
            step="0.1"
            type="number"
          />
        </Field>
        <Field
          error={state.errors.readingDate}
          id="readingDate"
          label="Reading date"
          required
        >
          <Input
            aria-invalid={Boolean(state.errors.readingDate)}
            defaultValue={state.fields.readingDate}
            id="readingDate"
            name="readingDate"
            type="date"
          />
        </Field>
        <label className="flex min-h-11 items-center gap-3 self-end rounded-lg border border-border bg-background px-3 text-sm text-foreground">
          <input
            defaultChecked={state.fields.isCorrection}
            name="isCorrection"
            type="checkbox"
          />
          This is an explicit correction
        </label>
      </div>
      <Field
        error={state.errors.notes}
        helperText="A note is required if the correction lowers the current meter."
        id="readingNotes"
        label="Notes"
      >
        <Textarea
          aria-invalid={Boolean(state.errors.notes)}
          defaultValue={state.fields.notes}
          id="readingNotes"
          name="notes"
        />
      </Field>
      <div className="flex justify-end">
        <Button disabled={isPending} type="submit">
          <Save aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Saving" : "Save reading"}
        </Button>
      </div>
    </form>
  );
}
