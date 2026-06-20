"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateUploadFile } from "@/features/documents/file-validation";
import { recordDocumentVersion } from "@/features/documents/server/versions";
import { assertFleetStorageQuotaAvailable } from "@/features/documents/server/storage-quota";
import {
  MAINTENANCE_ATTACHMENT_ALLOWED_TYPES,
  MAINTENANCE_ATTACHMENT_MAX_SIZE_BYTES,
} from "@/features/maintenance/constants";
import type { MaintenanceAssetOption } from "@/features/maintenance/types";
import {
  calculateReviewedTotal,
  findMeterDecreaseWarnings,
  getInboxReviewFieldsFromFormData,
} from "@/features/inbox/helpers";
import type {
  InboxReviewFormState,
  InboxUploadFormState,
  IngestionJob,
} from "@/features/inbox/types";
import { inboxReviewSchema } from "@/features/inbox/validation";
import { extractMaintenanceDraftFromFile } from "@/features/inbox/server/ai";
import { requireOwnerDatabaseContext } from "@/features/fleet/server/owner";
import { enforceOwnerTenantRateLimit } from "@/lib/rate-limit/server";
import { serverEnv } from "@/lib/env/server";
import { recordAuditEvent } from "@/server/audit/log";
import {
  expectedActionError,
  formActionFailure,
  toSafeActionError,
  toSafeActionException,
} from "@/server/actions/safe-error";

type InboxAssetCandidate = MaintenanceAssetOption & {
  vin_or_serial: string | null;
  license_plate: string | null;
  make: string | null;
  model: string | null;
};

