import type { ModuleDefinition } from "@/features/module-definition";

export const settingsModule = {
  title: "Settings",
  href: "/settings",
  summary:
    "Owner account, workspace, notification, and product configuration boundaries for future setup.",
  scope: [
    "Owner profile settings",
    "Workspace identity",
    "Reminder notification preferences",
    "Billing entry point reserved for Stripe",
  ],
  deferred: [
    "Supabase account updates",
    "Stripe billing implementation",
    "Workspace member invitations",
  ],
} satisfies ModuleDefinition;
