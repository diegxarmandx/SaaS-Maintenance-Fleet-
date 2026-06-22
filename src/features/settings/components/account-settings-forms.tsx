"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { Building2, Gauge, Pencil, Save, UserCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { ToastRegion } from "@/components/ui/toast";
import {
  updateCompanyProfileAction,
  updateOwnerProfileAction,
  updateWorkspacePreferencesAction,
} from "@/features/settings/actions";
import { TIMEZONE_OPTIONS } from "@/features/settings/helpers";
import type {
  CompanyProfileFields,
  CompanyProfileFormState,
  OwnerProfileFields,
  OwnerProfileFormState,
  WorkspacePreferencesFields,
  WorkspacePreferencesFormState,
} from "@/features/settings/types";

type ActiveEditor = "company" | "owner" | "preferences" | null;

type AccountSettingsFormsProps = {
  companyProfile: CompanyProfileFields;
  ownerProfile: OwnerProfileFields & { email: string };
  workspacePreferences: WorkspacePreferencesFields;
};

export function AccountSettingsForms({
  companyProfile: initialCompanyProfile,
  ownerProfile: initialOwnerProfile,
  workspacePreferences: initialWorkspacePreferences,
}: AccountSettingsFormsProps) {
  const [companyProfile, setCompanyProfile] = useState(initialCompanyProfile);
  const [ownerProfile, setOwnerProfile] = useState(initialOwnerProfile);
  const [workspacePreferences, setWorkspacePreferences] = useState(
    initialWorkspacePreferences,
  );
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const finishEdit = (message: string) => {
    setSuccessMessage(message);
    setActiveEditor(null);
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <EditableSettingsCard
          description="Company contact information used on owner-facing records and billing context."
          editDisabled={activeEditor !== null}
          editing={activeEditor === "company"}
          icon={<Building2 aria-hidden="true" className="h-5 w-5" />}
          onEdit={() => {
            setSuccessMessage("");
            setActiveEditor("company");
          }}
          title="Company profile"
        >
          {activeEditor === "company" ? (
            <CompanyProfileEditor
              initialFields={companyProfile}
              onCancel={() => setActiveEditor(null)}
              onSaved={(fields, message) => {
                setCompanyProfile(fields);
                finishEdit(message);
              }}
            />
          ) : (
            <SettingsDescriptionList
              rows={[
                ["Company", companyProfile.companyName],
                ["Email", companyProfile.companyEmail],
                ["Phone", companyProfile.phone || "Not recorded"],
                ["Address", companyProfile.address || "Not recorded"],
              ]}
            />
          )}
        </EditableSettingsCard>

        <EditableSettingsCard
          description="The authenticated owner identity shown throughout this workspace."
          editDisabled={activeEditor !== null}
          editing={activeEditor === "owner"}
          icon={<UserCircle aria-hidden="true" className="h-5 w-5" />}
          onEdit={() => {
            setSuccessMessage("");
            setActiveEditor("owner");
          }}
          title="Owner profile"
        >
          {activeEditor === "owner" ? (
            <OwnerProfileEditor
              email={ownerProfile.email}
              initialFields={ownerProfile}
              onCancel={() => setActiveEditor(null)}
              onSaved={(fields, message) => {
                setOwnerProfile((current) => ({ ...current, ...fields }));
                finishEdit(message);
              }}
            />
          ) : (
            <SettingsDescriptionList
              rows={[
                ["Name", ownerProfile.fullName],
                ["Email", ownerProfile.email],
              ]}
            />
          )}
        </EditableSettingsCard>

        <EditableSettingsCard
          description="Defaults that keep dates, mileage, and engine-hour entries consistent."
          editDisabled={activeEditor !== null}
          editLabel="Edit workspace preferences"
          editing={activeEditor === "preferences"}
          icon={<Gauge aria-hidden="true" className="h-5 w-5" />}
          onEdit={() => {
            setSuccessMessage("");
            setActiveEditor("preferences");
          }}
          title="Measurement and timezone"
        >
          {activeEditor === "preferences" ? (
            <WorkspacePreferencesEditor
              initialFields={workspacePreferences}
              onCancel={() => setActiveEditor(null)}
              onSaved={(fields, message) => {
                setWorkspacePreferences(fields);
                finishEdit(message);
              }}
            />
          ) : (
            <SettingsDescriptionList
              rows={[
                ["Timezone", workspacePreferences.preferredTimezone],
                [
                  "Distance unit",
                  workspacePreferences.distanceUnit === "kilometers"
                    ? "Kilometers"
                    : "Miles",
                ],
                ["Engine hours", workspacePreferences.engineHourTracking ? "On" : "Off"],
              ]}
            />
          )}
        </EditableSettingsCard>
      </div>
      <ToastRegion message={successMessage} tone="success" />
    </>
  );
}

