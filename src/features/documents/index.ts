import type { ModuleDefinition } from "@/features/module-definition";

export const documentsModule = {
  title: "Documents",
  href: "/documents",
  summary:
    "Supabase Storage-backed file organization for asset records, compliance files, and maintenance receipts.",
  scope: [
    "Fleet document metadata",
    "Asset and compliance associations",
    "Expiration dates for relevant documents",
    "Owner-controlled storage paths",
  ],
  deferred: [
    "File upload and preview",
    "Storage bucket policies",
    "Document versioning decisions",
    "Document search",
  ],
} satisfies ModuleDefinition;
