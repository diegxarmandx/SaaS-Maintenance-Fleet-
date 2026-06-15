"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildDocumentMetadataPayload,
  buildDocumentUpdatePayload,
  getDocumentFieldsFromFormData,
  resolveDocumentCategory,
} from "@/features/documents/helpers";
import type { DocumentFormState } from "@/features/documents/types";
import {
  documentFormSchema,
  type DocumentFormInput,
} from "@/features/documents/validation";
import { validateDocumentFile } from "@/features/documents/file-validation";
import { recordDocumentVersion } from "@/features/documents/server/versions";
import { assertFleetStorageQuotaAvailable } from "@/features/documents/server/storage-quota";
import type { SafeActionErrorPayload } from "@/lib/action-errors";
import { serverEnv } from "@/lib/env/server";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { recordAuditEvent } from "@/server/audit/log";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";
import {
  expectedActionError,
  formActionFailure,
  toSafeActionError,
  toSafeActionException,
} from "@/server/actions/safe-error";

export async function uploadFleetDocumentAction(
  _previousState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const fields = getDocumentFieldsFromFormData(formData);
  const parsed = documentFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Review the highlighted document fields.",
      fields,
      errors: getFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const documentId = crypto.randomUUID();
  let uploaded: UploadedDocumentFile | null = null;

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);
    await enforceOwnerTenantRateLimit("documentUpload", context);

    const relationshipResult = await resolveRelationships(context, parsed.data);

    if (relationshipResult.error) {
      return {
        status: "error",
        code: relationshipResult.error.code,
        message: relationshipResult.error.message,
        fields,
        errors: {},
      };
    }

    const upload = await uploadDocumentFile(
      context,
      documentId,
      relationshipResult.input,
      formData,
    );

    if (upload.error) {
      return {
        status: "error",
        code: upload.error.code,
        message: upload.error.message,
        fields,
        errors: { file: upload.error.message },
      };
    }

    if (!upload.file) {
      return {
        status: "error",
        code: "INVALID_FILE",
        message: "Choose a PDF, JPG, or PNG document to upload.",
        fields,
        errors: { file: "Choose a PDF, JPG, or PNG document to upload." },
      };
    }

    uploaded = upload.file;

    const payload = buildDocumentMetadataPayload(
      context.companyId,
      relationshipResult.input,
      uploaded,
    );
    const { error } = await context.supabase
      .from("documents")
      .insert({ id: documentId, ...payload });

    if (error) {
      await context.supabase.storage
        .from(uploaded.storageBucket)
        .remove([uploaded.storagePath]);

      return formActionFailure(
        error,
        { action: "documents.upload.insert" },
        fields,
        {},
      );
    }

    try {
      await recordDocumentVersion(context, {
        documentId,
        storageBucket: uploaded.storageBucket,
        storagePath: uploaded.storagePath,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        changeReason: "upload",
      });
      await recordAuditEvent(context, {
        eventType: "document.uploaded",
        entityType: "document",
        entityId: documentId,
        metadata: { documentType: relationshipResult.input.documentType },
      });
    } catch (error) {
      await context.supabase
        .from("documents")
        .delete()
        .eq("id", documentId)
        .eq("company_id", context.companyId);
      await context.supabase.storage
        .from(uploaded.storageBucket)
        .remove([uploaded.storagePath]);

      return formActionFailure(
        error,
        { action: "documents.upload.versionOrAudit" },
        fields,
        {},
      );
    }
  } catch (error) {
    if (uploaded) {
      const context = await requireOwnerDatabaseContext();
      await context.supabase.storage
        .from(uploaded.storageBucket)
        .remove([uploaded.storagePath]);
    }

    return formActionFailure(error, { action: "documents.upload" }, fields, {});
  }

  revalidatePath("/documents");
  redirect(`/documents/${documentId}`);
}

