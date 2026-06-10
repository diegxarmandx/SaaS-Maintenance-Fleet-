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
  ],
  deferred: [
    "Requirement templates",
    "Expiration alert scheduling",
    "Compliance status calculations",
    "Renewal history",
  ],
} satisfies ModuleDefinition;
