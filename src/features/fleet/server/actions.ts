"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ASSET_IMAGE_ALLOWED_TYPES,
  ASSET_IMAGE_MAX_SIZE_BYTES,
} from "@/features/fleet/constants";
import {
  buildArchiveAssetPayload,
  buildAssetInsertPayload,
  buildAssetUpdatePayload,
  defaultMeterReadingFields,
  getAssetFormFieldsFromFormData,
  getMeterReadingFieldsFromFormData,
  validateMeterReadingChange,
} from "@/features/fleet/helpers";
import {
  validateUploadFile,
  type SupportedUploadMimeType,
} from "@/features/documents/file-validation";
import { assertFleetStorageQuotaAvailable } from "@/features/documents/server/storage-quota";
import type {
  AssetFormState,
  FleetAsset,
  MeterReadingFormState,
} from "@/features/fleet/types";
import { assetFormSchema, meterReadingFormSchema } from "@/features/fleet/validation";
import { serverEnv } from "@/lib/env/server";
import type { SafeActionErrorPayload } from "@/lib/action-errors";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { requireActiveAssetCapacity } from "@/features/billing/server/subscription";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";
import {
  expectedActionError,
  formActionFailure,
  toSafeActionError,
  toSafeActionException,
} from "@/server/actions/safe-error";

export async function createAssetAction(
  _previousState: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  const fields = getAssetFormFieldsFromFormData(formData);
  const parsed = assetFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Review the highlighted asset fields.",
      fields,
      errors: getAssetFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let redirectPath = "/fleet";

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    if (hasFormFile(formData, "assetImage")) {
      await enforceOwnerTenantRateLimit("documentUpload", context);
    }

    if (parsed.data.status === "active") {
      await requireActiveAssetCapacity(context);
    }

    const assetId = crypto.randomUUID();
    const imageUpload = await uploadAssetImage(context, assetId, formData);

    if (imageUpload.error) {
      return {
        status: "error",
        code: imageUpload.error.code,
        message: imageUpload.error.message,
        fields,
        errors: { assetImage: imageUpload.error.message },
      };
    }

    const payload = buildAssetInsertPayload(
      context.companyId,
      assetId,
      parsed.data,
      imageUpload.path,
    );

    const { error } = await context.supabase.from("assets").insert(payload);

    if (error) {
      if (imageUpload.path) {
        await context.supabase.storage
          .from(serverEnv.SUPABASE_ASSET_IMAGES_BUCKET)
          .remove([imageUpload.path]);
      }

      return formActionFailure(error, { action: "fleet.createAsset.insert" }, fields, {});
    }

    redirectPath = `/fleet/${assetId}`;
  } catch (error) {
    return formActionFailure(error, { action: "fleet.createAsset" }, fields, {});
  }

  revalidatePath("/fleet");
  redirect(redirectPath);
}

export async function updateAssetAction(
  assetId: string,
  _previousState: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  const fields = getAssetFormFieldsFromFormData(formData);
  const parsed = assetFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Review the highlighted asset fields.",
      fields,
      errors: getAssetFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const redirectPath = `/fleet/${assetId}`;

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    if (hasFormFile(formData, "assetImage")) {
      await enforceOwnerTenantRateLimit("documentUpload", context);
    }

    const { data: existingAsset, error: lookupError } = await context.supabase
      .from("assets")
      .select("id,asset_image_path,status,archived_at")
      .eq("id", assetId)
      .eq("company_id", context.companyId)
      .maybeSingle();

    if (lookupError) {
      return formActionFailure(
        lookupError,
        { action: "fleet.updateAsset.lookup" },
        fields,
        {},
      );
    }

    if (!existingAsset) {
      return formActionFailure(
        expectedActionError("NOT_FOUND", "Asset was not found for this owner company."),
        { action: "fleet.updateAsset.notFound" },
        fields,
        {},
      );
    }

    const previousAssetState = existingAsset as {
      asset_image_path: string | null;
      status: string;
      archived_at: string | null;
    };
    const isReactivating =
      parsed.data.status === "active" &&
      (previousAssetState.status !== "active" || Boolean(previousAssetState.archived_at));

    if (isReactivating) {
      await requireActiveAssetCapacity(context);
    }

    const imageUpload = await uploadAssetImage(context, assetId, formData);

    if (imageUpload.error) {
      return {
        status: "error",
        code: imageUpload.error.code,
        message: imageUpload.error.message,
        fields,
        errors: { assetImage: imageUpload.error.message },
      };
    }

    const assetImagePath =
      imageUpload.path ?? previousAssetState.asset_image_path ?? null;
    const payload = buildAssetUpdatePayload(parsed.data, assetImagePath);

    const { error } = await context.supabase
      .from("assets")
      .update(payload)
      .eq("id", assetId)
      .eq("company_id", context.companyId);

    if (error) {
      return formActionFailure(error, { action: "fleet.updateAsset.update" }, fields, {});
    }
  } catch (error) {
    return formActionFailure(error, { action: "fleet.updateAsset" }, fields, {});
  }

  revalidatePath("/fleet");
  revalidatePath(redirectPath);
  redirect(redirectPath);
}