export async function uploadInboxDocumentAction(
  _previousState: InboxUploadFormState,
  formData: FormData,
): Promise<InboxUploadFormState> {
  let redirectPath: string | null = null;
  let jobCreated = false;
  let uploaded:
    | {
        bucket: string;
        path: string;
      }
    | null = null;

  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);
    await enforceOwnerTenantRateLimit("documentUpload", context);

    const candidate = formData.get("file");

    if (!(candidate instanceof File) || candidate.size === 0) {
      return {
        status: "error",
        code: "INVALID_FILE",
        message: "Choose a maintenance invoice, receipt, or photo to upload.",
        errors: { file: "Choose a maintenance invoice, receipt, or photo to upload." },
      };
    }

    const validation = await validateUploadFile(candidate, {
      allowedTypes: MAINTENANCE_ATTACHMENT_ALLOWED_TYPES,
      maxSizeBytes: MAINTENANCE_ATTACHMENT_MAX_SIZE_BYTES,
      maxSizeLabel: "10 MB",
      allowedTypeLabel: "PDF, JPG, PNG, or WebP maintenance invoice or receipt",
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
    const storagePath = `${context.companyId}/inbox/${jobId}/${crypto.randomUUID()}-${validation.safeName}`;
    const { error: uploadError } = await context.supabase.storage
      .from(serverEnv.SUPABASE_MAINTENANCE_ATTACHMENTS_BUCKET)
      .upload(storagePath, candidate, {
        cacheControl: "3600",
        contentType: validation.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return {
        status: "error",
        ...toSafeActionError(uploadError, { action: "inbox.upload.storage" }),
        errors: {},
      };
    }

    uploaded = {
      bucket: serverEnv.SUPABASE_MAINTENANCE_ATTACHMENTS_BUCKET,
      path: storagePath,
    };

    const { error: insertError } = await context.supabase.from("ingestion_jobs").insert({
      id: jobId,
      company_id: context.companyId,
      owner_id: context.ownerId,
      storage_bucket: uploaded.bucket,
      storage_path: uploaded.path,
      original_file_name: validation.safeName,
      mime_type: validation.mimeType,
      file_size: validation.fileSize,
      source_type: "owner_upload",
      status: "uploaded",
      extracted_data: {},
    });

    if (insertError) {
      await context.supabase.storage.from(uploaded.bucket).remove([uploaded.path]);

      return formActionFailure(
        insertError,
        { action: "inbox.upload.insertJob" },
        {},
        {},
      );
    }

    jobCreated = true;
    await recordInboxEvent(context, jobId, "uploaded", {
      mimeType: validation.mimeType,
      fileSize: validation.fileSize,
    });

    const assets = await getInboxAssetCandidates(context);
    await context.supabase
      .from("ingestion_jobs")
      .update({ status: "classifying" })
      .eq("id", jobId)
      .eq("company_id", context.companyId);
    await recordInboxEvent(context, jobId, "classifying");

    const extraction = await extractMaintenanceDraftFromFile({
      file: candidate,
      assets,
    });

    if (!extraction.ok) {
      await context.supabase
        .from("ingestion_jobs")
        .update({
          status: "failed",
          model_provider: extraction.provider === "openai" ? "openai" : null,
          model_version: extraction.model,
          error_message: extraction.ownerMessage,
        })
        .eq("id", jobId)
        .eq("company_id", context.companyId);
      await recordInboxEvent(context, jobId, "failed", {
        provider: extraction.provider,
      });

      revalidatePath("/inbox");
      redirectPath = `/inbox/${jobId}`;
    } else {
      await context.supabase
        .from("ingestion_jobs")
        .update({
          asset_id: extraction.extraction.asset.assetId,
          detected_document_type: extraction.extraction.detectedDocumentType,
          status: "needs_review",
          extracted_data: extraction.extraction,
          confidence_score: extraction.extraction.overallConfidence,
          model_provider: extraction.provider,
          model_version: extraction.model,
        })
        .eq("id", jobId)
        .eq("company_id", context.companyId);
      await recordInboxEvent(context, jobId, "extracted", {
        confidence: extraction.extraction.overallConfidence,
      });

      revalidatePath("/inbox");
      redirectPath = `/inbox/${jobId}`;
    }
  } catch (error) {
    if (uploaded && !jobCreated) {
      const context = await requireOwnerDatabaseContext();
      await context.supabase.storage.from(uploaded.bucket).remove([uploaded.path]);
    }

    return formActionFailure(error, { action: "inbox.upload" }, {}, {});
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

export async function confirmInboxMaintenanceAction(
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
      message: "Review the highlighted maintenance fields.",
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

    const job = await getActionJob(context, jobId);
    assertJobCanBeReviewed(job);

    const asset = await getActionAsset(context, parsed.data.assetId);
    const meterWarnings = findMeterDecreaseWarnings(fields, asset);

    if (meterWarnings.length > 0 && !parsed.data.confirmMeterDecrease) {
      return {
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Confirm the lower meter reading before creating the record.",
        fields,
        errors: {
          meterConfirmation:
            "Confirm this is intentional before saving the maintenance record.",
        },
      };
    }

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
      p_tax_cost: parsed.data.taxCost,
      p_notes: parsed.data.notes ?? null,
      p_attachment_name: job.original_file_name,
      p_attachment_storage_path: job.storage_path,
      p_attachment_mime_type: job.mime_type,
      p_attachment_file_size: job.file_size,
    });

    if (error) {
      return formActionFailure(
        error,
        { action: "inbox.confirm.rpc" },
        fields,
        {},
      );
    }

    await context.supabase
      .from("ingestion_jobs")
      .update({
        status: "confirmed",
        corrected_data: {
          ...parsed.data,
          reviewedTotalCost: calculateReviewedTotal(fields),
          meterWarnings,
        },
        created_record_type: "maintenance_record",
        created_record_id: recordId,
      })
      .eq("id", jobId)
      .eq("company_id", context.companyId);
    await recordInboxEvent(context, jobId, "confirmed", {
      createdRecordType: "maintenance_record",
      createdRecordId: recordId,
    });
    await recordAuditEvent(context, {
      eventType: "inbox.maintenance_confirmed",
      entityType: "maintenance_record",
      entityId: recordId,
      metadata: { ingestionJobId: jobId },
    });
  } catch (error) {
    return formActionFailure(error, { action: "inbox.confirm" }, fields, {});
  }

  revalidatePath("/inbox");
  revalidatePath("/maintenance");
  redirect(`/maintenance/history/${recordId}`);
}

