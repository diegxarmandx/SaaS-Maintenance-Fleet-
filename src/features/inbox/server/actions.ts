"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateUploadFile } from "@/features/documents/file-validation";
import { assertFleetStorageQuotaAvailable } from "@/features/documents/server/storage-quota";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import {
  calculateReviewedTotal,
  findMeterDecreaseWarnings,
  getInboxReviewFieldsFromFormData,
} from "@/features/inbox/helpers";
import { extractAssetDraftFromFile } from "@/features/inbox/server/ai";
import type {
  InboxReviewFormState,
  InboxUploadFormState,
  IngestionJob,
  MaintenanceExtraction,
} from "@/features/inbox/types";
import { inboxReviewSchema } from "@/features/inbox/validation";
import {
  MAINTENANCE_ATTACHMENT_ALLOWED_TYPES,
  MAINTENANCE_ATTACHMENT_MAX_SIZE_BYTES,
} from "@/features/maintenance/constants";
import type { MaintenanceAssetOption } from "@/features/maintenance/types";
import { serverEnv } from "@/lib/env/server";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";
import { recordAuditEvent } from "@/server/audit/log";
import {
  expectedActionError,
  formActionFailure,
  toSafeActionError,
  toSafeActionException,
} from "@/server/actions/safe-error";

export async function uploadAssetInboxDocumentAction(
  assetId: string,
  _previousState: InboxUploadFormState,
  formData: FormData,
): Promise<InboxUploadFormState> {
  let uploaded: { bucket: string; path: string } | null = null;
  let jobCreated = false;
  let redirectPath: string | null = null;

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);
    await enforceOwnerTenantRateLimit("documentUpload", context);

    const asset = await getActionAsset(context, assetId);
    const note = String(formData.get("note") ?? "").trim();
    if (note.length > 500) {
      return {
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Shorten the upload note.",
        errors: { note: "Notes must be 500 characters or fewer." },
      };
    }

    const candidate = formData.get("file");
    if (!(candidate instanceof File) || candidate.size === 0) {
      return {
        status: "error",
        code: "INVALID_FILE",
        message: "Choose a PDF or image to upload.",
        errors: { file: "Choose a PDF or image to upload." },
      };
    }

    const validation = await validateUploadFile(candidate, {
      allowedTypes: MAINTENANCE_ATTACHMENT_ALLOWED_TYPES,
      maxSizeBytes: MAINTENANCE_ATTACHMENT_MAX_SIZE_BYTES,
      maxSizeLabel: "10 MB",
      allowedTypeLabel: "PDF, JPG, PNG, or WebP fleet document",
    });

    if (!validation.ok) {
      return {
        status: "error",
        code: validation.code,
        message: validation.error,
        errors: { file: validation.error },
      };
    }

    await assertFleetStorageQuotaAvailable({
      context,
      incomingBytes: validation.fileSize,
      storageBucket: serverEnv.SUPABASE_MAINTENANCE_ATTACHMENTS_BUCKET,
    });

    const jobId = crypto.randomUUID();
    const storagePath = `${context.companyId}/assets/${asset.id}/inbox/${jobId}/${crypto.randomUUID()}-${validation.safeName}`;
    const bucket = serverEnv.SUPABASE_MAINTENANCE_ATTACHMENTS_BUCKET;
    const { error: uploadError } = await context.supabase.storage
      .from(bucket)
      .upload(storagePath, candidate, {
        cacheControl: "3600",
        contentType: validation.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return {
        status: "error",
        ...toSafeActionError(uploadError, { action: "assetInbox.upload.storage" }),
        errors: {},
      };
    }

    uploaded = { bucket, path: storagePath };
    const { error: insertError } = await context.supabase.from("ingestion_jobs").insert({
      id: jobId,
      company_id: context.companyId,
      owner_id: context.ownerId,
      asset_id: asset.id,
      storage_bucket: bucket,
      storage_path: storagePath,
      original_file_name: validation.safeName,
      mime_type: validation.mimeType,
      file_size: validation.fileSize,
      source_type: "asset_upload",
      upload_note: note || null,
      status: "uploaded",
      extracted_data: {},
    });

    if (insertError) {
      await context.supabase.storage.from(bucket).remove([storagePath]);
      return formActionFailure(
        insertError,
        { action: "assetInbox.upload.insertJob" },
        {},
        {},
      );
    }

    jobCreated = true;
    await recordInboxEvent(context, jobId, "uploaded", {
      assetId: asset.id,
      mimeType: validation.mimeType,
      fileSize: validation.fileSize,
    });

    await context.supabase
      .from("ingestion_jobs")
      .update({ status: "classifying" })
      .eq("id", jobId)
      .eq("company_id", context.companyId)
      .eq("asset_id", asset.id);

    const extraction = await extractAssetDraftFromFile({ file: candidate, asset });
    if (extraction.ok) {
      await context.supabase
        .from("ingestion_jobs")
        .update({
          detected_document_type: extraction.extraction.detectedDocumentType,
          status: "needs_review",
          extracted_data: extraction.extraction,
          confidence_score: extraction.extraction.overallConfidence,
          model_provider: extraction.provider,
          model_version: extraction.model,
          error_message: null,
        })
        .eq("id", jobId)
        .eq("company_id", context.companyId)
        .eq("asset_id", asset.id);
      await recordInboxEvent(context, jobId, "extracted", {
        confidence: extraction.extraction.overallConfidence,
      });
    } else {
      await context.supabase
        .from("ingestion_jobs")
        .update({
          status: "needs_attention",
          extracted_data: createEmptyExtraction(asset),
          model_provider: extraction.provider === "openai" ? "openai" : null,
          model_version: extraction.model,
          error_message: extraction.ownerMessage,
        })
        .eq("id", jobId)
        .eq("company_id", context.companyId)
        .eq("asset_id", asset.id);
      await recordInboxEvent(context, jobId, "needs_attention", {
        provider: extraction.provider,
      });
    }

    revalidateAssetPaths(asset.id);
    redirectPath = `/fleet/${asset.id}/inbox/${jobId}`;
  } catch (error) {
    if (uploaded && !jobCreated) {
      const context = await requireOwnerDatabaseContext();
      await context.supabase.storage.from(uploaded.bucket).remove([uploaded.path]);
    }
    return formActionFailure(error, { action: "assetInbox.upload" }, {}, {});
  }

  if (redirectPath) {
    redirect(redirectPath);
  }

  return {
    status: "error",
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again.",
    errors: {},
  };
}

