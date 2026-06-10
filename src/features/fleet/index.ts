import type { ModuleDefinition } from "@/features/module-definition";

export const fleetModule = {
  title: "Fleet assets",
  href: "/fleet",
  summary:
    "Owner-managed records for vehicles, trailers, and equipment used by small fleets with 1 to 25 assets.",
  scope: [
    "Asset identity and ownership details",
    "Vehicle, trailer, and equipment categorization",
    "Mileage and engine-hour reading entry points",
    "Active, inactive, and archived asset lifecycle states",
  ],
  deferred: [
    "Asset create and edit forms",
    "Supabase persistence",
    "Document attachment workflows",
    "Import or bulk actions",
  ],
} satisfies ModuleDefinition;