function EditableSettingsCard({
  title,
  description,
  editDisabled,
  editLabel,
  icon,
  editing,
  onEdit,
  children,
}: {
  title: string;
  description: string;
  editDisabled: boolean;
  editLabel?: string;
  icon: ReactNode;
  editing: boolean;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </span>
            <div className="min-w-0">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {!editing ? (
            <Button
              aria-label={editLabel ?? `Edit ${title.toLowerCase()}`}
              disabled={editDisabled}
              onClick={onEdit}
              size="sm"
              variant="secondary"
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function CompanyProfileEditor({
  initialFields,
  onCancel,
  onSaved,
}: {
  initialFields: CompanyProfileFields;
  onCancel: () => void;
  onSaved: (fields: CompanyProfileFields, message: string) => void;
}) {
  const initialState: CompanyProfileFormState = {
    status: "idle",
    message: "",
    fields: initialFields,
    errors: {},
  };
  const [state, formAction, isPending] = useActionState(
    updateCompanyProfileAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      onSaved(state.fields, state.message);
    }
  }, [onSaved, state]);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.status === "error" ? (
        <ErrorMessage message={state.message} title="Company profile was not saved" />
      ) : null}
      <Field
        error={state.errors.companyName}
        id="companyName"
        label="Company name"
        required
      >
        <Input
          aria-invalid={Boolean(state.errors.companyName)}
          defaultValue={state.fields.companyName}
          disabled={isPending}
          id="companyName"
          name="companyName"
        />
      </Field>
      <Field
        error={state.errors.companyEmail}
        helperText="Used for company records and operational contact."
        id="companyEmail"
        label="Company email"
        required
      >
        <Input
          aria-invalid={Boolean(state.errors.companyEmail)}
          autoComplete="email"
          defaultValue={state.fields.companyEmail}
          disabled={isPending}
          id="companyEmail"
          name="companyEmail"
          type="email"
        />
      </Field>
      <Field error={state.errors.phone} id="companyPhone" label="Phone">
        <Input
          aria-invalid={Boolean(state.errors.phone)}
          autoComplete="tel"
          defaultValue={state.fields.phone}
          disabled={isPending}
          id="companyPhone"
          inputMode="tel"
          name="phone"
          type="tel"
        />
      </Field>
      <Field error={state.errors.address} id="companyAddress" label="Address">
        <Textarea
          aria-invalid={Boolean(state.errors.address)}
          autoComplete="street-address"
          defaultValue={state.fields.address}
          disabled={isPending}
          id="companyAddress"
          name="address"
          rows={3}
        />
      </Field>
      <FormActions
        cancelLabel="Cancel company profile changes"
        isPending={isPending}
        onCancel={onCancel}
        saveLabel="Save company profile"
      />
    </form>
  );
}

