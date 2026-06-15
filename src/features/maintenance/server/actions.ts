"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  MAINTENANCE_ATTACHMENT_ALLOWED_TYPES,
  MAINTENANCE_ATTACHMENT_MAX_SIZE_BYTES,
} from "@/features/maintenance/constants";
import { validateUploadFile } from "@/features/documents/file-validation";
import { assertFleetStorageQuotaAvailable } from "@/features/documents/server/storage-quota";
import {
  buildMaintenanceRulePayload,
  getCompletedMaintenanceFieldsFromFormData,
  getMaintenanceRuleFieldsFromFormData,
} from "@/features/maintenance/helpers";
import type {
  CompletedMaintenanceFormState,
  MaintenanceRuleFormState,
} from "@/features/maintenance/types";
import {
  completedMaintenanceFormSchema,
  maintenanceRuleFormSchema,
} from "@/features/maintenance/validation";
import { AppError, getErrorMessage } from "@/lib/errors";
import { serverEnv } from "@/lib/env/server";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";

export async function createMaintenanceRuleAction(
  _previousState: MaintenanceRuleFormState,
  formData: FormData,
): Promise<MaintenanceRuleFormState> {
  const fields = getMaintenanceRuleFieldsFromFormData(formData);
  const parsed = maintenanceRuleFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the highlighted maintenance rule fields.",
      fields,
      errors: getFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    const payload = buildMaintenanceRulePayload(context.companyId, parsed.data);
    const { error } = await context.supabase.from("maintenance_rules").insert(payload);

    if (error) {
      return { status: "error", message: error.message, fields, errors: {} };
    }
  } catch (error) {
    return { status: "error", message: getErrorMessage(error), fields, errors: {} };
  }

  revalidatePath("/maintenance");
  redirect("/maintenance");
}

export async function recordCompletedMaintenanceAction(
  _previousState: CompletedMaintenanceFormState,
  formData: FormData,
): Promise<CompletedMaintenanceFormState> {
  const fields = getCompletedMaintenanceFieldsFromFormData(formData);
  const parsed = completedMaintenanceFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the highlighted completed maintenance fields.",
      fields,
      errors: getFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const recordId = crypto.randomUUID();
  let uploadedPath: string | null = null;

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    if (hasFormFile(formData, "attachment")) {
      await enforceOwnerTenantRateLimit("documentUpload", context);
    }

    const upload = await uploadMaintenanceAttachment(context, recordId, formData);

    if (upload.error) {
      return {
        status: "error",
        message: upload.error,
        fields,
        errors: { attachment: upload.error },
      };
    }

    uploadedPath = upload.path;

    const { error } = await context.supabase.rpc("complete_maintenance_and_update_rule", {
      p_record_id: recordId,
      p_asset_id: parsed.data.assetId,
      p_maintenance_rule_id: parsed.data.maintenanceRuleId ?? null,
      p_maintenance_type: parsed.data.maintenanceType,
      p_completion_date: parsed.data.completionDate,
      p_mileage: parsed.data.mileage ?? null,
      p_engine_hours: parsed.data.engineHours ?? null,
      p_service_provider: parsed.data.serviceProvider ?? null,
      p_parts_cost: parsed.data.partsCost,
      p_labor_cost: parsed.data.laborCost,
      p_other_cost: parsed.data.otherCost,
      p_notes: parsed.data.notes ?? null,
      p_attachment_name: upload.name,
      p_attachment_storage_path: upload.path,
      p_attachment_mime_type: upload.mimeType,
      p_attachment_file_size: upload.fileSize,
    });

    if (error) {
      if (uploadedPath) {
        await context.supabase.storage
          .from(serverEnv.SUPABASE_MAINTENANCE_ATTACHMENTS_BUCKET)
          .remove([uploadedPath]);
      }

      return { status: "error", message: error.message, fields, errors: {} };
    }
  } catch (error) {
    return { status: "error", message: getErrorMessage(error), fields, errors: {} };
  }

  revalidatePath("/maintenance");
  redirect(`/maintenance/history/${recordId}`);
}

