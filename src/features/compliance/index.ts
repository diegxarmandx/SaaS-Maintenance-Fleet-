import type { ModuleDefinition } from "@/features/module-definition";

export const complianceModule = {
  title: "Compliance",
  href: "/compliance",
  summary:
    "Owner-maintained compliance requirements and expiration monitoring for fleet assets.",
  scope: [
    "Registration, insurance, permits, and inspection requirements",
    "Requirement status by asset",
    "Expiration dates and alert thresholds",
    "Compliance report source data",
    "Secure compliance document attachments",
  ],
  deferred: [
    "Expiration alert scheduling",
    "Renewal history",
    "Compliance report visualizations",
  ],
} satisfies ModuleDefinition;