export async function completeAssetInboxItemAction(
  assetId: string,
  jobId: string,
  _previousState: InboxReviewFormState,
  formData: FormData,
): Promise<InboxReviewFormState> {
  const fields = getInboxReviewFieldsFromFormData(formData);
  const parsed = inboxReviewSchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Review the highlighted fields.",
      fields,
      errors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [
          key,
          messages?.[0] ?? "",
        ]),
      ),
    };
  }

  const recordId = crypto.randomUUID();
  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);
    const [job, asset] = await Promise.all([
      getActionJob(context, assetId, jobId),
      getActionAsset(context, assetId),
    ]);
    assertJobCanBeReviewed(job);

    if (parsed.data.category === "maintenance") {
      const meterWarnings = findMeterDecreaseWarnings(fields, asset);
      if (meterWarnings.length > 0 && !parsed.data.confirmMeterDecrease) {
        return {
          status: "error",
          code: "VALIDATION_ERROR",
          message: "Confirm the lower meter reading before marking completed.",
          fields,
          errors: {
            meterConfirmation:
              "Confirm this is intentional before saving the maintenance record.",
          },
        };
      }

      const { error } = await context.supabase.rpc("complete_asset_inbox_maintenance", {
        p_job_id: jobId,
        p_record_id: recordId,
        p_maintenance_rule_id: parsed.data.maintenanceRuleId || null,
        p_maintenance_type: parsed.data.maintenanceType,
        p_completion_date: parsed.data.completionDate,
        p_mileage: parsed.data.mileage ?? null,
        p_engine_hours: parsed.data.engineHours ?? null,
        p_service_provider: parsed.data.serviceProvider || null,
        p_parts_cost: parsed.data.partsCost,
        p_labor_cost: parsed.data.laborCost,
        p_other_cost: parsed.data.otherCost,
        p_tax_cost: parsed.data.taxCost,
        p_notes: parsed.data.notes || null,
        p_document_name: parsed.data.documentName,
        p_document_type: parsed.data.documentType,
        p_corrected_data: {
          ...parsed.data,
          reviewedTotalCost: calculateReviewedTotal(fields),
          meterWarnings,
        },
      });
      if (error) {
        return formActionFailure(
          error,
          { action: "assetInbox.complete.maintenance" },
          fields,
          {},
        );
      }
    } else if (parsed.data.category === "compliance") {
      const { error } = await context.supabase.rpc("complete_asset_inbox_compliance", {
        p_job_id: jobId,
        p_record_id: recordId,
        p_requirement_id: null,
        p_compliance_type: parsed.data.documentType,
        p_issuing_organization: parsed.data.issuingOrganization || null,
        p_identification_number: parsed.data.identificationNumber || null,
        p_effective_date: parsed.data.effectiveDate || null,
        p_expiration_date: parsed.data.expirationDate,
        p_reminder_days: parsed.data.reminderDays,
        p_notes: parsed.data.notes || null,
        p_document_name: parsed.data.documentName,
        p_corrected_data: parsed.data,
      });
      if (error) {
        return formActionFailure(
          error,
          { action: "assetInbox.complete.compliance" },
          fields,
          {},
        );
      }
    } else {
      const { error } = await context.supabase.rpc("complete_asset_inbox_document", {
        p_job_id: jobId,
        p_document_id: recordId,
        p_document_name: parsed.data.documentName,
        p_document_type: parsed.data.documentType,
        p_issue_date: parsed.data.effectiveDate || null,
        p_expiration_date: parsed.data.expirationDate || null,
        p_document_number: parsed.data.documentNumber || null,
        p_notes: parsed.data.notes || null,
        p_corrected_data: parsed.data,
      });
      if (error) {
        return formActionFailure(
          error,
          { action: "assetInbox.complete.document" },
          fields,
          {},
        );
      }
    }

    await recordAuditEvent(context, {
      eventType: "asset_inbox.completed",
      entityType: parsed.data.category,
      entityId: recordId,
      metadata: {
        ingestionJobId: jobId,
        assetId,
        reviewedTotalCost: calculateReviewedTotal(fields),
      },
    });
  } catch (error) {
    return formActionFailure(error, { action: "assetInbox.complete" }, fields, {});
  }

  revalidateAssetPaths(assetId);
  redirect(`/fleet/${assetId}?section=inbox`);
}

