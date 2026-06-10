"use client";

import Link from "next/link";
import { useActionState, useEffect, type MouseEvent } from "react";
import { useForm } from "react-hook-form";
import { Save } from "lucide-react";

import { Button, buttonClassName } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Field } from "@/components/ui/field";
import { FileUploadArea } from "@/components/ui/file-upload-area";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSET_IMAGE_ALLOWED_TYPES,
  ASSET_STATUS_OPTIONS,
  DEFAULT_ASSET_TYPES,
} from "@/features/fleet/constants";
import {
  assetToFormFields,
  emptyAssetFormState,
  getAssetFormState,
} from "@/features/fleet/helpers";
import { createAssetAction, updateAssetAction } from "@/features/fleet/server/actions";
import type { AssetFormFields, AssetFormState, FleetAsset } from "@/features/fleet/types";

type AssetFormProps = {
  mode: "create" | "edit";
  asset?: FleetAsset | undefined;
  cancelHref: string;
};

type AssetFormAction = (
  previousState: AssetFormState,
  formData: FormData,
) => Promise<AssetFormState>;

export function AssetForm({ mode, asset, cancelHref }: AssetFormProps) {
  const initialState =
    mode === "edit" && asset
      ? getAssetFormState(assetToFormFields(asset))
      : emptyAssetFormState;
  const formActionHandler: AssetFormAction =
    mode === "edit" && asset ? updateAssetAction.bind(null, asset.id) : createAssetAction;
  const [state, formAction, isPending] = useActionState(formActionHandler, initialState);
  const {
    register,
    formState: { isDirty },
  } = useForm<AssetFormFields>({
    defaultValues: state.fields,
  });

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const confirmDiscard = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isDirty && !window.confirm("Discard unsaved asset changes?")) {
      event.preventDefault();
    }
  };

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.status === "error" ? (
        <ErrorMessage message={state.message} title="Asset was not saved" />
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Asset details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            error={state.errors.unitNumber}
            id="unitNumber"
            label="Unit number"
            required
          >
            <Input
              aria-invalid={Boolean(state.errors.unitNumber)}
              defaultValue={state.fields.unitNumber}
              id="unitNumber"
              {...register("unitNumber")}
            />
          </Field>
          <Field
            error={state.errors.assetName}
            id="assetName"
            label="Asset name"
            required
          >
            <Input
              aria-invalid={Boolean(state.errors.assetName)}
              defaultValue={state.fields.assetName}
              id="assetName"
              {...register("assetName")}
            />
          </Field>
          <Field
            error={state.errors.assetType}
            helperText="Choose a default type or type a custom equipment type."
            id="assetType"
            label="Asset type"
            required
          >
            <Input
              aria-invalid={Boolean(state.errors.assetType)}
              defaultValue={state.fields.assetType}
              id="assetType"
              list="asset-type-options"
              {...register("assetType")}
            />
            <datalist id="asset-type-options">
              {DEFAULT_ASSET_TYPES.map((assetType) => (
                <option key={assetType} value={assetType} />
              ))}
            </datalist>
          </Field>
          <Field error={state.errors.status} id="status" label="Status">
            <Select
              aria-invalid={Boolean(state.errors.status)}
              defaultValue={state.fields.status}
              id="status"
              {...register("status")}
            >
              {ASSET_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field error={state.errors.year} id="year" label="Year">
            <Input
              aria-invalid={Boolean(state.errors.year)}
              defaultValue={state.fields.year}
              id="year"
              inputMode="numeric"
              type="number"
              {...register("year")}
            />
          </Field>
          <Field error={state.errors.make} id="make" label="Make">
            <Input
              aria-invalid={Boolean(state.errors.make)}
              defaultValue={state.fields.make}
              id="make"
              {...register("make")}
            />
          </Field>
          <Field error={state.errors.model} id="model" label="Model">
            <Input
              aria-invalid={Boolean(state.errors.model)}
              defaultValue={state.fields.model}
              id="model"
              {...register("model")}
            />
          </Field>
          <Field
            error={state.errors.licensePlate}
            id="licensePlate"
            label="License plate"
          >
            <Input
              aria-invalid={Boolean(state.errors.licensePlate)}
              defaultValue={state.fields.licensePlate}
              id="licensePlate"
              {...register("licensePlate")}
            />
          </Field>
          <Field
            className="sm:col-span-2"
            error={state.errors.vinOrSerialNumber}
            id="vinOrSerialNumber"
            label="VIN or serial number"
          >
            <Input
              aria-invalid={Boolean(state.errors.vinOrSerialNumber)}
              defaultValue={state.fields.vinOrSerialNumber}
              id="vinOrSerialNumber"
              {...register("vinOrSerialNumber")}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Meter and ownership</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            error={state.errors.currentMileage}
            helperText="Use the meter-reading form on the asset page for later updates."
            id="currentMileage"
            label="Current mileage"
          >
            <Input
              aria-invalid={Boolean(state.errors.currentMileage)}
              defaultValue={state.fields.currentMileage}
              id="currentMileage"
              inputMode="decimal"
              min="0"
              step="0.1"
              type="number"
              {...register("currentMileage")}
            />
          </Field>
          <Field
            error={state.errors.currentEngineHours}
            id="currentEngineHours"
            label="Engine hours"
          >
            <Input
              aria-invalid={Boolean(state.errors.currentEngineHours)}
              defaultValue={state.fields.currentEngineHours}
              id="currentEngineHours"
              inputMode="decimal"
              min="0"
              step="0.1"
              type="number"
              {...register("currentEngineHours")}
            />
          </Field>
          <Field
            error={state.errors.purchaseDate}
            id="purchaseDate"
            label="Purchase date"
          >
            <Input
              aria-invalid={Boolean(state.errors.purchaseDate)}
              defaultValue={state.fields.purchaseDate}
              id="purchaseDate"
              type="date"
              {...register("purchaseDate")}
            />
          </Field>
          <Field
            error={state.errors.purchasePrice}
            id="purchasePrice"
            label="Purchase price"
          >
            <Input
              aria-invalid={Boolean(state.errors.purchasePrice)}
              defaultValue={state.fields.purchasePrice}
              id="purchasePrice"
              inputMode="decimal"
              min="0"
              step="0.01"
              type="number"
              {...register("purchasePrice")}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Photo and notes</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <FileUploadArea
              accept={ASSET_IMAGE_ALLOWED_TYPES.join(",")}
              helperText="JPG, PNG, or WebP up to 5 MB."
              label={mode === "edit" ? "Replace asset image" : "Upload asset image"}
              name="assetImage"
            />
            {state.errors.assetImage ? (
              <p className="mt-2 text-sm text-danger" role="status">
                {state.errors.assetImage}
              </p>
            ) : null}
          </div>
          <Field error={state.errors.notes} id="notes" label="Notes">
            <Textarea
              aria-invalid={Boolean(state.errors.notes)}
              defaultValue={state.fields.notes}
              id="notes"
              {...register("notes")}
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className={buttonClassName({ variant: "secondary" })}
          href={cancelHref}
          onClick={confirmDiscard}
        >
          Cancel
        </Link>
        <Button disabled={isPending} type="submit">
          <Save aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Saving" : "Save asset"}
        </Button>
      </div>
    </form>
  );
}