export async function updateFleetDocumentAction(
  documentId: string,
  _previousState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const fields = getDocumentFieldsFromFormData(formData);
  const parsed = documentFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Review the highlighted document fields.",
      fields,
      errors: getFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let uploaded: UploadedDocumentFile | null = null;

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    if (hasFormFile(formData, "file")) {
      await enforceOwnerTenantRateLimit("documentUpload", context);
    }

    const { data: existingDocument, error: lookupError } = await context.supabase
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .eq("company_id", context.companyId)
      .maybeSingle();

    if (lookupError) {
      return formActionFailure(
        lookupError,
        { action: "documents.update.lookup" },
        fields,
        {},
      );
    }

    if (!existingDocument) {
      return formActionFailure(
        expectedActionError(
          "NOT_FOUND",
          "Document was not found for this owner company.",
        ),
        { action: "documents.update.notFound" },
        fields,
        {},
      );
    }

    const relationshipResult = await resolveRelationships(context, parsed.data);

    if (relationshipResult.error) {
      return {
        status: "error",
        code: relationshipResult.error.code,
        message: relationshipResult.error.message,
        fields,
        errors: {},
      };
    }

    const upload = await uploadDocumentFile(
      context,
      documentId,
      relationshipResult.input,
      formData,
    );

    if (upload.error) {
      return {
        status: "error",
        code: upload.error.code,
        message: upload.error.message,
        fields,
        errors: { file: upload.error.message },
      };
    }

    uploaded = upload.file;
    let version: { id: string; versionNumber: number } | null = null;

    if (uploaded) {
      version = await recordDocumentVersion(context, {
        documentId,
        storageBucket: uploaded.storageBucket,
        storagePath: uploaded.storagePath,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        changeReason: "replacement",
      });
    }

    const updatePayload = {
      ...buildDocumentUpdatePayload(relationshipResult.input),
      ...(uploaded
        ? {
            storage_bucket: uploaded.storageBucket,
            storage_path: uploaded.storagePath,
            mime_type: uploaded.mimeType,
            file_size: uploaded.fileSize,
          }
        : {}),
    };
    const { error } = await context.supabase
      .from("documents")
      .update(updatePayload)
      .eq("id", documentId)
      .eq("company_id", context.companyId);

    if (error) {
      if (uploaded) {
        if (version) {
          await context.supabase
            .from("document_versions")
            .delete()
            .eq("id", version.id)
            .eq("company_id", context.companyId);
        }

        await context.supabase.storage
          .from(uploaded.storageBucket)
          .remove([uploaded.storagePath]);
      }

      return formActionFailure(
        error,
        { action: "documents.update.update" },
        fields,
        {},
      );
    }

    if (uploaded && version) {
      await recordAuditEvent(context, {
        eventType: "document.replaced",
        entityType: "document",
        entityId: documentId,
        metadata: { versionNumber: version.versionNumber },
      });
    }
  } catch (error) {
    if (uploaded) {
      const context = await requireOwnerDatabaseContext();
      await context.supabase.storage
        .from(uploaded.storageBucket)
        .remove([uploaded.storagePath]);
    }

    return formActionFailure(error, { action: "documents.update" }, fields, {});
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  redirect(`/documents/${documentId}`);
}

export async function archiveFleetDocumentAction(documentId: string) {
  const context = await requireOwnerDatabaseContext();
  await enforceOwnerTenantRateLimit("mutation", context);

  const { error } = await context.supabase
    .from("documents")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("company_id", context.companyId);

  if (error) {
    throw toSafeActionException(error, { action: "documents.archive" });
  }

  await recordAuditEvent(context, {
    eventType: "document.archived",
    entityType: "document",
    entityId: documentId,
  });

  revalidatePath("/documents");
  redirect("/documents");
}

type FieldErrorMap = Partial<Record<string, string[]>>;

function getFieldErrors<T extends string>(fieldErrors: FieldErrorMap) {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? ""]),
  ) as Partial<Record<T, string>>;
}

type UploadedDocumentFile = {
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
};

type UploadResult = {
  file: UploadedDocumentFile | null;
  error: SafeActionErrorPayload | null;
};

