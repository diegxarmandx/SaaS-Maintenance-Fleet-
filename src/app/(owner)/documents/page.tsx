import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/placeholders/module-placeholder";
import { documentsModule } from "@/features/documents";

export const metadata: Metadata = {
  title: "Documents",
};

export default function DocumentsPage() {
  return <ModulePlaceholder module={documentsModule} />;
}
