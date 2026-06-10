import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/placeholders/module-placeholder";
import { reportsModule } from "@/features/reports";

export const metadata: Metadata = {
  title: "Reports",
};

export default function ReportsPage() {
  return <ModulePlaceholder module={reportsModule} />;
}
