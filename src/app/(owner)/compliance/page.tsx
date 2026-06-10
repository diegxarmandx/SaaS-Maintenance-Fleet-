import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/placeholders/module-placeholder";
import { complianceModule } from "@/features/compliance";

export const metadata: Metadata = {
  title: "Compliance",
};

export default function CompliancePage() {
  return <ModulePlaceholder module={complianceModule} />;
}
