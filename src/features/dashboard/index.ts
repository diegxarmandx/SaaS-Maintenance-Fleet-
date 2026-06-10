import type { ModuleDefinition } from "@/features/module-definition";

export const dashboardModule = {
  title: "Dashboard",
  href: "/dashboard",
  summary:
    "Owner-facing overview for upcoming maintenance, compliance expirations, document gaps, and fleet health indicators.",
  scope: [
    "Upcoming preventive maintenance reminders",
    "Upcoming compliance and document expirations",
    "Asset coverage and missing-reading indicators",
    "Owner-only report entry points",
  ],
  deferred: [
    "Live Supabase queries",
    "Reminder calculations",
    "Alert delivery",
    "Report visualizations",
  ],
} satisfies ModuleDefinition;
