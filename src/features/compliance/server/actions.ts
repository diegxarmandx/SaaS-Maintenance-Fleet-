"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildComplianceRecordUpdatePayload,
  buildComplianceRequirementPayload,
  getComplianceRecordFieldsFromFormData,
  getComplianceRequirementFieldsFromFormData,
} from "@/features/compliance/helpers";
import type {
  ComplianceRecordFormState,
  ComplianceRequirementFormState,
} from "@/features/compliance/types";
import {
  complianceRecordFormSchema,
  complianceRequirementFormSchema,
} from "@/features/compliance/validation";
import { validateDocumentFile } from "@/features/documents/file-validation";
import { assertFleetStorageQuotaAvailable } from "@/features/documents/server/storage-quota";
import { AppError, getErrorMessage } from "@/lib/errors";
import { serverEnv } from "@/lib/env/server";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";

export async function createComplianceRequirementAction(
  _previousState: ComplianceRequirementFormState,
  formData: FormData,
): Promise<ComplianceRequirementFormState> {
  const fields = getComplianceRequirementFieldsFromFormData(formData);
  const parsed = complianceRequirementFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the highlighted compliance requirement fields.",
      fields,
      errors: getFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    const payload = buildComplianceRequirementPayload(context.companyId, parsed.data);
    const { error } = await context.supabase
      .from("compliance_requirements")
      .insert(payload);

    if (error) {
      return { status: "error", message: error.message, fields, errors: {} };
    }
  } catch (error) {
    return { status: "error", message: getErrorMessage(error), fields, errors: {} };
  }

  revalidatePath("/compliance");
  redirect("/compliance");
}

export async function createComplianceRecordAction(
  _previousState: ComplianceRecordFormState,
  formData: FormData,
): Promise<ComplianceRecordFormState> {
  const fields = getComplianceRecordFieldsFromFormData(formData);
  const parsed = complianceRecordFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the highlighted compliance fields.",
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

    const upload = await uploadComplianceDocument(context, recordId, formData);

    if (upload.error) {
      return {
        status: "error",
        message: upload.error,
        fields,
        errors: { attachment: upload.error },
      };
    }

    uploadedPath = upload.path;

    const { error } = await context.supabase.rpc(
      "create_compliance_record_with_document",
      {
        p_record_id: recordId,
        p_requirement_id: parsed.data.requirementId ?? null,
        p_asset_id: parsed.data.assetId,
        p_compliance_type: parsed.data.complianceType,
        p_issuing_organization: parsed.data.issuingOrganization ?? null,
        p_identification_number: parsed.data.identificationNumber ?? null,
        p_effective_date: parsed.data.effectiveDate ?? null,
        p_expiration_date: parsed.data.expirationDate,
        p_reminder_days: parsed.data.reminderDays,
        p_notes: parsed.data.notes ?? null,
        p_document_name: upload.name,
        p_document_storage_bucket: upload.bucket,
        p_document_storage_path: upload.path,
        p_document_mime_type: upload.mimeType,
        p_document_file_size: upload.fileSize,
        p_document_type: parsed.data.complianceType,
        p_document_number: parsed.data.identificationNumber ?? null,
      },
    );

    if (error) {
      if (uploadedPath) {
        await context.supabase.storage
          .from(serverEnv.SUPABASE_COMPLIANCE_DOCUMENTS_BUCKET)
          .remove([uploadedPath]);
      }

      return { status: "error", message: error.message, fields, errors: {} };
    }
  } catch (error) {
    return { status: "error", message: getErrorMessage(error), fields, errors: {} };
  }

  revalidatePath("/compliance");
  revalidatePath("/documents");
  redirect(`/compliance/${recordId}`);
}

