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
import { AppError, getErrorMessage } from "@/lib/errors";
import { serverEnv } from "@/lib/env/server";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";

export async function uploadFleetDocumentAction(
  _previousState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const fields = getDocumentFieldsFromFormData(formData);
  const parsed = documentFormSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the highlighted document fields.",
      fields,
      errors: getFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const documentId = crypto.randomUUID();
  let uploaded: UploadedDocumentFile | null = null;

  try {
    const context = await requireOwnerDatabaseContext();
    const relationshipResult = await resolveRelationships(context, parsed.data);

    if (relationshipResult.error) {
      return {
        status: "error",
        message: relationshipResult.error,
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
        message: upload.error,
        fields,
        errors: { file: upload.error },
      };
    }

    if (!upload.file) {
      return {
        status: "error",
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

      return { status: "error", message: error.message, fields, errors: {} };
    }
  } catch (error) {
    if (uploaded) {
      const context = await requireOwnerDatabaseContext();
      await context.supabase.storage
        .from(uploaded.storageBucket)
        .remove([uploaded.storagePath]);
    }

    return { status: "error", message: getErrorMessage(error), fields, errors: {} };
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
      message: "Review the highlighted document fields.",
      fields,
      errors: getFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let uploaded: UploadedDocumentFile | null = null;

  try {
    const context = await requireOwnerDatabaseContext();
    const { data: existingDocument, error: lookupError } = await context.supabase
      .from("documents")
      .select("storage_bucket,storage_path")
      .eq("id", documentId)
      .eq("company_id", context.companyId)
      .maybeSingle();

    if (lookupError) {
      return { status: "error", message: lookupError.message, fields, errors: {} };
    }

    if (!existingDocument) {
      return {
        status: "error",
        message: "Document was not found for this owner company.",
        fields,
        errors: {},
      };
    }

    const relationshipResult = await resolveRelationships(context, parsed.data);

    if (relationshipResult.error) {
      return { status: "error", message: relationshipResult.error, fields, errors: {} };
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
        message: upload.error,
        fields,
        errors: { file: upload.error },
      };
    }

    uploaded = upload.file;

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
        await context.supabase.storage
          .from(uploaded.storageBucket)
          .remove([uploaded.storagePath]);
      }

      return { status: "error", message: error.message, fields, errors: {} };
    }

    if (uploaded) {
      await context.supabase.storage
        .from(existingDocument.storage_bucket)
        .remove([existingDocument.storage_path]);
    }
  } catch (error) {
    if (uploaded) {
      const context = await requireOwnerDatabaseContext();
      await context.supabase.storage
        .from(uploaded.storageBucket)
        .remove([uploaded.storagePath]);
    }

    return { status: "error", message: getErrorMessage(error), fields, errors: {} };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  redirect(`/documents/${documentId}`);
}

export async function archiveFleetDocumentAction(documentId: string) {
  const context = await requireOwnerDatabaseContext();
  const { error } = await context.supabase
    .from("documents")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("company_id", context.companyId);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

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
  error: string | null;
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
    return { file: null, error: validation.error };
  }

  const category = resolveDocumentCategory(input);
  const storageBucket = getStorageBucketForCategory(category);
  const storagePath = `${context.companyId}/${category}/${documentId}/${crypto.randomUUID()}-${validation.safeName}`;
  const { error } = await context.supabase.storage
    .from(storageBucket)
    .upload(storagePath, candidate, {
      cacheControl: "3600",
      contentType: validation.mimeType,
      upsert: false,
    });

  if (error) {
    return { file: null, error: error.message };
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
): Promise<{ input: DocumentFormInput; error: string | null }> {
  let resolvedAssetId = input.assetId;

  if (input.maintenanceRecordId) {
    const { data, error } = await context.supabase
      .from("maintenance_records")
      .select("asset_id")
      .eq("id", input.maintenanceRecordId)
      .eq("company_id", context.companyId)
      .maybeSingle();

    if (error) {
      return { input, error: error.message };
    }

    if (!data) {
      return { input, error: "Choose a maintenance record from this company." };
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
      return { input, error: error.message };
    }

    if (!data) {
      return { input, error: "Choose a compliance record from this company." };
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
      return { input, error: error.message };
    }

    if (!data) {
      return { input, error: "Choose an asset from this company." };
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
