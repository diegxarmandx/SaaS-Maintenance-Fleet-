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

export type InboxOverviewResult = {
  isConfigured: boolean;
  companyName: string;
  jobs: InboxJobListItem[];
};

export type InboxJobDetailResult = {
  isConfigured: boolean;
  companyName: string;
  job: IngestionJob | null;
  signedUrl: string | null;
  events: IngestionEvent[];
};

export async function getInboxOverview(): Promise<InboxOverviewResult> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return shouldUseLocalDemoData
      ? getLocalDemoInboxOverview()
      : { isConfigured: false, companyName: "FleetReady workspace", jobs: [] };
  }

  const { data, error } = await context.supabase
    .from("ingestion_jobs")
    .select(
      "id,original_file_name,status,detected_document_type,confidence_score,created_record_type,created_record_id,created_at,error_message",
    )
    .eq("company_id", context.companyId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return {
    isConfigured: true,
    companyName: context.companyName,
    jobs: (data ?? []).map((job) => ({
      ...(job as InboxJobListItem),
      confidence_score:
        (job as { confidence_score: number | null }).confidence_score === null
          ? null
          : Number((job as { confidence_score: number }).confidence_score),
    })),
  };
}

export async function getInboxJobDetail(
  jobId: string,
): Promise<InboxJobDetailResult> {
  const context = await getOwnerDatabaseContext();

  if (!context) {
    return shouldUseLocalDemoData
      ? getLocalDemoInboxJobDetail(jobId)
      : {
          isConfigured: false,
          companyName: "FleetReady workspace",
          job: null,
          signedUrl: null,
          events: [],
        };
  }

  const [job, events] = await Promise.all([
    getInboxJob(context.supabase, context.companyId, jobId),
    getInboxEvents(context.supabase, context.companyId, jobId),
  ]);

  return {
    isConfigured: true,
    companyName: context.companyName,
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
  jobId: string,
) {
  const { data, error } = await supabase
    .from("ingestion_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  if (!data) {
    return null;
  }

  return normalizeJob(data as IngestionJob);
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

function normalizeJob(job: IngestionJob): IngestionJob {
  const parsedExtraction = maintenanceExtractionSchema.safeParse(job.extracted_data);
  const extractedData: MaintenanceExtraction | Record<string, never> =
    parsedExtraction.success ? parsedExtraction.data : {};

  return {
    ...job,
    file_size: Number(job.file_size ?? 0),
    confidence_score:
      job.confidence_score === null ? null : Number(job.confidence_score),
    extracted_data: extractedData,
  };
}

function getLocalDemoInboxOverview(): InboxOverviewResult {
  return {
    isConfigured: true,
    companyName: localDemoIdentity.companyName,
    jobs: [localDemoInboxJob],
  };
}

function getLocalDemoInboxJobDetail(jobId: string): InboxJobDetailResult {
  const job =
    jobId === localDemoInboxJob.id ? normalizeJob(localDemoInboxJobDetail) : null;

  return {
    isConfigured: true,
    companyName: localDemoIdentity.companyName,
    job,
    signedUrl: null,
    events: job
      ? [
          {
            id: "demo-inbox-event-uploaded",
            ingestion_job_id: job.id,
            company_id: job.company_id,
            event_type: "uploaded",
            metadata: {},
            created_at: job.created_at,
          },
          {
            id: "demo-inbox-event-extracted",
            ingestion_job_id: job.id,
            company_id: job.company_id,
            event_type: "extracted",
            metadata: { demo: true },
            created_at: job.updated_at,
          },
        ]
      : [],
  };
}

const demoAsset = getLocalDemoDataset().assets[0];

const demoExtraction: MaintenanceExtraction = {
  detectedDocumentType: "Maintenance receipt",
  asset: {
    assetId: demoAsset?.id ?? null,
    label: demoAsset ? `${demoAsset.unit_number} ${demoAsset.asset_name}` : null,
    confidence: 0.91,
    reason: "DEMO RECORD - NOT REAL.",
  },
  maintenanceDate: { value: new Date().toISOString().slice(0, 10), confidence: 0.88 },
  mileage: { value: demoAsset?.current_mileage ?? null, confidence: 0.8 },
  engineHours: { value: null, confidence: 0 },
  serviceProvider: { value: "DEMO Provider - Receipt Scan", confidence: 0.86 },
  maintenanceType: { value: "Oil and filter service", confidence: 0.9 },
  notes: {
    value: "Draft extracted from demo receipt. DEMO RECORD - NOT REAL.",
    confidence: 0.78,
  },
  partsCost: { value: 82.5, confidence: 0.92 },
  laborCost: { value: 45, confidence: 0.88 },
  otherCost: { value: 0, confidence: 0.8 },
  taxCost: { value: 9.56, confidence: 0.84 },
  totalCost: { value: 137.06, confidence: 0.88 },
  overallConfidence: 0.86,
  warnings: ["Review demo values before saving. DEMO RECORD - NOT REAL."],
};

const localDemoInboxJob: InboxJobListItem = {
  id: "demo-inbox-job",
  original_file_name: "demo-maintenance-receipt.pdf",
  status: "needs_review",
  detected_document_type: "Maintenance receipt",
  confidence_score: 0.86,
  created_record_type: null,
  created_record_id: null,
  error_message: null,
  created_at: new Date().toISOString(),
};

const localDemoInboxJobDetail: IngestionJob = {
  ...localDemoInboxJob,
  company_id: localDemoIdentity.companyId,
  owner_id: "demo-owner",
  asset_id: demoAsset?.id ?? null,
  storage_bucket: "maintenance-attachments",
  storage_path: `${localDemoIdentity.companyId}/inbox/demo-inbox-job/demo-maintenance-receipt.pdf`,
  mime_type: "application/pdf",
  file_size: 42_000,
  source_type: "owner_upload",
  extracted_data: demoExtraction,
  corrected_data: null,
  model_provider: "none",
  model_version: null,
  updated_at: new Date().toISOString(),
};