export async function updateMaintenanceRecordAction(
  recordId: string,
  _previousState: CompletedMaintenanceFormState,
  formData: FormData,
): Promise<CompletedMaintenanceFormState> {
  const fields = getCompletedMaintenanceFieldsFromFormData(formData);
  const parsed = completedMaintenanceFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the highlighted completed maintenance fields.",
      fields,
      errors: getFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    const { error } = await context.supabase
      .from("maintenance_records")
      .update({
        asset_id: parsed.data.assetId,
        maintenance_rule_id: parsed.data.maintenanceRuleId ?? null,
        maintenance_type: parsed.data.maintenanceType,
        completion_date: parsed.data.completionDate,
        mileage: parsed.data.mileage ?? null,
        engine_hours: parsed.data.engineHours ?? null,
        service_provider: parsed.data.serviceProvider ?? null,
        parts_cost: parsed.data.partsCost,
        labor_cost: parsed.data.laborCost,
        other_cost: parsed.data.otherCost,
        notes: parsed.data.notes ?? null,
      })
      .eq("id", recordId)
      .eq("company_id", context.companyId);

    if (error) {
      return { status: "error", message: error.message, fields, errors: {} };
    }
  } catch (error) {
    return { status: "error", message: getErrorMessage(error), fields, errors: {} };
  }

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/history/${recordId}`);
  redirect(`/maintenance/history/${recordId}`);
}

export async function archiveMaintenanceRecordAction(recordId: string) {
  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("mutation", context);

  const { error } = await context.supabase
    .from("maintenance_records")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", recordId)
    .eq("company_id", context.companyId);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  revalidatePath("/maintenance");
  redirect("/maintenance#history");
}

type FieldErrorMap = Partial<Record<string, string[]>>;

function getFieldErrors<T extends string>(fieldErrors: FieldErrorMap) {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? ""]),
  ) as Partial<Record<T, string>>;
}

type UploadResult = {
  path: string | null;
  name: string | null;
  mimeType: string | null;
  fileSize: number | null;
  error: string | null;
};

async function uploadMaintenanceAttachment(
  context: Awaited<ReturnType<typeof requireOwnerDatabaseContext>>,
  recordId: string,
  formData: FormData,
): Promise<UploadResult> {
  const candidate = formData.get("attachment");

  if (!(candidate instanceof File) || candidate.size === 0) {
    return {
      path: null,
      name: null,
      mimeType: null,
      fileSize: null,
      error: null,
    };
  }

  const validation = await validateUploadFile(candidate, {
    allowedTypes: MAINTENANCE_ATTACHMENT_ALLOWED_TYPES,
    maxSizeBytes: MAINTENANCE_ATTACHMENT_MAX_SIZE_BYTES,
    maxSizeLabel: "10 MB",
    allowedTypeLabel: "PDF, JPG, PNG, or WebP maintenance attachment",
  });

  if (!validation.ok) {
    return {
      path: null,
      name: null,
      mimeType: null,
      fileSize: null,
      error: validation.error,
    };
  }

  await assertFleetStorageQuotaAvailable({
    context,
    incomingBytes: validation.fileSize,
    storageBucket: serverEnv.SUPABASE_MAINTENANCE_ATTACHMENTS_BUCKET,
  });

  const storagePath = `${context.companyId}/maintenance/${recordId}/${crypto.randomUUID()}-${validation.safeName || "attachment"}`;

  const { error } = await context.supabase.storage
    .from(serverEnv.SUPABASE_MAINTENANCE_ATTACHMENTS_BUCKET)
    .upload(storagePath, candidate, {
      cacheControl: "3600",
      contentType: validation.mimeType,
      upsert: false,
    });

  if (error) {
    return {
      path: null,
      name: null,
      mimeType: null,
      fileSize: null,
      error: error.message,
    };
  }

  return {
    path: storagePath,
    name: candidate.name,
    mimeType: validation.mimeType,
    fileSize: validation.fileSize,
    error: null,
  };
}

function hasFormFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return value instanceof File && value.size > 0;
}