export async function saveInboxDocumentOnlyAction(jobId: string) {
  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);

    const job = await getActionJob(context, jobId);
    assertJobCanBeReviewed(job);

    const documentId = crypto.randomUUID();
    const extraction =
      "maintenanceDate" in job.extracted_data ? job.extracted_data : null;
    const { error } = await context.supabase.from("documents").insert({
      id: documentId,
      company_id: context.companyId,
      asset_id: job.asset_id,
      maintenance_record_id: null,
      compliance_record_id: null,
      document_name: job.original_file_name,
      category: "maintenance",
      document_type: "Maintenance receipt",
      storage_bucket: job.storage_bucket,
      storage_path: job.storage_path,
      mime_type: job.mime_type,
      file_size: job.file_size,
      issue_date: extraction?.maintenanceDate.value ?? null,
      notes: "Saved from FleetReady Inbox without creating a maintenance record.",
    });

    if (error) {
      throw error;
    }

    await recordDocumentVersion(context, {
      documentId,
      storageBucket: job.storage_bucket,
      storagePath: job.storage_path,
      mimeType: job.mime_type,
      fileSize: job.file_size,
      changeReason: "upload",
    });
    await context.supabase
      .from("ingestion_jobs")
      .update({
        status: "confirmed",
        created_record_type: "document",
        created_record_id: documentId,
      })
      .eq("id", jobId)
      .eq("company_id", context.companyId);
    await recordInboxEvent(context, jobId, "confirmed", {
      createdRecordType: "document",
      createdRecordId: documentId,
    });
  } catch (error) {
    throw toSafeActionException(error, { action: "inbox.saveDocumentOnly" });
  }

  revalidatePath("/inbox");
  revalidatePath("/documents");
  redirect("/documents");
}

export async function discardInboxJobAction(jobId: string) {
  try {
    const context = await requireOwnerDatabaseContext();
    await enforceOwnerTenantRateLimit("mutation", context);
    const job = await getActionJob(context, jobId);

    if (job.status === "confirmed") {
      throw expectedActionError(
        "CONFLICT",
        "This Inbox draft was already confirmed.",
      );
    }

    await recordInboxEvent(context, jobId, "discarded", {
      deletedFile: true,
      storageBucket: job.storage_bucket,
      storagePath: job.storage_path,
    });

    const { error: removeFileError } = await context.supabase.storage
      .from(job.storage_bucket)
      .remove([job.storage_path]);

    if (removeFileError) {
      throw removeFileError;
    }

    const { error: deleteEventsError } = await context.supabase
      .from("ingestion_job_events")
      .delete()
      .eq("ingestion_job_id", jobId)
      .eq("company_id", context.companyId);

    if (deleteEventsError) {
      throw deleteEventsError;
    }

    const { error: deleteJobError } = await context.supabase
      .from("ingestion_jobs")
      .delete()
      .eq("id", jobId)
      .eq("company_id", context.companyId);

    if (deleteJobError) {
      throw deleteJobError;
    }
  } catch (error) {
    throw toSafeActionException(error, { action: "inbox.discard" });
  }

  revalidatePath("/inbox");
  redirect("/inbox");
}

async function getInboxAssetCandidates(
  context: Awaited<ReturnType<typeof requireOwnerDatabaseContext>>,
): Promise<InboxAssetCandidate[]> {
  const { data, error } = await context.supabase
    .from("assets")
    .select(
      "id,unit_number,asset_name,asset_type,current_mileage,current_engine_hours,vin_or_serial:vin_or_serial_number,license_plate,make,model",
    )
    .eq("company_id", context.companyId)
    .is("archived_at", null);

  if (error) {
    throw error;
  }

  return (data ?? []) as InboxAssetCandidate[];
}

async function getActionJob(
  context: Awaited<ReturnType<typeof requireOwnerDatabaseContext>>,
  jobId: string,
): Promise<IngestionJob> {
  const { data, error } = await context.supabase
    .from("ingestion_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", context.companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw expectedActionError("NOT_FOUND", "Inbox draft was not found.");
  }

  return {
    ...(data as IngestionJob),
    file_size: Number((data as { file_size: number }).file_size ?? 0),
    confidence_score:
      (data as { confidence_score: number | null }).confidence_score === null
        ? null
        : Number((data as { confidence_score: number }).confidence_score),
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
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw expectedActionError("VALIDATION_ERROR", "Choose an asset from this company.");
  }

  return data as MaintenanceAssetOption;
}

function assertJobCanBeReviewed(job: IngestionJob) {
  if (job.status === "confirmed") {
    throw expectedActionError("CONFLICT", "This Inbox draft was already confirmed.");
  }

  if (job.status === "discarded") {
    throw expectedActionError("CONFLICT", "This Inbox draft was discarded.");
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
