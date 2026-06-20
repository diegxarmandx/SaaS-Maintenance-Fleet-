import type { ModuleDefinition } from "@/features/module-definition";

export const inboxModule = {
  title: "Inbox",
  href: "/inbox",
  summary:
    "Owner-reviewed AI ingestion for maintenance invoices, receipts, and photos.",
  scope: [
    "Maintenance invoice and receipt uploads",
    "Private file storage",
    "AI-extracted maintenance draft fields",
    "Owner review before record creation",
    "Manual entry fallback",
  ],
  deferred: [
    "Insurance and registration extraction",
    "Odometer or tachometer-only photo extraction",
    "Batch inbox",
    "Email forwarding",
    "Duplicate detection",
  ],
} satisfies ModuleDefinition;
