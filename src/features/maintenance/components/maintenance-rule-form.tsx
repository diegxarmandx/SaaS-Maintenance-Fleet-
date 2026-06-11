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
import { emptyMaintenanceRuleFormState } from "@/features/maintenance/helpers";
import { createMaintenanceRuleAction } from "@/features/maintenance/server/actions";
import type { MaintenanceFormOptions } from "@/features/maintenance/server/queries";

type MaintenanceRuleFormProps = {
  options: MaintenanceFormOptions;
};

export function MaintenanceRuleForm({ options }: MaintenanceRuleFormProps) {
  const [state, formAction, isPending] = useActionState(
    createMaintenanceRuleAction,
    emptyMaintenanceRuleFormState,
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.status === "error" ? (
        <ErrorMessage message={state.message} title="Maintenance rule was not saved" />
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Rule setup</h2>
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
            error={state.errors.templateId}
            helperText="Choose a system template or leave blank for a custom item."
            id="templateId"
            label="Template"
          >
            <Select
              defaultValue={state.fields.templateId}
              id="templateId"
              name="templateId"
            >
              <option value="">Custom maintenance item</option>
              {options.templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field error={state.errors.name} id="name" label="Maintenance type" required>
            <Input
              aria-invalid={Boolean(state.errors.name)}
              defaultValue={state.fields.name}
              id="name"
              name="name"
              placeholder="Engine oil and filter"
            />
          </Field>
          <label className="flex min-h-11 items-center gap-3 self-end rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <input
              defaultChecked={state.fields.isActive}
              name="isActive"
              type="checkbox"
            />
            Active rule
          </label>
          <Field
            className="sm:col-span-2"
            error={state.errors.description}
            id="description"
            label="Notes"
          >
            <Textarea
              aria-invalid={Boolean(state.errors.description)}
              defaultValue={state.fields.description}
              id="description"
              name="description"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Intervals</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Use mileage, engine hours, calendar days, or any combination.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field
            error={state.errors.mileageInterval}
            id="mileageInterval"
            label="Mileage interval"
          >
            <Input
              defaultValue={state.fields.mileageInterval}
              id="mileageInterval"
              min="0"
              name="mileageInterval"
              step="0.1"
              type="number"
            />
          </Field>
          <Field
            error={state.errors.hourInterval}
            id="hourInterval"
            label="Hour interval"
          >
            <Input
              defaultValue={state.fields.hourInterval}
              id="hourInterval"
              min="0"
              name="hourInterval"
              step="0.1"
              type="number"
            />
          </Field>
          <Field
            error={state.errors.calendarIntervalDays}
            id="calendarIntervalDays"
            label="Calendar interval days"
          >
            <Input
              defaultValue={state.fields.calendarIntervalDays}
              id="calendarIntervalDays"
              min="1"
              name="calendarIntervalDays"
              type="number"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Last completed</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field
            error={state.errors.lastCompletedDate}
            id="lastCompletedDate"
            label="Last completed date"
          >
            <Input
              defaultValue={state.fields.lastCompletedDate}
              id="lastCompletedDate"
              name="lastCompletedDate"
              type="date"
            />
          </Field>
          <Field
            error={state.errors.lastCompletedMileage}
            id="lastCompletedMileage"
            label="Last mileage"
          >
            <Input
              defaultValue={state.fields.lastCompletedMileage}
              id="lastCompletedMileage"
              min="0"
              name="lastCompletedMileage"
              step="0.1"
              type="number"
            />
          </Field>
          <Field
            error={state.errors.lastCompletedHours}
            id="lastCompletedHours"
            label="Last engine hours"
          >
            <Input
              defaultValue={state.fields.lastCompletedHours}
              id="lastCompletedHours"
              min="0"
              name="lastCompletedHours"
              step="0.1"
              type="number"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Reminder thresholds</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field
            error={state.errors.reminderDays}
            id="reminderDays"
            label="Reminder days"
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
            error={state.errors.reminderMileage}
            id="reminderMileage"
            label="Reminder mileage"
          >
            <Input
              defaultValue={state.fields.reminderMileage}
              id="reminderMileage"
              min="0"
              name="reminderMileage"
              step="0.1"
              type="number"
            />
          </Field>
          <Field
            error={state.errors.reminderHours}
            id="reminderHours"
            label="Reminder hours"
          >
            <Input
              defaultValue={state.fields.reminderHours}
              id="reminderHours"
              min="0"
              name="reminderHours"
              step="0.1"
              type="number"
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link className={buttonClassName({ variant: "secondary" })} href="/maintenance">
          Cancel
        </Link>
        <Button disabled={isPending} type="submit">
          <Save aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Saving" : "Save rule"}
        </Button>
      </div>
    </form>
  );
}
