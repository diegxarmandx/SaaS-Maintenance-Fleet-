import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/placeholders/module-placeholder";
import { dashboardModule } from "@/features/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <ModulePlaceholder module={dashboardModule} />;
}