export async function archiveAssetAction(assetId: string) {
  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("mutation", context);

  const { error } = await context.supabase
    .from("assets")
    .update(buildArchiveAssetPayload())
    .eq("id", assetId)
    .eq("company_id", context.companyId);

  if (error) {
    throw toSafeActionException(error, { action: "fleet.archiveAsset" });
  }

  revalidatePath("/fleet");
  redirect("/fleet");
}

export async function createMeterReadingAction(
  assetId: string,
  _previousState: MeterReadingFormState,
  formData: FormData,
): Promise<MeterReadingFormState> {
  const fields = getMeterReadingFieldsFromFormData(formData);
  const parsed = meterReadingFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Review the highlighted meter reading fields.",
      fields,
      errors: getMeterReadingFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    const { data: asset, error: lookupError } = await context.supabase
      .from("assets")
      .select("current_mileage,current_engine_hours")
      .eq("id", assetId)
      .eq("company_id", context.companyId)
      .maybeSingle();

    if (lookupError) {
      return formActionFailure(
        lookupError,
        { action: "fleet.createMeterReading.lookup" },
        fields,
        {},
      );
    }

    if (!asset) {
      return formActionFailure(
        expectedActionError("NOT_FOUND", "Asset was not found for this owner company."),
        { action: "fleet.createMeterReading.notFound" },
        fields,
        {},
      );
    }

    const assetMeters = asset as Pick<
      FleetAsset,
      "current_mileage" | "current_engine_hours"
    >;
    const validation = validateMeterReadingChange({
      reading: parsed.data,
      currentMileage: Number(assetMeters.current_mileage),
      currentEngineHours: Number(assetMeters.current_engine_hours),
    });

    if (!validation.ok) {
      return {
        status: "error",
        code: "VALIDATION_ERROR",
        message: validation.message,
        fields,
        errors: { readingValue: validation.message },
      };
    }

    const { error } = await context.supabase.rpc("create_meter_reading_for_asset", {
      p_asset_id: assetId,
      p_reading_type: parsed.data.readingType,
      p_reading_value: parsed.data.readingValue,
      p_reading_date: parsed.data.readingDate,
      p_notes: parsed.data.notes ?? null,
      p_is_correction: parsed.data.isCorrection,
    });

    if (error) {
      return formActionFailure(
        error,
        { action: "fleet.createMeterReading.rpc" },
        fields,
        {},
      );
    }
  } catch (error) {
    return formActionFailure(error, { action: "fleet.createMeterReading" }, fields, {});
  }

  revalidatePath(`/fleet/${assetId}`);

  return {
    status: "success",
    message: "Meter reading saved and the asset current value was updated.",
    fields: defaultMeterReadingFields(fields.readingType),
    errors: {},
  };
}

type AssetFieldErrors = Partial<Record<keyof AssetFormState["fields"], string>>;
type MeterReadingFieldErrors = Partial<
  Record<keyof MeterReadingFormState["fields"], string>
>;

function getAssetFieldErrors(
  fieldErrors: Partial<Record<keyof AssetFormState["fields"], string[]>>,
): AssetFieldErrors {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? ""]),
  ) as AssetFieldErrors;
}

function getMeterReadingFieldErrors(
  fieldErrors: Partial<Record<keyof MeterReadingFormState["fields"], string[]>>,
): MeterReadingFieldErrors {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? ""]),
  ) as MeterReadingFieldErrors;
}

type UploadResult = {
  path: string | null;
  error: SafeActionErrorPayload | null;
};

async function uploadAssetImage(
  context: Awaited<ReturnType<typeof requireOwnerDatabaseContext>>,
  assetId: string,
  formData: FormData,
): Promise<UploadResult> {
  const candidate = formData.get("assetImage");

  if (!(candidate instanceof File) || candidate.size === 0) {
    return { path: null, error: null };
  }

  const validation = await validateUploadFile(candidate, {
    allowedTypes: ASSET_IMAGE_ALLOWED_TYPES satisfies readonly SupportedUploadMimeType[],
    maxSizeBytes: ASSET_IMAGE_MAX_SIZE_BYTES,
    maxSizeLabel: "5 MB",
    allowedTypeLabel: "JPG, PNG, or WebP asset image",
  });

  if (!validation.ok) {
    return {
      path: null,
      error: { code: validation.code, message: validation.error },
    };
  }

  await assertFleetStorageQuotaAvailable({
    context,
    incomingBytes: validation.fileSize,
    storageBucket: serverEnv.SUPABASE_ASSET_IMAGES_BUCKET,
  });

  const storagePath = `${context.companyId}/assets/${assetId}/${crypto.randomUUID()}-${validation.safeName || "asset-image"}`;

  const { error } = await context.supabase.storage
    .from(serverEnv.SUPABASE_ASSET_IMAGES_BUCKET)
    .upload(storagePath, candidate, {
      cacheControl: "3600",
      contentType: validation.mimeType,
      upsert: false,
    });

  if (error) {
    return {
      path: null,
      error: toSafeActionError(error, { action: "fleet.uploadAssetImage" }),
    };
  }

  return { path: storagePath, error: null };
}

function hasFormFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return value instanceof File && value.size > 0;
}
