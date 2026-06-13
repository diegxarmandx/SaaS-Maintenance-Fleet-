import type { ModuleDefinition } from "@/features/module-definition";

export const settingsModule = {
  title: "Settings",
  href: "/settings",
  summary: "Owner account, workspace, billing, notification, and product configuration.",
  scope: [
    "Owner profile settings",
    "Workspace identity",
    "Reminder notification preferences",
    "Stripe subscription and billing portal entry points",
  ],
  deferred: ["In-app account email changes"],
} satisfies ModuleDefinition;
