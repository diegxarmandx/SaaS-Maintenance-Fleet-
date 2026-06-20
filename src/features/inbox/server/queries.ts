import { createAuthorizedSignedDocumentUrl } from "@/features/documents/server/storage";
import { getLocalDemoDataset, localDemoIdentity } from "@/features/demo/local-data";
import { shouldUseLocalDemoData } from "@/features/demo/mode";
import {
  getOwnerDatabaseContext,
  type SupabaseServerClient,
} from "@/features/fleet/server/owner";
import { maintenanceExtractionSchema } from "@/features/inbox/validation";
import type {
  InboxJobListItem,
  IngestionEvent,
  IngestionJob,
  MaintenanceExtraction,
} from "@/features/inbox/types";
import { AppError } from "@/lib/errors";

export type AssetInboxOverviewResult = {
  isConfigured: boolean;
  assetId: string;
  jobs: InboxJobListItem[];
  pendingCount: number;
};

export type InboxJobDetailResult = {
  isConfigured: boolean;
  job: IngestionJob | null;
  signedUrl: string | null;
  events: IngestionEvent[];
};

export async function getAssetInboxOverview(
  assetId: string,
): Promise<AssetInboxOverviewResult> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return shouldUseLocalDemoData
      ? getLocalDemoAssetInboxOverview(assetId)
      : { isConfigured: false, assetId, jobs: [], pendingCount: 0 };
  }

  const [{ data, error }, { count: pendingCount, error: pendingCountError }] =
    await Promise.all([
      context.supabase
        .from("ingestion_jobs")
        .select(
          "id,original_file_name,status,detected_document_type,confidence_score,created_record_type,created_record_id,created_at,completed_at,error_message",
        )
        .eq("company_id", context.companyId)
        .eq("asset_id", assetId)
        .neq("status", "discarded")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("ingestion_jobs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", context.companyId)
        .eq("asset_id", assetId)
        .in("status", [
          "uploaded",
          "classifying",
          "extracted",
          "needs_review",
          "needs_attention",
          "failed",
        ]),
    ]);

  if (error || pendingCountError) {
    throw new AppError(
      "DATA_ACCESS_ERROR",
      error?.message ?? pendingCountError?.message ?? "Inbox query failed.",
    );
  }

  const jobs = (data ?? []).map(normalizeListItem);
  return {
    isConfigured: true,
    assetId,
    jobs,
    pendingCount: pendingCount ?? 0,
  };
}

export async function getAssetInboxJobDetail(
  assetId: string,
  jobId: string,
): Promise<InboxJobDetailResult> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return shouldUseLocalDemoData
      ? getLocalDemoInboxJobDetail(assetId, jobId)
      : { isConfigured: false, job: null, signedUrl: null, events: [] };
  }

  const [job, events] = await Promise.all([
    getInboxJob(context.supabase, context.companyId, assetId, jobId),
    getInboxEvents(context.supabase, context.companyId, jobId),
  ]);

  return {
    isConfigured: true,
    job,
    signedUrl: job
      ? await createAuthorizedSignedDocumentUrl(context.supabase, context.companyId, {
          storage_bucket: job.storage_bucket,
          storage_path: job.storage_path,
        })
      : null,
    events,
  };
}

async function getInboxJob(
  supabase: SupabaseServerClient,
  companyId: string,
  assetId: string,
  jobId: string,
) {
  const { data, error } = await supabase
    .from("ingestion_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", companyId)
    .eq("asset_id", assetId)
    .maybeSingle();

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return data ? normalizeJob(data as IngestionJob) : null;
}

