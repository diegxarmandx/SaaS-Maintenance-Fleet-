import type { ModuleDefinition } from "@/features/module-definition";

export const documentsModule = {
  title: "Documents",
  href: "/documents",
  summary:
    "Supabase Storage-backed file organization for asset records, compliance files, and maintenance receipts.",
  scope: [
    "Fleet document metadata",
    "Asset, maintenance, and compliance associations",
    "Expiration dates for relevant documents",
    "Owner-controlled storage paths",
    "Private file upload, preview, replacement, archive, and signed access",
  ],
  deferred: [
    "Document versioning decisions",
    "Bulk import",
    "Broad document OCR beyond the maintenance Inbox MVP",
  ],
} satisfies ModuleDefinition;