export async function markAssetInboxNeedsAttentionAction(assetId: string, jobId: string) {
  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);
    const job = await getActionJob(context, assetId, jobId);
    assertJobCanBeReviewed(job);

    const { error } = await context.supabase
      .from("ingestion_jobs")
      .update({ status: "needs_attention" })
      .eq("id", jobId)
      .eq("company_id", context.companyId)
      .eq("asset_id", assetId);
    if (error) {
      throw error;
    }
    await recordInboxEvent(context, jobId, "needs_attention");
  } catch (error) {
    throw toSafeActionException(error, {
      action: "assetInbox.markNeedsAttention",
    });
  }

  revalidateAssetPaths(assetId);
  redirect(`/fleet/${assetId}?section=inbox`);
}

export async function deleteAssetInboxItemAction(assetId: string, jobId: string) {
  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);
    const job = await getActionJob(context, assetId, jobId);
    assertJobCanBeReviewed(job);

    const { error: storageError } = await context.supabase.storage
      .from(job.storage_bucket)
      .remove([job.storage_path]);
    if (storageError) {
      throw storageError;
    }

    const { error: deleteError } = await context.supabase
      .from("ingestion_jobs")
      .delete()
      .eq("id", jobId)
      .eq("company_id", context.companyId)
      .eq("asset_id", assetId);
    if (deleteError) {
      throw deleteError;
    }
  } catch (error) {
    throw toSafeActionException(error, { action: "assetInbox.delete" });
  }

  revalidateAssetPaths(assetId);
  redirect(`/fleet/${assetId}?section=inbox`);
}

