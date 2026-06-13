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
import type {
  AssetFormState,
  FleetAsset,
  MeterReadingFormState,
} from "@/features/fleet/types";
import { assetFormSchema, meterReadingFormSchema } from "@/features/fleet/validation";
import { AppError, getErrorMessage } from "@/lib/errors";
import { serverEnv } from "@/lib/env/server";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { requireActiveAssetCapacity } from "@/features/billing/server/subscription";

export async function createAssetAction(
  _previousState: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  const fields = getAssetFormFieldsFromFormData(formData);
  const parsed = assetFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the highlighted asset fields.",
      fields,
      errors: getAssetFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let redirectPath = "/fleet";

  try {
    const context = await requireOwnerDatabaseContext();

    if (parsed.data.status === "active") {
      await requireActiveAssetCapacity(context);
    }

    const assetId = crypto.randomUUID();
    const imageUpload = await uploadAssetImage(context, assetId, formData);

    if (imageUpload.error) {
      return {
        status: "error",
        message: imageUpload.error,
        fields,
        errors: { assetImage: imageUpload.error },
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

      return {
        status: "error",
        message: error.message,
        fields,
        errors: {},
      };
    }

    redirectPath = `/fleet/${assetId}`;
  } catch (error) {
    return {
      status: "error",
      message: getErrorMessage(error),
      fields,
      errors: {},
    };
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
      message: "Review the highlighted asset fields.",
      fields,
      errors: getAssetFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const redirectPath = `/fleet/${assetId}`;

  try {
    const context = await requireOwnerDatabaseContext();
    const { data: existingAsset, error: lookupError } = await context.supabase
      .from("assets")
      .select("id,asset_image_path,status,archived_at")
      .eq("id", assetId)
      .eq("company_id", context.companyId)
      .maybeSingle();

    if (lookupError) {
      return { status: "error", message: lookupError.message, fields, errors: {} };
    }

    if (!existingAsset) {
      return {
        status: "error",
        message: "Asset was not found for this owner company.",
        fields,
        errors: {},
      };
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
        message: imageUpload.error,
        fields,
        errors: { assetImage: imageUpload.error },
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
      return {
        status: "error",
        message: error.message,
        fields,
        errors: {},
      };
    }
  } catch (error) {
    return {
      status: "error",
      message: getErrorMessage(error),
      fields,
      errors: {},
    };
  }

  revalidatePath("/fleet");
  revalidatePath(redirectPath);
  redirect(redirectPath);
}

export async function archiveAssetAction(assetId: string) {
  const context = await requireOwnerDatabaseContext();
  const { error } = await context.supabase
    .from("assets")
    .update(buildArchiveAssetPayload())
    .eq("id", assetId)
    .eq("company_id", context.companyId);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
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
      message: "Review the highlighted meter reading fields.",
      fields,
      errors: getMeterReadingFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    const context = await requireOwnerDatabaseContext();
    const { data: asset, error: lookupError } = await context.supabase
      .from("assets")
      .select("current_mileage,current_engine_hours")
      .eq("id", assetId)
      .eq("company_id", context.companyId)
      .maybeSingle();

    if (lookupError) {
      return { status: "error", message: lookupError.message, fields, errors: {} };
    }

    if (!asset) {
      return {
        status: "error",
        message: "Asset was not found for this owner company.",
        fields,
        errors: {},
      };
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
      return { status: "error", message: error.message, fields, errors: {} };
    }
  } catch (error) {
    return {
      status: "error",
      message: getErrorMessage(error),
      fields,
      errors: {},
    };
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
  error: string | null;
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

  if (
    !ASSET_IMAGE_ALLOWED_TYPES.includes(
      candidate.type as (typeof ASSET_IMAGE_ALLOWED_TYPES)[number],
    )
  ) {
    return {
      path: null,
      error: "Upload a JPG, PNG, or WebP asset image.",
    };
  }

  if (candidate.size > ASSET_IMAGE_MAX_SIZE_BYTES) {
    return {
      path: null,
      error: "Asset images must be 5 MB or smaller.",
    };
  }

  const safeName = candidate.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const storagePath = `${context.companyId}/assets/${assetId}/${Date.now()}-${safeName || "asset-image"}`;

  const { error } = await context.supabase.storage
    .from(serverEnv.SUPABASE_ASSET_IMAGES_BUCKET)
    .upload(storagePath, candidate, {
      cacheControl: "3600",
      contentType: candidate.type,
      upsert: false,
    });

  if (error) {
    return {
      path: null,
      error: error.message,
    };
  }

  return { path: storagePath, error: null };
}
