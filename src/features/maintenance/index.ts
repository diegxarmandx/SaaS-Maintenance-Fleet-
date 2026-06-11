import type { ModuleDefinition } from "@/features/module-definition";

export const maintenanceModule = {
  title: "Maintenance",
  href: "/maintenance",
  summary:
    "Preventive maintenance rules, reminders, completed maintenance history, meter readings, and owner cost tracking.",
  scope: [
    "Mileage-based preventive maintenance rules",
    "Engine-hour preventive maintenance rules",
    "Completed maintenance history and costs",
    "Reminder state derived from readings and dates",
  ],
  deferred: [
    "Reminder engine",
    "Scheduled notification delivery",
    "Advanced report visualizations",
  ],
} satisfies ModuleDefinition;
