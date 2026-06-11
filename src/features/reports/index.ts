import type { ModuleDefinition } from "@/features/module-definition";

export const reportsModule = {
  title: "Reports",
  href: "/reports",
  summary:
    "Owner-facing reporting for maintenance costs, upcoming service, compliance readiness, and document expirations.",
  scope: [
    "Maintenance cost summaries",
    "Upcoming maintenance report",
    "Compliance expiration report",
    "Asset-level history views",
  ],
  deferred: ["Charts and trend views", "Saved report preferences", "PDF generation"],
} satisfies ModuleDefinition;
