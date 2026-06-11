import { isCompanyScopedStoragePath } from "@/features/documents/file-validation";
import type { SupabaseServerClient } from "@/features/fleet/server/owner";

export type StoredDocumentFile = {
  storage_bucket: string;
  storage_path: string;
};

const signedUrlSeconds = 60 * 10;

export async function createAuthorizedSignedDocumentUrl(
  supabase: SupabaseServerClient,
  companyId: string,
  document: StoredDocumentFile,
) {
  if (!isCompanyScopedStoragePath(document.storage_path, companyId)) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(document.storage_bucket)
    .createSignedUrl(document.storage_path, signedUrlSeconds);

  if (error) {
    return null;
  }

  return data.signedUrl;
}
