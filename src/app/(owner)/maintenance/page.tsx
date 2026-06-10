import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/placeholders/module-placeholder";
import { maintenanceModule } from "@/features/maintenance";

export const metadata: Metadata = {
  title: "Maintenance",
};

export default function MaintenancePage() {
  return <ModulePlaceholder module={maintenanceModule} />;
}