export async function updateComplianceRecordAction(
  recordId: string,
  _previousState: ComplianceRecordFormState,
  formData: FormData,
): Promise<ComplianceRecordFormState> {
  const fields = getComplianceRecordFieldsFromFormData(formData);
  const parsed = complianceRecordFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the highlighted compliance fields.",
      fields,
      errors: getFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let uploadedPath: string | null = null;

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    if (hasFormFile(formData, "attachment")) {
      await enforceOwnerTenantRateLimit("documentUpload", context);
    }

    const validationError = await validateRequirementSelection(
      context,
      parsed.data.assetId,
      parsed.data.requirementId,
    );

    if (validationError) {
      return {
        status: "error",
        message: validationError,
        fields,
        errors: { requirementId: validationError },
      };
    }

    const upload = await uploadComplianceDocument(context, recordId, formData);

    if (upload.error) {
      return {
        status: "error",
        message: upload.error,
        fields,
        errors: { attachment: upload.error },
      };
    }

    uploadedPath = upload.path;

    const { error } = await context.supabase
      .from("compliance_records")
      .update(buildComplianceRecordUpdatePayload(parsed.data))
      .eq("id", recordId)
      .eq("company_id", context.companyId);

    if (error) {
      if (uploadedPath) {
        await context.supabase.storage
          .from(serverEnv.SUPABASE_COMPLIANCE_DOCUMENTS_BUCKET)
          .remove([uploadedPath]);
      }

      return { status: "error", message: error.message, fields, errors: {} };
    }

    if (upload.path) {
      const { error: archiveError } = await context.supabase
        .from("documents")
        .update({ archived_at: new Date().toISOString() })
        .eq("compliance_record_id", recordId)
        .eq("company_id", context.companyId)
        .is("archived_at", null);

      if (archiveError) {
        await context.supabase.storage
          .from(serverEnv.SUPABASE_COMPLIANCE_DOCUMENTS_BUCKET)
          .remove([upload.path]);

        return { status: "error", message: archiveError.message, fields, errors: {} };
      }

      const { error: documentError } = await context.supabase.from("documents").insert({
        company_id: context.companyId,
        asset_id: parsed.data.assetId,
        compliance_record_id: recordId,
        document_name: upload.name ?? parsed.data.complianceType,
        category: "compliance",
        document_type: parsed.data.complianceType,
        storage_bucket: upload.bucket,
        storage_path: upload.path,
        mime_type: upload.mimeType,
        file_size: upload.fileSize,
        issue_date: parsed.data.effectiveDate ?? null,
        expiration_date: parsed.data.expirationDate,
        document_number: parsed.data.identificationNumber ?? null,
        notes: "Replacement compliance document uploaded by the owner.",
      });

      if (documentError) {
        await context.supabase.storage
          .from(serverEnv.SUPABASE_COMPLIANCE_DOCUMENTS_BUCKET)
          .remove([upload.path]);

        return { status: "error", message: documentError.message, fields, errors: {} };
      }
    }
  } catch (error) {
    return { status: "error", message: getErrorMessage(error), fields, errors: {} };
  }

  revalidatePath("/compliance");
  revalidatePath("/documents");
  revalidatePath(`/compliance/${recordId}`);
  redirect(`/compliance/${recordId}`);
}

export async function archiveComplianceRecordAction(recordId: string) {
  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("mutation", context);

  const { error } = await context.supabase
    .from("compliance_records")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", recordId)
    .eq("company_id", context.companyId);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  revalidatePath("/compliance");
  redirect("/compliance");
}

export async function archiveComplianceRequirementAction(requirementId: string) {
  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("mutation", context);

  const { error } = await context.supabase
    .from("compliance_requirements")
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq("id", requirementId)
    .eq("company_id", context.companyId);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  revalidatePath("/compliance");
  redirect("/compliance");
}

type FieldErrorMap = Partial<Record<string, string[]>>;

function getFieldErrors<T extends string>(fieldErrors: FieldErrorMap) {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? ""]),
  ) as Partial<Record<T, string>>;
}

type UploadResult = {
  path: string | null;
  bucket: string | null;
  name: string | null;
  mimeType: string | null;
  fileSize: number | null;
  error: string | null;
};

async function uploadComplianceDocument(
  context: Awaited<ReturnType<typeof requireOwnerDatabaseContext>>,
  recordId: string,
  formData: FormData,
): Promise<UploadResult> {
  const candidate = formData.get("attachment");

  if (!(candidate instanceof File) || candidate.size === 0) {
    return {
      path: null,
      bucket: null,
      name: null,
      mimeType: null,
      fileSize: null,
      error: null,
    };
  }

  const validation = await validateDocumentFile(
    candidate,
    serverEnv.DOCUMENT_UPLOAD_MAX_SIZE_BYTES,
  );

  if (!validation.ok) {
    return {
      path: null,
      bucket: null,
      name: null,
      mimeType: null,
      fileSize: null,
      error: validation.error,
    };
  }

  await assertFleetStorageQuotaAvailable({
    context,
    incomingBytes: validation.fileSize,
    storageBucket: serverEnv.SUPABASE_COMPLIANCE_DOCUMENTS_BUCKET,
  });

  const storagePath = `${context.companyId}/compliance/${recordId}/${crypto.randomUUID()}-${validation.safeName}`;
  const { error } = await context.supabase.storage
    .from(serverEnv.SUPABASE_COMPLIANCE_DOCUMENTS_BUCKET)
    .upload(storagePath, candidate, {
      cacheControl: "3600",
      contentType: validation.mimeType,
      upsert: false,
    });

  if (error) {
    return {
      path: null,
      bucket: null,
      name: null,
      mimeType: null,
      fileSize: null,
      error: error.message,
    };
  }

  return {
    path: storagePath,
    bucket: serverEnv.SUPABASE_COMPLIANCE_DOCUMENTS_BUCKET,
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

async function validateRequirementSelection(
  context: Awaited<ReturnType<typeof requireOwnerDatabaseContext>>,
  assetId: string,
  requirementId: string | undefined,
) {
  if (!requirementId) {
    return null;
  }

  const { data, error } = await context.supabase
    .from("compliance_requirements")
    .select("id")
    .eq("id", requirementId)
    .eq("company_id", context.companyId)
    .eq("asset_id", assetId)
    .maybeSingle();

  if (error) {
    return error.message;
  }

  return data ? null : "Choose a requirement assigned to this asset.";
}