async function uploadDocumentFile(
  context: Awaited<ReturnType<typeof requireOwnerDatabaseContext>>,
  documentId: string,
  input: DocumentFormInput,
  formData: FormData,
): Promise<UploadResult> {
  const candidate = formData.get("file");

  if (!(candidate instanceof File) || candidate.size === 0) {
    return { file: null, error: null };
  }

  const validation = await validateDocumentFile(
    candidate,
    serverEnv.DOCUMENT_UPLOAD_MAX_SIZE_BYTES,
  );

  if (!validation.ok) {
    return {
      file: null,
      error: { code: validation.code, message: validation.error },
    };
  }

  const category = resolveDocumentCategory(input);
  const storageBucket = getStorageBucketForCategory(category);
  await assertFleetStorageQuotaAvailable({
    context,
    incomingBytes: validation.fileSize,
    storageBucket,
  });

  const storagePath = `${context.companyId}/${category}/${documentId}/${crypto.randomUUID()}-${validation.safeName}`;
  const { error } = await context.supabase.storage
    .from(storageBucket)
    .upload(storagePath, candidate, {
      cacheControl: "3600",
      contentType: validation.mimeType,
      upsert: false,
    });

  if (error) {
    return {
      file: null,
      error: toSafeActionError(error, { action: "documents.uploadFile" }),
    };
  }

  return {
    file: {
      storageBucket,
      storagePath,
      mimeType: validation.mimeType,
      fileSize: validation.fileSize,
    },
    error: null,
  };
}

function hasFormFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return value instanceof File && value.size > 0;
}

function getStorageBucketForCategory(
  category: "asset" | "maintenance" | "compliance" | "general",
) {
  if (category === "maintenance") {
    return serverEnv.SUPABASE_MAINTENANCE_ATTACHMENTS_BUCKET;
  }

  if (category === "compliance") {
    return serverEnv.SUPABASE_COMPLIANCE_DOCUMENTS_BUCKET;
  }

  return serverEnv.SUPABASE_STORAGE_BUCKET;
}

async function resolveRelationships(
  context: Awaited<ReturnType<typeof requireOwnerDatabaseContext>>,
  input: DocumentFormInput,
): Promise<{ input: DocumentFormInput; error: SafeActionErrorPayload | null }> {
  let resolvedAssetId = input.assetId;

  if (input.maintenanceRecordId) {
    const { data, error } = await context.supabase
      .from("maintenance_records")
      .select("asset_id")
      .eq("id", input.maintenanceRecordId)
      .eq("company_id", context.companyId)
      .maybeSingle();

    if (error) {
      return {
        input,
        error: toSafeActionError(error, {
          action: "documents.resolveMaintenanceRecord",
        }),
      };
    }

    if (!data) {
      return {
        input,
        error: {
          code: "VALIDATION_ERROR",
          message: "Choose a maintenance record from this company.",
        },
      };
    }

    resolvedAssetId = data.asset_id;
  }

  if (input.complianceRecordId) {
    const { data, error } = await context.supabase
      .from("compliance_records")
      .select("asset_id")
      .eq("id", input.complianceRecordId)
      .eq("company_id", context.companyId)
      .maybeSingle();

    if (error) {
      return {
        input,
        error: toSafeActionError(error, {
          action: "documents.resolveComplianceRecord",
        }),
      };
    }

    if (!data) {
      return {
        input,
        error: {
          code: "VALIDATION_ERROR",
          message: "Choose a compliance record from this company.",
        },
      };
    }

    resolvedAssetId = data.asset_id;
  }

  if (resolvedAssetId) {
    const { data, error } = await context.supabase
      .from("assets")
      .select("id")
      .eq("id", resolvedAssetId)
      .eq("company_id", context.companyId)
      .maybeSingle();

    if (error) {
      return {
        input,
        error: toSafeActionError(error, { action: "documents.resolveAsset" }),
      };
    }

    if (!data) {
      return {
        input,
        error: {
          code: "VALIDATION_ERROR",
          message: "Choose an asset from this company.",
        },
      };
    }
  }

  return {
    input: {
      ...input,
      assetId: resolvedAssetId,
    },
    error: null,
  };
}
