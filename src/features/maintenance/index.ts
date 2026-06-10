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
    "Rule builder forms",
    "Reminder engine",
    "Maintenance history entry",
    "Cost reporting calculations",
  ],
} satisfies ModuleDefinition;
