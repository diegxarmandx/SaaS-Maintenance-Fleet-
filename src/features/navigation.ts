import { complianceModule } from "@/features/compliance";
import { dashboardModule } from "@/features/dashboard";
import { documentsModule } from "@/features/documents";
import { fleetModule } from "@/features/fleet";
import { maintenanceModule } from "@/features/maintenance";
import { reportsModule } from "@/features/reports";
import { settingsModule } from "@/features/settings";

export const ownerModules = [
  dashboardModule,
  fleetModule,
  maintenanceModule,
  complianceModule,
  documentsModule,
  reportsModule,
  settingsModule,
] as const;
