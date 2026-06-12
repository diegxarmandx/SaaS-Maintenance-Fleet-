import { AppError } from "@/lib/errors";
import type { OwnerDatabaseContext } from "@/features/fleet/server/owner";

export type DocumentVersionChangeReason = "upload" | "replacement" | "metadata_import";

export type DocumentVersionInput = {
  documentId: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  changeReason: DocumentVersionChangeReason;
};

export async function getNextDocumentVersionNumber(
  context: OwnerDatabaseContext,
  documentId: string,
) {
  const { data, error } = await context.supabase
    .from("document_versions")
    .select("version_number")
    .eq("company_id", context.companyId)
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1);

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  const latest = (data?.[0] as { version_number: number } | undefined)?.version_number;

  return latest ? latest + 1 : 1;
}

export async function recordDocumentVersion(
  context: OwnerDatabaseContext,
  input: DocumentVersionInput,
) {
  const versionNumber = await getNextDocumentVersionNumber(context, input.documentId);
  const { data, error } = await context.supabase
    .from("document_versions")
    .insert({
      company_id: context.companyId,
      document_id: input.documentId,
      version_number: versionNumber,
      storage_bucket: input.storageBucket,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      change_reason: input.changeReason,
      created_by: context.ownerId,
    })
    .select("id")
    .single();

  if (error) {
    throw new AppError("DATA_ACCESS_ERROR", error.message);
  }

  return {
    id: (data as { id: string }).id,
    versionNumber,
  };
}