function OwnerProfileEditor({
  initialFields,
  email,
  onCancel,
  onSaved,
}: {
  initialFields: OwnerProfileFields;
  email: string;
  onCancel: () => void;
  onSaved: (fields: OwnerProfileFields, message: string) => void;
}) {
  const initialState: OwnerProfileFormState = {
    status: "idle",
    message: "",
    fields: initialFields,
    errors: {},
  };
  const [state, formAction, isPending] = useActionState(
    updateOwnerProfileAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      onSaved(state.fields, state.message);
    }
  }, [onSaved, state]);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.status === "error" ? (
        <ErrorMessage message={state.message} title="Owner profile was not saved" />
      ) : null}
      <Field error={state.errors.fullName} id="fullName" label="Owner name" required>
        <Input
          aria-invalid={Boolean(state.errors.fullName)}
          autoComplete="name"
          defaultValue={state.fields.fullName}
          disabled={isPending}
          id="fullName"
          name="fullName"
        />
      </Field>
      <Field
        helperText="Account email changes use the secure authentication flow and are not editable here."
        id="ownerEmail"
        label="Sign-in email"
      >
        <Input disabled id="ownerEmail" readOnly type="email" value={email} />
      </Field>
      <FormActions
        cancelLabel="Cancel owner profile changes"
        isPending={isPending}
        onCancel={onCancel}
        saveLabel="Save owner profile"
      />
    </form>
  );
}

function WorkspacePreferencesEditor({
  initialFields,
  onCancel,
  onSaved,
}: {
  initialFields: WorkspacePreferencesFields;
  onCancel: () => void;
  onSaved: (fields: WorkspacePreferencesFields, message: string) => void;
}) {
  const initialState: WorkspacePreferencesFormState = {
    status: "idle",
    message: "",
    fields: initialFields,
    errors: {},
  };
  const [state, formAction, isPending] = useActionState(
    updateWorkspacePreferencesAction,
    initialState,
  );
  const timezoneOptions = TIMEZONE_OPTIONS.some(
    (option) => option.value === state.fields.preferredTimezone,
  )
    ? TIMEZONE_OPTIONS
    : [
        {
          label: state.fields.preferredTimezone,
          value: state.fields.preferredTimezone,
        },
        ...TIMEZONE_OPTIONS,
      ];

  useEffect(() => {
    if (state.status === "success") {
      onSaved(state.fields, state.message);
    }
  }, [onSaved, state]);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.status === "error" ? (
        <ErrorMessage
          message={state.message}
          title="Workspace preferences were not saved"
        />
      ) : null}
      <Field
        error={state.errors.preferredTimezone}
        helperText="Dates and reminder timing use this timezone."
        id="preferredTimezone"
        label="Timezone"
        required
      >
        <Select
          aria-invalid={Boolean(state.errors.preferredTimezone)}
          defaultValue={state.fields.preferredTimezone}
          disabled={isPending}
          id="preferredTimezone"
          name="preferredTimezone"
        >
          {timezoneOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        error={state.errors.distanceUnit}
        id="distanceUnit"
        label="Distance unit"
        required
      >
        <Select
          aria-invalid={Boolean(state.errors.distanceUnit)}
          defaultValue={state.fields.distanceUnit}
          disabled={isPending}
          id="distanceUnit"
          name="distanceUnit"
        >
          <option value="miles">Miles</option>
          <option value="kilometers">Kilometers</option>
        </Select>
      </Field>
      <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
        <input
          className="mt-0.5 h-4 w-4 rounded border-border text-primary"
          defaultChecked={state.fields.engineHourTracking}
          disabled={isPending}
          name="engineHourTracking"
          type="checkbox"
        />
        <span>
          <span className="block font-medium">Track engine hours</span>
          <span className="mt-1 block leading-5 text-muted">
            Keep engine-hour inputs available for equipment that reports hours.
          </span>
        </span>
      </label>
      <FormActions
        cancelLabel="Cancel workspace preference changes"
        isPending={isPending}
        onCancel={onCancel}
        saveLabel="Save workspace preferences"
      />
    </form>
  );
}

function FormActions({
  cancelLabel,
  saveLabel,
  isPending,
  onCancel,
}: {
  cancelLabel: string;
  saveLabel: string;
  isPending: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
      <Button
        aria-label={cancelLabel}
        disabled={isPending}
        onClick={onCancel}
        variant="ghost"
      >
        <X aria-hidden="true" className="h-4 w-4" />
        Cancel
      </Button>
      <Button disabled={isPending} type="submit">
        <Save aria-hidden="true" className="h-4 w-4" />
        {isPending ? "Saving" : saveLabel}
      </Button>
    </div>
  );
}

function SettingsDescriptionList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 text-sm">
      {rows.map(([label, value]) => (
        <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]" key={label}>
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 break-words font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