async function getActionJob(
  context: Awaited<ReturnType<typeof requireOwnerDatabaseContext>>,
  assetId: string,
  jobId: string,
): Promise<IngestionJob> {
  const { data, error } = await context.supabase
    .from("ingestion_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", context.companyId)
    .eq("asset_id", assetId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw expectedActionError("NOT_FOUND", "Inbox item was not found.");
  }

  return {
    ...(data as IngestionJob),
    file_size: Number((data as { file_size: number }).file_size ?? 0),
  };
}

async function getActionAsset(
  context: Awaited<ReturnType<typeof requireOwnerDatabaseContext>>,
  assetId: string,
): Promise<MaintenanceAssetOption> {
  const { data, error } = await context.supabase
    .from("assets")
    .select("id,unit_number,asset_name,asset_type,current_mileage,current_engine_hours")
    .eq("id", assetId)
    .eq("company_id", context.companyId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw expectedActionError("NOT_FOUND", "Asset was not found.");
  }
  return data as MaintenanceAssetOption;
}

function assertJobCanBeReviewed(job: IngestionJob) {
  if (job.status === "confirmed") {
    throw expectedActionError("CONFLICT", "This Inbox item is already completed.");
  }
  if (job.status === "discarded") {
    throw expectedActionError("CONFLICT", "This Inbox item was deleted.");
  }
}

async function recordInboxEvent(
  context: Awaited<ReturnType<typeof requireOwnerDatabaseContext>>,
  jobId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await context.supabase.from("ingestion_job_events").insert({
    ingestion_job_id: jobId,
    company_id: context.companyId,
    event_type: eventType,
    metadata,
  });
  if (error) {
    throw error;
  }
}

function createEmptyExtraction(asset: MaintenanceAssetOption): MaintenanceExtraction {
  return {
    detectedDocumentType: null,
    documentCategory: { value: "general", confidence: 0 },
    documentType: { value: "Other", confidence: 0 },
    asset: {
      assetId: asset.id,
      label: `${asset.unit_number} ${asset.asset_name}`,
      confidence: 1,
      reason: "The upload came from this asset's Inbox.",
    },
    maintenanceDate: { value: null, confidence: 0 },
    mileage: { value: null, confidence: 0 },
    engineHours: { value: null, confidence: 0 },
    serviceProvider: { value: null, confidence: 0 },
    maintenanceType: { value: null, confidence: 0 },
    notes: { value: null, confidence: 0 },
    partsCost: { value: 0, confidence: 0 },
    laborCost: { value: 0, confidence: 0 },
    otherCost: { value: 0, confidence: 0 },
    taxCost: { value: 0, confidence: 0 },
    totalCost: { value: 0, confidence: 0 },
    complianceExpirationDate: { value: null, confidence: 0 },
    overallConfidence: 0,
    warnings: ["Automatic extraction was unavailable. Review every field."],
  };
}

function revalidateAssetPaths(assetId: string) {
  revalidatePath(`/fleet/${assetId}`);
  revalidatePath(`/fleet/${assetId}/upload`);
  revalidatePath(`/fleet/${assetId}/inbox`);
  revalidatePath("/maintenance");
  revalidatePath("/compliance");
  revalidatePath("/documents");
}