async function getInboxEvents(
  supabase: SupabaseServerClient,
  companyId: string,
  jobId: string,
) {
  const { data, error } = await supabase
    .from("ingestion_job_events")
    .select("*")
    .eq("company_id", companyId)
    .eq("ingestion_job_id", jobId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return (data ?? []) as IngestionEvent[];
}

function normalizeListItem(job: Record<string, unknown>): InboxJobListItem {
  return {
    id: String(job.id),
    original_file_name: String(job.original_file_name),
    status: job.status as InboxJobListItem["status"],
    detected_document_type:
      typeof job.detected_document_type === "string" ? job.detected_document_type : null,
    confidence_score:
      job.confidence_score === null || job.confidence_score === undefined
        ? null
        : Number(job.confidence_score),
    created_record_type:
      (job.created_record_type as InboxJobListItem["created_record_type"]) ?? null,
    created_record_id:
      typeof job.created_record_id === "string" ? job.created_record_id : null,
    created_at: String(job.created_at),
    completed_at: typeof job.completed_at === "string" ? job.completed_at : null,
    error_message: typeof job.error_message === "string" ? job.error_message : null,
  };
}

function normalizeJob(job: IngestionJob): IngestionJob {
  const parsedExtraction = maintenanceExtractionSchema.safeParse(job.extracted_data);
  const extractedData: MaintenanceExtraction | Record<string, never> =
    parsedExtraction.success ? parsedExtraction.data : {};

  return {
    ...job,
    file_size: Number(job.file_size ?? 0),
    confidence_score: job.confidence_score === null ? null : Number(job.confidence_score),
    upload_note: job.upload_note ?? null,
    completed_at: job.completed_at ?? null,
    extracted_data: extractedData,
  };
}

function getLocalDemoAssetInboxOverview(assetId: string): AssetInboxOverviewResult {
  const job = getLocalDemoJob(assetId);
  return {
    isConfigured: true,
    assetId,
    jobs: job ? [normalizeListItem(job)] : [],
    pendingCount: job ? 1 : 0,
  };
}

function getLocalDemoInboxJobDetail(
  assetId: string,
  jobId: string,
): InboxJobDetailResult {
  const job = getLocalDemoJob(assetId);
  const matches = job?.id === jobId;
  return {
    isConfigured: true,
    job: matches && job ? normalizeJob(job) : null,
    signedUrl: null,
    events:
      matches && job
        ? [
            {
              id: "demo-asset-inbox-event",
              ingestion_job_id: job.id,
              company_id: job.company_id,
              event_type: "extracted",
              metadata: { demo: true },
              created_at: job.created_at,
            },
          ]
        : [],
  };
}

function getLocalDemoJob(assetId: string): IngestionJob | null {
  const asset = getLocalDemoDataset().assets.find((item) => item.id === assetId);
  if (!asset) {
    return null;
  }

  const now = new Date().toISOString();
  return {
    id: `demo-inbox-${asset.id}`,
    company_id: localDemoIdentity.companyId,
    owner_id: "demo-owner",
    asset_id: asset.id,
    storage_bucket: "maintenance-attachments",
    storage_path: `${localDemoIdentity.companyId}/assets/${asset.id}/inbox/demo-receipt.pdf`,
    original_file_name: "demo-oil-change-invoice.pdf",
    mime_type: "application/pdf",
    file_size: 42_000,
    source_type: "asset_upload",
    detected_document_type: "Maintenance receipt",
    status: "needs_review",
    extracted_data: {
      detectedDocumentType: "Maintenance receipt",
      documentCategory: { value: "maintenance", confidence: 0.9 },
      documentType: { value: "Maintenance receipt", confidence: 0.9 },
      asset: {
        assetId: asset.id,
        label: `${asset.unit_number} ${asset.asset_name}`,
        confidence: 1,
        reason: "The upload came from this asset's Inbox.",
      },
      maintenanceDate: { value: now.slice(0, 10), confidence: 0.82 },
      mileage: { value: asset.current_mileage, confidence: 0.75 },
      engineHours: { value: null, confidence: 0 },
      serviceProvider: { value: "Demo Service Center", confidence: 0.8 },
      maintenanceType: { value: "Oil and filter service", confidence: 0.86 },
      notes: { value: "DEMO RECORD - NOT REAL.", confidence: 0.7 },
      partsCost: { value: 82.5, confidence: 0.9 },
      laborCost: { value: 45, confidence: 0.88 },
      otherCost: { value: 0, confidence: 0.8 },
      taxCost: { value: 9.56, confidence: 0.82 },
      totalCost: { value: 137.06, confidence: 0.88 },
      complianceExpirationDate: { value: null, confidence: 0 },
      overallConfidence: 0.84,
      warnings: ["DEMO RECORD - NOT REAL. Review before saving."],
    },
    corrected_data: null,
    confidence_score: 0.84,
    model_provider: "mock",
    model_version: "deterministic-asset-inbox-v1",
    error_message: null,
    upload_note: "Demo upload for interface review.",
    created_record_type: null,
    created_record_id: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
}
